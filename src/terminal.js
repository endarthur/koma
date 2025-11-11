/**
 * Koma Terminal - Slate Hardening Boot System
 * New boot flow with proper error handling and recovery
 */

import { BootManager } from './boot/boot-manager.js';
import { initSafeMode, getSafeModeConfig, showSafeModeIndicator } from './boot/safe-mode.js';

// Feature flag for boot manager (can disable if issues arise)
const ENABLE_BOOT_MANAGER = true;

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
    brightBlue: '#70b3fff',
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

// Global exports (for backwards compatibility and debugging)
let tabManager = null;
let editor = null;
let bootManager = null;

/**
 * Main boot entry point
 */
async function startKoma() {
  console.log('[Koma] Starting boot process...');

  if (ENABLE_BOOT_MANAGER) {
    // New boot flow with Slate hardening
    await bootWithManager();
  } else {
    // Legacy boot flow (fallback)
    await bootLegacy();
  }
}

/**
 * Boot with Slate hardening boot manager
 */
async function bootWithManager() {
  try {
    // Detect safe mode early
    const safeMode = initSafeMode();
    const safeModeConfig = getSafeModeConfig();

    // Create boot manager
    bootManager = new BootManager();

    // Show boot status in status bar
    bootManager.onStatusUpdate((stage, status, details) => {
      updateBootStatus(stage, status);
    });

    // Run boot sequence
    const bootResult = await bootManager.boot({
      terminalConfig,
      ...safeModeConfig
    });

    if (bootResult.success) {
      // Boot succeeded
      console.log('[Koma] Boot successful');

      // Extract components
      editor = bootResult.editor;
      tabManager = bootResult.shale;

      // Show safe mode indicator if active
      if (safeMode) {
        showSafeModeIndicator();
      }

      // Clear boot status
      clearBootStatus();

    } else {
      // Boot failed - emergency mode or preflight error
      console.error('[Koma] Boot failed:', bootResult.mode);
      // Emergency UI is already shown by boot manager
    }

  } catch (error) {
    console.error('[Koma] Fatal boot error:', error);
    showFatalError(error);
  }
}

/**
 * Legacy boot flow (fallback if boot manager disabled)
 */
async function bootLegacy() {
  console.log('[Koma] Using legacy boot flow');

  try {
    // Import legacy dependencies
    const { Editor } = await import('./ui/editor.js');
    const { Shale } = await import('./ui/shale.js');
    const { kernelClient } = await import('./kernel/client.js');

    // Start kernel initialization early
    kernelClient.ready.catch(err => {
      console.error('[Koma] Kernel initialization failed:', err);
      alert('Kernel initialization failed. Check console for details.');
    });

    // Initialize editor first (needed by tab manager for vein command)
    editor = new Editor();

    // Initialize Shale (tab manager)
    tabManager = new Shale(terminalConfig, editor);

    console.log('[Koma] Legacy boot complete');

  } catch (error) {
    console.error('[Koma] Legacy boot failed:', error);
    showFatalError(error);
  }
}

/**
 * Update boot status in UI
 */
function updateBootStatus(stage, status) {
  const statusBar = document.querySelector('.status-bar .cwd');
  if (statusBar) {
    const stageNames = ['Pre-flight', 'Kernel', 'UI', 'Environment', 'Monitoring'];
    const stageName = stageNames[stage] || `Stage ${stage}`;
    statusBar.textContent = `[${stageName}] ${status}`;
  }
}

/**
 * Clear boot status from UI
 */
function clearBootStatus() {
  const statusBar = document.querySelector('.status-bar .cwd');
  if (statusBar) {
    statusBar.textContent = '~';
  }
}

/**
 * Show fatal error (fallback if everything fails)
 */
function showFatalError(error) {
  const container = document.getElementById('koma-workstation');
  if (container) {
    container.innerHTML = `
      <div style="padding: 40px; font-family: monospace; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #ff6b35;">⚠️ Koma Failed to Start</h1>
        <p>A fatal error occurred during boot.</p>
        <div style="background: #1a1a1a; color: #00ff88; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <strong>Error:</strong> ${error.message}
        </div>
        <h2>What can I do?</h2>
        <ul>
          <li>Reload the page and try again</li>
          <li>Clear browser data and reload</li>
          <li>Check browser console for details (F12)</li>
        </ul>
        <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #ff6b35; color: white; border: none; border-radius: 4px;">
          Reload Page
        </button>
      </div>
    `;
  }
}

// Start boot process when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startKoma);
} else {
  // DOM already ready
  startKoma();
}

// Export for external use and debugging
export { tabManager, editor, bootManager };
