/**
 * AST Nodes - Abstract Syntax Tree node definitions
 *
 * Represents the parsed structure of shell commands.
 * Each node type represents a different shell construct.
 */

/**
 * Base class for all AST nodes
 */
export class ASTNode {
  constructor(type) {
    this.type = type;
  }

  /**
   * String representation for debugging
   */
  toString() {
    return `${this.type}()`;
  }
}

/**
 * CommandNode - A simple command with arguments
 *
 * Examples:
 *   ls -la /home
 *   cat file.txt
 *   echo "hello world"
 */
export class CommandNode extends ASTNode {
  /**
   * @param {string} command - Command name
   * @param {Array<string|VariableNode>} args - Arguments (can include variables)
   */
  constructor(command, args = []) {
    super('Command');
    this.command = command;
    this.args = args;
  }

  toString() {
    const argsStr = this.args.map(arg => {
      if (typeof arg === 'string') return arg;
      return arg.toString();
    }).join(' ');
    return `Command(${this.command} ${argsStr})`;
  }
}

/**
 * PipelineNode - Commands connected by pipes
 *
 * Examples:
 *   cat file.txt | grep foo
 *   ls | sort | uniq
 */
export class PipelineNode extends ASTNode {
  /**
   * @param {Array<CommandNode>} commands - Commands in the pipeline
   */
  constructor(commands) {
    super('Pipeline');
    this.commands = commands;
  }

  toString() {
    return `Pipeline(${this.commands.map(c => c.toString()).join(' | ')})`;
  }
}

/**
 * RedirectNode - Input/output redirection
 *
 * Examples:
 *   command < input.txt
 *   command > output.txt
 *   command >> append.txt
 */
export class RedirectNode extends ASTNode {
  /**
   * @param {string} type - 'in', 'out', or 'append'
   * @param {string} filename - File to redirect to/from
   * @param {ASTNode} command - Command to redirect
   */
  constructor(type, filename, command) {
    super('Redirect');
    this.redirectType = type;  // 'in', 'out', 'append'
    this.filename = filename;
    this.command = command;
  }

  toString() {
    const op = this.redirectType === 'in' ? '<' :
               this.redirectType === 'append' ? '>>' : '>';
    return `Redirect(${this.command.toString()} ${op} ${this.filename})`;
  }
}

/**
 * SequenceNode - Commands executed sequentially
 *
 * Examples:
 *   cd /tmp ; ls ; pwd
 *   mkdir test ; cd test
 */
export class SequenceNode extends ASTNode {
  /**
   * @param {Array<ASTNode>} commands - Commands to execute in sequence
   */
  constructor(commands) {
    super('Sequence');
    this.commands = commands;
  }

  toString() {
    return `Sequence(${this.commands.map(c => c.toString()).join(' ; ')})`;
  }
}

/**
 * AssignmentNode - Variable assignment
 *
 * Examples:
 *   NAME=value
 *   PATH=/usr/bin
 */
export class AssignmentNode extends ASTNode {
  /**
   * @param {string} name - Variable name
   * @param {string} value - Variable value
   */
  constructor(name, value) {
    super('Assignment');
    this.name = name;
    this.value = value;
  }

  toString() {
    return `Assignment(${this.name}=${this.value})`;
  }
}

/**
 * VariableNode - Variable reference for expansion
 *
 * Examples:
 *   $HOME
 *   ${USER}
 *   $?
 */
export class VariableNode extends ASTNode {
  /**
   * @param {string} name - Variable name
   */
  constructor(name) {
    super('Variable');
    this.name = name;
  }

  toString() {
    return `$${this.name}`;
  }
}

/**
 * CompoundNode - A command with redirections
 * Wraps a command/pipeline with its input/output redirects
 *
 * Examples:
 *   cat file.txt > output.txt
 *   cat < input.txt | grep foo > output.txt
 */
export class CompoundNode extends ASTNode {
  /**
   * @param {ASTNode} command - The command or pipeline
   * @param {Object} redirects - Redirect specifications
   * @param {string|null} redirects.input - Input file (<)
   * @param {string|null} redirects.output - Output file (> or >>)
   * @param {string} redirects.outputMode - 'write' or 'append'
   */
  constructor(command, redirects = {}) {
    super('Compound');
    this.command = command;
    this.redirects = {
      input: redirects.input || null,
      output: redirects.output || null,
      outputMode: redirects.outputMode || 'write'
    };
  }

  toString() {
    let str = this.command.toString();
    if (this.redirects.input) {
      str += ` < ${this.redirects.input}`;
    }
    if (this.redirects.output) {
      const op = this.redirects.outputMode === 'append' ? '>>' : '>';
      str += ` ${op} ${this.redirects.output}`;
    }
    return `Compound(${str})`;
  }
}

/**
 * EmptyNode - Represents empty input (no command)
 * Used for blank lines or whitespace-only input
 */
export class EmptyNode extends ASTNode {
  constructor() {
    super('Empty');
  }

  toString() {
    return 'Empty()';
  }
}

/**
 * SExpressionNode - Lisp s-expression for Schist interpreter
 * Represents a list structure (function application or data)
 *
 * Examples:
 *   (+ 1 2 3)
 *   (list 1 2 3)
 *   (car (cons 1 2))
 */
export class SExpressionNode extends ASTNode {
  /**
   * @param {Array<SExpressionNode|string|number>} elements - List elements
   */
  constructor(elements = []) {
    super('SExpression');
    this.elements = elements;
  }

  toString() {
    const elementsStr = this.elements.map(e => {
      if (e instanceof SExpressionNode) return e.toString();
      return String(e);
    }).join(' ');
    return `(${elementsStr})`;
  }
}
