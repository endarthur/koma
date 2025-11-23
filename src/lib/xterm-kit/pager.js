/**
 * xterm-kit: Interactive Pager
 * less-like text viewer for terminal applications
 *
 * Features: navigation, search, percentage indicator, vim-like keys
 */

import { getTheme } from './themes.js';

/**
 * Interactive text pager (similar to less/more)
 */
export class Pager {
  /**
   * Create a pager instance
   * @param {object} term - xterm.js Terminal instance
   * @param {object} options - Configuration options
   * @param {number} [options.pageSize] - Lines per page (defaults to term.rows - 1)
   * @param {string} [options.prompt] - Custom prompt text
   * @param {boolean} [options.showPercent=true] - Show percentage in prompt
   * @param {boolean} [options.searchCaseSensitive=false] - Case-sensitive search
   * @param {object} [options.theme] - Theme override (uses global if not specified)
   */
  constructor(term, options = {}) {
    this.term = term;
    this.theme = options.theme || getTheme();
    this.options = {
      pageSize: options.pageSize || (term.rows - 1),
      prompt: options.prompt || null,  // null = use theme default
      showPercent: options.showPercent ?? true,
      searchCaseSensitive: options.searchCaseSensitive ?? false,
    };

    this.lines = [];
    this.currentLine = 0;
    this.searchTerm = null;
    this.searchMatches = [];
    this.currentMatch = 0;

    this.inputBuffer = '';
    this.mode = 'view'; // 'view' or 'search'
    this.disposable = null;
    this.cursorSaved = false;
  }

  /**
   * Show content in pager
   * @param {string|string[]} content - Content to display (string or array of lines)
   * @returns {Promise<void>} Resolves when user quits pager
   */
  async show(content) {
    // Parse content into lines
    this.lines = Array.isArray(content)
      ? content
      : content.split('\n');

    this.currentLine = 0;

    // If content fits on one screen, just display it and return
    if (this.lines.length <= this.options.pageSize) {
      this.lines.forEach(line => this.term.writeln(line));
      return;
    }

    // Enter pager mode
    this.render();
    return this.handleInput();
  }

  /**
   * Render current page
   */
  render() {
    // Clear screen and move cursor to home
    this.term.write('\x1b[2J\x1b[H');

    // Render visible lines
    const endLine = Math.min(
      this.currentLine + this.options.pageSize,
      this.lines.length
    );

    for (let i = this.currentLine; i < endLine; i++) {
      const line = this.lines[i];

      // Highlight search matches
      if (this.searchMatches.includes(i)) {
        this.term.writeln(this.highlightLine(line));
      } else {
        this.term.writeln(line);
      }
    }

    // Show prompt
    this.showPrompt();
  }

  /**
   * Show bottom prompt with status
   */
  showPrompt() {
    const percent = Math.round((this.currentLine / this.lines.length) * 100);
    const atEnd = this.currentLine + this.options.pageSize >= this.lines.length;

    let prompt;

    if (atEnd) {
      prompt = this.theme.pager.prompt.replace('-- More --', '(END)');
    } else if (this.options.showPercent) {
      const basePrompt = this.options.prompt || '-- More --';
      const percentText = this.theme.pager.percent ?
        this.theme.pager.percent(` ${percent}%`) :
        ` ${percent}%`;

      // Extract color codes from theme prompt
      if (this.theme.pager.prompt.includes('\x1b[')) {
        const colorStart = this.theme.pager.prompt.match(/^(\x1b\[[^m]+m)/)?.[1] || '';
        const colorEnd = '\x1b[0m';
        prompt = `${colorStart}${basePrompt}${percentText}${colorEnd}`;
      } else {
        prompt = `${basePrompt}${percentText}`;
      }
    } else {
      prompt = this.options.prompt || this.theme.pager.prompt;
    }

    this.term.write(prompt);
  }

  /**
   * Handle user input
   * @returns {Promise<void>}
   */
  handleInput() {
    return new Promise((resolve) => {
      this.disposable = this.term.onData(data => {
        if (this.mode === 'search') {
          this.handleSearchInput(data, resolve);
        } else {
          this.handleViewInput(data, resolve);
        }
      });
    });
  }

  /**
   * Handle input in view mode
   */
  handleViewInput(data, resolve) {
    const key = data.toLowerCase();
    const upperData = data; // Preserve case for G vs g

    switch (key) {
      case 'q':           // Quit
      case '\x1b':        // Escape
        this.quit(resolve);
        break;

      case ' ':           // Page down
      case '\x1b[6~':     // Page Down key
      case 'f':           // Forward (less keybinding)
        this.pageDown();
        break;

      case 'b':           // Page up
      case '\x1b[5~':     // Page Up key
        this.pageUp();
        break;

      case 'j':           // Line down (vim-style)
      case '\x1b[B':      // Down arrow
      case '\r':          // Enter
        this.lineDown();
        break;

      case 'k':           // Line up (vim-style)
      case '\x1b[A':      // Up arrow
        this.lineUp();
        break;

      case 'd':           // Half page down (vim-style)
        this.halfPageDown();
        break;

      case 'u':           // Half page up (vim-style)
        this.halfPageUp();
        break;

      case 'g':           // Go to start
      case '\x1b[H':      // Home key
        if (upperData === 'g') {
          this.goToStart();
        }
        break;

      case '/':           // Search
        this.enterSearchMode();
        break;

      case 'n':           // Next search match
        this.nextMatch();
        break;

      case 'h':           // Help
      case '?':
        this.showHelp();
        break;
    }

    // Handle uppercase G separately
    if (upperData === 'G' || data === '\x1b[F') {
      this.goToEnd();
    }

    // Handle uppercase N separately
    if (upperData === 'N') {
      this.prevMatch();
    }
  }

  /**
   * Handle input in search mode
   */
  handleSearchInput(data, resolve) {
    if (data === '\r') {
      // Execute search
      this.executeSearch();
      this.mode = 'view';
      this.render();
    } else if (data === '\x1b') {
      // Cancel search
      this.mode = 'view';
      this.inputBuffer = '';
      this.render();
    } else if (data === '\x7f' || data === '\x08') {
      // Backspace
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      this.updateSearchPrompt();
    } else if (data.charCodeAt(0) >= 32 && data.charCodeAt(0) <= 126) {
      // Printable characters only
      this.inputBuffer += data;
      this.updateSearchPrompt();
    }
  }

  /**
   * Page down
   */
  pageDown() {
    const newLine = this.currentLine + this.options.pageSize;
    if (newLine < this.lines.length) {
      this.currentLine = Math.min(newLine, this.lines.length - this.options.pageSize);
      this.render();
    }
  }

  /**
   * Page up
   */
  pageUp() {
    const newLine = this.currentLine - this.options.pageSize;
    this.currentLine = Math.max(0, newLine);
    this.render();
  }

  /**
   * Half page down
   */
  halfPageDown() {
    const halfPage = Math.floor(this.options.pageSize / 2);
    const newLine = this.currentLine + halfPage;
    if (newLine < this.lines.length) {
      this.currentLine = Math.min(newLine, this.lines.length - this.options.pageSize);
      this.render();
    }
  }

  /**
   * Half page up
   */
  halfPageUp() {
    const halfPage = Math.floor(this.options.pageSize / 2);
    const newLine = this.currentLine - halfPage;
    this.currentLine = Math.max(0, newLine);
    this.render();
  }

  /**
   * Line down
   */
  lineDown() {
    if (this.currentLine + this.options.pageSize < this.lines.length) {
      this.currentLine++;
      this.render();
    }
  }

  /**
   * Line up
   */
  lineUp() {
    if (this.currentLine > 0) {
      this.currentLine--;
      this.render();
    }
  }

  /**
   * Go to start
   */
  goToStart() {
    this.currentLine = 0;
    this.render();
  }

  /**
   * Go to end
   */
  goToEnd() {
    this.currentLine = Math.max(0, this.lines.length - this.options.pageSize);
    this.render();
  }

  /**
   * Enter search mode
   */
  enterSearchMode() {
    this.mode = 'search';
    this.inputBuffer = '';
    this.updateSearchPrompt();
  }

  /**
   * Update search prompt
   */
  updateSearchPrompt() {
    // Clear prompt line and show search input
    this.term.write('\r\x1b[K');
    this.term.write(`/${this.inputBuffer}`);
  }

  /**
   * Execute search
   */
  executeSearch() {
    const term = this.inputBuffer;
    if (!term) return;

    this.searchTerm = this.options.searchCaseSensitive
      ? term
      : term.toLowerCase();

    // Find all matches
    this.searchMatches = [];
    this.lines.forEach((line, idx) => {
      const searchLine = this.options.searchCaseSensitive
        ? line
        : line.toLowerCase();

      if (searchLine.includes(this.searchTerm)) {
        this.searchMatches.push(idx);
      }
    });

    // Jump to first match after current line
    if (this.searchMatches.length > 0) {
      const nextMatch = this.searchMatches.find(m => m >= this.currentLine);
      if (nextMatch !== undefined) {
        this.currentLine = nextMatch;
        this.currentMatch = this.searchMatches.indexOf(nextMatch);
      } else {
        // Wrap around to first match
        this.currentLine = this.searchMatches[0];
        this.currentMatch = 0;
      }
    }

    this.inputBuffer = '';
  }

  /**
   * Next search match
   */
  nextMatch() {
    if (this.searchMatches.length === 0) return;

    this.currentMatch = (this.currentMatch + 1) % this.searchMatches.length;
    this.currentLine = this.searchMatches[this.currentMatch];
    this.render();
  }

  /**
   * Previous search match
   */
  prevMatch() {
    if (this.searchMatches.length === 0) return;

    this.currentMatch = (this.currentMatch - 1 + this.searchMatches.length)
      % this.searchMatches.length;
    this.currentLine = this.searchMatches[this.currentMatch];
    this.render();
  }

  /**
   * Highlight search term in line
   */
  highlightLine(line) {
    if (!this.searchTerm) return line;

    const searchLine = this.options.searchCaseSensitive
      ? line
      : line.toLowerCase();

    const idx = searchLine.indexOf(this.searchTerm);
    if (idx === -1) return line;

    const before = line.slice(0, idx);
    const match = line.slice(idx, idx + this.searchTerm.length);
    const after = line.slice(idx + this.searchTerm.length);

    return `${before}${this.theme.pager.searchHighlight(match)}${after}`;
  }

  /**
   * Show help
   */
  showHelp() {
    this.term.write('\x1b[2J\x1b[H');
    this.term.writeln('PAGER KEYBINDINGS:');
    this.term.writeln('');
    this.term.writeln('  Navigation:');
    this.term.writeln('    Space, f, PgDn     Page down');
    this.term.writeln('    b, PgUp            Page up');
    this.term.writeln('    d                  Half page down');
    this.term.writeln('    u                  Half page up');
    this.term.writeln('    j, Down, Enter     Line down');
    this.term.writeln('    k, Up              Line up');
    this.term.writeln('    g, Home            Go to start');
    this.term.writeln('    G, End             Go to end');
    this.term.writeln('');
    this.term.writeln('  Search:');
    this.term.writeln('    /                  Start search');
    this.term.writeln('    n                  Next match');
    this.term.writeln('    N                  Previous match');
    this.term.writeln('');
    this.term.writeln('  Control:');
    this.term.writeln('    q, Esc             Quit pager');
    this.term.writeln('    h, ?               Show this help');
    this.term.writeln('');
    this.term.write('\x1b[7mPress any key to continue\x1b[0m');

    // Wait for any key, then return to content
    const tempDisposable = this.term.onData(() => {
      tempDisposable.dispose();
      this.render();
    });
  }

  /**
   * Quit pager
   */
  quit(resolve) {
    // Clean up
    if (this.disposable) {
      this.disposable.dispose();
    }

    // Clear prompt line
    this.term.write('\r\x1b[K');

    resolve();
  }
}
