/**
 * Preflight Checks - Slate Hardening Boot System
 * Verifies browser capabilities before starting Koma
 *
 * These checks must complete synchronously and quickly (<100ms)
 * Failures result in showing an error page with recovery instructions
 */

/**
 * Check if IndexedDB is available
 * Common failure: Private/Incognito mode
 */
function checkIndexedDB() {
  if (!window.indexedDB) {
    return {
      status: 'fail',
      check: 'indexedDB',
      message: 'IndexedDB not available',
      help: 'Disable private/incognito mode or use a supported browser',
      details: 'Koma requires IndexedDB for the virtual filesystem'
    };
  }

  // Additional check: try to open a test database
  // This can fail in some edge cases even if window.indexedDB exists
  try {
    const testRequest = indexedDB.open('_preflight_test', 1);
    testRequest.onerror = () => {
      // Will handle async, but we return pass for now
    };
    testRequest.onsuccess = () => {
      // Clean up test database
      indexedDB.deleteDatabase('_preflight_test');
    };
  } catch (error) {
    return {
      status: 'fail',
      check: 'indexedDB',
      message: 'IndexedDB cannot be opened',
      help: 'Check browser security settings or disable private mode',
      details: error.message
    };
  }

  return {
    status: 'pass',
    check: 'indexedDB'
  };
}

/**
 * Check if Web Workers are supported
 * Required for Olivine kernel
 */
function checkWebWorkers() {
  if (!window.Worker) {
    return {
      status: 'fail',
      check: 'webWorkers',
      message: 'Web Workers not supported',
      help: 'Update to a modern browser (Chrome 4+, Firefox 3.5+, Safari 4+)',
      details: 'Koma requires Web Workers for the Olivine kernel'
    };
  }

  return {
    status: 'pass',
    check: 'webWorkers'
  };
}

/**
 * Check if ES Modules are supported
 * Required for dynamic imports
 */
function checkESModules() {
  // Check for dynamic import support
  if (typeof import.meta?.url !== 'string') {
    return {
      status: 'fail',
      check: 'esModules',
      message: 'ES Modules not fully supported',
      help: 'Update to a modern browser with ES Module support',
      details: 'Koma requires ES Module support including import.meta'
    };
  }

  return {
    status: 'pass',
    check: 'esModules'
  };
}

/**
 * Check available storage quota
 * Warns if low, fails if critically low
 */
async function checkStorageQuota() {
  // Storage API is optional
  if (!navigator.storage?.estimate) {
    return {
      status: 'warn',
      check: 'storage',
      message: 'Storage quota check unavailable',
      help: 'Browser does not support Storage API',
      details: 'Cannot estimate available storage'
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const available = estimate.quota - estimate.usage;
    const minRequired = 10 * 1024 * 1024; // 10MB minimum
    const recommendedMin = 50 * 1024 * 1024; // 50MB recommended

    if (available < minRequired) {
      return {
        status: 'fail',
        check: 'storage',
        message: `Critically low storage: ${formatBytes(available)} available`,
        help: 'Free up browser storage or clear cache',
        details: `Koma requires at least ${formatBytes(minRequired)} of storage`,
        available,
        quota: estimate.quota,
        usage: estimate.usage
      };
    }

    if (available < recommendedMin) {
      return {
        status: 'warn',
        check: 'storage',
        message: `Low storage: ${formatBytes(available)} available`,
        help: 'Consider freeing up browser storage',
        details: `${formatBytes(recommendedMin)} recommended for comfortable usage`,
        available,
        quota: estimate.quota,
        usage: estimate.usage
      };
    }

    return {
      status: 'pass',
      check: 'storage',
      available,
      quota: estimate.quota,
      usage: estimate.usage
    };
  } catch (error) {
    return {
      status: 'warn',
      check: 'storage',
      message: 'Storage quota check failed',
      details: error.message
    };
  }
}

/**
 * Check if we're in a sandboxed iframe
 * Can cause issues with storage and workers
 */
function checkSandbox() {
  try {
    // If we're in an iframe, check for sandbox restrictions
    if (window.self !== window.top) {
      const sandbox = window.frameElement?.getAttribute('sandbox');
      if (sandbox !== null) {
        // Sandboxed iframe - may have restrictions
        return {
          status: 'warn',
          check: 'sandbox',
          message: 'Running in sandboxed iframe',
          help: 'Some features may be restricted',
          details: `Sandbox attributes: ${sandbox || 'none'}`
        };
      }
    }

    return {
      status: 'pass',
      check: 'sandbox'
    };
  } catch (error) {
    // Can't access frameElement - probably cross-origin
    return {
      status: 'pass',
      check: 'sandbox'
    };
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

/**
 * Run all preflight checks
 * Returns results object with pass/fail status
 */
export async function runPreflightChecks() {
  const startTime = performance.now();

  // Run synchronous checks first
  const syncResults = {
    indexedDB: checkIndexedDB(),
    webWorkers: checkWebWorkers(),
    esModules: checkESModules(),
    sandbox: checkSandbox()
  };

  // Run async check
  const storageResult = await checkStorageQuota();

  const results = {
    ...syncResults,
    storage: storageResult
  };

  // Collect failures and warnings
  const failed = Object.values(results).filter(r => r.status === 'fail');
  const warnings = Object.values(results).filter(r => r.status === 'warn');

  const duration = performance.now() - startTime;

  return {
    success: failed.length === 0,
    results,
    failed,
    warnings,
    duration,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate human-readable preflight report
 */
export function generatePreflightReport(preflightResults) {
  const { results, failed, warnings, duration } = preflightResults;

  let report = 'Koma Preflight Check Report\n';
  report += '='.repeat(50) + '\n\n';

  // Overall status
  if (failed.length === 0) {
    report += '✓ All critical checks passed\n\n';
  } else {
    report += `✗ ${failed.length} critical check(s) failed\n\n`;
  }

  // Individual checks
  for (const [name, result] of Object.entries(results)) {
    const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠' : '✗';
    report += `${icon} ${name}: ${result.message || result.status}\n`;

    if (result.details) {
      report += `  Details: ${result.details}\n`;
    }
    if (result.help) {
      report += `  Help: ${result.help}\n`;
    }
    report += '\n';
  }

  // Warnings
  if (warnings.length > 0) {
    report += `\nWarnings: ${warnings.length}\n`;
    warnings.forEach(w => {
      report += `  - ${w.message}\n`;
    });
    report += '\n';
  }

  report += `Completed in ${duration.toFixed(2)}ms\n`;

  return report;
}
