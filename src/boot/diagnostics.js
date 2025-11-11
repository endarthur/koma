/**
 * Boot Diagnostics - Slate Hardening Boot System
 * Tracks boot stages, timing, and errors for debugging
 *
 * Provides detailed diagnostic reports that can be downloaded
 * for troubleshooting boot failures
 */

// Version info (sync with olivine.js)
const KOMA_VERSION = '0.5.0';
const KOMA_BUILD_DATE = '2025-11-10';

export class BootDiagnostics {
  constructor() {
    this.stages = [];
    this.errors = [];
    this.warnings = [];
    this.startTime = performance.now();
    this.bootId = `boot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Record a boot stage completion
   */
  recordStage(name, duration, status, error = null, details = {}) {
    const stage = {
      name,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimals
      status, // 'success', 'failed', 'skipped'
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      } : null,
      details,
      timestamp: Date.now(),
      relativeTime: Math.round((performance.now() - this.startTime) * 100) / 100
    };

    this.stages.push(stage);
    console.log(`[Boot] Stage ${name}: ${status} (${duration.toFixed(2)}ms)`, details);

    return stage;
  }

  /**
   * Record a fatal error that stops boot
   */
  recordFatalError(error, context = {}) {
    const errorRecord = {
      type: 'fatal',
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      context,
      timestamp: Date.now(),
      relativeTime: Math.round((performance.now() - this.startTime) * 100) / 100
    };

    this.errors.push(errorRecord);
    console.error('[Boot] Fatal error:', error, context);

    return errorRecord;
  }

  /**
   * Record a non-fatal warning
   */
  recordWarning(message, details = {}) {
    const warning = {
      message,
      details,
      timestamp: Date.now(),
      relativeTime: Math.round((performance.now() - this.startTime) * 100) / 100
    };

    this.warnings.push(warning);
    console.warn('[Boot] Warning:', message, details);

    return warning;
  }

  /**
   * Get storage information (async)
   */
  async getStorageInfo() {
    if (!navigator.storage?.estimate) {
      return {
        available: false,
        reason: 'Storage API not supported'
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        available: true,
        quota: estimate.quota,
        usage: estimate.usage,
        remaining: estimate.quota - estimate.usage,
        percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
      };
    } catch (error) {
      return {
        available: false,
        reason: error.message
      };
    }
  }

  /**
   * Get browser/environment information
   */
  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory, // GB, if available
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  /**
   * Get memory information (if available)
   */
  getMemoryInfo() {
    if (!performance.memory) {
      return {
        available: false,
        reason: 'Memory API not available'
      };
    }

    return {
      available: true,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      percentUsed: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2)
    };
  }

  /**
   * Get performance timing information
   */
  getTimingInfo() {
    const perfTiming = performance.timing;
    const now = performance.now();

    return {
      bootDuration: Math.round(now * 100) / 100,
      domContentLoaded: perfTiming.domContentLoadedEventEnd - perfTiming.navigationStart,
      domComplete: perfTiming.domComplete - perfTiming.navigationStart,
      loadComplete: perfTiming.loadEventEnd - perfTiming.navigationStart,
      stages: this.stages.map(s => ({
        name: s.name,
        duration: s.duration,
        status: s.status
      }))
    };
  }

  /**
   * Generate a comprehensive diagnostic report
   */
  async generateReport() {
    const totalTime = performance.now() - this.startTime;

    const report = {
      // Identification
      bootId: this.bootId,
      timestamp: new Date().toISOString(),
      komaVersion: KOMA_VERSION,
      komaBuildDate: KOMA_BUILD_DATE,

      // Boot summary
      summary: {
        totalBootTime: Math.round(totalTime * 100) / 100,
        stagesCompleted: this.stages.length,
        stagesFailed: this.stages.filter(s => s.status === 'failed').length,
        errors: this.errors.length,
        warnings: this.warnings.length,
        success: this.errors.length === 0 && this.stages.filter(s => s.status === 'failed').length === 0
      },

      // Stage details
      stages: this.stages,

      // Errors and warnings
      errors: this.errors,
      warnings: this.warnings,

      // Environment
      environment: {
        browser: this.getBrowserInfo(),
        memory: this.getMemoryInfo(),
        storage: await this.getStorageInfo(),
        timing: this.getTimingInfo()
      },

      // Feature detection
      features: {
        indexedDB: !!window.indexedDB,
        webWorkers: !!window.Worker,
        serviceWorker: 'serviceWorker' in navigator,
        localStorage: (() => {
          try {
            localStorage.setItem('_test', '1');
            localStorage.removeItem('_test');
            return true;
          } catch {
            return false;
          }
        })(),
        webGL: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch {
            return false;
          }
        })()
      }
    };

    return report;
  }

  /**
   * Generate human-readable text report
   */
  async generateTextReport() {
    const report = await this.generateReport();
    let text = '';

    text += '='.repeat(70) + '\n';
    text += 'KOMA BOOT DIAGNOSTIC REPORT\n';
    text += '='.repeat(70) + '\n\n';

    // Header
    text += `Boot ID:       ${report.bootId}\n`;
    text += `Timestamp:     ${report.timestamp}\n`;
    text += `Koma Version:  ${report.komaVersion} (${report.komaBuildDate})\n`;
    text += `Boot Time:     ${report.summary.totalBootTime}ms\n`;
    text += `Status:        ${report.summary.success ? '✓ SUCCESS' : '✗ FAILED'}\n`;
    text += '\n';

    // Summary
    text += 'SUMMARY\n';
    text += '-'.repeat(70) + '\n';
    text += `Stages Completed: ${report.summary.stagesCompleted}\n`;
    text += `Stages Failed:    ${report.summary.stagesFailed}\n`;
    text += `Errors:           ${report.summary.errors}\n`;
    text += `Warnings:         ${report.summary.warnings}\n`;
    text += '\n';

    // Stages
    if (report.stages.length > 0) {
      text += 'BOOT STAGES\n';
      text += '-'.repeat(70) + '\n';
      for (const stage of report.stages) {
        const icon = stage.status === 'success' ? '✓' : stage.status === 'failed' ? '✗' : '○';
        text += `${icon} ${stage.name.padEnd(30)} ${stage.duration.toFixed(2)}ms (${stage.relativeTime.toFixed(2)}ms)\n`;
        if (stage.error) {
          text += `  Error: ${stage.error.message}\n`;
        }
      }
      text += '\n';
    }

    // Errors
    if (report.errors.length > 0) {
      text += 'ERRORS\n';
      text += '-'.repeat(70) + '\n';
      for (const error of report.errors) {
        text += `[${error.type}] ${error.message}\n`;
        text += `  Time: ${error.relativeTime.toFixed(2)}ms\n`;
        if (error.context && Object.keys(error.context).length > 0) {
          text += `  Context: ${JSON.stringify(error.context)}\n`;
        }
        text += '\n';
      }
    }

    // Warnings
    if (report.warnings.length > 0) {
      text += 'WARNINGS\n';
      text += '-'.repeat(70) + '\n';
      for (const warning of report.warnings) {
        text += `⚠ ${warning.message}\n`;
        if (warning.details && Object.keys(warning.details).length > 0) {
          text += `  Details: ${JSON.stringify(warning.details)}\n`;
        }
      }
      text += '\n';
    }

    // Environment
    text += 'ENVIRONMENT\n';
    text += '-'.repeat(70) + '\n';
    text += `Browser:       ${report.environment.browser.userAgent}\n`;
    text += `Platform:      ${report.environment.browser.platform}\n`;
    text += `Language:      ${report.environment.browser.language}\n`;
    text += `Screen:        ${report.environment.browser.screen.width}x${report.environment.browser.screen.height}\n`;
    text += `Pixel Ratio:   ${report.environment.browser.screen.pixelRatio}\n`;
    text += `Hardware:      ${report.environment.browser.hardwareConcurrency || 'N/A'} cores\n`;
    if (report.environment.browser.deviceMemory) {
      text += `Device Memory: ${report.environment.browser.deviceMemory}GB\n`;
    }
    text += '\n';

    // Storage
    if (report.environment.storage.available) {
      const storage = report.environment.storage;
      text += 'STORAGE\n';
      text += '-'.repeat(70) + '\n';
      text += `Quota:         ${formatBytes(storage.quota)}\n`;
      text += `Used:          ${formatBytes(storage.usage)} (${storage.percentUsed}%)\n`;
      text += `Remaining:     ${formatBytes(storage.remaining)}\n`;
      text += '\n';
    }

    // Memory
    if (report.environment.memory.available) {
      const memory = report.environment.memory;
      text += 'MEMORY\n';
      text += '-'.repeat(70) + '\n';
      text += `JS Heap Limit: ${formatBytes(memory.jsHeapSizeLimit)}\n`;
      text += `JS Heap Used:  ${formatBytes(memory.usedJSHeapSize)} (${memory.percentUsed}%)\n`;
      text += '\n';
    }

    // Features
    text += 'FEATURES\n';
    text += '-'.repeat(70) + '\n';
    text += `IndexedDB:      ${report.features.indexedDB ? '✓' : '✗'}\n`;
    text += `Web Workers:    ${report.features.webWorkers ? '✓' : '✗'}\n`;
    text += `Service Worker: ${report.features.serviceWorker ? '✓' : '✗'}\n`;
    text += `LocalStorage:   ${report.features.localStorage ? '✓' : '✗'}\n`;
    text += `WebGL:          ${report.features.webGL ? '✓' : '✗'}\n`;
    text += '\n';

    text += '='.repeat(70) + '\n';

    return text;
  }

  /**
   * Download diagnostic report as JSON
   */
  async downloadJSON() {
    const report = await this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koma-diagnostics-${this.bootId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Download diagnostic report as text
   */
  async downloadText() {
    const text = await this.generateTextReport();
    const blob = new Blob([text], {
      type: 'text/plain'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koma-diagnostics-${this.bootId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
