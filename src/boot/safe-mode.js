/**
 * Safe Mode - Slate Hardening Boot System
 * Provides minimal boot mode for troubleshooting
 *
 * Activated by holding Shift during page load
 *
 * Safe mode:
 * - Skips .komarc execution
 * - Single tab only (no tab restoration)
 * - Disables health monitoring
 * - Shows safe mode indicator
 * - Minimal startup for debugging
 */

let safeModeDetected = false;
let shiftKeyPressed = false;

// Set up early keydown listener to detect Shift
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
      shiftKeyPressed = true;
    }
  }, { capture: true, passive: true });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
      shiftKeyPressed = false;
    }
  }, { capture: true, passive: true });
}

/**
 * Detect if Shift key is held during page load
 * Must be called early in boot process
 */
export function detectSafeMode() {
  // Check if Shift is currently pressed
  if (shiftKeyPressed) {
    safeModeDetected = true;
    console.log('[SafeMode] Shift key detected - entering safe mode');
    return true;
  }

  // Check URL parameter (manual override)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('safemode') || urlParams.has('safe')) {
    safeModeDetected = true;
    console.log('[SafeMode] URL parameter detected - entering safe mode');
    return true;
  }

  // Check localStorage override (for persistent safe mode)
  try {
    if (localStorage.getItem('koma-safe-mode') === 'true') {
      safeModeDetected = true;
      console.log('[SafeMode] localStorage override - entering safe mode');
      return true;
    }
  } catch (e) {
    // localStorage not available
  }

  return false;
}

/**
 * Check if safe mode is active
 */
export function isSafeModeActive() {
  return safeModeDetected;
}

/**
 * Enable safe mode for next boot
 */
export function enableSafeModeForNextBoot() {
  try {
    localStorage.setItem('koma-safe-mode', 'true');
    console.log('[SafeMode] Safe mode enabled for next boot');
    return true;
  } catch (e) {
    console.error('[SafeMode] Could not enable safe mode:', e);
    return false;
  }
}

/**
 * Disable safe mode
 */
export function disableSafeMode() {
  try {
    localStorage.removeItem('koma-safe-mode');
    console.log('[SafeMode] Safe mode disabled');
    return true;
  } catch (e) {
    console.error('[SafeMode] Could not disable safe mode:', e);
    return false;
  }
}

/**
 * Exit safe mode and reload (removes URL params and localStorage)
 */
export function exitSafeMode() {
  // Remove localStorage flag
  disableSafeMode();

  // Remove safe mode URL parameters
  const url = new URL(window.location.href);
  url.searchParams.delete('safemode');
  url.searchParams.delete('safe');

  // Reload with clean URL
  window.location.href = url.toString();
}

/**
 * Show safe mode indicator in UI
 */
export function showSafeModeIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'safe-mode-indicator';
  indicator.innerHTML = `
    <div class="safe-mode-banner">
      <span class="safe-mode-prefix">[</span>
      <span class="safe-mode-text">SAFE MODE</span>
      <span class="safe-mode-prefix">]</span>
      <span class="safe-mode-info">minimal boot - .komarc skipped - health monitoring disabled</span>
      <button class="safe-mode-exit" id="exit-safe-mode-btn">exit</button>
    </div>
  `;

  // Insert at top of page
  document.body.insertBefore(indicator, document.body.firstChild);

  // Add CSS
  injectSafeModeCSS();

  // Attach exit handler
  const exitBtn = document.getElementById('exit-safe-mode-btn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      exitSafeMode();
    });
  }
}

/**
 * Inject safe mode CSS
 */
function injectSafeModeCSS() {
  if (document.getElementById('safe-mode-css')) {
    return; // Already injected
  }

  const style = document.createElement('style');
  style.id = 'safe-mode-css';
  style.textContent = `
    .safe-mode-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1a1a1a;
      color: #ffcc00;
      padding: 8px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10000;
      border-bottom: 2px solid #ffcc00;
      font-family: 'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
    }
    .safe-mode-prefix {
      color: #666;
    }
    .safe-mode-text {
      color: #ffcc00;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .safe-mode-info {
      color: #999;
      flex: 1;
      font-size: 12px;
    }
    .safe-mode-exit {
      background: transparent;
      color: #ffcc00;
      border: 1px solid #ffcc00;
      padding: 4px 12px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      transition: all 0.15s;
    }
    .safe-mode-exit:hover {
      background: #ffcc00;
      color: #1a1a1a;
    }

    /* Adjust workstation to account for banner */
    #koma-workstation {
      margin-top: 36px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Get safe mode configuration for boot
 */
export function getSafeModeConfig() {
  return {
    safeMode: safeModeDetected,
    skipKomarc: safeModeDetected,
    skipHealth: safeModeDetected,
    singleTab: safeModeDetected,
    skipTabRestore: safeModeDetected
  };
}

/**
 * Initialize safe mode detection (call early!)
 */
export function initSafeMode() {
  const isActive = detectSafeMode();

  if (isActive) {
    console.log('[SafeMode] Safe mode activated');
    console.log('[SafeMode] Features disabled:');
    console.log('  - .komarc execution');
    console.log('  - Tab restoration');
    console.log('  - Health monitoring');
  }

  return isActive;
}
