/**
 * Integration tests for koma system commands (insert, eject)
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('koma commands', () => {
  let vfs, cleanup, shell, term;
  let originalFetch;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Inject test kernel into kernelClient
    const { kernelClient } = await import('../../../src/kernel/client.js');
    kernelClient.setTestKernel(vfs);

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    // Ensure /media directory exists
    try {
      await vfs.mkdir('/media');
    } catch (e) {
      // Already exists
    }

    // Store original fetch
    originalFetch = globalThis.fetch;
  });

  afterEach(async () => {
    // Clear test kernel
    const { kernelClient } = await import('../../../src/kernel/client.js');
    kernelClient.clearTestKernel();

    // Restore original fetch
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }

    if (cleanup) {
      await cleanup();
    }
  });

  describe('koma insert', () => {
    let mockArchive;

    beforeEach(async () => {
      // Create a mock KMT archive for testing
      const { populateTestFixtures } = await import('../../helpers/vfs-test-helper.js');
      await populateTestFixtures(vfs, {
        '/tmp/source/file1.txt': 'Test content 1',
        '/tmp/source/file2.txt': 'Test content 2'
      });

      // Create a real KMT archive
      await shell.execute('kmt pack /tmp/source test-archive.kmt --label "Test Archive"');
      mockArchive = await vfs.readFile('/home/test-archive.kmt');
      term.clear();
    });

    it('should download and unpack archive from store', async () => {
      // Mock fetch to return our test archive
      globalThis.fetch = async (url) => {
        expect(url).to.include('/store/examples.kmt');
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => mockArchive
        };
      };

      await shell.execute('koma insert examples');

      const output = term.getOutput();
      expect(output).to.include('Inserting KMT: examples.kmt');
      expect(output).to.include('Downloading...');
      expect(output).to.include('Unpacking...');
      expect(output).to.include('Extracted');
      expect(output).to.include('Location: /media/examples');

      // Verify files were extracted to /media/examples/
      const file1 = await vfs.readFile('/media/examples/file1.txt');
      expect(file1).to.equal('Test content 1');

      const file2 = await vfs.readFile('/media/examples/file2.txt');
      expect(file2).to.equal('Test content 2');
    });

    it('should auto-append .kmt extension', async () => {
      globalThis.fetch = async (url) => {
        // Should request with .kmt extension even though we didn't provide it
        expect(url).to.include('examples.kmt');
        expect(url).to.not.include('examples.kmt.kmt');
        return {
          ok: true,
          status: 200,
          text: async () => mockArchive
        };
      };

      await shell.execute('koma insert examples');
      const output = term.getOutput();
      expect(output).to.include('examples.kmt');
    });

    it('should not double-append .kmt extension', async () => {
      globalThis.fetch = async (url) => {
        expect(url).to.include('examples.kmt');
        expect(url).to.not.include('.kmt.kmt');
        return {
          ok: true,
          status: 200,
          text: async () => mockArchive
        };
      };

      await shell.execute('koma insert examples.kmt');
      const output = term.getOutput();
      expect(output).to.include('examples.kmt');
      expect(output).to.not.include('.kmt.kmt');
    });

    it('should download only with --download-only flag', async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => mockArchive
      });

      await shell.execute('koma insert test --download-only');

      const output = term.getOutput();
      expect(output).to.include('Downloading...');
      expect(output).to.include('Saved to: /media/test.kmt');
      expect(output).to.not.include('Unpacking...');

      // Verify archive was saved but not extracted
      const archiveExists = await vfs.exists('/media/test.kmt');
      expect(archiveExists).to.be.true;

      // Verify directory was NOT created
      const dirExists = await vfs.exists('/media/test');
      expect(dirExists).to.be.false;
    });

    it('should extract to custom location with --to flag', async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => mockArchive
      });

      // Create custom destination
      await vfs.mkdir('/home/custom');

      await shell.execute('koma insert test --to /home/custom');

      const output = term.getOutput();
      expect(output).to.include('Location: /home/custom');

      // Verify files were extracted to custom location
      const file1 = await vfs.readFile('/home/custom/file1.txt');
      expect(file1).to.equal('Test content 1');
    });

    it('should handle download errors', async () => {
      globalThis.fetch = async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await shell.execute('koma insert nonexistent');

      const output = term.getOutput();
      expect(output).to.include('koma insert:');
      expect(output).to.include('HTTP 404');
    });

    it('should clean up temp file on error', async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => 'invalid json'
      });

      await shell.execute('koma insert broken');

      const output = term.getOutput();
      expect(output).to.include('koma insert:');

      // Verify temp file was cleaned up
      const tempExists = await vfs.exists('/media/.tmp_broken.kmt');
      expect(tempExists).to.be.false;
    });

    it('should use window.location.origin for store URL', async () => {
      const originalOrigin = window.location.origin;

      globalThis.fetch = async (url) => {
        expect(url).to.equal(`${originalOrigin}/store/test.kmt`);
        return {
          ok: true,
          status: 200,
          text: async () => mockArchive
        };
      };

      await shell.execute('koma insert test');

      const output = term.getOutput();
      expect(output).to.include(`From: ${originalOrigin}/store/test.kmt`);
    });

    it('should show error when archive name missing', async () => {
      await shell.execute('koma insert');

      const output = term.getOutput();
      expect(output).to.include('koma insert:');
      expect(output).to.include('missing archive name');
      expect(output).to.include('Usage:');
    });
  });

  describe('koma eject', () => {
    beforeEach(async () => {
      // Clear /media directory to ensure clean state
      try {
        await vfs.unlinkRecursive('/media');
      } catch (e) {
        // Directory might not exist
      }
      await vfs.mkdir('/media');

      // Create test files and directories in /media
      const { populateTestFixtures } = await import('../../helpers/vfs-test-helper.js');
      await populateTestFixtures(vfs, {
        '/media/examples/file1.txt': 'Content 1',
        '/media/examples/file2.txt': 'Content 2',
        '/media/examples/subdir/file3.txt': 'Content 3',
        '/media/archive.kmt': '{"format":"kmt"}'
      });
    });

    it('should eject unpacked directory', async () => {
      await shell.execute('koma eject examples');

      const output = term.getOutput();
      expect(output).to.include('examples');
      expect(output).to.include('/media/examples/');

      // Verify directory was removed
      const exists = await vfs.exists('/media/examples');
      expect(exists).to.be.false;
    });

    it('should eject KMT file', async () => {
      await shell.execute('koma eject archive.kmt');

      const output = term.getOutput();
      expect(output).to.include('archive.kmt');
      expect(output).to.include('/media/archive.kmt');

      // Verify file was removed
      const exists = await vfs.exists('/media/archive.kmt');
      expect(exists).to.be.false;
    });

    it('should recursively remove directory contents', async () => {
      // Verify directory has nested content before ejecting
      const file3Exists = await vfs.exists('/media/examples/subdir/file3.txt');
      expect(file3Exists).to.be.true;

      await shell.execute('koma eject examples');

      // Verify entire directory tree was removed
      const dirExists = await vfs.exists('/media/examples');
      expect(dirExists).to.be.false;

      const subdirExists = await vfs.exists('/media/examples/subdir');
      expect(subdirExists).to.be.false;
    });

    it('should error when tape not found', async () => {
      await shell.execute('koma eject nonexistent');

      const output = term.getOutput();
      expect(output).to.include('Tape not found');
      expect(output).to.include('nonexistent');
    });

    it('should only operate on /media directory', async () => {
      // Create a directory outside /media
      await vfs.mkdir('/home/test');

      // Try to eject it - should fail because it's not in /media
      await shell.execute('koma eject test');

      const output = term.getOutput();
      expect(output).to.include('Tape not found');

      // Verify /home/test still exists
      const exists = await vfs.exists('/home/test');
      expect(exists).to.be.true;
    });

    it('should show error when tape name missing', async () => {
      await shell.execute('koma eject');

      const output = term.getOutput();
      expect(output).to.include('missing tape name');
      expect(output).to.include('Usage:');
    });

    it('should show examples in help output', async () => {
      await shell.execute('koma eject');

      const output = term.getOutput();
      expect(output).to.include('Examples:');
      expect(output).to.include('koma eject examples');
      expect(output).to.include('Remove /media/examples/');
    });
  });

  describe('koma insert + eject workflow', () => {
    let mockArchive;

    beforeEach(async () => {
      // Create a test archive
      const { populateTestFixtures } = await import('../../helpers/vfs-test-helper.js');
      await populateTestFixtures(vfs, {
        '/tmp/test/data.txt': 'Important data'
      });

      await shell.execute('kmt pack /tmp/test workflow-test.kmt');
      mockArchive = await vfs.readFile('/home/workflow-test.kmt');
      term.clear();

      // Mock fetch
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => mockArchive
      });
    });

    it('should complete full insert-eject cycle', async () => {
      // Insert
      await shell.execute('koma insert workflow-test');

      let output = term.getOutput();
      expect(output).to.include('Extracted');

      // Verify inserted
      const dataExists = await vfs.exists('/media/workflow-test/data.txt');
      expect(dataExists).to.be.true;

      term.clear();

      // Eject
      await shell.execute('koma eject workflow-test');

      output = term.getOutput();
      expect(output).to.include('Ejected tape: workflow-test');

      // Verify ejected
      const dirExists = await vfs.exists('/media/workflow-test');
      expect(dirExists).to.be.false;
    });

    it('should allow re-inserting after ejecting', async () => {
      // Insert, eject, insert again
      await shell.execute('koma insert workflow-test');
      await shell.execute('koma eject workflow-test');
      term.clear();

      await shell.execute('koma insert workflow-test');

      const output = term.getOutput();
      expect(output).to.include('Extracted');

      // Verify re-inserted successfully
      const dataExists = await vfs.exists('/media/workflow-test/data.txt');
      expect(dataExists).to.be.true;
    });
  });
});
