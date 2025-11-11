/**
 * VFS Test Helper
 * Utilities for testing VFS and IndexedDB operations
 */

/**
 * Generate a unique test database name
 * @returns {string} Unique database name
 */
function generateTestDbName() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `KomaVFS_Test_${timestamp}_${random}`;
}

/**
 * Create an isolated test VFS instance
 * Returns a kernel instance and cleanup function
 *
 * @returns {Promise<{kernel: object, dbName: string, cleanup: Function}>}
 */
export async function createTestVFS() {
  const dbName = generateTestDbName();

  // Import kernel client - all tests share the same kernel singleton
  // Note: Tests will have shared VFS state. This is a known limitation
  // that we mitigate by running tests serially (concurrency: 1)
  const { kernelClient } = await import('../../src/kernel/client.js');
  const kernel = await kernelClient.getKernel();

  // Cleanup function to delete test database
  const cleanup = async () => {
    try {
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
          console.warn('[Test] Database deletion blocked, waiting...');
          setTimeout(resolve, 100);
        };
      });
      console.log(`[Test] Cleaned up database: ${dbName}`);
    } catch (error) {
      console.error('[Test] Cleanup failed:', error);
    }
  };

  return {
    kernel,
    dbName,
    cleanup
  };
}

/**
 * Populate VFS with test fixtures
 *
 * @param {object} kernel - Kernel instance
 * @param {object} fixtures - Map of paths to content
 * @returns {Promise<void>}
 */
export async function populateTestFixtures(kernel, fixtures) {
  for (const [path, content] of Object.entries(fixtures)) {
    const parts = path.split('/').filter(Boolean);
    const filename = parts.pop();
    const dirPath = '/' + parts.join('/');

    // Ensure directory exists
    if (dirPath !== '/') {
      try {
        await kernel.mkdir(dirPath);
      } catch (error) {
        // Directory might already exist, that's fine
        if (error.message && !error.message.includes('EEXIST') && !error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    // Write file
    await kernel.writeFile(path, content);
  }
}

/**
 * Get all files in VFS recursively
 *
 * @param {object} kernel - Kernel instance
 * @param {string} path - Starting path
 * @returns {Promise<string[]>} Array of file paths
 */
export async function getAllFiles(kernel, path = '/') {
  const files = [];
  const entries = await kernel.readdir(path);

  for (const entry of entries) {
    const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;

    if (entry.type === 'file') {
      files.push(fullPath);
    } else if (entry.type === 'directory') {
      const subFiles = await getAllFiles(kernel, fullPath);
      files.push(...subFiles);
    }
  }

  return files;
}

/**
 * Assert file exists with expected content
 *
 * @param {object} kernel - Kernel instance
 * @param {string} path - File path
 * @param {string} expectedContent - Expected file content
 * @returns {Promise<void>}
 * @throws {Error} If file doesn't exist or content doesn't match
 */
export async function assertFileContent(kernel, path, expectedContent) {
  const content = await kernel.readFile(path);

  if (content !== expectedContent) {
    throw new Error(
      `File content mismatch at ${path}\n` +
      `Expected: ${expectedContent}\n` +
      `Got: ${content}`
    );
  }
}

/**
 * Assert directory exists
 *
 * @param {object} kernel - Kernel instance
 * @param {string} path - Directory path
 * @returns {Promise<void>}
 * @throws {Error} If directory doesn't exist or is not a directory
 */
export async function assertDirectoryExists(kernel, path) {
  const stat = await kernel.stat(path);

  if (stat.type !== 'directory') {
    throw new Error(`Path ${path} exists but is not a directory (type: ${stat.type})`);
  }
}

/**
 * Assert file or directory does not exist
 *
 * @param {object} kernel - Kernel instance
 * @param {string} path - Path to check
 * @returns {Promise<void>}
 * @throws {Error} If path exists
 */
export async function assertNotExists(kernel, path) {
  try {
    await kernel.stat(path);
    throw new Error(`Path ${path} exists but should not`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // ENOENT is expected, path doesn't exist
  }
}

/**
 * Create a snapshot of VFS state
 *
 * @param {object} kernel - Kernel instance
 * @returns {Promise<object>} VFS snapshot
 */
export async function createVFSSnapshot(kernel) {
  const snapshot = {};
  const files = await getAllFiles(kernel);

  for (const path of files) {
    const content = await kernel.readFile(path);
    snapshot[path] = content;
  }

  return snapshot;
}

/**
 * Restore VFS from snapshot
 *
 * @param {object} kernel - Kernel instance
 * @param {object} snapshot - VFS snapshot
 * @returns {Promise<void>}
 */
export async function restoreVFSSnapshot(kernel, snapshot) {
  await populateTestFixtures(kernel, snapshot);
}

/**
 * Clear all files in a directory (but keep the directory)
 *
 * @param {object} kernel - Kernel instance
 * @param {string} path - Directory path
 * @returns {Promise<void>}
 */
export async function clearDirectory(kernel, path) {
  const entries = await kernel.readdir(path);

  for (const entry of entries) {
    const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
    await kernel.unlink(fullPath);
  }
}

/**
 * Common test fixtures
 */
export const COMMON_FIXTURES = {
  '/home/test.txt': 'hello world\nthis is a test\n',
  '/home/data.json': '{"name": "test", "value": 123}',
  '/home/script.js': 'console.log("Hello from script");',
  '/home/empty.txt': '',
};
