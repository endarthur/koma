/**
 * CommandContext - Abstraction for command input/output
 *
 * Provides a unified interface for commands to read stdin and write stdout,
 * whether they're running standalone in a terminal or as part of a pipeline.
 */

export class CommandContext {
  /**
   * Create a command context
   * @param {object} options - Context options
   * @param {object} options.term - Terminal instance
   * @param {object} [options.shell] - Shell instance (for interactive input)
   * @param {string} [options.stdin=''] - Input data (for piped commands)
   * @param {boolean} [options.isPiped=false] - Whether output is being piped
   * @param {boolean} [options.isRedirected=false] - Whether output is redirected to file
   */
  constructor(options) {
    this.term = options.term;
    this.shell = options.shell || null;
    this.stdin = options.stdin || '';
    this.isPiped = options.isPiped || false;
    this.isRedirected = options.isRedirected || false;
    this.stdout = [];  // Buffer for output
    this.stderr = [];  // Buffer for errors
  }

  /**
   * Write a line to stdout
   * @param {string} text - Text to write
   */
  writeln(text) {
    if (this.isPiped || this.isRedirected) {
      // Buffer output for next command or file
      this.stdout.push(text);
    } else {
      // Write directly to terminal
      this.term.writeln(text);
    }
  }

  /**
   * Write text to stdout without newline
   * @param {string} text - Text to write
   */
  write(text) {
    if (this.isPiped || this.isRedirected) {
      // Add to last line or create new line
      if (this.stdout.length === 0) {
        this.stdout.push(text);
      } else {
        this.stdout[this.stdout.length - 1] += text;
      }
    } else {
      this.term.write(text);
    }
  }

  /**
   * Write an error message to stderr
   * @param {string} text - Error text
   */
  error(text) {
    this.stderr.push(text);
    // Always show errors in terminal, even if piped
    this.term.writeln(text);
  }

  /**
   * Get stdin as array of lines
   * @returns {string[]} Array of input lines
   */
  getStdinLines() {
    if (!this.stdin) return [];
    return this.stdin.split('\n');
  }

  /**
   * Get stdout as string
   * @returns {string} Complete stdout with newlines
   */
  getStdout() {
    return this.stdout.join('\n');
  }

  /**
   * Get stdout as array of lines
   * @returns {string[]} Array of output lines
   */
  getStdoutLines() {
    return this.stdout;
  }

  /**
   * Check if stdin has data
   * @returns {boolean} True if stdin is not empty
   */
  hasStdin() {
    return this.stdin.length > 0;
  }

  /**
   * Check if command is in standalone mode (not piped/redirected)
   * @returns {boolean} True if standalone
   */
  isStandalone() {
    return !this.isPiped && !this.isRedirected;
  }

  /**
   * Read a line of input from the user (interactive mode)
   * @param {string} prompt - Optional prompt to display
   * @returns {Promise<string|null>} The input line, or null if cancelled
   * @throws {Error} If readLine is not available (piped/redirected context)
   */
  async readLine(prompt = '') {
    if (!this.shell) {
      throw new Error('readLine not available in piped/redirected context');
    }
    return await this.shell.readLine(prompt);
  }
}

/**
 * Create a command context for standalone terminal execution
 * @param {object} term - Terminal instance
 * @param {object} [shell] - Shell instance (for interactive input)
 * @returns {CommandContext} Context for standalone execution
 */
export function createTerminalContext(term, shell = null) {
  return new CommandContext({
    term,
    shell,
    stdin: '',
    isPiped: false,
    isRedirected: false
  });
}

/**
 * Create a command context for piped execution
 * @param {object} term - Terminal instance
 * @param {string} stdin - Input from previous command
 * @param {object} [shell] - Shell instance for interactive features
 * @returns {CommandContext} Context for piped execution
 */
export function createPipedContext(term, stdin, shell = null) {
  return new CommandContext({
    term,
    shell,
    stdin,
    isPiped: true,
    isRedirected: false
  });
}

/**
 * Create a command context for redirected output
 * @param {object} term - Terminal instance
 * @param {string} stdin - Input data
 * @param {object} [shell] - Shell instance for interactive features
 * @returns {CommandContext} Context for redirected execution
 */
export function createRedirectedContext(term, stdin = '', shell = null) {
  return new CommandContext({
    term,
    shell,
    stdin,
    isPiped: false,
    isRedirected: true
  });
}
