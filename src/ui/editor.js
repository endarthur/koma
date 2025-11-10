/**
 * Koma Editor - CodeMirror 6 integration with Vim mode
 */

import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands';
// Language support disabled - causes CDN dependency conflicts
// import { javascript } from '@codemirror/lang-javascript';
// import { markdown } from '@codemirror/lang-markdown';
// import { json } from '@codemirror/lang-json';
// import { vim } from '@replit/codemirror-vim';
import { kernelClient } from '../kernel/client.js';
import { activityLED } from './activity-led.js';

export class Editor {
  constructor() {
    this.view = null;
    this.currentFile = null;
    this.isDirty = false;
    this.container = document.getElementById('codemirror-container');
    this.editorViewEl = document.getElementById('editor-view');
    this.terminalViewEl = document.getElementById('terminal-view');
    this.filenameEl = document.querySelector('.filename');
    this.editorStatusEl = document.querySelector('.editor-status');

    // Initialize CodeMirror
    this.initializeEditor();

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Initialize status bar
    this.updateEditorStatus();
  }

  /**
   * Initialize CodeMirror editor (Vim mode disabled due to CDN issues)
   */
  initializeEditor() {
    const extensions = [
      // vim(), // Disabled - causes CDN dependency conflicts
      history(), // Enable undo/redo
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.markDirty();
        }
      }),
      // Koma theme
      EditorView.theme({
        '&': {
          backgroundColor: '#1a1a1a',
          color: '#e0e0e0',
          height: '100%',
          fontSize: '13px',
          fontFamily: "'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
        },
        '.cm-content': {
          caretColor: '#ff6b35',
        },
        '.cm-cursor, .cm-dropCursor': {
          borderLeftColor: '#ff6b35',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
          backgroundColor: 'rgba(255, 107, 53, 0.3)',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
        '.cm-gutters': {
          backgroundColor: '#1a1a1a',
          color: '#666666',
          border: 'none',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
      }, { dark: true }),
    ];

    this.view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions,
      }),
      parent: this.container,
    });

    // Vim mode disabled - no commands to set up
  }

  /**
   * Set up Vim command handlers (disabled - Vim mode not available)
   */
  setupVimCommands() {
    // Vim mode disabled due to CDN dependency conflicts
    // Use Ctrl+S to save, Ctrl+W to close, Ctrl+` to toggle
  }

  /**
   * Set up global keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + ` OR F2 - Toggle terminal/editor
      if (((e.ctrlKey || e.metaKey) && e.key === '`') || e.key === 'F2') {
        e.preventDefault();
        this.toggleView();
      }

      // Ctrl/Cmd + S - Save (when editor is visible)
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !this.editorViewEl.hidden) {
        e.preventDefault();
        this.saveFile();
      }

      // Escape - Close editor (when editor is visible)
      if (e.key === 'Escape' && !this.editorViewEl.hidden) {
        e.preventDefault();
        if (this.isDirty) {
          this.showConfirmModal(
            'Unsaved Changes',
            'File has unsaved changes. Close anyway?',
            'Close',
            'Cancel'
          ).then(confirmed => {
            if (confirmed) {
              this.closeEditor();
            }
          });
        } else {
          this.closeEditor();
        }
      }
    });
  }

  /**
   * Open a file in the editor
   */
  async openFile(path, force = false) {
    // Check for unsaved changes
    if (!force && this.currentFile && this.isDirty) {
      throw new Error('No write since last change (use -f or --force to override)');
    }

    try {
      activityLED.reading();
      const kernel = await kernelClient.getKernel();

      // Try to read the file, or start with empty content if it doesn't exist
      let content = '';
      try {
        content = await kernel.readFile(path);
      } catch (error) {
        // If file doesn't exist, start with empty content (we'll create it on save)
        if (error.message.includes('ENOENT')) {
          console.log(`[Editor] Creating new file: ${path}`);
          content = '';
        } else {
          throw error; // Re-throw other errors
        }
      }

      // Update editor state
      this.currentFile = path;
      this.isDirty = false;
      this.filenameEl.textContent = path;

      // Set content (syntax highlighting disabled due to CDN conflicts)
      const extensions = [
        // vim(), // Disabled
        history(), // Enable undo/redo
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.markDirty();
          }
        }),
        this.getTheme(),
      ];

      // Language support disabled - causes CDN dependency conflicts
      // const language = this.detectLanguage(path);
      // if (language) {
      //   extensions.push(language);
      // }

      this.view.setState(EditorState.create({
        doc: content,
        extensions,
      }));

      // Show editor
      this.showEditor();

      // Update status bar
      this.updateEditorStatus();

      activityLED.idle();
    } catch (error) {
      activityLED.error();
      throw new Error(`Cannot open file: ${error.message}`);
    }
  }

  /**
   * Save current file to VFS
   */
  async saveFile() {
    if (!this.currentFile) {
      this.showError('No file open');
      return;
    }

    try {
      activityLED.writing();
      const kernel = await kernelClient.getKernel();
      const content = this.view.state.doc.toString();
      await kernel.writeFile(this.currentFile, content);
      this.isDirty = false;
      this.updateFilename();
      this.updateEditorStatus();
      activityLED.idle();
      console.log(`[Editor] Saved ${this.currentFile}`);
    } catch (error) {
      activityLED.error();
      this.showError(`Save failed: ${error.message}`);
    }
  }

  /**
   * Close the editor and return to terminal
   */
  closeEditor() {
    this.currentFile = null;
    this.isDirty = false;
    this.updateEditorStatus();
    this.showTerminal();
  }

  /**
   * Show the editor view
   */
  showEditor() {
    this.terminalViewEl.hidden = true;
    this.editorViewEl.hidden = false;
    this.view.focus();
  }

  /**
   * Show the terminal view
   */
  showTerminal() {
    this.editorViewEl.hidden = true;
    this.terminalViewEl.hidden = false;

    // Focus the active terminal
    // The terminal element itself should already be in focus from the tab manager
    const terminalEl = document.getElementById('terminal');
    if (terminalEl && terminalEl.querySelector('.xterm-helper-textarea')) {
      terminalEl.querySelector('.xterm-helper-textarea').focus();
    }
  }

  /**
   * Toggle between terminal and editor
   */
  toggleView() {
    if (this.editorViewEl.hidden) {
      if (this.currentFile) {
        this.showEditor();
      }
    } else {
      this.showTerminal();
    }
  }

  /**
   * Mark file as having unsaved changes
   */
  markDirty() {
    if (!this.isDirty) {
      this.isDirty = true;
      this.updateFilename();
      this.updateEditorStatus();
    }
  }

  /**
   * Update filename display
   */
  updateFilename() {
    if (this.currentFile) {
      this.filenameEl.textContent = this.currentFile + (this.isDirty ? ' [+]' : '');
    }
  }

  /**
   * Detect language based on file extension
   */
  detectLanguage(path) {
    const ext = path.split('.').pop().toLowerCase();

    switch (ext) {
      case 'js':
      case 'mjs':
      case 'cjs':
        return javascript();
      case 'json':
        return json();
      case 'md':
      case 'markdown':
        return markdown();
      default:
        return null;
    }
  }

  /**
   * Get Koma theme for CodeMirror
   */
  getTheme() {
    return EditorView.theme({
      '&': {
        backgroundColor: '#1a1a1a',
        color: '#e0e0e0',
        height: '100%',
        fontSize: '13px',
        fontFamily: "'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
      },
      '.cm-content': {
        caretColor: '#ff6b35',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: '#ff6b35',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'rgba(255, 107, 53, 0.3)',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
      },
      '.cm-gutters': {
        backgroundColor: '#1a1a1a',
        color: '#666666',
        border: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
      },
    }, { dark: true });
  }

  /**
   * Show error in terminal (for Vim command errors)
   */
  showError(message) {
    // This is a bit hacky - we'll improve it later
    console.error(`[Editor] ${message}`);
    // TODO: Show error in terminal or status bar
  }

  /**
   * Show custom confirm modal
   * @returns {Promise<boolean>} true if confirmed, false if cancelled
   */
  showConfirmModal(title, message, confirmText = 'OK', cancelText = 'Cancel') {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'modal';

      // Modal header
      const header = document.createElement('div');
      header.className = 'modal-header';
      header.textContent = title;

      // Modal content
      const content = document.createElement('div');
      content.className = 'modal-content';
      content.textContent = message;

      // Modal buttons
      const buttons = document.createElement('div');
      buttons.className = 'modal-buttons';

      // Function to close modal and clean up
      const closeModal = (result) => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        document.removeEventListener('keydown', handleKeyboard);
        resolve(result);
      };

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'modal-button';
      cancelBtn.textContent = cancelText;
      cancelBtn.addEventListener('click', () => closeModal(false));

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'modal-button primary';
      confirmBtn.textContent = confirmText;
      confirmBtn.addEventListener('click', () => closeModal(true));

      buttons.appendChild(cancelBtn);
      buttons.appendChild(confirmBtn);

      // Assemble modal
      modal.appendChild(header);
      modal.appendChild(content);
      modal.appendChild(buttons);
      overlay.appendChild(modal);

      // Add to DOM
      document.body.appendChild(overlay);

      // Focus primary button
      confirmBtn.focus();

      // Handle keyboard navigation
      const handleKeyboard = (e) => {
        e.stopPropagation(); // Prevent editor Esc handler from firing

        if (e.key === 'Escape') {
          e.preventDefault();
          closeModal(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          closeModal(true);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          // Toggle focus between buttons
          if (document.activeElement === confirmBtn) {
            cancelBtn.focus();
          } else {
            confirmBtn.focus();
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          cancelBtn.focus();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          confirmBtn.focus();
        }
      };
      document.addEventListener('keydown', handleKeyboard);
    });
  }

  /**
   * Update status bar editor indicator
   */
  updateEditorStatus() {
    if (this.currentFile) {
      const filename = this.currentFile.split('/').pop();
      this.editorStatusEl.textContent = `vein: ${filename}${this.isDirty ? ' [+]' : ''}`;
      this.editorStatusEl.className = this.isDirty ? 'editor-status dirty' : 'editor-status';
    } else {
      // Show vein as inactive when no file is open
      this.editorStatusEl.textContent = 'vein';
      this.editorStatusEl.className = 'editor-status inactive';
    }
  }
}
