/**
 * xterm-kit: Key Handler
 * Helper for handling keyboard input in xterm.js
 */

/**
 * Key sequence constants
 */
export const KEYS = {
  // Control keys
  CTRL_C: '\x03',
  CTRL_D: '\x04',
  CTRL_L: '\x0c',
  CTRL_Z: '\x1a',

  // Navigation
  UP: '\x1b[A',
  DOWN: '\x1b[B',
  RIGHT: '\x1b[C',
  LEFT: '\x1b[D',
  HOME: '\x1b[H',
  END: '\x1b[F',
  PAGE_UP: '\x1b[5~',
  PAGE_DOWN: '\x1b[6~',

  // Editing
  BACKSPACE: '\x7f',
  DELETE: '\x1b[3~',
  TAB: '\t',
  ENTER: '\r',
  ESCAPE: '\x1b',
};

/**
 * Key handler for terminal input
 */
export class KeyHandler {
  /**
   * Create a key handler
   * @param {object} term - xterm.js Terminal instance
   */
  constructor(term) {
    this.term = term;
    this.handlers = new Map();
    this.defaultHandler = null;
    this.disposable = null;
  }

  /**
   * Register a key binding
   * @param {string} key - Key sequence or name (e.g., 'ctrl+c', 'up', 'enter')
   * @param {Function} handler - Handler function
   *
   * @example
   * keys.on('ctrl+c', () => cancelOperation());
   * keys.on('up', () => historyPrevious());
   * keys.on('enter', () => executeCommand());
   */
  on(key, handler) {
    const sequence = this.keyToSequence(key);
    this.handlers.set(sequence, handler);
  }

  /**
   * Unregister a key binding
   * @param {string} key - Key sequence or name
   */
  off(key) {
    const sequence = this.keyToSequence(key);
    this.handlers.delete(sequence);
  }

  /**
   * Set default handler for unmatched keys
   * @param {Function} handler - Default handler function
   */
  onDefault(handler) {
    this.defaultHandler = handler;
  }

  /**
   * Start listening for key events
   */
  start() {
    if (this.disposable) return;

    this.disposable = this.term.onData(data => {
      const handler = this.handlers.get(data);

      if (handler) {
        handler(data);
      } else if (this.defaultHandler) {
        this.defaultHandler(data);
      }
    });
  }

  /**
   * Stop listening for key events
   */
  stop() {
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = null;
    }
  }

  /**
   * Convert key name to escape sequence
   * @param {string} key - Key name
   * @returns {string} Escape sequence
   */
  keyToSequence(key) {
    // If it's already a sequence (starts with escape or control char), return as-is
    if (key.charCodeAt(0) < 32 || key.startsWith('\x1b')) {
      return key;
    }

    // Handle ctrl+ combinations
    if (key.startsWith('ctrl+')) {
      const char = key.slice(5).toLowerCase();
      const code = char.charCodeAt(0) - 96; // Convert a-z to 1-26
      return String.fromCharCode(code);
    }

    // Handle named keys
    const keyMap = {
      // Navigation
      'up': KEYS.UP,
      'down': KEYS.DOWN,
      'left': KEYS.LEFT,
      'right': KEYS.RIGHT,
      'home': KEYS.HOME,
      'end': KEYS.END,
      'pageup': KEYS.PAGE_UP,
      'pagedown': KEYS.PAGE_DOWN,

      // Editing
      'backspace': KEYS.BACKSPACE,
      'delete': KEYS.DELETE,
      'tab': KEYS.TAB,
      'enter': KEYS.ENTER,
      'escape': KEYS.ESCAPE,
      'esc': KEYS.ESCAPE,
    };

    return keyMap[key.toLowerCase()] || key;
  }

  /**
   * Check if data matches a specific key
   * @param {string} data - Input data from terminal
   * @param {string} key - Key to check
   * @returns {boolean} True if matches
   */
  static matches(data, key) {
    const handler = new KeyHandler(null);
    const sequence = handler.keyToSequence(key);
    return data === sequence;
  }

  /**
   * Check if data is printable character
   * @param {string} data - Input data
   * @returns {boolean} True if printable
   */
  static isPrintable(data) {
    if (data.length !== 1) return false;
    const code = data.charCodeAt(0);
    return code >= 32 && code <= 126;
  }

  /**
   * Check if data is control key
   * @param {string} data - Input data
   * @returns {boolean} True if control key
   */
  static isControl(data) {
    if (data.length === 0) return false;
    const code = data.charCodeAt(0);
    return code < 32 || data.startsWith('\x1b');
  }
}

/**
 * Simple line editor with history support
 */
export class LineEditor {
  /**
   * Create a line editor
   * @param {object} term - xterm.js Terminal instance
   * @param {object} options - Configuration options
   * @param {Function} [options.onSubmit] - Called when user presses Enter
   * @param {Function} [options.onCancel] - Called when user presses Ctrl+C
   * @param {string[]} [options.history] - Command history
   */
  constructor(term, options = {}) {
    this.term = term;
    this.onSubmit = options.onSubmit || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.history = options.history || [];
    this.historyIndex = this.history.length;

    this.line = '';
    this.cursor = 0;
    this.keyHandler = new KeyHandler(term);

    this.setupKeys();
  }

  /**
   * Setup key bindings
   */
  setupKeys() {
    // Submit on Enter
    this.keyHandler.on('enter', () => {
      this.term.writeln('');
      const line = this.line;
      this.line = '';
      this.cursor = 0;
      this.onSubmit(line);
    });

    // Cancel on Ctrl+C
    this.keyHandler.on('ctrl+c', () => {
      this.term.writeln('^C');
      this.line = '';
      this.cursor = 0;
      this.onCancel();
    });

    // History navigation
    this.keyHandler.on('up', () => {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.setLine(this.history[this.historyIndex]);
      }
    });

    this.keyHandler.on('down', () => {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.setLine(this.history[this.historyIndex]);
      } else if (this.historyIndex === this.history.length - 1) {
        this.historyIndex = this.history.length;
        this.setLine('');
      }
    });

    // Cursor movement
    this.keyHandler.on('left', () => {
      if (this.cursor > 0) {
        this.cursor--;
        this.term.write('\x1b[D');
      }
    });

    this.keyHandler.on('right', () => {
      if (this.cursor < this.line.length) {
        this.cursor++;
        this.term.write('\x1b[C');
      }
    });

    this.keyHandler.on('home', () => {
      this.term.write(`\x1b[${this.cursor}D`);
      this.cursor = 0;
    });

    this.keyHandler.on('end', () => {
      const move = this.line.length - this.cursor;
      if (move > 0) {
        this.term.write(`\x1b[${move}C`);
      }
      this.cursor = this.line.length;
    });

    // Backspace
    this.keyHandler.on('backspace', () => {
      if (this.cursor > 0) {
        this.line = this.line.slice(0, this.cursor - 1) + this.line.slice(this.cursor);
        this.cursor--;
        this.redraw();
      }
    });

    // Delete
    this.keyHandler.on('delete', () => {
      if (this.cursor < this.line.length) {
        this.line = this.line.slice(0, this.cursor) + this.line.slice(this.cursor + 1);
        this.redraw();
      }
    });

    // Printable characters
    this.keyHandler.onDefault(data => {
      if (KeyHandler.isPrintable(data)) {
        this.line = this.line.slice(0, this.cursor) + data + this.line.slice(this.cursor);
        this.cursor++;
        this.redraw();
      }
    });
  }

  /**
   * Set current line
   */
  setLine(line) {
    // Clear current line
    this.term.write('\r\x1b[K');
    this.term.write(line);
    this.line = line;
    this.cursor = line.length;
  }

  /**
   * Redraw current line
   */
  redraw() {
    // Save cursor position
    const savedCursor = this.cursor;

    // Clear line and redraw
    this.term.write('\r\x1b[K');
    this.term.write(this.line);

    // Restore cursor position
    const move = this.line.length - savedCursor;
    if (move > 0) {
      this.term.write(`\x1b[${move}D`);
    }
  }

  /**
   * Start editing
   */
  start() {
    this.keyHandler.start();
  }

  /**
   * Stop editing
   */
  stop() {
    this.keyHandler.stop();
  }
}
