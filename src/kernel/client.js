/**
 * Olivine Client
 * Manages Olivine kernel (Web Worker) connection and provides access to APIs
 */

import * as Comlink from 'comlink';

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
   */
  async getKernel() {
    try {
      await this.ready;
      if (!this.kernel) {
        throw new Error('Kernel not initialized');
      }

      return this.kernel;
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
