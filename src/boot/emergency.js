/**
 * Emergency Mode - Slate Hardening Boot System
 * Provides recovery interface when kernel fails to initialize
 *
 * Features:
 * - Upload and inject .magma backups
 * - Direct IndexedDB manipulation (bypasses broken kernel)
 * - Diagnostic report display and download
 * - Recovery instructions and help
 */

const DB_NAME = 'KomaVFS';
const STORE_NAME = 'filesystem';

export class EmergencyMode {
  constructor(error, diagnosticReport, diagnostics) {
    this.error = error;
    this.diagnosticReport = diagnosticReport;
    this.diagnostics = diagnostics;
    this.selectedFile = null;
  }

  /**
   * Show emergency mode UI
   */
  show() {
    console.log('[Emergency] Showing emergency mode');

    // Hide normal UI, show emergency panel
    const container = document.getElementById('koma-workstation');
    container.innerHTML = this.renderUI();

    // Attach event handlers
    this.attachEventHandlers();

    // Add CSS if not already present
    this.injectCSS();
  }

  /**
   * Render emergency mode UI
   */
  renderUI() {
    const bootId = this.diagnosticReport.bootId;
    const errorMsg = this.error.message || 'Unknown error';

    return `
      <div class="emergency-mode">
        <div class="emergency-header">
          <h1>⚠️ Koma Emergency Mode</h1>
          <p class="emergency-subtitle">Kernel initialization failed - Recovery options available</p>
        </div>

        <div class="emergency-content">
          <div class="error-section">
            <h2>What Happened?</h2>
            <p>The Olivine kernel failed to initialize. This usually means:</p>
            <ul>
              <li>IndexedDB is corrupted or unavailable</li>
              <li>Browser storage is full</li>
              <li>Private/incognito mode is blocking storage</li>
            </ul>

            <div class="error-details">
              <strong>Error:</strong> <code>${this.escapeHTML(errorMsg)}</code>
              <br>
              <strong>Diagnostic ID:</strong> <code>${bootId}</code>
            </div>
          </div>

          <div class="restore-section">
            <h2>🔧 Restore from Backup</h2>
            <p>If you have a <code>.magma</code> backup file, you can restore your VFS:</p>

            <div class="restore-panel">
              <input type="file" id="magma-file" accept=".magma" class="file-input">
              <button id="inject-btn" disabled class="btn btn-primary">Inject & Restart</button>
            </div>

            <div id="inject-status" class="inject-status"></div>

            <details class="help-details">
              <summary>Where do I get a .magma file?</summary>
              <ul>
                <li>If you used <code>magma dump</code>, check your downloads folder</li>
                <li>If you used the six-finger salute (Ctrl+K E), check downloads</li>
                <li>Check <code>/home</code> for <code>.koma-backup-*.magma</code> files (if VFS is accessible)</li>
              </ul>
            </details>
          </div>

          <div class="actions-section">
            <h2>Other Options</h2>
            <div class="action-buttons">
              <button id="retry-btn" class="btn btn-secondary">🔄 Try Again</button>
              <button id="clear-storage-btn" class="btn btn-warning">🗑️ Clear Storage & Restart</button>
              <button id="diagnostics-btn" class="btn btn-secondary">📊 Download Diagnostics</button>
              <button id="help-btn" class="btn btn-secondary">❓ Get Help</button>
            </div>
          </div>

          <div class="diagnostic-preview">
            <details>
              <summary>Technical Details</summary>
              <pre id="diagnostic-text">${this.escapeHTML(JSON.stringify(this.diagnosticReport, null, 2))}</pre>
            </details>
          </div>
        </div>

        <div class="emergency-footer">
          <p>Need help? Check the <a href="https://github.com/anthropics/koma" target="_blank">documentation</a> or report an issue.</p>
        </div>
      </div>
    `;
  }

  /**
   * Attach event handlers to UI elements
   */
  attachEventHandlers() {
    // File upload
    const fileInput = document.getElementById('magma-file');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // Inject button
    const injectBtn = document.getElementById('inject-btn');
    if (injectBtn) {
      injectBtn.addEventListener('click', () => this.performEmergencyRestore());
    }

    // Retry button
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        console.log('[Emergency] Retrying boot...');
        window.location.reload();
      });
    }

    // Clear storage button
    const clearBtn = document.getElementById('clear-storage-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearStorageAndRestart());
    }

    // Diagnostics button
    const diagBtn = document.getElementById('diagnostics-btn');
    if (diagBtn) {
      diagBtn.addEventListener('click', () => this.downloadDiagnostics());
    }

    // Help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.showHelp());
    }
  }

  /**
   * Handle file selection
   */
  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      console.log('[Emergency] File selected:', file.name);
      this.selectedFile = file;
      document.getElementById('inject-btn').disabled = false;

      // Show file info
      const status = document.getElementById('inject-status');
      status.innerHTML = `<div class="status-info">Selected: ${this.escapeHTML(file.name)} (${formatBytes(file.size)})</div>`;
    }
  }

  /**
   * Perform emergency VFS restore
   */
  async performEmergencyRestore() {
    const status = document.getElementById('inject-status');
    const injectBtn = document.getElementById('inject-btn');

    try {
      injectBtn.disabled = true;
      status.innerHTML = '<div class="status-progress">Reading backup file...</div>';

      // Read .magma file
      const text = await this.selectedFile.text();

      status.innerHTML = '<div class="status-progress">Parsing backup...</div>';
      const magmaData = JSON.parse(text);

      // Validate format
      if (!magmaData.entries || !Array.isArray(magmaData.entries)) {
        throw new Error('Invalid .magma format: missing entries array');
      }

      status.innerHTML = `<div class="status-progress">Clearing VFS...</div>`;

      // Inject directly into IndexedDB
      await this.directVFSInject(magmaData);

      status.innerHTML = '<div class="status-success">✓ VFS restored! Reloading...</div>';

      // Reload page after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('[Emergency] Restore failed:', error);
      status.innerHTML = `<div class="status-error">✗ Failed: ${this.escapeHTML(error.message)}</div>`;
      injectBtn.disabled = false;
    }
  }

  /**
   * Direct IndexedDB VFS injection (bypasses kernel)
   */
  async directVFSInject(magmaData) {
    return new Promise((resolve, reject) => {
      console.log('[Emergency] Opening IndexedDB for direct injection...');

      const request = indexedDB.open(DB_NAME, 2);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error.message}`));
      };

      request.onsuccess = async () => {
        const db = request.result;

        try {
          // Start transaction
          const tx = db.transaction([STORE_NAME], 'readwrite');
          const store = tx.objectStore(STORE_NAME);

          // Clear existing data
          await new Promise((res, rej) => {
            const clearReq = store.clear();
            clearReq.onsuccess = () => res();
            clearReq.onerror = () => rej(clearReq.error);
          });

          console.log(`[Emergency] Injecting ${magmaData.entries.length} entries...`);

          // Inject new data
          for (const entry of magmaData.entries) {
            await new Promise((res, rej) => {
              const putReq = store.put(entry);
              putReq.onsuccess = () => res();
              putReq.onerror = () => rej(putReq.error);
            });
          }

          // Wait for transaction to complete
          await new Promise((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
          });

          db.close();
          console.log('[Emergency] VFS injection complete');
          resolve();

        } catch (error) {
          db.close();
          reject(error);
        }
      };

      request.onupgradeneeded = () => {
        reject(new Error('IndexedDB schema upgrade needed - cannot inject'));
      };
    });
  }

  /**
   * Clear browser storage and restart
   */
  async clearStorageAndRestart() {
    if (!confirm('This will DELETE ALL Koma data including the VFS. Are you sure?')) {
      return;
    }

    if (!confirm('Really? This cannot be undone. Make sure you have backups!')) {
      return;
    }

    try {
      console.log('[Emergency] Clearing storage...');

      // Delete IndexedDB
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Clear localStorage
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('[Emergency] Could not clear localStorage:', e);
      }

      // Clear sessionStorage
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('[Emergency] Could not clear sessionStorage:', e);
      }

      console.log('[Emergency] Storage cleared, reloading...');
      window.location.reload();

    } catch (error) {
      alert(`Failed to clear storage: ${error.message}`);
    }
  }

  /**
   * Download diagnostic report
   */
  async downloadDiagnostics() {
    try {
      if (this.diagnostics && typeof this.diagnostics.downloadText === 'function') {
        await this.diagnostics.downloadText();
      } else {
        // Fallback: download JSON
        const blob = new Blob([JSON.stringify(this.diagnosticReport, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `koma-diagnostics-${this.diagnosticReport.bootId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('[Emergency] Failed to download diagnostics:', error);
      alert('Failed to download diagnostics');
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    const helpText = `
Koma Emergency Mode Help
========================

You're in emergency mode because the Olivine kernel failed to start.
This usually happens when IndexedDB is corrupted or unavailable.

Recovery Options:
-----------------
1. Restore from Backup
   - Upload a .magma backup file
   - Click "Inject & Restart"
   - Your VFS will be restored

2. Try Again
   - Simply reload the page
   - May work if the issue was temporary

3. Clear Storage
   - Deletes ALL Koma data (WARNING!)
   - Gives you a fresh start
   - Make sure you have backups first!

Where to Get Help:
------------------
- Documentation: https://github.com/anthropics/koma
- Issues: https://github.com/anthropics/koma/issues
- Include your Diagnostic ID: ${this.diagnosticReport.bootId}

Common Issues:
--------------
- Private/Incognito Mode: Disable it
- Browser Storage Full: Free up space
- Corrupted VFS: Use a .magma backup to restore
`;

    alert(helpText);
  }

  /**
   * Inject minimal CSS for emergency mode
   */
  injectCSS() {
    if (document.getElementById('emergency-mode-css')) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'emergency-mode-css';
    style.textContent = `
      .emergency-mode {
        font-family: 'IBM Plex Mono', monospace;
        max-width: 900px;
        margin: 0 auto;
        padding: 40px 20px;
        color: #e0e0e0;
        background: #1a1a1a;
        min-height: 100vh;
      }
      .emergency-header {
        text-align: center;
        margin-bottom: 40px;
        border-bottom: 2px solid #ff6b35;
        padding-bottom: 20px;
      }
      .emergency-header h1 {
        color: #ff6b35;
        margin: 0;
        font-size: 2em;
      }
      .emergency-subtitle {
        color: #999;
        margin: 10px 0 0 0;
      }
      .emergency-content {
        display: flex;
        flex-direction: column;
        gap: 30px;
      }
      .error-section, .restore-section, .actions-section {
        background: #242424;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid #ff6b35;
      }
      .error-section h2, .restore-section h2, .actions-section h2 {
        margin-top: 0;
        color: #ff6b35;
      }
      .error-details {
        background: #1a1a1a;
        padding: 15px;
        border-radius: 4px;
        margin-top: 15px;
        font-family: monospace;
        font-size: 0.9em;
      }
      .restore-panel {
        display: flex;
        gap: 10px;
        margin: 20px 0;
        align-items: center;
      }
      .file-input {
        flex: 1;
        padding: 10px;
        background: #1a1a1a;
        border: 1px solid #444;
        border-radius: 4px;
        color: #e0e0e0;
      }
      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1em;
        font-family: inherit;
        transition: all 0.2s;
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-primary {
        background: #ff6b35;
        color: white;
      }
      .btn-primary:hover:not(:disabled) {
        background: #ff8c61;
      }
      .btn-secondary {
        background: #444;
        color: white;
      }
      .btn-secondary:hover {
        background: #555;
      }
      .btn-warning {
        background: #ffcc00;
        color: #1a1a1a;
      }
      .btn-warning:hover {
        background: #ffdd33;
      }
      .inject-status {
        margin-top: 10px;
        min-height: 30px;
      }
      .status-info, .status-progress, .status-success, .status-error {
        padding: 10px;
        border-radius: 4px;
      }
      .status-info {
        background: #2a4a5a;
        color: #4d9fff;
      }
      .status-progress {
        background: #3a3a2a;
        color: #ffcc00;
      }
      .status-success {
        background: #2a4a2a;
        color: #00ff88;
      }
      .status-error {
        background: #4a2a2a;
        color: #ff6b35;
      }
      .action-buttons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .help-details {
        margin-top: 15px;
      }
      .help-details summary {
        cursor: pointer;
        color: #4d9fff;
      }
      .diagnostic-preview {
        background: #0a0a0a;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #333;
      }
      .diagnostic-preview summary {
        cursor: pointer;
        color: #4d9fff;
        margin-bottom: 10px;
      }
      .diagnostic-preview pre {
        background: #1a1a1a;
        padding: 15px;
        border-radius: 4px;
        overflow-x: auto;
        max-height: 400px;
        overflow-y: auto;
        font-size: 0.85em;
      }
      .emergency-footer {
        text-align: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #333;
        color: #666;
      }
      .emergency-footer a {
        color: #4d9fff;
        text-decoration: none;
      }
      .emergency-footer a:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}
