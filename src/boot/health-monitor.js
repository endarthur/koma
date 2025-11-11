/**
 * Health Monitor - Slate Hardening Boot System
 * Background monitoring for VFS health and session state
 *
 * Features:
 * - Lightweight session state backups (tabs, history, input)
 * - VFS health checks (read/write verification)
 * - Daily VFS snapshots (full .magma backups)
 * - Memory pressure monitoring
 */

const SESSION_BACKUP_INTERVAL = 30000; // 30 seconds
const VFS_HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const DAILY_SNAPSHOT_INTERVAL = 86400000; // 24 hours
const MEMORY_CHECK_INTERVAL = 10000; // 10 seconds
const MAX_DAILY_SNAPSHOTS = 7; // Keep last 7 days

const SESSION_STATE_DB = 'KomaSessionState';
const SESSION_STATE_STORE = 'state';

export class HealthMonitor {
  constructor(kernel, shale) {
    this.kernel = kernel;
    this.shale = shale;
    this.running = false;
    this.checks = [];
    this.intervals = {};
    this.lastSnapshotDate = null;
  }

  /**
   * Start health monitoring
   */
  start() {
    if (this.running) {
      console.warn('[Health] Already running');
      return;
    }

    this.running = true;
    console.log('[Health] Starting health monitor');

    // Session state backup (lightweight)
    this.intervals.sessionBackup = setInterval(() => {
      this.saveSessionState().catch(err => {
        console.error('[Health] Session backup failed:', err);
      });
    }, SESSION_BACKUP_INTERVAL);

    // VFS health check
    this.intervals.vfsHealth = setInterval(() => {
      this.checkVFSHealth().catch(err => {
        console.error('[Health] VFS health check failed:', err);
      });
    }, VFS_HEALTH_CHECK_INTERVAL);

    // Daily VFS snapshot
    this.intervals.dailySnapshot = setInterval(() => {
      this.createDailySnapshot().catch(err => {
        console.error('[Health] Daily snapshot failed:', err);
      });
    }, DAILY_SNAPSHOT_INTERVAL);

    // Memory pressure monitoring (if available)
    if (performance.memory) {
      this.intervals.memory = setInterval(() => {
        this.checkMemoryPressure();
      }, MEMORY_CHECK_INTERVAL);
    }

    // Run initial checks
    this.saveSessionState().catch(() => {});
    this.checkVFSHealth().catch(() => {});
    this.checkForDailySnapshot().catch(() => {});

    console.log('[Health] Health monitor started');
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    console.log('[Health] Stopping health monitor');

    // Clear all intervals
    for (const [name, intervalId] of Object.entries(this.intervals)) {
      clearInterval(intervalId);
    }

    this.intervals = {};
  }

  /**
   * Save lightweight session state (NOT full VFS)
   * This is fast and small - just tabs, history, current input
   */
  async saveSessionState() {
    try {
      const sessionState = {
        timestamp: Date.now(),
        tabs: this.getTabsState(),
        activeTabId: this.shale.activeTabId,
        version: '1.0'
      };

      await this.storeSessionState(sessionState);

      this.recordCheck('session-backup', 'pass', {
        tabs: sessionState.tabs.length,
        size: JSON.stringify(sessionState).length
      });

    } catch (error) {
      this.recordCheck('session-backup', 'fail', { error: error.message });
      throw error;
    }
  }

  /**
   * Get serializable tabs state
   */
  getTabsState() {
    const tabs = [];

    for (const [id, tab] of this.shale.tabs.entries()) {
      tabs.push({
        id,
        name: tab.name,
        cwd: tab.shell.cwd,
        currentInput: tab.currentLine || '',
        cursorPos: tab.cursorPos || 0,
        history: tab.shell.history.slice(-100) // Last 100 commands
      });
    }

    return tabs;
  }

  /**
   * Store session state in separate IndexedDB
   */
  async storeSessionState(sessionState) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(SESSION_STATE_DB, 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(SESSION_STATE_STORE)) {
          db.createObjectStore(SESSION_STATE_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction([SESSION_STATE_STORE], 'readwrite');
        const store = tx.objectStore(SESSION_STATE_STORE);

        // Store under fixed key (overwrites previous)
        const putRequest = store.put({
          id: 'current',
          ...sessionState
        });

        putRequest.onsuccess = () => {
          db.close();
          resolve();
        };

        putRequest.onerror = () => {
          db.close();
          reject(putRequest.error);
        };
      };
    });
  }

  /**
   * Load session state (called during boot)
   */
  static async loadSessionState() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(SESSION_STATE_DB, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;

        // Check if store exists
        if (!db.objectStoreNames.contains(SESSION_STATE_STORE)) {
          db.close();
          resolve(null);
          return;
        }

        const tx = db.transaction([SESSION_STATE_STORE], 'readonly');
        const store = tx.objectStore(SESSION_STATE_STORE);
        const getRequest = store.get('current');

        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result || null);
        };

        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };
      };

      request.onupgradeneeded = () => {
        // No state exists yet
        resolve(null);
      };
    });
  }

  /**
   * Check VFS health
   */
  async checkVFSHealth() {
    try {
      // Verify we can still read/write
      const testPath = `/tmp/.health-check-${Date.now()}`;
      const testContent = `health check ${Date.now()}`;

      await this.kernel.writeFile(testPath, testContent);
      const readContent = await this.kernel.readFile(testPath);
      await this.kernel.unlink(testPath);

      if (readContent !== testContent) {
        throw new Error('VFS read/write mismatch');
      }

      this.recordCheck('vfs-health', 'pass');

    } catch (error) {
      this.recordCheck('vfs-health', 'fail', { error: error.message });
      this.handleVFSFailure(error);
      throw error;
    }
  }

  /**
   * Handle VFS health check failure
   */
  handleVFSFailure(error) {
    console.error('[Health] VFS health check failed:', error);

    // Show user notification
    const shouldRestart = confirm(
      'VFS health check failed. Koma may be unstable.\n\n' +
      'Do you want to restart now?'
    );

    if (shouldRestart) {
      window.location.reload();
    }
  }

  /**
   * Check if we need to create today's snapshot
   */
  async checkForDailySnapshot() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (this.lastSnapshotDate === today) {
      return; // Already created today
    }

    try {
      // Check if snapshot for today exists
      const snapshotPath = `/home/.koma-snapshot-${today}.magma`;
      const exists = await this.fileExists(snapshotPath);

      if (!exists) {
        await this.createDailySnapshot();
      }

      this.lastSnapshotDate = today;

    } catch (error) {
      console.error('[Health] Daily snapshot check failed:', error);
    }
  }

  /**
   * Create daily VFS snapshot
   */
  async createDailySnapshot() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const snapshotPath = `/home/.koma-snapshot-${today}.magma`;

    try {
      // Check if already exists
      if (await this.fileExists(snapshotPath)) {
        console.log('[Health] Daily snapshot already exists:', snapshotPath);
        return;
      }

      console.log('[Health] Creating daily snapshot:', snapshotPath);

      // Export VFS
      const magmaData = await this.kernel.exportVFS();

      // Save to VFS
      await this.kernel.writeFile(snapshotPath, magmaData);

      // Prune old snapshots
      await this.pruneOldSnapshots();

      this.recordCheck('daily-snapshot', 'pass', { path: snapshotPath });

      console.log('[Health] Daily snapshot created:', snapshotPath);

    } catch (error) {
      this.recordCheck('daily-snapshot', 'fail', { error: error.message });
      console.error('[Health] Daily snapshot failed:', error);
    }
  }

  /**
   * Prune old daily snapshots (keep last N days)
   */
  async pruneOldSnapshots() {
    try {
      const entries = await this.kernel.readdir('/home');
      const snapshots = entries
        .filter(e => e.type === 'file' && e.name.match(/^\.koma-snapshot-\d{4}-\d{2}-\d{2}\.magma$/))
        .sort((a, b) => b.name.localeCompare(a.name)); // Newest first

      // Keep only last N snapshots
      const toDelete = snapshots.slice(MAX_DAILY_SNAPSHOTS);

      for (const snapshot of toDelete) {
        const path = `/home/${snapshot.name}`;
        await this.kernel.unlink(path);
        console.log('[Health] Pruned old snapshot:', path);
      }

      if (toDelete.length > 0) {
        console.log(`[Health] Pruned ${toDelete.length} old snapshot(s)`);
      }

    } catch (error) {
      console.error('[Health] Failed to prune old snapshots:', error);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(path) {
    try {
      await this.kernel.stat(path);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check memory pressure
   */
  checkMemoryPressure() {
    if (!performance.memory) {
      return;
    }

    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usage = usedJSHeapSize / jsHeapSizeLimit;

    if (usage > 0.9) {
      console.warn('[Health] High memory usage:', (usage * 100).toFixed(1) + '%');
      this.recordCheck('memory', 'warn', {
        usage: (usage * 100).toFixed(1) + '%',
        used: usedJSHeapSize,
        limit: jsHeapSizeLimit
      });
    } else {
      this.recordCheck('memory', 'pass', {
        usage: (usage * 100).toFixed(1) + '%'
      });
    }
  }

  /**
   * Record a health check result
   */
  recordCheck(name, status, details = {}) {
    const check = {
      name,
      status, // 'pass', 'warn', 'fail'
      details,
      timestamp: Date.now()
    };

    this.checks.push(check);

    // Keep only last 100 checks
    if (this.checks.length > 100) {
      this.checks.shift();
    }

    // Log failures and warnings
    if (status === 'fail') {
      console.error(`[Health] Check failed: ${name}`, details);
    } else if (status === 'warn') {
      console.warn(`[Health] Check warning: ${name}`, details);
    }
  }

  /**
   * Get health report
   */
  getReport() {
    const recent = this.checks.slice(-20); // Last 20 checks
    const failedCount = recent.filter(c => c.status === 'fail').length;
    const warnCount = recent.filter(c => c.status === 'warn').length;

    return {
      running: this.running,
      checks: recent,
      summary: {
        total: recent.length,
        failed: failedCount,
        warnings: warnCount,
        healthy: failedCount === 0
      }
    };
  }
}
