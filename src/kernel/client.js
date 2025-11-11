/**
 * Olivine Client
 * Manages Olivine kernel (Web Worker) connection and provides access to APIs
 */

import * as Comlink from 'comlink';

/**
 * Parse error code from VFS error message
 * VFS errors follow format: "CODE: message: path"
 * Comlink strips custom properties from errors, so we parse from message
 */
function restoreErrorCode(error) {
  if (error && error.message && !error.code) {
    const match = error.message.match(/^([A-Z]+):/);
    if (match) {
      error.code = match[1];
      // Also try to extract path from message
      const pathMatch = error.message.match(/:\s*([^:]+)$/);
      if (pathMatch) {
        error.path = pathMatch[1].trim();
      }
    }
  }
  return error;
}

/**
 * Wrap kernel method to restore error codes
 */
function wrapMethod(method) {
  return async function(...args) {
    try {
      return await method(...args);
    } catch (error) {
      throw restoreErrorCode(error);
    }
  };
}

class KernelClient {
  constructor() {
    this.worker = null;
    this.kernel = null;
    this.ready = this.initialize();
  }

  /**
   * Initialize Olivine kernel (Web Worker) and Comlink connection
   */
  async initialize() {
    try {
      // Create Olivine kernel worker
      this.worker = new Worker(
        new URL('./olivine.js', import.meta.url),
        { type: 'module' }
      );

      // Add error handler to catch worker errors
      this.worker.onerror = (error) => {
        console.error('[Koma] Worker error:', error);
        console.error('[Koma] Error message:', error.message);
        console.error('[Koma] Error filename:', error.filename);
        console.error('[Koma] Error lineno:', error.lineno);
      };

      this.worker.onmessageerror = (error) => {
        console.error('[Koma] Worker message error:', error);
      };

      console.log('[Koma] Olivine kernel created');

      // Wrap worker with Comlink
      this.kernel = Comlink.wrap(this.worker);

      // Wait for VFS to initialize
      console.log('[Koma] Waiting for ping...');
      await this.kernel.ping();

      console.log('[Koma] Olivine connected');

      return this.kernel;
    } catch (error) {
      console.error('[Koma] Failed to initialize Olivine:', error);
      throw error;
    }
  }

  /**
   * Get kernel API (VFS methods are at top level)
   * Returns a Proxy that restores error codes for all methods
   */
  async getKernel() {
    try {
      await this.ready;
      if (!this.kernel) {
        throw new Error('Kernel not initialized');
      }

      // Return a Proxy that wraps all kernel methods to restore error codes
      return new Proxy(this.kernel, {
        get(target, prop) {
          const value = target[prop];
          // If it's a function, wrap it to restore error codes
          if (typeof value === 'function') {
            return wrapMethod(value.bind(target));
          }
          return value;
        }
      });
    } catch (error) {
      console.error('[KernelClient] Failed to get kernel:', error);
      throw error;
    }
  }

  /**
   * Get kernel version
   */
  async getVersion() {
    await this.ready;
    return this.kernel.getVersion();
  }

  /**
   * Terminate and restart Olivine kernel
   */
  async restart() {
    console.log('[Koma] Restarting Olivine...');

    // Terminate existing worker
    if (this.worker) {
      this.worker.terminate();
    }

    // Reinitialize
    this.ready = this.initialize();
    await this.ready;

    console.log('[Koma] Olivine restarted');
  }
}

// Export singleton instance
export const kernelClient = new KernelClient();
