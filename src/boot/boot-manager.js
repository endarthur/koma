/**
 * Boot Manager - Slate Hardening Boot System
 * Orchestrates the Koma boot process with proper error handling and recovery
 *
 * Boot Stages:
 * 0. Preflight - Browser capability checks
 * 1. Kernel - Olivine initialization and VFS setup
 * 2. UI - Editor and Shale (tab manager) creation
 * 3. Environment - Tab restoration and .komarc loading
 * 4. Monitoring - Background health checks
 */

import { runPreflightChecks, generatePreflightReport } from './preflight.js';
import { BootDiagnostics } from './diagnostics.js';
import { kernelClient } from '../kernel/client.js';
import { Editor } from '../ui/editor.js';
import { Shale } from '../ui/shale.js';

export class BootManager {
  constructor() {
    this.stage = 0;
    this.status = 'initializing';
    this.diagnostics = new BootDiagnostics();
    this.kernel = null;
    this.editor = null;
    this.shale = null;
    this.healthMonitor = null;
    this.statusCallbacks = [];
  }

  /**
   * Register a callback for status updates
   * Callback receives (stage, status, details)
   */
  onStatusUpdate(callback) {
    this.statusCallbacks.push(callback);
  }

  /**
   * Update boot status and notify callbacks
   */
  updateStatus(status, details = {}) {
    this.status = status;
    console.log(`[Boot] ${status}`, details);

    for (const callback of this.statusCallbacks) {
      try {
        callback(this.stage, status, details);
      } catch (error) {
        console.error('[Boot] Status callback error:', error);
      }
    }
  }

  /**
   * Main boot sequence
   */
  async boot(config = {}) {
    const {
      terminalConfig = {},
      skipPreflight = false,
      skipHealth = false,
      safeMode = false
    } = config;

    try {
      // Stage 0: Pre-flight checks
      if (!skipPreflight) {
        this.stage = 0;
        this.updateStatus('Running pre-flight checks...');
        const preflightResult = await this.runPreflight();

        if (!preflightResult.success) {
          return this.handlePreflightFailure(preflightResult);
        }
      }

      // Stage 1: Kernel initialization
      this.stage = 1;
      this.updateStatus('Starting Olivine kernel...');
      const kernelResult = await this.initializeKernel();

      if (!kernelResult.success) {
        return this.enterEmergencyMode(kernelResult.error, 'kernel');
      }

      this.kernel = kernelResult.kernel;

      // Stage 2: UI initialization
      this.stage = 2;
      this.updateStatus('Initializing interface...');
      const uiResult = await this.initializeUI(terminalConfig);

      if (!uiResult.success) {
        return this.enterEmergencyMode(uiResult.error, 'ui');
      }

      this.editor = uiResult.editor;
      this.shale = uiResult.shale;

      // Stage 3: Environment setup
      this.stage = 3;
      this.updateStatus('Loading environment...');
      const envResult = await this.setupEnvironment(safeMode);

      if (!envResult.success) {
        // Environment setup is not critical - log and continue
        this.diagnostics.recordWarning('Environment setup incomplete', {
          error: envResult.error?.message
        });
      }

      // Stage 4: Background monitoring
      if (!skipHealth && !safeMode) {
        this.stage = 4;
        this.updateStatus('Starting health monitoring...');
        await this.startHealthMonitoring();
      }

      // Boot complete!
      this.stage = 5;
      this.status = 'ready';
      this.updateStatus('Ready');

      this.diagnostics.recordStage('boot-complete', performance.now() - this.diagnostics.startTime, 'success');

      return {
        success: true,
        kernel: this.kernel,
        editor: this.editor,
        shale: this.shale,
        healthMonitor: this.healthMonitor,
        diagnostics: this.diagnostics
      };

    } catch (error) {
      console.error('[Boot] Unhandled boot failure:', error);
      this.diagnostics.recordFatalError(error, { stage: this.stage, status: this.status });
      return this.enterEmergencyMode(error, 'unknown');
    }
  }

  /**
   * Stage 0: Run preflight checks
   */
  async runPreflight() {
    const startTime = performance.now();

    try {
      const results = await runPreflightChecks();
      const duration = performance.now() - startTime;

      this.diagnostics.recordStage('preflight', duration, results.success ? 'success' : 'failed', null, results);

      if (!results.success) {
        console.error('[Boot] Preflight checks failed:', results.failed);
        const report = generatePreflightReport(results);
        console.log(report);
      }

      if (results.warnings.length > 0) {
        results.warnings.forEach(w => {
          this.diagnostics.recordWarning(w.message, w);
        });
      }

      return results;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('preflight', duration, 'failed', error);
      throw error;
    }
  }

  /**
   * Handle preflight failure (show error page)
   */
  handlePreflightFailure(preflightResults) {
    console.error('[Boot] Cannot start Koma - preflight checks failed');

    // Show preflight error page
    const container = document.getElementById('koma-workstation');
    container.innerHTML = this.renderPreflightError(preflightResults);

    return {
      success: false,
      mode: 'preflight-error',
      results: preflightResults
    };
  }

  /**
   * Render preflight error page
   */
  renderPreflightError(results) {
    const report = generatePreflightReport(results);

    return `
      <div class="boot-error">
        <div class="boot-error-header">
          <h1>⚠️ Koma Cannot Start</h1>
        </div>
        <div class="boot-error-content">
          <p>Your browser does not meet the minimum requirements to run Koma.</p>

          <div class="error-details">
            <h2>Failed Checks</h2>
            ${results.failed.map(f => `
              <div class="error-item">
                <strong>✗ ${f.check}:</strong> ${f.message}
                ${f.help ? `<br><em>Help: ${f.help}</em>` : ''}
              </div>
            `).join('')}
          </div>

          ${results.warnings.length > 0 ? `
            <div class="warning-details">
              <h2>Warnings</h2>
              ${results.warnings.map(w => `
                <div class="warning-item">
                  <strong>⚠ ${w.check}:</strong> ${w.message}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="help-section">
            <h2>What can I do?</h2>
            <ul>
              <li>If in private/incognito mode, try regular browsing mode</li>
              <li>Update your browser to the latest version</li>
              <li>Try a different browser (Chrome, Firefox, Safari, Edge)</li>
              <li>Check browser security settings</li>
            </ul>
          </div>

          <details>
            <summary>Technical Details</summary>
            <pre>${report}</pre>
          </details>
        </div>
      </div>
    `;
  }

  /**
   * Stage 1: Initialize kernel with timeout
   */
  async initializeKernel() {
    const startTime = performance.now();
    const timeoutMs = 10000; // 10 second timeout

    try {
      this.updateStatus('Creating Olivine worker...');

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Kernel initialization timeout')), timeoutMs);
      });

      // Race between kernel init and timeout
      const kernel = await Promise.race([
        kernelClient.getKernel(),
        timeoutPromise
      ]);

      this.updateStatus('Verifying VFS health...');

      // Verify VFS is working
      await this.verifyVFSHealth(kernel);

      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('kernel', duration, 'success');

      return { success: true, kernel };

    } catch (error) {
      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('kernel', duration, 'failed', error);
      console.error('[Boot] Kernel initialization failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Verify VFS health after boot
   */
  async verifyVFSHealth(kernel) {
    try {
      // Check root directory exists
      const rootStat = await kernel.stat('/');
      if (!rootStat || rootStat.type !== 'directory') {
        throw new Error('Root directory invalid');
      }

      // Try to write to /tmp
      const testPath = `/tmp/.boot-verify-${Date.now()}`;
      const testContent = 'boot verification test';
      await kernel.writeFile(testPath, testContent);

      // Try to read back
      const readContent = await kernel.readFile(testPath);
      if (readContent !== testContent) {
        throw new Error('VFS read/write verification failed');
      }

      // Clean up test file
      await kernel.unlink(testPath);

      console.log('[Boot] VFS health check passed');

    } catch (error) {
      console.error('[Boot] VFS health check failed:', error);
      throw new Error(`VFS health check failed: ${error.message}`);
    }
  }

  /**
   * Stage 2: Initialize UI (Editor and Shale)
   */
  async initializeUI(terminalConfig) {
    const startTime = performance.now();

    try {
      this.updateStatus('Creating editor...');
      const editor = new Editor();

      this.updateStatus('Creating tab manager...');
      const shale = new Shale(terminalConfig, editor);

      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('ui', duration, 'success');

      return { success: true, editor, shale };

    } catch (error) {
      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('ui', duration, 'failed', error);
      console.error('[Boot] UI initialization failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Stage 3: Setup environment (.komarc, etc)
   */
  async setupEnvironment(safeMode) {
    const startTime = performance.now();

    try {
      if (safeMode) {
        this.updateStatus('Skipping environment setup (safe mode)');
        this.diagnostics.recordStage('environment', performance.now() - startTime, 'skipped', null, { safeMode: true });
        return { success: true, skipped: true };
      }

      // Environment setup is handled by Shale.loadTabs() and Shale.loadKomarc()
      // which are called during tab creation
      // This stage is mostly a placeholder for future environment setup tasks

      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('environment', duration, 'success');

      return { success: true };

    } catch (error) {
      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('environment', duration, 'failed', error);
      console.error('[Boot] Environment setup failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Stage 4: Start health monitoring
   */
  async startHealthMonitoring() {
    const startTime = performance.now();

    try {
      // Dynamic import to avoid circular dependencies
      const { HealthMonitor } = await import('./health-monitor.js');

      this.healthMonitor = new HealthMonitor(this.kernel, this.shale);
      this.healthMonitor.start();

      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('health-monitor', duration, 'success');

    } catch (error) {
      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('health-monitor', duration, 'failed', error);
      console.error('[Boot] Health monitor failed to start:', error);
      // Non-critical - don't fail boot
    }
  }

  /**
   * Enter emergency mode (show recovery UI)
   */
  async enterEmergencyMode(error, failureStage) {
    console.error('[Boot] Entering emergency mode:', error);

    this.status = 'emergency';
    this.diagnostics.recordFatalError(error, { stage: failureStage });

    // Generate diagnostic report
    const report = await this.diagnostics.generateReport();

    // Show emergency UI
    try {
      // Dynamic import to avoid loading unless needed
      const { EmergencyMode } = await import('./emergency.js');

      const emergency = new EmergencyMode(error, report, this.diagnostics);
      emergency.show();

    } catch (emergencyError) {
      console.error('[Boot] Emergency mode failed to load:', emergencyError);
      // Fallback to basic error display
      this.showBasicErrorPage(error, report);
    }

    return {
      success: false,
      mode: 'emergency',
      error,
      report,
      diagnostics: this.diagnostics
    };
  }

  /**
   * Fallback basic error page (if emergency mode fails)
   */
  showBasicErrorPage(error, report) {
    const container = document.getElementById('koma-workstation');
    container.innerHTML = `
      <div style="padding: 40px; font-family: monospace; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #ff6b35;">⚠️ Koma Failed to Start</h1>
        <p>The Olivine kernel failed to initialize.</p>
        <div style="background: #1a1a1a; color: #00ff88; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <strong>Error:</strong> ${error.message}
        </div>
        <p>Diagnostic ID: <code>${report.bootId}</code></p>
        <h2>Recovery Options</h2>
        <ul>
          <li>Reload the page and try again</li>
          <li>Clear browser data and reload</li>
          <li>Check browser console for details (F12)</li>
          <li>Report issue with diagnostic ID above</li>
        </ul>
        <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }

  /**
   * Stop health monitoring (for cleanup)
   */
  stop() {
    if (this.healthMonitor) {
      this.healthMonitor.stop();
    }
  }
}
