/**
 * Koma Service Worker - The Kernel
 *
 * This service worker acts as the "operating system" layer for Koma,
 * providing persistent storage, process management, and system services.
 */

import * as Comlink from 'https://esm.sh/comlink@4.4.1';

const VERSION = '0.1.1';
const DB_NAME = 'koma-vfs';
const DB_VERSION = 1;

/**
 * IndexedDB-backed Virtual Filesystem
 */
class VirtualFilesystem {
  constructor() {
    this.db = null;
    this.ready = this.initialize();
  }

  /**
   * Initialize the filesystem database
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        const transaction = event.target.transaction;

        console.log(`[Koma VFS] Upgrading database from version ${oldVersion} to ${DB_VERSION}`);

        // Version 0 -> 1: Initial schema creation
        if (oldVersion < 1) {
          // Inodes store: file and directory metadata
          if (!db.objectStoreNames.contains('inodes')) {
            const inodes = db.createObjectStore('inodes', { keyPath: 'path' });
            inodes.createIndex('parent', 'parent', { unique: false });
            inodes.createIndex('type', 'type', { unique: false });
          }

          // Data store: file contents
          if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data', { keyPath: 'path' });
          }

          // Initialize root directory structure
          const inodes = transaction.objectStore('inodes');
          const rootDirs = [
            { path: '/', type: 'directory', parent: null, created: Date.now(), modified: Date.now() },
            { path: '/home', type: 'directory', parent: '/', created: Date.now(), modified: Date.now() },
            { path: '/tmp', type: 'directory', parent: '/', created: Date.now(), modified: Date.now() },
            { path: '/usr', type: 'directory', parent: '/', created: Date.now(), modified: Date.now() },
            { path: '/usr/bin', type: 'directory', parent: '/usr', created: Date.now(), modified: Date.now() },
            { path: '/mnt', type: 'directory', parent: '/', created: Date.now(), modified: Date.now() },
            { path: '/proc', type: 'directory', parent: '/', created: Date.now(), modified: Date.now() },
          ];

          rootDirs.forEach(dir => inodes.add(dir));
          console.log('[Koma VFS] Initialized root filesystem');
        }

        // Future migrations go here:
        // if (oldVersion < 2) {
        //   // Migration from v1 to v2
        // }
      };
    });
  }

  /**
   * Normalize path (remove trailing slashes, handle relative paths)
   */
  normalizePath(path) {
    if (!path || path === '/') return '/';

    // Collapse multiple consecutive slashes into one
    path = path.replace(/\/+/g, '/');

    // Remove trailing slash
    path = path.replace(/\/+$/, '');

    // Ensure leading slash
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    return path;
  }

  /**
   * Get parent directory path
   */
  getParent(path) {
    if (path === '/') return null;
    const normalized = this.normalizePath(path);
    const parts = normalized.split('/').filter(p => p);
    parts.pop();
    return parts.length === 0 ? '/' : '/' + parts.join('/');
  }

  /**
   * List directory contents
   */
  async readdir(path) {
    await this.ready;
    path = this.normalizePath(path);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inodes'], 'readonly');
      const store = transaction.objectStore('inodes');
      const index = store.index('parent');
      const request = index.getAll(path);

      request.onsuccess = () => {
        const entries = request.result.map(inode => ({
          name: inode.path.split('/').pop(),
          path: inode.path,
          type: inode.type,
          size: inode.size || 0,
          created: inode.created,
          modified: inode.modified,
        }));
        resolve(entries);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if path exists
   */
  async exists(path) {
    await this.ready;
    path = this.normalizePath(path);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inodes'], 'readonly');
      const store = transaction.objectStore('inodes');
      const request = store.get(path);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get file/directory metadata
   */
  async stat(path) {
    await this.ready;
    path = this.normalizePath(path);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inodes'], 'readonly');
      const store = transaction.objectStore('inodes');
      const request = store.get(path);

      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error(`ENOENT: no such file or directory: ${path}`));
        } else {
          resolve(request.result);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Create directory
   */
  async mkdir(path) {
    await this.ready;
    path = this.normalizePath(path);

    // Check if already exists
    if (await this.exists(path)) {
      throw new Error(`EEXIST: file already exists: ${path}`);
    }

    // Check if parent exists
    const parent = this.getParent(path);
    if (parent && !(await this.exists(parent))) {
      throw new Error(`ENOENT: no such file or directory: ${parent}`);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inodes'], 'readwrite');
      const store = transaction.objectStore('inodes');

      const inode = {
        path,
        type: 'directory',
        parent: parent || '/',
        created: Date.now(),
        modified: Date.now(),
      };

      const request = store.add(inode);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Write file
   */
  async writeFile(path, content) {
    await this.ready;
    path = this.normalizePath(path);

    const parent = this.getParent(path);
    if (parent && !(await this.exists(parent))) {
      throw new Error(`ENOENT: no such file or directory: ${parent}`);
    }

    const size = new Blob([content]).size;
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inodes', 'data'], 'readwrite');

      // Update or create inode
      const inodes = transaction.objectStore('inodes');
      const inode = {
        path,
        type: 'file',
        parent: parent || '/',
        size,
        created: now,
        modified: now,
      };

      // Check if file exists to preserve creation time
      const getRequest = inodes.get(path);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          inode.created = getRequest.result.created;
        }
        inodes.put(inode);
      };

      // Write data
      const data = transaction.objectStore('data');
      data.put({ path, content });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Read file
   */
  async readFile(path) {
    await this.ready;
    path = this.normalizePath(path);

    // Check if exists and is a file
    const inode = await this.stat(path);
    if (inode.type !== 'file') {
      throw new Error(`EISDIR: illegal operation on a directory: ${path}`);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.get(path);

      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error(`ENOENT: no such file: ${path}`));
        } else {
          resolve(request.result.content);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete file or directory
   */
  async unlink(path) {
    await this.ready;
    path = this.normalizePath(path);

    const inode = await this.stat(path);

    // If directory, check if empty
    if (inode.type === 'directory') {
      const contents = await this.readdir(path);
      if (contents.length > 0) {
        throw new Error(`ENOTEMPTY: directory not empty: ${path}`);
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inodes', 'data'], 'readwrite');

      transaction.objectStore('inodes').delete(path);

      if (inode.type === 'file') {
        transaction.objectStore('data').delete(path);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Copy file
   */
  async copyFile(srcPath, destPath) {
    await this.ready;
    srcPath = this.normalizePath(srcPath);
    destPath = this.normalizePath(destPath);

    // Check source exists and is a file
    const srcInode = await this.stat(srcPath);
    if (srcInode.type !== 'file') {
      throw new Error(`EISDIR: cannot copy directory: ${srcPath}`);
    }

    // Check destination doesn't exist
    if (await this.exists(destPath)) {
      throw new Error(`EEXIST: file already exists: ${destPath}`);
    }

    // Check destination parent exists
    const destParent = this.getParent(destPath);
    if (destParent && !(await this.exists(destParent))) {
      throw new Error(`ENOENT: no such file or directory: ${destParent}`);
    }

    // Read source content
    const content = await this.readFile(srcPath);

    // Write to destination
    await this.writeFile(destPath, content);
  }

  /**
   * Move/rename file or directory
   */
  async move(srcPath, destPath) {
    await this.ready;
    srcPath = this.normalizePath(srcPath);
    destPath = this.normalizePath(destPath);

    // Check source exists
    const srcInode = await this.stat(srcPath);

    // Check destination doesn't exist
    if (await this.exists(destPath)) {
      throw new Error(`EEXIST: file already exists: ${destPath}`);
    }

    // Check destination parent exists
    const destParent = this.getParent(destPath);
    if (destParent && !(await this.exists(destParent))) {
      throw new Error(`ENOENT: no such file or directory: ${destParent}`);
    }

    // For directories, check we're not moving into a subdirectory
    if (srcInode.type === 'directory' && destPath.startsWith(srcPath + '/')) {
      throw new Error(`EINVAL: cannot move directory into itself: ${srcPath} -> ${destPath}`);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inodes', 'data'], 'readwrite');
      const inodes = transaction.objectStore('inodes');

      // Update inode with new path and parent
      const newInode = {
        ...srcInode,
        path: destPath,
        parent: destParent || '/',
        modified: Date.now(),
      };

      // Delete old inode
      inodes.delete(srcPath);

      // Add new inode
      inodes.add(newInode);

      // If it's a file, update data path
      if (srcInode.type === 'file') {
        const data = transaction.objectStore('data');

        // Read old data
        const getRequest = data.get(srcPath);
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            // Write to new path
            data.put({ path: destPath, content: getRequest.result.content });
            // Delete old path
            data.delete(srcPath);
          }
        };
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Create VFS instance
const vfs = new VirtualFilesystem();

// Expose VFS methods directly via Comlink
class Kernel {
  async version() {
    return VERSION;
  }

  async readdir(path) {
    return await vfs.readdir(path);
  }

  async exists(path) {
    return await vfs.exists(path);
  }

  async stat(path) {
    return await vfs.stat(path);
  }

  async mkdir(path) {
    return await vfs.mkdir(path);
  }

  async writeFile(path, content) {
    return await vfs.writeFile(path, content);
  }

  async readFile(path) {
    return await vfs.readFile(path);
  }

  async unlink(path) {
    return await vfs.unlink(path);
  }

  async copyFile(srcPath, destPath) {
    return await vfs.copyFile(srcPath, destPath);
  }

  async move(srcPath, destPath) {
    return await vfs.move(srcPath, destPath);
  }
}

const kernel = new Kernel();

// Service worker lifecycle
self.addEventListener('install', (event) => {
  console.log('[Koma Kernel] Installing version', VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Koma Kernel] Activated version', VERSION);
  event.waitUntil(clients.claim());
});

// Set up Comlink
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_COMLINK') {
    const port = event.ports[0];
    Comlink.expose(kernel, port);
    console.log('[Koma Kernel] Comlink initialized');
  }
});

// Global error handler for service worker
self.addEventListener('error', (event) => {
  console.error('[Koma Kernel] Uncaught error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Koma Kernel] Unhandled promise rejection:', event.reason);
});
