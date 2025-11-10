import { TabManager } from './ui/tab-manager.js';
import { Editor } from './ui/editor.js';
import { kernelClient } from './kernel/client.js';

// Start kernel initialization early
kernelClient.ready.catch(err => {
  console.error('[Koma] Kernel initialization failed:', err);
});

// Terminal configuration matching Koma aesthetic
const terminalConfig = {
  fontFamily: "'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
  fontSize: 13,
  lineHeight: 1.5,
  cursorBlink: true,
  cursorStyle: 'block',
  theme: {
    background: '#1a1a1a',
    foreground: '#e0e0e0',
    cursor: '#ff6b35',
    cursorAccent: '#1a1a1a',
    selectionBackground: 'rgba(255, 107, 53, 0.3)',
    black: '#1a1a1a',
    red: '#ff6b35',
    green: '#00ff88',
    yellow: '#ffcc00',
    blue: '#4d9fff',
    magenta: '#ff6bcb',
    cyan: '#00ddff',
    white: '#e0e0e0',
    brightBlack: '#666666',
    brightRed: '#ff8c61',
    brightGreen: '#33ffaa',
    brightYellow: '#ffdd33',
    brightBlue: '#70b3ff',
    brightMagenta: '#ff8cdb',
    brightCyan: '#33eeff',
    brightWhite: '#ffffff',
  },
  allowProposedApi: true,
  // Custom key event handler to allow F12 passthrough for dev tools
  customKeyEventHandler: (e) => {
    // Return false to prevent xterm from handling F12
    // This allows the browser to handle it and open dev tools
    if (e.key === 'F12') {
      return false;
    }
    // Return true for all other keys to let xterm handle them
    return true;
  },
};

// Initialize editor first (needed by tab manager for vein command)
const editor = new Editor();

// Initialize tab manager
const tabManager = new TabManager(terminalConfig, editor);

// Export for external use
export { tabManager, editor };
