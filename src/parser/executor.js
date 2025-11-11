/**
 * Executor - Interprets and executes Abstract Syntax Trees
 *
 * Takes AST nodes from the Parser and executes them by interfacing
 * with the Shell's existing command execution infrastructure.
 *
 * Execution Flow:
 *   AST Node → Executor.execute() → Shell.executeSimple/executePipeline
 *
 * Exit Codes:
 *   0 = success
 *   1 = general error
 *   127 = command not found
 *   130 = terminated by Ctrl+C
 */

import {
  CommandNode,
  PipelineNode,
  CompoundNode,
  SequenceNode,
  AssignmentNode,
  VariableNode,
  EmptyNode
} from './ast-nodes.js';

/**
 * Executor - Executes AST nodes
 */
export class Executor {
  /**
   * @param {Shell} shell - Shell instance with commands and environment
   */
  constructor(shell) {
    this.shell = shell;
    // Use shell's lastExitCode instead of our own
  }

  /**
   * Execute an AST node
   * @param {ASTNode} node - AST node to execute
   * @returns {Promise<number>} Exit code (0 = success)
   */
  async execute(node) {
    try {
      // Route to appropriate execution method based on node type
      switch (node.type) {
        case 'Empty':
          return await this.executeEmpty(node);

        case 'Command':
          return await this.executeCommand(node);

        case 'Pipeline':
          return await this.executePipeline(node);

        case 'Compound':
          return await this.executeCompound(node);

        case 'Sequence':
          return await this.executeSequence(node);

        case 'Assignment':
          return await this.executeAssignment(node);

        default:
          throw new Error(`Unknown AST node type: ${node.type}`);
      }
    } catch (error) {
      this.shell.term.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
      console.error('[Executor]', error);
      this.shell.lastExitCode = 1;
      return 1;
    }
  }

  /**
   * Execute an empty node (blank line)
   * @returns {Promise<number>} Exit code 0
   */
  async executeEmpty(node) {
    this.shell.lastExitCode = 0;
    return 0;
  }

  /**
   * Execute a simple command
   * @param {CommandNode} node - Command node
   * @returns {Promise<number>} Exit code
   */
  async executeCommand(node) {
    // Expand variables in arguments
    const expandedArgs = await this.expandArguments(node.args);

    // Check if command exists
    if (!this.shell.commands.has(node.command)) {
      this.shell.term.writeln(`\x1b[31mkoma: command not found: ${node.command}\x1b[0m`);
      this.shell.term.writeln(`Type \x1b[1mhelp\x1b[0m for available commands`);
      this.shell.lastExitCode = 127; // Command not found
      return 127;
    }

    // Execute command using Shell's existing infrastructure
    try {
      const handler = this.shell.commands.get(node.command);
      const { createTerminalContext } = await import('../utils/command-context.js');
      const context = createTerminalContext(this.shell.term);
      context.commandName = node.command; // Add command name for special commands like [

      const result = await handler(expandedArgs, this.shell, context);

      // Use command's return value if it returns one (like test command)
      // Otherwise assume success (0)
      const exitCode = (typeof result === 'number') ? result : 0;
      this.shell.lastExitCode = exitCode;
      return exitCode;
    } catch (error) {
      this.shell.term.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
      console.error(error);
      this.shell.lastExitCode = 1;
      return 1;
    }
  }

  /**
   * Execute a pipeline (multiple commands connected by pipes)
   * @param {PipelineNode} node - Pipeline node
   * @returns {Promise<number>} Exit code
   */
  async executePipeline(node) {
    // Convert AST pipeline to Shell's pipeline format
    const pipelineStruct = {
      stages: [],
      inputFile: null,
      outputFile: null,
      outputMode: 'write',
      raw: node.toString(),
      isPipeline: true
    };

    // Convert each command node to stage format
    for (const cmdNode of node.commands) {
      if (cmdNode.type !== 'Command') {
        throw new Error(`Pipeline can only contain commands, got: ${cmdNode.type}`);
      }

      const expandedArgs = await this.expandArguments(cmdNode.args);
      pipelineStruct.stages.push({
        command: cmdNode.command,
        args: expandedArgs
      });
    }

    // Execute using Shell's existing pipeline infrastructure
    try {
      await this.shell.executePipeline(pipelineStruct);
      this.shell.lastExitCode = 0;
      return 0;
    } catch (error) {
      this.shell.lastExitCode = 1;
      return 1;
    }
  }

  /**
   * Execute a compound command (command/pipeline with redirects)
   * @param {CompoundNode} node - Compound node
   * @returns {Promise<number>} Exit code
   */
  async executeCompound(node) {
    // Build pipeline structure with redirects
    let pipelineStruct;

    if (node.command.type === 'Pipeline') {
      // Convert pipeline node to structure
      pipelineStruct = {
        stages: [],
        inputFile: node.redirects.input,
        outputFile: node.redirects.output,
        outputMode: node.redirects.outputMode,
        raw: node.toString(),
        isPipeline: true
      };

      for (const cmdNode of node.command.commands) {
        if (cmdNode.type !== 'Command') {
          throw new Error(`Pipeline can only contain commands, got: ${cmdNode.type}`);
        }

        const expandedArgs = await this.expandArguments(cmdNode.args);
        pipelineStruct.stages.push({
          command: cmdNode.command,
          args: expandedArgs
        });
      }
    } else if (node.command.type === 'Command') {
      // Single command with redirects
      const expandedArgs = await this.expandArguments(node.command.args);
      pipelineStruct = {
        stages: [{
          command: node.command.command,
          args: expandedArgs
        }],
        inputFile: node.redirects.input,
        outputFile: node.redirects.output,
        outputMode: node.redirects.outputMode,
        raw: node.toString(),
        isPipeline: true // Always use pipeline executor for redirects
      };
    } else {
      throw new Error(`Compound node can only contain Command or Pipeline, got: ${node.command.type}`);
    }

    // Execute using Shell's pipeline infrastructure (handles redirects)
    try {
      await this.shell.executePipeline(pipelineStruct);
      this.shell.lastExitCode = 0;
      return 0;
    } catch (error) {
      this.shell.lastExitCode = 1;
      return 1;
    }
  }

  /**
   * Execute a sequence of commands (separated by semicolons or newlines)
   * @param {SequenceNode} node - Sequence node
   * @returns {Promise<number>} Exit code of last command
   */
  async executeSequence(node) {
    let exitCode = 0;

    // Execute each command in order
    for (const cmdNode of node.commands) {
      exitCode = await this.execute(cmdNode);
      // Continue even if a command fails (that's how semicolons work)
    }

    this.shell.lastExitCode = exitCode;
    return exitCode;
  }

  /**
   * Execute a variable assignment
   * @param {AssignmentNode} node - Assignment node
   * @returns {Promise<number>} Exit code (always 0)
   */
  async executeAssignment(node) {
    // Set variable in shell environment
    this.shell.env[node.name] = node.value;
    this.shell.lastExitCode = 0;
    return 0;
  }

  /**
   * Expand variables in argument list
   * @param {Array<string|VariableNode>} args - Arguments (may contain variables)
   * @returns {Promise<string[]>} Expanded arguments
   */
  async expandArguments(args) {
    const expanded = [];

    for (const arg of args) {
      if (arg instanceof VariableNode) {
        // Expand variable
        const value = this.expandVariable(arg.name);
        expanded.push(value);
      } else if (typeof arg === 'string') {
        // Regular string argument
        expanded.push(arg);
      } else {
        throw new Error(`Invalid argument type: ${typeof arg}`);
      }
    }

    return expanded;
  }

  /**
   * Expand a single variable reference
   * @param {string} name - Variable name
   * @returns {string} Variable value (empty string if undefined)
   */
  expandVariable(name) {
    // Special variables
    if (name === '?') {
      return String(this.shell.lastExitCode);
    }
    if (name === '#') {
      // Number of arguments (not implemented yet)
      return '0';
    }
    if (name === '@') {
      // All arguments (not implemented yet)
      return '';
    }

    // Regular environment variable
    return this.shell.env[name] || '';
  }

  /**
   * Get the last exit code
   * @returns {number} Last exit code
   */
  getLastExitCode() {
    return this.shell.lastExitCode;
  }

  /**
   * Set the last exit code (for integration with Shell)
   * @param {number} code - Exit code
   */
  setLastExitCode(code) {
    this.shell.lastExitCode = code;
  }
}

/**
 * Convenience function to execute an AST with a shell
 * @param {ASTNode} ast - AST to execute
 * @param {Shell} shell - Shell instance
 * @returns {Promise<number>} Exit code
 */
export async function execute(ast, shell) {
  const executor = new Executor(shell);
  return await executor.execute(ast);
}
