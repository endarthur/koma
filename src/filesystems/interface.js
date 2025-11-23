/**
 * FilesystemInterface - Base class for all filesystem implementations
 *
 * All mounted filesystems must implement this interface.
 * This enables the mount system to treat all filesystems uniformly.
 */

export class FilesystemInterface {
  /**
   * Read entire file contents
   * @param {string} path - Path relative to mount point
   * @returns {Promise<string>} File contents
   * @throws {Error} ENOENT if file doesn't exist, EISDIR if path is directory
   */
  async readFile(path) {
    throw new Error('FilesystemInterface.readFile() not implemented');
  }

  /**
   * Write entire file contents
   * @param {string} path - Path relative to mount point
   * @param {string} content - File content
   * @returns {Promise<void>}
   * @throws {Error} ENOENT if parent doesn't exist, EISDIR if path is directory
   */
  async writeFile(path, content) {
    throw new Error('FilesystemInterface.writeFile() not implemented');
  }

  /**
   * List directory entries
   * @param {string} path - Directory path
   * @returns {Promise<string[]>} Array of entry names (not full paths)
   * @throws {Error} ENOENT if directory doesn't exist, ENOTDIR if not a directory
   */
  async readdir(path) {
    throw new Error('FilesystemInterface.readdir() not implemented');
  }

  /**
   * Get file/directory metadata
   * @param {string} path - Path to stat
   * @returns {Promise<Object>} Stat object with {type, size, modified, created}
   * @throws {Error} ENOENT if path doesn't exist
   */
  async stat(path) {
    throw new Error('FilesystemInterface.stat() not implemented');
  }

  /**
   * Check if path exists
   * @param {string} path - Path to check
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async exists(path) {
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
   * Create directory
   * @param {string} path - Directory path
   * @returns {Promise<void>}
   * @throws {Error} EEXIST if already exists, ENOENT if parent doesn't exist
   */
  async mkdir(path) {
    throw new Error('FilesystemInterface.mkdir() not implemented');
  }

  /**
   * Delete file or empty directory
   * @param {string} path - Path to delete
   * @returns {Promise<void>}
   * @throws {Error} ENOENT if doesn't exist, ENOTEMPTY if directory not empty
   */
  async unlink(path) {
    throw new Error('FilesystemInterface.unlink() not implemented');
  }

  /**
   * Recursively delete directory and contents
   * @param {string} path - Directory path
   * @returns {Promise<void>}
   * @throws {Error} ENOENT if doesn't exist
   */
  async unlinkRecursive(path) {
    // Default implementation using other methods
    const stat = await this.stat(path);

    if (stat.type === 'file') {
      return this.unlink(path);
    }

    // Directory: delete contents first
    const entries = await this.readdir(path);
    for (const entry of entries) {
      const entryPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
      await this.unlinkRecursive(entryPath);
    }

    // Then delete the directory itself
    await this.unlink(path);
  }

  /**
   * Rename/move file or directory
   * @param {string} oldPath - Current path
   * @param {string} newPath - New path
   * @returns {Promise<void>}
   * @throws {Error} ENOENT if source doesn't exist, EEXIST if destination exists
   */
  async rename(oldPath, newPath) {
    throw new Error('FilesystemInterface.rename() not implemented');
  }

  /**
   * Copy file
   * @param {string} srcPath - Source file
   * @param {string} destPath - Destination file
   * @returns {Promise<void>}
   * @throws {Error} ENOENT if source doesn't exist, EISDIR if source is directory
   */
  async copyFile(srcPath, destPath) {
    // Default implementation
    const content = await this.readFile(srcPath);
    await this.writeFile(destPath, content);
  }

  /**
   * Move file or directory (may use rename or copy+delete)
   * @param {string} srcPath - Source path
   * @param {string} destPath - Destination path
   * @returns {Promise<void>}
   */
  async move(srcPath, destPath) {
    // Default implementation: try rename, fall back to copy+delete
    try {
      await this.rename(srcPath, destPath);
    } catch (error) {
      // If rename fails (cross-filesystem), do copy+delete
      const stat = await this.stat(srcPath);
      if (stat.type === 'file') {
        await this.copyFile(srcPath, destPath);
      } else {
        // Directory: recursive copy
        await this.mkdir(destPath);
        const entries = await this.readdir(srcPath);
        for (const entry of entries) {
          const src = `${srcPath}/${entry}`;
          const dest = `${destPath}/${entry}`;
          await this.move(src, dest);
        }
      }
      await this.unlinkRecursive(srcPath);
    }
  }

  /**
   * Get filesystem capabilities
   * @returns {{readable: boolean, writable: boolean, seekable: boolean, watchable: boolean}}
   */
  get capabilities() {
    return {
      readable: true,
      writable: false,
      seekable: false,
      watchable: false
    };
  }

  /**
   * Get filesystem name for display
   * @returns {string}
   */
  get name() {
    return this.constructor.name;
  }
}

/**
 * Helper to create VFS-style errors
 */
export function createVFSError(code, message, path) {
  const error = new Error(`${code}: ${message}: ${path}`);
  error.code = code;
  error.path = path;
  return error;
}
