/**
 * Koma Tab Manager
 * Handles multiple terminal tabs with independent shell sessions
 */

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Shell } from '../shell.js';
import { registerBuiltins } from '../commands/index.js';

const STORAGE_KEY = 'koma:tabs';

export class TabManager {
  constructor(terminalConfig, editor = null) {
    this.terminalConfig = terminalConfig;
    this.editor = editor;
    this.tabs = new Map();
    this.activeTabId = null;
    this.nextTabId = 1;
    this.commandMode = false;

    // Tab completion state
    this.lastTabCompletionTime = 0;
    this.tabCompletionDebounce = 150; // ms

    // DOM elements
    this.tabsContainer = document.querySelector('.tabs');
    this.terminalContainer = document.getElementById('terminal');
    this.statusBar = document.querySelector('.status-bar');

    // Bind event handlers
    this.setupEventHandlers();

    // Set up terminal copy/paste
    this.setupCopyPaste();

    // Load persisted tabs or create first tab
    this.loadTabs();
  }

  /**
   * Create a new tab
   */
  async createTab(name = null, restoreState = null, tabId = null) {
    // Use provided ID (for restoration) or generate new one
    if (tabId === null) {
      tabId = this.nextTabId++;
    }
    const tabName = name || `${tabId}:main`;

    // Create terminal instance
    const term = new Terminal(this.terminalConfig);
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Create shell instance
    const shell = new Shell(term);
    registerBuiltins(shell, this, this.editor);

    // Restore state if provided
    if (restoreState) {
      shell.setState(restoreState);
    }

    // Create tab DOM element
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.id = tabId;
    tabElement.innerHTML = `<span class="tab-name">${tabName}</span>`;
    tabElement.addEventListener('click', () => this.switchTab(tabId));

    // Insert before the "new tab" button
    const newTabButton = this.tabsContainer.querySelector('.new-tab');
    this.tabsContainer.insertBefore(tabElement, newTabButton);

    // Store tab data
    this.tabs.set(tabId, {
      id: tabId,
      name: tabName,
      element: tabElement,
      terminal: term,
      fitAddon,
      shell,
      currentLine: '',
      cursorPos: 0, // Position within currentLine
      inputHandler: null,
    });

    // Switch to the new tab
    this.switchTab(tabId);

    // Get the tab we just created
    const createdTab = this.tabs.get(tabId);

    // Load .komarc for new tabs (not restored ones)
    // This runs AFTER tab is visible but BEFORE welcome message
    if (!restoreState) {
      await this.loadKomarc(shell);
    }

    // Write welcome message and prompt for new tabs (not restored)
    if (!restoreState) {
      createdTab.terminal.writeln('\x1b[38;5;208mKoma Terminal v0.1\x1b[0m');
      createdTab.terminal.writeln('Type \x1b[1mhelp\x1b[0m for available commands\n');
      createdTab.shell.writePrompt();
    } else {
      // For restored tabs, just write the prompt
      createdTab.shell.writePrompt();
    }

    // Update status bar to show hint
    this.updateStatusBar();

    // Save tabs
    this.saveTabs();

    return tabId;
  }

  /**
   * Switch to a specific tab
   */
  switchTab(tabId) {
    if (!this.tabs.has(tabId)) return;

    // Deactivate current tab
    if (this.activeTabId !== null && this.tabs.has(this.activeTabId)) {
      const currentTab = this.tabs.get(this.activeTabId);
      currentTab.element.classList.remove('active');

      // Detach terminal
      if (currentTab.inputHandler) {
        currentTab.inputHandler.dispose();
      }
    }

    // Activate new tab
    const tab = this.tabs.get(tabId);
    tab.element.classList.add('active');
    this.activeTabId = tabId;

    // Clear and attach terminal
    this.terminalContainer.innerHTML = '';
    tab.terminal.open(this.terminalContainer);
    tab.fitAddon.fit();

    // Dispose existing input handler if any, then set up new one
    if (tab.inputHandler) {
      tab.inputHandler.dispose();
    }
    tab.inputHandler = this.setupInputHandler(tab);

    // Update status bar
    this.updateStatusBar();

    // Focus terminal
    tab.terminal.focus();

    // Save tabs
    this.saveTabs();
  }

  /**
   * Close a tab
   */
  closeTab(tabId) {
    if (!this.tabs.has(tabId)) return;
    if (this.tabs.size === 1) {
      // Don't close the last tab
      return;
    }

    const tab = this.tabs.get(tabId);

    // Remove DOM element
    tab.element.remove();

    // Dispose terminal
    if (tab.inputHandler) {
      tab.inputHandler.dispose();
    }
    tab.terminal.dispose();

    // Remove from map
    this.tabs.delete(tabId);

    // Switch to another tab if this was active
    if (this.activeTabId === tabId) {
      const remainingTabId = this.tabs.keys().next().value;
      this.switchTab(remainingTabId);
    }

    // Save tabs
    this.saveTabs();
  }

  /**
   * Get current active tab
   */
  getActiveTab() {
    return this.tabs.get(this.activeTabId);
  }

  /**
   * Switch to next tab
   */
  nextTab() {
    const tabIds = Array.from(this.tabs.keys());
    const currentIndex = tabIds.indexOf(this.activeTabId);
    const nextIndex = (currentIndex + 1) % tabIds.length;
    this.switchTab(tabIds[nextIndex]);
  }

  /**
   * Switch to previous tab
   */
  previousTab() {
    const tabIds = Array.from(this.tabs.keys());
    const currentIndex = tabIds.indexOf(this.activeTabId);
    const prevIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
    this.switchTab(tabIds[prevIndex]);
  }

  /**
   * Set up input handler for a tab
   */
  setupInputHandler(tab) {
    return tab.terminal.onData(data => {
      const code = data.charCodeAt(0);

      // Handle interactive input mode (readLine)
      if (tab.shell.inputMode === 'command-read') {
        if (code === 13) { // Enter
          tab.terminal.write('\r\n');
          const input = tab.shell.inputBuffer;
          tab.shell.inputMode = 'normal';
          tab.shell.inputBuffer = '';
          if (tab.shell.inputResolver) {
            tab.shell.inputResolver(input);
            tab.shell.inputResolver = null;
          }
          return;
        } else if (code === 127) { // Backspace
          if (tab.shell.inputBuffer.length > 0) {
            tab.shell.inputBuffer = tab.shell.inputBuffer.slice(0, -1);
            tab.terminal.write('\b \b');
          }
          return;
        } else if (code === 3) { // Ctrl+C
          tab.terminal.write('^C\r\n');
          tab.shell.inputMode = 'normal';
          tab.shell.inputBuffer = '';
          if (tab.shell.inputResolver) {
            tab.shell.inputResolver(null); // Signal cancellation
            tab.shell.inputResolver = null;
          }
          tab.shell.writePrompt();
          return;
        } else if (code >= 32 && code <= 126) { // Printable characters
          tab.shell.inputBuffer += data;
          tab.terminal.write(data);
          return;
        }
        // Ignore other keys in read mode
        return;
      }

      // Handle Ctrl+K: Enter command mode
      if (code === 11) { // Ctrl+K
        this.enterCommandMode();
        return;
      }

      // Handle Esc: Exit command mode
      if (code === 27 && this.commandMode) { // Esc
        this.exitCommandMode();
        return;
      }

      // Handle F2 - Toggle to editor (F2 sends escape sequence \x1bOQ)
      if (data === '\x1bOQ' || data === '\x1b[12~') {
        // Only toggle to editor if terminal is visible and file is open
        if (this.editor && this.editor.currentFile && this.editor.editorViewEl.hidden) {
          this.editor.showEditor();
        }
        return;
      }

      // Handle command mode single-key commands
      if (this.commandMode) {
        switch (data) {
          case 'n': // Next tab
            this.nextTab();
            this.exitCommandMode();
            return;
          case 'p': // Previous tab
            this.previousTab();
            this.exitCommandMode();
            return;
          case 't': // New tab
            this.createTab();
            this.exitCommandMode();
            return;
          case 'w': // Close tab
            this.closeTab(this.activeTabId);
            this.exitCommandMode();
            return;
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9': {
            const tabIndex = parseInt(data) - 1;
            const tabIds = Array.from(this.tabs.keys());
            if (tabIndex < tabIds.length) {
              this.switchTab(tabIds[tabIndex]);
            }
            this.exitCommandMode();
            return;
          }
        }
        // If we get here, unknown command, just exit command mode
        this.exitCommandMode();
        return;
      }

      // Handle ANSI escape sequences (arrow keys)
      if (data === '\x1b[A') { // Up arrow
        const prev = tab.shell.historyPrevious();
        if (prev !== null) {
          tab.terminal.write('\r\x1b[K');
          tab.shell.writePrompt();
          tab.terminal.write(prev);
          tab.currentLine = prev;
          tab.cursorPos = prev.length;
        }
        return;
      } else if (data === '\x1b[B') { // Down arrow
        const next = tab.shell.historyNext();
        if (next !== null) {
          tab.terminal.write('\r\x1b[K');
          tab.shell.writePrompt();
          tab.terminal.write(next);
          tab.currentLine = next;
          tab.cursorPos = next.length;
        }
        return;
      } else if (data === '\x1b[C') { // Right arrow
        if (tab.cursorPos < tab.currentLine.length) {
          tab.cursorPos++;
          tab.terminal.write('\x1b[C'); // Move cursor right
        }
        return;
      } else if (data === '\x1b[D') { // Left arrow
        if (tab.cursorPos > 0) {
          tab.cursorPos--;
          tab.terminal.write('\x1b[D'); // Move cursor left
        }
        return;
      } else if (data === '\x1b[H' || data === '\x1b[1~') { // Home
        if (tab.cursorPos > 0) {
          // Move cursor to beginning of line
          tab.terminal.write(`\x1b[${tab.cursorPos}D`);
          tab.cursorPos = 0;
        }
        return;
      } else if (data === '\x1b[F' || data === '\x1b[4~') { // End
        if (tab.cursorPos < tab.currentLine.length) {
          const distance = tab.currentLine.length - tab.cursorPos;
          tab.terminal.write(`\x1b[${distance}C`);
          tab.cursorPos = tab.currentLine.length;
        }
        return;
      } else if (data === '\x1b[3~') { // Delete key
        if (tab.cursorPos < tab.currentLine.length) {
          // Delete character at cursor
          tab.currentLine = tab.currentLine.slice(0, tab.cursorPos) +
                           tab.currentLine.slice(tab.cursorPos + 1);
          // Redraw from cursor to end
          const rest = tab.currentLine.slice(tab.cursorPos);
          tab.terminal.write(rest + ' \x1b[' + (rest.length + 1) + 'D');
        }
        return;
      }

      // Handle Tab - Tab completion
      if (code === 9) { // Tab
        this.handleTabCompletion(tab);
        return;
      }

      // Handle special keys
      if (code === 13) { // Enter
        tab.terminal.write('\r\n');
        if (tab.currentLine.trim()) {
          tab.shell.execute(tab.currentLine.trim())
            .catch(error => {
              // This should never happen since execute() has its own try/catch,
              // but we handle it just in case to prevent terminal lockup
              tab.terminal.writeln(`\x1b[31mUnexpected error: ${error.message}\x1b[0m`);
              console.error('Unhandled error in command execution:', error);
            })
            .finally(() => {
              // Always write prompt, even if there was an error
              tab.shell.writePrompt();
              this.updateStatusBar();
              // Save tabs to persist command history
              try {
                this.saveTabs();
              } catch (error) {
                console.error('[Koma] Failed to save tabs:', error);
              }
            });
        } else {
          tab.shell.writePrompt();
        }
        tab.currentLine = '';
        tab.cursorPos = 0;
      } else if (code === 127) { // Backspace
        if (tab.cursorPos > 0) {
          // Delete character before cursor
          tab.currentLine = tab.currentLine.slice(0, tab.cursorPos - 1) +
                           tab.currentLine.slice(tab.cursorPos);
          tab.cursorPos--;
          // Redraw from cursor to end
          const rest = tab.currentLine.slice(tab.cursorPos);
          tab.terminal.write('\b' + rest + ' \x1b[' + (rest.length + 1) + 'D');
        }
      } else if (code === 3) { // Ctrl+C
        tab.terminal.write('^C\r\n');
        tab.currentLine = '';
        tab.cursorPos = 0;
        tab.shell.writePrompt();
      } else if (code === 12) { // Ctrl+L
        // Clear screen and move cursor to home using ANSI escape codes
        tab.terminal.write('\x1b[2J\x1b[H');
        tab.shell.writePrompt();
        tab.terminal.write(tab.currentLine);
        // Move cursor to correct position
        if (tab.cursorPos < tab.currentLine.length) {
          const distance = tab.currentLine.length - tab.cursorPos;
          tab.terminal.write(`\x1b[${distance}D`);
        }
      } else if (code >= 32 && code <= 126) { // Printable characters
        // Insert character at cursor position
        tab.currentLine = tab.currentLine.slice(0, tab.cursorPos) +
                         data +
                         tab.currentLine.slice(tab.cursorPos);
        tab.cursorPos++;
        // Redraw from cursor to end
        const rest = tab.currentLine.slice(tab.cursorPos - 1);
        tab.terminal.write(rest);
        // Move cursor back to correct position
        if (tab.cursorPos < tab.currentLine.length) {
          const distance = tab.currentLine.length - tab.cursorPos;
          tab.terminal.write(`\x1b[${distance}D`);
        }
      }
    });
  }

  /**
   * Update status bar with current tab info
   */
  updateStatusBar() {
    const tab = this.getActiveTab();
    if (!tab) return;

    const cwdElement = this.statusBar.querySelector('.cwd');
    if (cwdElement) {
      cwdElement.textContent = tab.shell.cwd;
    }

    // Update hints based on command mode
    const hintsElement = this.statusBar.querySelector('.hints');
    if (hintsElement) {
      if (this.commandMode) {
        hintsElement.textContent = 'n:next p:prev t:new w:close 1-9:jump Esc:cancel';
        hintsElement.style.color = 'var(--accent-orange)';
      } else {
        hintsElement.textContent = 'Ctrl+K command mode';
        hintsElement.style.color = 'var(--text-tertiary)';
      }
    }
  }

  /**
   * Handle tab completion
   */
  async handleTabCompletion(tab) {
    // Debounce to prevent VFS spam
    const now = Date.now();
    if (now - this.lastTabCompletionTime < this.tabCompletionDebounce) {
      return;
    }
    this.lastTabCompletionTime = now;

    const line = tab.currentLine;
    const cursorPos = tab.cursorPos;

    // Get the word being completed (from last space to cursor)
    const beforeCursor = line.slice(0, cursorPos);
    const lastSpaceIndex = beforeCursor.lastIndexOf(' ');
    const wordStart = lastSpaceIndex + 1;
    const word = beforeCursor.slice(wordStart);

    // Determine if we're completing a command or a path
    const isCommand = wordStart === 0;

    let matches = [];

    if (isCommand) {
      // Complete command names
      const commands = Array.from(tab.shell.commands.keys());
      matches = commands.filter(cmd => cmd.startsWith(word)).sort();
    } else {
      // Complete file/directory paths
      matches = await this.getPathCompletions(tab.shell, word);
    }

    if (matches.length === 0) {
      // No matches, do nothing
      return;
    } else if (matches.length === 1) {
      // Single match - auto-complete
      const completion = matches[0];
      const toInsert = completion.slice(word.length);

      // Insert completion
      tab.currentLine = line.slice(0, cursorPos) + toInsert + line.slice(cursorPos);
      tab.terminal.write(toInsert);
      tab.cursorPos += toInsert.length;

      // Move cursor back if needed
      if (cursorPos < line.length) {
        const distance = line.length - cursorPos;
        tab.terminal.write(`\x1b[${distance}D`);
      }
    } else {
      // Multiple matches - show them
      tab.terminal.write('\r\n');
      const maxLength = Math.max(...matches.map(m => m.length));
      const columns = Math.floor(tab.terminal.cols / (maxLength + 2));

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i].padEnd(maxLength + 2);
        tab.terminal.write(match);

        if ((i + 1) % columns === 0 && i < matches.length - 1) {
          tab.terminal.write('\r\n');
        }
      }

      // Redraw prompt and current line
      tab.terminal.write('\r\n');
      tab.shell.writePrompt();
      tab.terminal.write(tab.currentLine);

      // Move cursor to correct position
      if (tab.cursorPos < tab.currentLine.length) {
        const distance = tab.currentLine.length - tab.cursorPos;
        tab.terminal.write(`\x1b[${distance}D`);
      }
    }
  }

  /**
   * Normalize a path by resolving . and .. segments
   */
  normalizePath(path) {
    const parts = path.split('/').filter(p => p && p !== '.');
    const normalized = [];

    for (const part of parts) {
      if (part === '..') {
        if (normalized.length > 0) {
          normalized.pop();
        }
      } else {
        normalized.push(part);
      }
    }

    return normalized.length === 0 ? '/' : '/' + normalized.join('/');
  }

  /**
   * Get path completions from VFS
   */
  async getPathCompletions(shell, word) {
    try {
      const kernel = await this.getKernel();

      // Determine directory to search and prefix to match
      let searchDir, prefix;

      if (word.includes('/')) {
        // Has path separator
        const lastSlash = word.lastIndexOf('/');
        const dirPart = word.slice(0, lastSlash + 1);
        prefix = word.slice(lastSlash + 1);

        // Resolve directory path
        if (dirPart.startsWith('/')) {
          // Absolute path
          searchDir = this.normalizePath(dirPart);
        } else {
          // Relative path - join with cwd and normalize
          const joined = shell.cwd === '/' ? `/${dirPart}` : `${shell.cwd}/${dirPart}`;
          searchDir = this.normalizePath(joined);
        }
      } else {
        // No path separator - search current directory
        searchDir = shell.cwd;
        prefix = word;
      }

      // Read directory
      const entries = await kernel.readdir(searchDir);
      const matches = entries
        .filter(entry => entry.name.startsWith(prefix))
        .map(entry => {
          const fullPath = word.slice(0, word.lastIndexOf('/') + 1) + entry.name;
          // Add trailing slash for directories
          return entry.type === 'directory' ? fullPath + '/' : fullPath;
        })
        .sort();

      return matches;
    } catch (error) {
      // Directory doesn't exist or can't be read
      return [];
    }
  }

  /**
   * Get kernel (helper to avoid importing kernelClient)
   */
  async getKernel() {
    const { kernelClient } = await import('../kernel/client.js');
    return await kernelClient.getKernel();
  }

  /**
   * Enter command mode
   */
  enterCommandMode() {
    this.commandMode = true;
    this.updateStatusBar();
  }

  /**
   * Exit command mode
   */
  exitCommandMode() {
    this.commandMode = false;
    this.updateStatusBar();
  }

  /**
   * Set up event handlers for tab controls
   */
  setupEventHandlers() {
    // New tab button
    const newTabButton = this.tabsContainer.querySelector('.new-tab');
    newTabButton.addEventListener('click', () => this.createTab());

    // Window resize
    window.addEventListener('resize', () => {
      const tab = this.getActiveTab();
      if (tab) {
        tab.fitAddon.fit();
      }
    });
  }

  /**
   * Set up copy/paste with right-click
   */
  setupCopyPaste() {
    this.terminalContainer.addEventListener('contextmenu', async (e) => {
      // Ctrl+right-click: show browser context menu
      if (e.ctrlKey || e.metaKey) {
        return; // Let browser handle it
      }

      e.preventDefault();

      const tab = this.getActiveTab();
      if (!tab) return;

      const terminal = tab.terminal;

      // Check if there's a selection
      if (terminal.hasSelection()) {
        // Copy selected text to clipboard
        const selectedText = terminal.getSelection();
        try {
          await navigator.clipboard.writeText(selectedText);
          console.log('[Koma] Copied to clipboard');
        } catch (error) {
          console.error('[Koma] Failed to copy to clipboard:', error);
        }
        // Clear selection after copy
        terminal.clearSelection();
      } else {
        // Paste from clipboard
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            // Add to current line instead of writing directly
            tab.currentLine = tab.currentLine.slice(0, tab.cursorPos) +
                             text +
                             tab.currentLine.slice(tab.cursorPos);
            // Write the pasted text
            terminal.write(text);
            tab.cursorPos += text.length;
          }
        } catch (error) {
          console.error('[Koma] Failed to paste from clipboard:', error);
        }
      }
    });
  }

  /**
   * Save tabs to localStorage
   */
  saveTabs() {
    const tabsData = Array.from(this.tabs.values()).map(tab => ({
      id: tab.id,
      name: tab.name,
      state: tab.shell.getState(),
    }));

    const data = {
      tabs: tabsData,
      activeTabId: this.activeTabId,
      nextTabId: this.nextTabId,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Load tabs from localStorage
   */
  loadTabs() {
    // Clear any existing tabs first
    this.tabs.clear();
    this.tabsContainer.querySelectorAll('.tab').forEach(el => el.remove());

    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const data = JSON.parse(saved);

        // Restore tabs with their original IDs
        if (data.tabs && data.tabs.length > 0) {
          data.tabs.forEach(tabData => {
            this.createTab(tabData.name, tabData.state, tabData.id);
          });

          // Set nextTabId to one past the highest restored ID
          this.nextTabId = data.nextTabId || (Math.max(...data.tabs.map(t => t.id)) + 1);

          // Restore active tab
          if (data.activeTabId && this.tabs.has(data.activeTabId)) {
            this.switchTab(data.activeTabId);
          }

          return;
        }
      } catch (error) {
        console.error('Failed to restore tabs:', error);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Create first tab if none exist
    if (this.tabs.size === 0) {
      this.createTab();
    }
  }

  /**
   * Load and execute .komarc if it exists
   * Silently ignores if file doesn't exist
   */
  async loadKomarc(shell) {
    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();
      const komaRcPath = '/home/.komarc';

      // Try to read .komarc
      const content = await kernel.readFile(komaRcPath);

      // Execute like a shell script
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));

      // Execute each line
      for (const line of lines) {
        try {
          await shell.execute(line);
        } catch (error) {
          // Log errors but continue executing
          console.error('[.komarc]', `Error executing: ${line}`, error);
        }
      }
    } catch (error) {
      // Silently ignore if .komarc doesn't exist
      if (!error.message.includes('ENOENT')) {
        console.error('[.komarc]', error);
      }
    }
  }
}
