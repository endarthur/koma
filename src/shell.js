/**
 * Koma Shell - Command parsing and execution
 */

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
  }

  /**
   * Register a command handler
   */
  registerCommand(name, handler) {
    this.commands.set(name, handler);
  }

  /**
   * Parse command line into command and arguments
   */
  parseCommand(line) {
    // Simple parsing - split on whitespace, handle quotes later
    const parts = line.trim().split(/\s+/);
    return {
      command: parts[0],
      args: parts.slice(1),
      raw: line.trim(),
    };
  }

  /**
   * Execute a command
   */
  async execute(line) {
    if (!line.trim()) return;

    // Add to history
    this.history.push(line);
    this.historyIndex = this.history.length;

    const { command, args, raw } = this.parseCommand(line);

    // Check if command exists
    if (!this.commands.has(command)) {
      this.term.writeln(`\x1b[31mkoma: command not found: ${command}\x1b[0m`);
      this.term.writeln(`Type \x1b[1mhelp\x1b[0m for available commands`);
      return;
    }

    // Execute command
    try {
      const handler = this.commands.get(command);
      await handler(args, this);
    } catch (error) {
      this.term.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
      console.error(error);
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
