import { TabManager } from './ui/tab-manager.js';

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
};

// Initialize tab manager
const tabManager = new TabManager(terminalConfig);

// Export for external use
export { tabManager };
