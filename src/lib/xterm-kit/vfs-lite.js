/**
 * xterm-kit: VFS Lite
 * Lightweight virtual filesystem for browser applications
 *
 * Extracted from koma's olivine kernel - core VFS only
 * Supports IndexedDB (persistent) and Memory (ephemeral) backends
 */

const DB_VERSION = 1;
const STORE_NAME = 'filesystem';

/**
 * Create a VFS error with proper code property
 * @param {string} code - Error code (ENOENT, EEXIST, EISDIR, ENOTEMPTY, etc.)
 * @param {string} message - Error message
 * @param {string} path - File path related to the error
 * @returns {Error} Error object with code property
 */
function createVFSError(code, message, path) {
  const error = new Error(`${code}: ${message}: ${path}`);
  error.code = code;
  error.path = path;
  return error;
}

/**
 * Virtual Filesystem (Lite)
 * Provides a Node.js-like filesystem API in the browser
 */
export class VFSLite {
  /**
   * Create a VFS instance
   * @param {object} options - Configuration options
   * @param {string} [options.backend='indexeddb'] - Storage backend: 'indexeddb' or 'memory'
   * @param {string} [options.dbName='vfs'] - Database name (for IndexedDB)
   */
  constructor(options = {}) {
    this.backend = options.backend || 'indexeddb';
    this.dbName = options.dbName || 'vfs';
    this.db = null;
    this.memoryStore = null;

    if (this.backend === 'memory') {
      this.memoryStore = new Map();
      this.ready = this.initializeMemory();
    } else {
      this.ready = this.initializeIndexedDB();
    }
  }

  /**
   * Normalize a path by removing double slashes, resolving . and ..
   * @param {string} path - Path to normalize
   * @returns {string} Normalized path
   */
  normalizePath(path) {
    if (!path || path === '') return '/';

    const isAbsolute = path.startsWith('/');
    const parts = path.split('/').filter(p => p && p !== '.');
    const normalized = [];

    for (const part of parts) {
      if (part === '..') {
        if (normalized.length > 0 && normalized[normalized.length - 1] !== '..') {
          normalized.pop();
        } else if (!isAbsolute) {
          normalized.push('..');
        }
      } else {
        normalized.push(part);
      }
    }

    const result = normalized.join('/');
    return isAbsolute ? (result === '' ? '/' : '/' + result) : (result === '' ? '.' : result);
  }

  /**
   * Initialize memory backend
   */
  async initializeMemory() {
    const now = Date.now();

    // Create root directory
    this.memoryStore.set('/', {
      path: '/',
      name: '',
      type: 'directory',
      parent: null,
      created: now,
      modified: now,
      size: 0,
    });

    // Create standard directories
    const dirs = ['/home', '/tmp'];
    for (const dir of dirs) {
      const parts = dir.split('/').filter(p => p);
      const name = parts[parts.length - 1];
      const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

      this.memoryStore.set(dir, {
        path: dir,
        name,
        type: 'directory',
        parent,
        created: now,
        modified: now,
        size: 0,
      });
    }

    return Promise.resolve();
  }

  /**
   * Initialize IndexedDB backend
   */
  async initializeIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;
        let store;

        // Create object store for filesystem if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
          store.createIndex('parent', 'parent', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        } else {
          store = transaction.objectStore(STORE_NAME);
        }

        // Initialize root directory
        const now = Date.now();

        store.put({
          path: '/',
          name: '',
          type: 'directory',
          parent: null,
          created: now,
          modified: now,
          size: 0,
        });

        // Create standard directories
        const dirs = ['/home', '/tmp'];
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
      };
    });
  }

  /**
   * Read directory contents
   * @param {string} path - Directory path
   * @returns {Promise<Array>} Array of directory entries
   */
  async readdir(path) {
    await this.ready;
    path = this.normalizePath(path);

    if (this.backend === 'memory') {
      const entries = [];
      for (const [key, entry] of this.memoryStore.entries()) {
        if (entry.parent === path) {
          entries.push({
            name: entry.name,
            type: entry.type,
            size: entry.size || 0,
            modified: entry.modified,
            created: entry.created,
          });
        }
      }
      return entries;
    }

    // IndexedDB backend
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

  /**
   * Read file contents
   * @param {string} path - File path
   * @returns {Promise<string>} File content
   */
  async readFile(path) {
    await this.ready;
    path = this.normalizePath(path);

    if (this.backend === 'memory') {
      const entry = this.memoryStore.get(path);
      if (!entry) {
        throw createVFSError('ENOENT', 'no such file or directory', path);
      }
      if (entry.type !== 'file') {
        throw createVFSError('EISDIR', 'illegal operation on a directory', path);
      }
      return entry.content || '';
    }

    // IndexedDB backend
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(path);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry) {
          reject(createVFSError('ENOENT', 'no such file or directory', path));
        } else if (entry.type !== 'file') {
          reject(createVFSError('EISDIR', 'illegal operation on a directory', path));
        } else {
          resolve(entry.content || '');
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Write file contents
   * @param {string} path - File path
   * @param {string} content - File content
   * @returns {Promise<void>}
   */
  async writeFile(path, content) {
    await this.ready;
    path = this.normalizePath(path);

    const parts = path.split('/').filter(p => p);
    const name = parts[parts.length - 1];
    const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

    if (this.backend === 'memory') {
      // Check if parent exists
      const parentEntry = this.memoryStore.get(parent);
      if (parent !== '/' && !parentEntry) {
        throw createVFSError('ENOENT', 'no such file or directory', parent);
      }
      if (parentEntry && parentEntry.type !== 'directory') {
        throw createVFSError('ENOTDIR', 'not a directory', parent);
      }

      const existing = this.memoryStore.get(path);
      const now = Date.now();

      this.memoryStore.set(path, {
        path,
        name,
        type: 'file',
        parent,
        content,
        size: content.length,
        modified: now,
        created: existing ? existing.created : now,
      });

      return;
    }

    // IndexedDB backend
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const createOrUpdateFile = () => {
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
      };

      // Check if parent exists
      if (parent !== '/') {
        const parentCheck = store.get(parent);
        parentCheck.onsuccess = () => {
          if (!parentCheck.result) {
            reject(createVFSError('ENOENT', 'no such file or directory', parent));
            return;
          }
          if (parentCheck.result.type !== 'directory') {
            reject(createVFSError('ENOTDIR', 'not a directory', parent));
            return;
          }
          createOrUpdateFile();
        };
        parentCheck.onerror = () => reject(parentCheck.error);
      } else {
        createOrUpdateFile();
      }
    });
  }

  /**
   * Create directory
   * @param {string} path - Directory path
   * @returns {Promise<void>}
   */
  async mkdir(path) {
    await this.ready;
    path = this.normalizePath(path);

    const parts = path.split('/').filter(p => p);
    const name = parts[parts.length - 1];
    const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

    if (this.backend === 'memory') {
      // Check if already exists
      if (this.memoryStore.has(path)) {
        throw createVFSError('EEXIST', 'directory already exists', path);
      }

      // Check if parent exists
      const parentEntry = this.memoryStore.get(parent);
      if (parent !== '/' && !parentEntry) {
        throw createVFSError('ENOENT', 'no such file or directory', parent);
      }
      if (parentEntry && parentEntry.type !== 'directory') {
        throw createVFSError('ENOTDIR', 'not a directory', parent);
      }

      const now = Date.now();
      this.memoryStore.set(path, {
        path,
        name,
        type: 'directory',
        parent,
        created: now,
        modified: now,
        size: 0,
      });

      return;
    }

    // IndexedDB backend
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Check if already exists
      const getRequest = store.get(path);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          reject(createVFSError('EEXIST', 'directory already exists', path));
          return;
        }

        const createDir = () => {
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

        // Check if parent exists
        if (parent !== '/') {
          const parentCheck = store.get(parent);
          parentCheck.onsuccess = () => {
            if (!parentCheck.result) {
              reject(createVFSError('ENOENT', 'no such file or directory', parent));
              return;
            }
            if (parentCheck.result.type !== 'directory') {
              reject(createVFSError('ENOTDIR', 'not a directory', parent));
              return;
            }
            createDir();
          };
          parentCheck.onerror = () => reject(parentCheck.error);
        } else {
          createDir();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Delete file or empty directory
   * @param {string} path - Path to delete
   * @returns {Promise<void>}
   */
  async unlink(path) {
    await this.ready;
    path = this.normalizePath(path);

    if (this.backend === 'memory') {
      const entry = this.memoryStore.get(path);
      if (!entry) {
        throw createVFSError('ENOENT', 'no such file or directory', path);
      }

      // Check if directory has children
      if (entry.type === 'directory') {
        for (const [key, value] of this.memoryStore.entries()) {
          if (value.parent === path) {
            throw createVFSError('ENOTEMPTY', 'directory not empty', path);
          }
        }
      }

      this.memoryStore.delete(path);
      return;
    }

    // IndexedDB backend
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(path);

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          reject(createVFSError('ENOENT', 'no such file or directory', path));
          return;
        }

        // Check if directory has children
        const index = store.index('parent');
        const childrenRequest = index.getAll(path);

        childrenRequest.onsuccess = () => {
          const children = childrenRequest.result;
          if (children.length > 0) {
            reject(createVFSError('ENOTEMPTY', 'directory not empty', path));
            return;
          }

          const deleteRequest = store.delete(path);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        };

        childrenRequest.onerror = () => reject(childrenRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Get file/directory stats
   * @param {string} path - Path to stat
   * @returns {Promise<object>} Stats object
   */
  async stat(path) {
    await this.ready;
    path = this.normalizePath(path);

    if (this.backend === 'memory') {
      const entry = this.memoryStore.get(path);
      if (!entry) {
        throw createVFSError('ENOENT', 'no such file or directory', path);
      }
      return {
        type: entry.type,
        size: entry.size || 0,
        created: entry.created,
        modified: entry.modified,
      };
    }

    // IndexedDB backend
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(path);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry) {
          reject(createVFSError('ENOENT', 'no such file or directory', path));
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

  /**
   * Check if path exists
   * @param {string} path - Path to check
   * @returns {Promise<boolean>} True if exists
   */
  async exists(path) {
    await this.ready;
    path = this.normalizePath(path);

    try {
      await this.stat(path);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Rename/move a file or directory
   * @param {string} oldPath - Current path
   * @param {string} newPath - New path
   * @returns {Promise<void>}
   */
  async rename(oldPath, newPath) {
    await this.ready;
    oldPath = this.normalizePath(oldPath);
    newPath = this.normalizePath(newPath);

    if (this.backend === 'memory') {
      const entry = this.memoryStore.get(oldPath);
      if (!entry) {
        throw createVFSError('ENOENT', 'no such file or directory', oldPath);
      }

      // Parse new path
      const parts = newPath.split('/').filter(p => p);
      const name = parts[parts.length - 1];
      const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

      // Update entry
      const newEntry = {
        ...entry,
        path: newPath,
        name,
        parent,
        modified: Date.now(),
      };

      // Delete old, add new
      this.memoryStore.delete(oldPath);
      this.memoryStore.set(newPath, newEntry);

      return;
    }

    // IndexedDB backend
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Read old entry
      const getRequest = store.get(oldPath);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (!entry) {
          reject(createVFSError('ENOENT', 'no such file or directory', oldPath));
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

  /**
   * Copy a file
   * @param {string} srcPath - Source file path
   * @param {string} destPath - Destination file path
   * @returns {Promise<void>}
   */
  async copyFile(srcPath, destPath) {
    await this.ready;
    srcPath = this.normalizePath(srcPath);
    destPath = this.normalizePath(destPath);

    if (this.backend === 'memory') {
      const entry = this.memoryStore.get(srcPath);
      if (!entry) {
        throw createVFSError('ENOENT', 'no such file or directory', srcPath);
      }

      if (entry.type !== 'file') {
        throw createVFSError('EISDIR', 'illegal operation on a directory', srcPath);
      }

      // Parse destination path
      const parts = destPath.split('/').filter(p => p);
      const name = parts[parts.length - 1];
      const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

      // Create new entry
      const now = Date.now();
      const newEntry = {
        path: destPath,
        name,
        parent,
        type: 'file',
        content: entry.content,
        size: entry.size,
        created: now,
        modified: now,
      };

      this.memoryStore.set(destPath, newEntry);
      return;
    }

    // IndexedDB backend
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Read source file
      const getRequest = store.get(srcPath);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (!entry) {
          reject(createVFSError('ENOENT', 'no such file or directory', srcPath));
          return;
        }

        if (entry.type !== 'file') {
          reject(createVFSError('EISDIR', 'illegal operation on a directory', srcPath));
          return;
        }

        // Create new entry at destination
        const parts = destPath.split('/').filter(p => p);
        const name = parts[parts.length - 1];
        const parent = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

        const now = Date.now();
        const newEntry = {
          path: destPath,
          name,
          parent,
          type: 'file',
          content: entry.content,
          size: entry.size,
          created: now,
          modified: now,
        };

        const putRequest = store.put(newEntry);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Export entire VFS as JSON
   * @returns {Promise<object>} Complete VFS dump
   */
  async exportJSON() {
    await this.ready;

    if (this.backend === 'memory') {
      return {
        version: 1,
        backend: 'memory',
        entries: Array.from(this.memoryStore.entries()).map(([path, entry]) => entry)
      };
    }

    // IndexedDB backend
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve({
          version: 1,
          backend: 'indexeddb',
          entries: request.result
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Import VFS from JSON dump
   * WARNING: This clears the current VFS first!
   * @param {object} data - VFS dump from exportJSON()
   * @returns {Promise<void>}
   */
  async importJSON(data) {
    await this.ready;

    if (!data || !data.entries) {
      throw new Error('Invalid VFS dump');
    }

    if (this.backend === 'memory') {
      this.memoryStore.clear();
      for (const entry of data.entries) {
        this.memoryStore.set(entry.path, entry);
      }
      return;
    }

    // IndexedDB backend
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing data
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // Import all entries
        let count = 0;
        const errors = [];

        for (const entry of data.entries) {
          const putRequest = store.put(entry);
          putRequest.onerror = () => errors.push(putRequest.error);
          count++;
        }

        transaction.oncomplete = () => {
          if (errors.length > 0) {
            reject(new Error(`Import completed with ${errors.length} errors`));
          } else {
            resolve();
          }
        };

        transaction.onerror = () => reject(transaction.error);
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }
}
