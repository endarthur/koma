/**
 * Koma Standard Library - Filesystem Module
 * Wraps VFS operations for use in user scripts
 */

export function createFsModule(vfs) {
  return {
    /**
     * Read file contents as string
     * @param {string} path - File path
     * @returns {Promise<string>} File contents
     */
    async readFile(path) {
      return vfs.readFile(path);
    },

    /**
     * Write content to file (creates or overwrites)
     * @param {string} path - File path
     * @param {string} content - Content to write
     */
    async writeFile(path, content) {
      return vfs.writeFile(path, content);
    },

    /**
     * Read directory contents
     * @param {string} path - Directory path
     * @returns {Promise<Array>} Array of directory entries
     */
    async readdir(path) {
      return vfs.readdir(path);
    },

    /**
     * Create directory
     * @param {string} path - Directory path
     */
    async mkdir(path) {
      return vfs.mkdir(path);
    },

    /**
     * Delete file or empty directory
     * @param {string} path - Path to delete
     */
    async unlink(path) {
      return vfs.unlink(path);
    },

    /**
     * Get file/directory metadata
     * @param {string} path - Path to stat
     * @returns {Promise<Object>} Metadata object
     */
    async stat(path) {
      return vfs.stat(path);
    },

    /**
     * Rename/move file or directory
     * @param {string} oldPath - Current path
     * @param {string} newPath - New path
     */
    async rename(oldPath, newPath) {
      return vfs.rename(oldPath, newPath);
    },

    /**
     * Check if path exists
     * @param {string} path - Path to check
     * @returns {Promise<boolean>} True if exists
     */
    async exists(path) {
      try {
        await vfs.stat(path);
        return true;
      } catch (error) {
        if (error.message.includes('ENOENT')) {
          return false;
        }
        throw error;
      }
    },

    /**
     * Check if path is a file
     * @param {string} path - Path to check
     * @returns {Promise<boolean>} True if file
     */
    async isFile(path) {
      try {
        const stat = await vfs.stat(path);
        return stat.type === 'file';
      } catch {
        return false;
      }
    },

    /**
     * Check if path is a directory
     * @param {string} path - Path to check
     * @returns {Promise<boolean>} True if directory
     */
    async isDirectory(path) {
      try {
        const stat = await vfs.stat(path);
        return stat.type === 'directory';
      } catch {
        return false;
      }
    },

    /**
     * Append content to file (creates if doesn't exist)
     * @param {string} path - File path
     * @param {string} content - Content to append
     */
    async appendFile(path, content) {
      try {
        const existing = await vfs.readFile(path);
        return vfs.writeFile(path, existing + content);
      } catch (error) {
        // If file doesn't exist, create it
        if (error.message.includes('ENOENT')) {
          return vfs.writeFile(path, content);
        }
        throw error;
      }
    }
  };
}
