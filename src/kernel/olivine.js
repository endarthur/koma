/**
 * Olivine - Koma Kernel
 *
 * Named after olivine crystals, the defining mineral in komatiite rocks.
 * The olivine kernel is Koma's execution environment and VFS manager.
 *
 * Architecture:
 * - VFS: Virtual filesystem backed by IndexedDB (Phase 3/4)
 * - ProcessManager: JavaScript execution engine (Phase 5)
 * - Scheduler: Cron-style task scheduling (Phase 5)
 * - StandardLibrary: APIs for scripts (Phase 5)
 */

import * as Comlink from 'https://esm.sh/comlink@4.4.1';

console.log('[Olivine] Worker file loaded, Comlink imported');

// ============================================================================
// Version Information (Phase 5.5)
// ============================================================================

export const KOMA_VERSION = '0.5.0';
export const KOMA_BUILD_DATE = '2025-11-10';

// ============================================================================
// VFS Layer (Phase 3/4 - Current Implementation)
// ============================================================================

const DB_NAME = 'KomaVFS';
const DB_VERSION = 2; // Bumped to force clean migration after Phase 5 changes
const STORE_NAME = 'filesystem';

class VFS {
  constructor() {
    this.db = null;
    this.ready = this.initialize();
  }

  async initialize() {
    console.log('[VFS] Initializing IndexedDB...');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[VFS] IndexedDB error:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[VFS] IndexedDB ready');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('[VFS] Upgrade needed');
        const db = event.target.result;
        const transaction = event.target.transaction;
        let store;
        let isNewStore = false;

        // Create object store for filesystem if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.log('[VFS] Creating new object store');
          store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
          store.createIndex('parent', 'parent', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          isNewStore = true;
        } else {
          console.log('[VFS] Object store exists, getting it');
          store = transaction.objectStore(STORE_NAME);

          // Ensure indexes exist (in case of partial upgrade)
          if (!store.indexNames.contains('parent')) {
            console.log('[VFS] Creating parent index');
            store.createIndex('parent', 'parent', { unique: false });
          }
          if (!store.indexNames.contains('type')) {
            console.log('[VFS] Creating type index');
            store.createIndex('type', 'type', { unique: false });
          }
        }

        // Only initialize root directory if this is a brand new store
        if (!isNewStore) {
          console.log('[VFS] Store exists, skipping initialization');
          return;
        }

        console.log('[VFS] Initializing root directory and basic structure');
        const now = Date.now();

        // Root directory
        store.put({
          path: '/',
          name: '',
          type: 'directory',
          parent: null,
          created: now,
          modified: now,
          size: 0,
        });

        // Standard directories
        const dirs = ['/home', '/tmp', '/usr', '/usr/bin', '/usr/share', '/usr/share/man', '/etc', '/mnt', '/proc'];
        dirs.forEach(dir => {
          const parts = dir.split('/').filter(p => p);
          const name = parts[parts.length - 1];
          const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

          store.put({
            path: dir,
            name,
            type: 'directory',
            parent,
            created: now,
            modified: now,
            size: 0,
          });
        });

        // Initialize man pages (done in transaction for atomicity)
        this.initManPages(store, now);
      };
    });
  }

  /**
   * Initialize man pages in /usr/share/man/
   * Called during VFS initialization
   */
  initManPages(store, now) {
    // We'll dynamically import and write man pages after VFS is ready
    // For now, just mark that man pages should be initialized
    this.needsManPageInit = true;
  }

  /**
   * Write initial man pages if needed
   * Called after VFS is fully ready
   */
  async ensureManPages() {
    if (!this.needsManPageInit) {
      return;
    }

    try {
      // Check if man pages already exist
      const manDir = await this.readdir('/usr/share/man');
      if (manDir.length > 0) {
        this.needsManPageInit = false;
        return;
      }
    } catch (error) {
      // Directory doesn't exist or other error, continue with init
    }

    try {
      // Dynamic import of man pages
      const { manPages } = await import('../utils/man-pages.js');

      // Write each man page
      for (const [filename, content] of Object.entries(manPages)) {
        const path = `/usr/share/man/${filename}`;
        await this.writeFile(path, content);
      }

      console.log('[VFS] Man pages initialized');
      this.needsManPageInit = false;
    } catch (error) {
      console.error('[VFS] Failed to initialize man pages:', error);
    }
  }

  /**
   * Get current system version from /etc/koma-version
   * Returns null if file doesn't exist
   */
  async getSystemVersion() {
    try {
      const content = await this.readFile('/etc/koma-version');
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist yet
      return null;
    }
  }

  /**
   * Write system version to /etc/koma-version
   */
  async setSystemVersion(version, buildDate) {
    const versionData = {
      version,
      buildDate,
      updatedAt: new Date().toISOString(),
      manPagesCount: 37 // Updated during Phase 5.5
    };
    await this.writeFile('/etc/koma-version', JSON.stringify(versionData, null, 2));
    console.log('[VFS] System version updated to', version);
  }

  /**
   * Update system files (man pages, etc.)
   */
  async updateSystemFiles() {
    try {
      console.log('[VFS] Updating system files...');

      // Dynamic import of man pages
      const { manPages } = await import('../utils/man-pages.js');

      // Write each man page (overwrite existing)
      for (const [filename, content] of Object.entries(manPages)) {
        const path = `/usr/share/man/${filename}`;
        await this.writeFile(path, content);
      }

      // Update version file
      await this.setSystemVersion(KOMA_VERSION, KOMA_BUILD_DATE);

      console.log('[VFS] System files updated successfully');
      return { success: true, filesUpdated: Object.keys(manPages).length };
    } catch (error) {
      console.error('[VFS] Failed to update system files:', error);
      throw error;
    }
  }

  async readdir(path) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('parent');
      const request = index.getAll(path);

      request.onsuccess = () => {
        const entries = request.result.map(entry => ({
          name: entry.name,
          type: entry.type,
          size: entry.size || 0,
          modified: entry.modified,
          created: entry.created,
        }));
        resolve(entries);
      };

      request.onerror = () => reject(new Error(`Cannot read directory: ${path}`));
    });
  }

  async readFile(path) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(path);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry) {
          reject(new Error(`ENOENT: no such file or directory: ${path}`));
        } else if (entry.type !== 'file') {
          reject(new Error(`EISDIR: illegal operation on a directory: ${path}`));
        } else {
          resolve(entry.content || '');
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async writeFile(path, content) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Get parent directory
      const parts = path.split('/').filter(p => p);
      const name = parts[parts.length - 1];
      const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

      // Check if file exists
      const getRequest = store.get(path);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const now = Date.now();

        const entry = {
          path,
          name,
          type: 'file',
          parent,
          content,
          size: content.length,
          modified: now,
          created: existing ? existing.created : now,
        };

        const putRequest = store.put(entry);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async mkdir(path) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const parts = path.split('/').filter(p => p);
      const name = parts[parts.length - 1];
      const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

      // Check if already exists
      const getRequest = store.get(path);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          reject(new Error(`EEXIST: directory already exists: ${path}`));
          return;
        }

        const now = Date.now();
        const entry = {
          path,
          name,
          type: 'directory',
          parent,
          created: now,
          modified: now,
          size: 0,
        };

        const putRequest = store.put(entry);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async unlink(path) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Check if it's a directory with children
      const index = store.index('parent');
      const childrenRequest = index.getAll(path);

      childrenRequest.onsuccess = () => {
        const children = childrenRequest.result;
        if (children.length > 0) {
          reject(new Error(`ENOTEMPTY: directory not empty: ${path}`));
          return;
        }

        const deleteRequest = store.delete(path);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };

      childrenRequest.onerror = () => reject(childrenRequest.error);
    });
  }

  async stat(path) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(path);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry) {
          reject(new Error(`ENOENT: no such file or directory: ${path}`));
        } else {
          resolve({
            type: entry.type,
            size: entry.size || 0,
            created: entry.created,
            modified: entry.modified,
          });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async rename(oldPath, newPath) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Read old entry
      const getRequest = store.get(oldPath);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (!entry) {
          reject(new Error(`ENOENT: no such file or directory: ${oldPath}`));
          return;
        }

        // Delete old entry
        const deleteRequest = store.delete(oldPath);

        deleteRequest.onsuccess = () => {
          // Create new entry with updated path and name
          const parts = newPath.split('/').filter(p => p);
          const name = parts[parts.length - 1];
          const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

          const newEntry = {
            ...entry,
            path: newPath,
            name,
            parent,
            modified: Date.now(),
          };

          const putRequest = store.put(newEntry);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };

        deleteRequest.onerror = () => reject(deleteRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async copyFile(srcPath, destPath) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Read source file
      const getRequest = store.get(srcPath);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (!entry) {
          reject(new Error(`ENOENT: no such file or directory: ${srcPath}`));
          return;
        }

        if (entry.type !== 'file') {
          reject(new Error(`EISDIR: illegal operation on a directory: ${srcPath}`));
          return;
        }

        // Create new entry at destination
        const parts = destPath.split('/').filter(p => p);
        const name = parts[parts.length - 1];
        const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

        const newEntry = {
          path: destPath,
          name,
          parent,
          type: 'file',
          content: entry.content,
          size: entry.size,
          created: Date.now(),
          modified: Date.now(),
        };

        const putRequest = store.put(newEntry);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async move(srcPath, destPath) {
    // move is the same as rename
    return this.rename(srcPath, destPath);
  }
}

// ============================================================================
// Process Manager (Phase 5)
// ============================================================================

/**
 * Process - Represents a running JavaScript process
 */
class Process {
  constructor(pid, scriptPath, args, env, vfs) {
    this.pid = pid;
    this.scriptPath = scriptPath;
    this.args = args;
    this.env = env;
    this.vfs = vfs;

    this.status = 'running';
    this.startTime = Date.now();
    this.endTime = null;
    this.exitCode = null;

    // Output buffers
    this.stdout = [];
    this.stderr = [];

    // Promise that resolves when process exits
    this.exitPromise = null;
    this.resolveExit = null;
    this.rejectExit = null;
  }

  /**
   * Execute the script
   */
  async run(stdlibModules) {
    this.exitPromise = new Promise((resolve, reject) => {
      this.resolveExit = resolve;
      this.rejectExit = reject;
    });

    try {
      // Read script from VFS
      const scriptCode = await this.vfs.readFile(this.scriptPath);

      // Create custom console for capturing output
      const customConsole = {
        log: (...args) => {
          const message = args.map(a => String(a)).join(' ');
          this.stdout.push(message);
        },
        error: (...args) => {
          const message = args.map(a => String(a)).join(' ');
          this.stderr.push(message);
        },
        warn: (...args) => {
          const message = args.map(a => String(a)).join(' ');
          this.stderr.push(`[WARN] ${message}`);
        },
        info: (...args) => {
          const message = args.map(a => String(a)).join(' ');
          this.stdout.push(message);
        }
      };

      // Create async function with stdlib and console injected
      // AsyncFunction signature: (...params, body)
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction(
        'args',      // Command-line arguments array
        'env',       // Environment variables
        'console',   // Console for stdout/stderr
        'fs',        // Filesystem module
        'http',      // HTTP module
        'notify',    // Notifications module
        'path',      // Path utilities module
        'argparse',  // Argument parsing module
        scriptCode
      );

      // Execute script with injected modules
      await fn(
        this.args,
        this.env,
        customConsole,
        stdlibModules.fs,
        stdlibModules.http,
        stdlibModules.notify,
        stdlibModules.path,
        stdlibModules.args
      );

      // Script completed successfully
      this.status = 'completed';
      this.exitCode = 0;
      this.endTime = Date.now();
      this.resolveExit(0);

    } catch (error) {
      // Script failed with error
      this.status = 'failed';
      this.exitCode = 1;
      this.endTime = Date.now();
      this.stderr.push(`Error: ${error.message}`);
      if (error.stack) {
        this.stderr.push(error.stack);
      }
      this.rejectExit(error);
    }
  }

  /**
   * Get all output since last call (consumed)
   */
  getOutput() {
    const output = {
      stdout: this.stdout.slice(),
      stderr: this.stderr.slice()
    };
    this.stdout = [];
    this.stderr = [];
    return output;
  }

  /**
   * Get process info for ps command
   */
  getInfo() {
    return {
      pid: this.pid,
      script: this.scriptPath,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      exitCode: this.exitCode,
      runtime: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime
    };
  }

  /**
   * Wait for process to exit
   */
  async wait() {
    return this.exitPromise;
  }

  /**
   * Kill the process
   */
  kill() {
    if (this.status === 'running') {
      this.status = 'killed';
      this.exitCode = 137; // SIGKILL
      this.endTime = Date.now();
      this.resolveExit(137);
    }
  }
}

/**
 * ProcessManager - Manages script execution
 */
class ProcessManager {
  constructor(vfs) {
    this.processes = new Map();
    this.nextPid = 1;
    this.vfs = vfs;
    this.stdlibModules = null; // Injected after stdlib is created
  }

  /**
   * Set standard library modules for injection into scripts
   */
  setStdlib(stdlibModules) {
    this.stdlibModules = stdlibModules;
  }

  /**
   * Spawn a new process to execute a script
   */
  async spawn(scriptPath, args = [], env = {}) {
    if (!this.stdlibModules) {
      throw new Error('Standard library not initialized');
    }

    const pid = this.nextPid++;
    const process = new Process(pid, scriptPath, args, env, this.vfs);

    this.processes.set(pid, process);

    // Start execution (non-blocking)
    process.run(this.stdlibModules).finally(() => {
      // Clean up completed processes after 60 seconds
      setTimeout(() => {
        if (this.processes.get(pid)?.status !== 'running') {
          this.processes.delete(pid);
        }
      }, 60000);
    });

    return pid;
  }

  /**
   * Kill a process by PID
   */
  async kill(pid) {
    const process = this.processes.get(pid);
    if (!process) {
      throw new Error(`No such process: ${pid}`);
    }

    process.kill();
    return { pid, status: 'killed' };
  }

  /**
   * List all processes
   */
  async ps() {
    return Array.from(this.processes.values()).map(p => p.getInfo());
  }

  /**
   * Wait for a process to exit
   */
  async wait(pid) {
    const process = this.processes.get(pid);
    if (!process) {
      throw new Error(`No such process: ${pid}`);
    }

    return process.wait();
  }

  /**
   * Get process output (for streaming to terminal)
   */
  async getOutput(pid) {
    const process = this.processes.get(pid);
    if (!process) {
      throw new Error(`No such process: ${pid}`);
    }

    return process.getOutput();
  }

  /**
   * Get process by PID
   */
  getProcess(pid) {
    return this.processes.get(pid);
  }
}

// ============================================================================
// Scheduler (Phase 5)
// ============================================================================

/**
 * Parse a single cron field
 * @param {string} field - Cron field (e.g., "*", "*\/5", "1-5", "1,3,5")
 * @param {number} min - Minimum value for field
 * @param {number} max - Maximum value for field
 * @returns {Array<number>} Array of matching values
 */
function parseCronField(field, min, max) {
  // Wildcard: all values
  if (field === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  // Step values: */N
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    const values = [];
    for (let i = min; i <= max; i += step) {
      values.push(i);
    }
    return values;
  }

  // Range: N-M
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(n => parseInt(n, 10));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // List: N,M,P
  if (field.includes(',')) {
    return field.split(',').map(n => parseInt(n.trim(), 10));
  }

  // Single value
  return [parseInt(field, 10)];
}

/**
 * Parse cron expression
 * @param {string} expr - Cron expression (5 fields: minute hour day month weekday)
 * @returns {Object} Parsed cron object
 */
function parseCron(expr) {
  const fields = expr.trim().split(/\s+/);

  if (fields.length !== 5) {
    throw new Error('Invalid cron expression: must have 5 fields (minute hour day month weekday)');
  }

  return {
    minutes: parseCronField(fields[0], 0, 59),
    hours: parseCronField(fields[1], 0, 23),
    days: parseCronField(fields[2], 1, 31),
    months: parseCronField(fields[3], 1, 12),
    weekdays: parseCronField(fields[4], 0, 6) // 0 = Sunday
  };
}

/**
 * Calculate next run time for cron expression
 * @param {Object} cron - Parsed cron object
 * @param {Date} from - Start time (defaults to now)
 * @returns {Date} Next execution time
 */
function getNextCronTime(cron, from = new Date()) {
  const next = new Date(from);
  next.setSeconds(0);
  next.setMilliseconds(0);

  // Start from next minute
  next.setMinutes(next.getMinutes() + 1);

  // Iterate up to 4 years (to avoid infinite loops)
  const maxIterations = 4 * 365 * 24 * 60;
  let iterations = 0;

  while (iterations++ < maxIterations) {
    const month = next.getMonth() + 1; // JavaScript months are 0-indexed
    const day = next.getDate();
    const weekday = next.getDay();
    const hour = next.getHours();
    const minute = next.getMinutes();

    if (
      cron.months.includes(month) &&
      cron.days.includes(day) &&
      cron.weekdays.includes(weekday) &&
      cron.hours.includes(hour) &&
      cron.minutes.includes(minute)
    ) {
      return next;
    }

    // Advance to next minute
    next.setMinutes(next.getMinutes() + 1);
  }

  throw new Error('Could not find next cron execution time');
}

/**
 * Scheduler - Manages cron-style scheduled jobs
 */
class Scheduler {
  constructor(processManager) {
    this.jobs = new Map();
    this.nextJobId = 1;
    this.processManager = processManager;
  }

  /**
   * Add a scheduled job
   * @param {string} schedule - Cron expression
   * @param {string} scriptPath - Script to execute
   * @returns {Promise<Object>} Job object with ID
   */
  async addJob(schedule, scriptPath) {
    try {
      // Parse and validate cron expression
      const cron = parseCron(schedule);
      const nextRun = getNextCronTime(cron);

      const jobId = this.nextJobId++;
      const job = {
        id: jobId,
        schedule,
        cron,
        scriptPath,
        nextRun,
        lastRun: null,
        lastPid: null,
        enabled: true,
        timer: null
      };

      this.jobs.set(jobId, job);

      // Schedule first execution
      this.scheduleJob(job);

      console.log(`[Scheduler] Job ${jobId} added: ${schedule} ${scriptPath}`);
      console.log(`[Scheduler] Next run: ${nextRun.toISOString()}`);

      return {
        id: jobId,
        schedule,
        scriptPath,
        nextRun: nextRun.toISOString()
      };

    } catch (error) {
      throw new Error(`Invalid cron expression: ${error.message}`);
    }
  }

  /**
   * Schedule a job's next execution
   */
  scheduleJob(job) {
    if (!job.enabled) {
      return;
    }

    // Clear existing timer
    if (job.timer) {
      clearTimeout(job.timer);
    }

    const now = Date.now();
    const delay = job.nextRun.getTime() - now;

    if (delay < 0) {
      // Next run is in the past, recalculate
      job.nextRun = getNextCronTime(job.cron);
      this.scheduleJob(job);
      return;
    }

    // Schedule execution
    job.timer = setTimeout(async () => {
      await this.executeJob(job);
    }, delay);
  }

  /**
   * Execute a job
   */
  async executeJob(job) {
    try {
      console.log(`[Scheduler] Executing job ${job.id}: ${job.scriptPath}`);

      // Spawn process
      const pid = await this.processManager.spawn(job.scriptPath, [], {});

      job.lastRun = new Date();
      job.lastPid = pid;

      // Calculate next run time
      job.nextRun = getNextCronTime(job.cron, job.lastRun);

      // Schedule next execution
      this.scheduleJob(job);

      console.log(`[Scheduler] Job ${job.id} next run: ${job.nextRun.toISOString()}`);

    } catch (error) {
      console.error(`[Scheduler] Job ${job.id} failed:`, error);

      // Still schedule next run even if this one failed
      job.nextRun = getNextCronTime(job.cron);
      this.scheduleJob(job);
    }
  }

  /**
   * Remove a scheduled job
   * @param {number} id - Job ID
   */
  async removeJob(id) {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`No such job: ${id}`);
    }

    // Clear timer
    if (job.timer) {
      clearTimeout(job.timer);
    }

    this.jobs.delete(id);

    console.log(`[Scheduler] Job ${id} removed`);

    return { id, status: 'removed' };
  }

  /**
   * List all scheduled jobs
   * @returns {Promise<Array>} Array of job info objects
   */
  async listJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      schedule: job.schedule,
      scriptPath: job.scriptPath,
      nextRun: job.nextRun.toISOString(),
      lastRun: job.lastRun ? job.lastRun.toISOString() : null,
      lastPid: job.lastPid,
      enabled: job.enabled
    }));
  }
}

// ============================================================================
// Olivine - Main Kernel Class
// ============================================================================

class KomaKernel {
  constructor() {
    this.vfs = new VFS();
    this.processes = new ProcessManager(this.vfs);
    this.scheduler = new Scheduler(this.processes);
    this.version = KOMA_VERSION;
    this.buildDate = KOMA_BUILD_DATE;
    this.stdlibReady = null; // Will be set when initialized

    console.log('[Olivine] Kernel constructed, version', this.version);
  }

  /**
   * Initialize standard library modules (called lazily on first use)
   */
  async ensureStdlibReady() {
    // Return cached promise if already initializing/initialized
    if (this.stdlibReady) {
      return this.stdlibReady;
    }

    // Create and cache the initialization promise
    this.stdlibReady = (async () => {
      try {
        console.log('[Olivine] Initializing stdlib...');
        // Wait for VFS to be ready
        await this.vfs.ready;
        console.log('[Olivine] VFS ready');

        // Initialize man pages if this is first boot
        await this.vfs.ensureManPages();

        // Dynamic import of stdlib modules (works in workers!)
        console.log('[Olivine] Loading stdlib modules...');
        const [fsModule, httpModule, notifyModule, pathModule, argsModule] = await Promise.all([
          import('../stdlib/fs.js'),
          import('../stdlib/http.js'),
          import('../stdlib/notify.js'),
          import('../stdlib/path.js'),
          import('../stdlib/args.js')
        ]);

        // Create stdlib modules with VFS access
        const stdlibModules = {
          fs: fsModule.createFsModule(this.vfs),
          http: httpModule.createHttpModule(),
          notify: notifyModule.createNotifyModule(),
          path: pathModule.createPathModule(),
          args: argsModule.createArgsModule()
        };

        // Inject stdlib into process manager
        this.processes.setStdlib(stdlibModules);

        console.log('[Olivine] Standard library initialized');
      } catch (error) {
        console.error('[Olivine] Failed to initialize stdlib:', error);
        throw error;
      }
    })();

    return this.stdlibReady;
  }

  // ========== VFS Methods ==========
  async readFile(path) { return this.vfs.readFile(path); }
  async writeFile(path, content) { return this.vfs.writeFile(path, content); }
  async readdir(path) { return this.vfs.readdir(path); }
  async mkdir(path) { return this.vfs.mkdir(path); }
  async unlink(path) { return this.vfs.unlink(path); }
  async stat(path) { return this.vfs.stat(path); }
  async rename(oldPath, newPath) { return this.vfs.rename(oldPath, newPath); }
  async copyFile(srcPath, destPath) { return this.vfs.copyFile(srcPath, destPath); }
  async move(srcPath, destPath) { return this.vfs.move(srcPath, destPath); }

  // ========== Process Methods (Phase 5) ==========
  async spawn(script, args, env) {
    await this.ensureStdlibReady();
    return this.processes.spawn(script, args, env);
  }
  async kill(pid) { return this.processes.kill(pid); }
  async ps() { return this.processes.ps(); }
  async wait(pid) { return this.processes.wait(pid); }
  async getOutput(pid) { return this.processes.getOutput(pid); }
  setStdlib(stdlibModules) { this.processes.setStdlib(stdlibModules); }

  // ========== Scheduler Methods (Phase 5) ==========
  async crontab(schedule, script) { return this.scheduler.addJob(schedule, script); }
  async cronlist() { return this.scheduler.listJobs(); }
  async cronrm(id) { return this.scheduler.removeJob(id); }

  // ========== Utility Methods ==========
  async ping() {
    console.log('[Olivine] ping() called');
    // Ensure stdlib is initialized (which waits for VFS)
    await this.ensureStdlibReady();
    console.log('[Olivine] ping() - stdlib ready, returning pong');
    return 'pong';
  }

  async getVersion() {
    return this.version;
  }

  // ========== System Update Methods (Phase 5.5) ==========
  async getSystemInfo() {
    await this.ensureStdlibReady();

    const storedVersion = await this.vfs.getSystemVersion();
    const manPages = await this.vfs.readdir('/usr/share/man');

    return {
      currentVersion: this.version,
      buildDate: this.buildDate,
      storedVersion: storedVersion ? storedVersion.version : null,
      lastUpdate: storedVersion ? storedVersion.updatedAt : null,
      manPagesCount: manPages.length,
      hasUpdate: storedVersion ? storedVersion.version !== this.version : true
    };
  }

  async checkSystemUpdate() {
    await this.ensureStdlibReady();

    const storedVersion = await this.vfs.getSystemVersion();
    const hasUpdate = !storedVersion || storedVersion.version !== this.version;

    return {
      currentVersion: storedVersion ? storedVersion.version : 'not set',
      availableVersion: this.version,
      hasUpdate,
      changes: hasUpdate ? ['Updated man pages (37 total)', 'System file improvements'] : []
    };
  }

  async upgradeSystem() {
    await this.ensureStdlibReady();

    const before = await this.vfs.getSystemVersion();
    const result = await this.vfs.updateSystemFiles();

    return {
      success: result.success,
      previousVersion: before ? before.version : 'none',
      newVersion: this.version,
      filesUpdated: result.filesUpdated
    };
  }

  async resetSystem() {
    await this.ensureStdlibReady();

    // Force update by calling updateSystemFiles
    const result = await this.vfs.updateSystemFiles();

    return {
      success: result.success,
      message: 'System files reset to defaults',
      filesReset: result.filesUpdated
    };
  }
}

// ============================================================================
// Initialize and Expose via Comlink
// ============================================================================

console.log('[Olivine] Creating kernel instance...');
const kernel = new KomaKernel();
console.log('[Olivine] Exposing kernel via Comlink...');
Comlink.expose(kernel);
console.log('[Olivine] Worker fully initialized and exposed');
