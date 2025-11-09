/**
 * Koma Tab Manager
 * Handles multiple terminal tabs with independent shell sessions
 */

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Shell } from '../shell.js';
import { registerBuiltins } from '../commands.js';

const STORAGE_KEY = 'koma:tabs';

export class TabManager {
  constructor(terminalConfig) {
    this.terminalConfig = terminalConfig;
    this.tabs = new Map();
    this.activeTabId = null;
    this.nextTabId = 1;
    this.commandMode = false;

    // DOM elements
    this.tabsContainer = document.querySelector('.tabs');
    this.terminalContainer = document.getElementById('terminal');
    this.statusBar = document.querySelector('.status-bar');

    // Bind event handlers
    this.setupEventHandlers();

    // Load persisted tabs or create first tab
    this.loadTabs();
  }

  /**
   * Create a new tab
   */
  createTab(name = null, restoreState = null, tabId = null) {
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
    registerBuiltins(shell, this);

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
      inputHandler: null,
    });

    // Switch to the new tab
    this.switchTab(tabId);

    // Get the tab we just created
    const createdTab = this.tabs.get(tabId);

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
        }
        return;
      } else if (data === '\x1b[B') { // Down arrow
        const next = tab.shell.historyNext();
        if (next !== null) {
          tab.terminal.write('\r\x1b[K');
          tab.shell.writePrompt();
          tab.terminal.write(next);
          tab.currentLine = next;
        }
        return;
      }

      // Handle special keys
      if (code === 13) { // Enter
        tab.terminal.write('\r\n');
        if (tab.currentLine.trim()) {
          tab.shell.execute(tab.currentLine.trim()).then(() => {
            tab.shell.writePrompt();
            this.updateStatusBar();
          });
        } else {
          tab.shell.writePrompt();
        }
        tab.currentLine = '';
      } else if (code === 127) { // Backspace
        if (tab.currentLine.length > 0) {
          tab.currentLine = tab.currentLine.slice(0, -1);
          tab.terminal.write('\b \b');
        }
      } else if (code === 3) { // Ctrl+C
        tab.terminal.write('^C\r\n');
        tab.currentLine = '';
        tab.shell.writePrompt();
      } else if (code === 12) { // Ctrl+L
        // Clear screen and move cursor to home using ANSI escape codes
        tab.terminal.write('\x1b[2J\x1b[H');
        tab.shell.writePrompt();
        tab.terminal.write(tab.currentLine);
      } else if (code >= 32 && code <= 126) { // Printable characters
        tab.currentLine += data;
        tab.terminal.write(data);
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
}
