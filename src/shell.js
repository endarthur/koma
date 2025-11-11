/**
 * Koma Shell - Command parsing and execution
 */

import { commandRegistry } from './utils/command-registry.js';
import { tokenize } from './parser/lexer.js';
import { parse } from './parser/parser.js';
import { Executor } from './parser/executor.js';

export class Shell {
  constructor(terminal) {
    this.term = terminal;
    this.commands = new Map();
    this.cwd = '/home';
    this.history = [];
    this.historyIndex = -1;
    this.env = {
      HOME: '/home',
      USER: 'koma',
      PATH: '/usr/bin:/bin',
      SHELL: '/bin/koma',
    };
    this.lastExitCode = 0; // Track exit codes for $?
    this.executor = new Executor(this); // AST executor
  }

  /**
   * Register a command handler
   * @param {string} name - Command name
   * @param {Function} handler - Command handler function
   * @param {Object} [metadata] - Optional metadata for help system
   * @param {string} [metadata.description] - Brief description
   * @param {string} [metadata.category] - Category (filesystem, shell, process, etc.)
   */
  registerCommand(name, handler, metadata = null) {
    this.commands.set(name, handler);

    // Register metadata if provided
    if (metadata) {
      commandRegistry.register(
        name,
        metadata.description || '',
        metadata.category || 'other'
      );
    }
  }

  /**
   * Tokenize command line with quote awareness
   * @param {string} line - Command line to tokenize
   * @returns {string[]} Array of tokens
   */
  tokenize(line) {
    const trimmed = line.trim();
    const tokens = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = null;

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      const nextChar = trimmed[i + 1];

      if ((char === '"' || char === "'") && !inQuotes) {
        // Start of quoted string
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        // End of quoted string
        inQuotes = false;
        quoteChar = null;
      } else if (!inQuotes && (char === '|' || char === '<' || char === '>')) {
        // Operator outside quotes
        if (current) {
          tokens.push(current);
          current = '';
        }
        // Handle >> as single token
        if (char === '>' && nextChar === '>') {
          tokens.push('>>');
          i++; // Skip next char
        } else {
          tokens.push(char);
        }
      } else if (char === ' ' && !inQuotes) {
        // Space outside quotes - end of token
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        // Regular character
        current += char;
      }
    }

    // Add last token
    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Parse command line into pipeline structure
   * Handles pipes (|), output redirection (>, >>), and input redirection (<)
   *
   * @param {string} line - Command line to parse
   * @returns {object} Pipeline structure with stages and redirects
   *
   * Structure:
   * {
   *   stages: [
   *     { command: 'cat', args: ['file.txt'] },
   *     { command: 'grep', args: ['foo'] }
   *   ],
   *   inputFile: null | 'file.txt',  // < file.txt
   *   outputFile: null | 'out.txt',  // > or >>
   *   outputMode: 'write' | 'append', // > vs >>
   *   raw: 'original command line'
   * }
   */
  parsePipeline(line) {
    const tokens = this.tokenize(line);
    const stages = [];
    let currentStage = [];
    let inputFile = null;
    let outputFile = null;
    let outputMode = 'write';

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token === '|') {
        // End current stage, start new one
        if (currentStage.length > 0) {
          stages.push({
            command: currentStage[0],
            args: currentStage.slice(1)
          });
          currentStage = [];
        }
      } else if (token === '<') {
        // Input redirection
        const nextToken = tokens[i + 1];
        if (nextToken) {
          inputFile = nextToken;
          i++; // Skip the filename
        }
      } else if (token === '>' || token === '>>') {
        // Output redirection
        const nextToken = tokens[i + 1];
        if (nextToken) {
          outputFile = nextToken;
          outputMode = token === '>>' ? 'append' : 'write';
          i++; // Skip the filename
        }
      } else {
        // Regular token (command or arg)
        currentStage.push(token);
      }
    }

    // Add final stage
    if (currentStage.length > 0) {
      stages.push({
        command: currentStage[0],
        args: currentStage.slice(1)
      });
    }

    return {
      stages,
      inputFile,
      outputFile,
      outputMode,
      raw: line.trim(),
      isPipeline: stages.length > 1 || inputFile !== null || outputFile !== null
    };
  }

  /**
   * Parse command line into command and arguments (simple mode)
   * Used for basic commands without pipes/redirects
   *
   * @param {string} line - Command line to parse
   * @returns {object} { command, args, raw }
   */
  parseCommand(line) {
    const tokens = this.tokenize(line);

    // Filter out operators (shouldn't be present in simple mode)
    const parts = tokens.filter(t => !['|', '<', '>', '>>'].includes(t));

    return {
      command: parts[0] || '',
      args: parts.slice(1),
      raw: line.trim(),
    };
  }

  /**
   * Split command line by semicolons (respecting quotes)
   * @param {string} line - Command line to split
   * @returns {string[]} Array of command segments
   */
  splitBySemicolon(line) {
    const segments = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = null;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = null;
        current += char;
      } else if (char === ';' && !inQuotes) {
        // Semicolon outside quotes - split here
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    // Add last segment
    if (current.trim()) {
      segments.push(current.trim());
    }

    return segments;
  }

  /**
   * Execute a command or pipeline using the new parser
   */
  async execute(line) {
    if (!line.trim()) return;

    // Add to history
    this.history.push(line);
    this.historyIndex = this.history.length;

    try {
      // Tokenize → Parse → Execute (new parser pipeline)
      const tokens = tokenize(line);
      const ast = parse(tokens);
      const exitCode = await this.executor.execute(ast);

      // Track exit code for $?
      this.lastExitCode = exitCode;
    } catch (error) {
      // Parser/executor errors
      this.term.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
      console.error('[Shell]', error);
      this.lastExitCode = 1;
    }
  }

  /**
   * Execute a single command segment (might contain pipes/redirects)
   */
  async executeSegment(line) {
    // Parse as pipeline
    const pipeline = this.parsePipeline(line);

    // Execute pipeline or simple command
    if (pipeline.isPipeline) {
      await this.executePipeline(pipeline);
    } else {
      // Simple command execution (no pipes/redirects)
      const { command, args } = pipeline.stages[0];
      await this.executeSimple(command, args);
    }
  }

  /**
   * Execute a simple command (no pipes/redirects)
   */
  async executeSimple(command, args) {
    // Check if command exists
    if (!this.commands.has(command)) {
      this.term.writeln(`\x1b[31mkoma: command not found: ${command}\x1b[0m`);
      this.term.writeln(`Type \x1b[1mhelp\x1b[0m for available commands`);
      return;
    }

    // Execute command
    try {
      const handler = this.commands.get(command);
      const { createTerminalContext } = await import('./utils/command-context.js');
      const context = createTerminalContext(this.term, this);
      await handler(args, this, context);
    } catch (error) {
      this.term.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
      console.error(error);
    }
  }

  /**
   * Execute a pipeline with pipes and/or redirects
   */
  async executePipeline(pipeline) {
    const { CommandContext, createTerminalContext, createPipedContext, createRedirectedContext } = await import('./utils/command-context.js');
    const { kernelClient } = await import('./kernel/client.js');
    const { resolvePath } = await import('./utils/command-utils.js');

    try {
      const kernel = await kernelClient.getKernel();
      let stdin = '';

      // Handle input redirection (<)
      if (pipeline.inputFile) {
        const inputPath = resolvePath(pipeline.inputFile, this.cwd, this.env.HOME);
        stdin = await kernel.readFile(inputPath);
      }

      // Execute each stage in the pipeline
      for (let i = 0; i < pipeline.stages.length; i++) {
        const stage = pipeline.stages[i];
        const isLastStage = i === pipeline.stages.length - 1;
        const hasOutputRedirect = isLastStage && pipeline.outputFile;

        // Check if command exists
        if (!this.commands.has(stage.command)) {
          this.term.writeln(`\x1b[31mkoma: command not found: ${stage.command}\x1b[0m`);
          return;
        }

        // Create context based on pipeline position
        let context;
        if (hasOutputRedirect) {
          context = createRedirectedContext(this.term, stdin, this);
        } else if (!isLastStage) {
          context = createPipedContext(this.term, stdin, this);
        } else {
          // Last stage with no redirect - buffer output then write to terminal
          context = createPipedContext(this.term, stdin, this);
        }

        // Execute command with context
        const handler = this.commands.get(stage.command);
        await handler(stage.args, this, context);

        // Get output for next stage
        if (!isLastStage) {
          stdin = context.getStdout();
        } else if (hasOutputRedirect) {
          // Write output to file
          const outputPath = resolvePath(pipeline.outputFile, this.cwd, this.env.HOME);
          const output = context.getStdout();

          try {
            if (pipeline.outputMode === 'append') {
              // Append mode (>>)
              try {
                const existing = await kernel.readFile(outputPath);
                await kernel.writeFile(outputPath, existing + '\n' + output);
              } catch (error) {
                // File doesn't exist, create it
                await kernel.writeFile(outputPath, output);
              }
            } else {
              // Write mode (>)
              await kernel.writeFile(outputPath, output);
            }
          } catch (error) {
            this.term.writeln(`\x1b[31mkoma: ${error.message}\x1b[0m`);
          }
        } else {
          // Last stage, no redirect - output already went to terminal
          // But if there was output buffered, show it now
          const output = context.getStdout();
          if (output) {
            const lines = output.split('\n');
            lines.forEach(line => this.term.writeln(line));
          }
        }
      }
    } catch (error) {
      this.term.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
      console.error('[Pipeline]', error);
    }
  }

  /**
   * Get previous command from history
   */
  historyPrevious() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.history[this.historyIndex];
    }
    return null;
  }

  /**
   * Get next command from history
   */
  historyNext() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.history[this.historyIndex];
    } else if (this.historyIndex === this.history.length - 1) {
      this.historyIndex = this.history.length;
      return '';
    }
    return null;
  }

  /**
   * Write the shell prompt
   */
  writePrompt() {
    const promptColor = '\x1b[38;5;208m'; // Orange
    const reset = '\x1b[0m';
    this.term.write(`${promptColor}${this.cwd}${reset} $ `);
  }

  /**
   * Read a line of input from the user (for interactive commands)
   * @param {string} prompt - Optional prompt to display
   * @returns {Promise<string>} The line entered by the user
   */
  async readLine(prompt = '') {
    if (prompt) {
      this.term.write(prompt);
    }

    return new Promise((resolve) => {
      this.inputMode = 'command-read';
      this.inputBuffer = '';
      this.inputResolver = resolve;
    });
  }

  /**
   * Change current working directory
   */
  cd(path) {
    // Simple path handling for now
    if (!path || path === '~') {
      this.cwd = this.env.HOME;
    } else if (path === '/') {
      this.cwd = '/';
    } else if (path === '..') {
      const parts = this.cwd.split('/').filter(p => p);
      parts.pop();
      this.cwd = '/' + parts.join('/');
      if (this.cwd === '/') this.cwd = '/';
    } else if (path.startsWith('/')) {
      this.cwd = path;
    } else {
      this.cwd = this.cwd === '/' ? `/${path}` : `${this.cwd}/${path}`;
    }

    // Normalize path
    if (this.cwd === '') this.cwd = '/';
  }

  /**
   * Get shell state for serialization
   */
  getState() {
    return {
      cwd: this.cwd,
      history: this.history.slice(-100), // Keep last 100 commands
      env: { ...this.env },
    };
  }

  /**
   * Restore shell state from serialized data
   */
  setState(state) {
    if (state.cwd) this.cwd = state.cwd;
    if (state.history) this.history = state.history;
    if (state.env) this.env = { ...this.env, ...state.env };
    this.historyIndex = this.history.length;
  }
}
