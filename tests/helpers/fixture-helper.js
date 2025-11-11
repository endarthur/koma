/**
 * Fixture Helper
 * Utilities for loading pre-generated .kmt fixtures into VFS for testing
 */

/**
 * Load and restore a VFS from a .kmt fixture file
 * @param {object} kernel - VFS kernel instance
 * @param {string} fixtureName - Name of fixture file (e.g., 'basic-vfs.kmt')
 * @param {string[]} excludePaths - Paths to preserve (e.g., ['/mnt/backups'])
 * @returns {Promise<void>}
 */
export async function restoreFromFixture(kernel, fixtureName, excludePaths = ['/mnt/backups']) {
  // Load the fixture file
  const fixturePath = new URL(`../fixtures/${fixtureName}`, import.meta.url);
  const response = await fetch(fixturePath);

  if (!response.ok) {
    throw new Error(`Failed to load fixture: ${fixtureName}`);
  }

  const backup = await response.json();

  // Validate format
  if (backup.format !== 'kmt' || !backup.data) {
    throw new Error(`Invalid .kmt format in ${fixtureName}`);
  }

  // Decode backup data (UTF-8 safe base64)
  const entriesJSON = base64ToUtf8(backup.data);
  const entries = JSON.parse(entriesJSON);

  // Clear VFS except excluded paths
  await clearVFS(kernel, excludePaths);

  // Restore entries
  await restoreEntries(kernel, entries);
}

/**
 * Decode base64 to UTF-8 string (safe for all Unicode characters)
 * @param {string} b64 - Base64 encoded string
 * @returns {string} Decoded UTF-8 string
 */
function base64ToUtf8(b64) {
  const binaryString = atob(b64);
  const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Clear all VFS contents except excluded paths
 * @param {object} kernel - VFS kernel instance
 * @param {string[]} excludePaths - Paths to preserve
 */
async function clearVFS(kernel, excludePaths = []) {
  try {
    const topLevelDirs = await kernel.readdir('/');

    for (const entry of topLevelDirs) {
      const fullPath = `/${entry.name}`;

      // Skip excluded paths
      if (excludePaths.some(ex => fullPath.startsWith(ex))) {
        continue;
      }

      try {
        if (entry.type === 'directory') {
          await kernel.unlinkRecursive(fullPath);
        } else {
          await kernel.unlink(fullPath);
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  } catch (e) {
    // Ignore if readdir fails
  }
}

/**
 * Restore VFS entries from backup data
 * @param {object} kernel - VFS kernel instance
 * @param {Array} entries - Array of VFS entries to restore
 */
async function restoreEntries(kernel, entries) {
  // Sort so directories come before files, and by path depth
  const sortedEntries = entries.slice().sort((a, b) => {
    // Directories first
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    // Then by path depth (parent directories before children)
    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    return aDepth - bDepth;
  });

  for (const entry of sortedEntries) {
    if (entry.type === 'directory') {
      try {
        await kernel.mkdir(entry.path);
      } catch (e) {
        // Directory might already exist
      }
    } else if (entry.type === 'file') {
      await kernel.writeFile(entry.path, entry.content);
    }
  }
}

/**
 * Get list of available fixtures
 * @returns {string[]} Array of fixture names
 */
export function getAvailableFixtures() {
  return [
    'empty-vfs.kmt',
    'minimal-vfs.kmt',
    'basic-vfs.kmt',
    'ls-test.kmt',
    'pipes-test.kmt',
    'file-reading-test.kmt',
    'vfs-ops-test.kmt',
    'complex-vfs.kmt'
  ];
}

/**
 * Create a safe helper function that can be called from any directory
 * @param {object} kernel - VFS kernel instance
 * @returns {Function} Restore function bound to kernel
 */
export function createRestoreHelper(kernel) {
  return async (fixtureName, excludePaths) => {
    return restoreFromFixture(kernel, fixtureName, excludePaths);
  };
}
