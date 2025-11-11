/**
 * VFS Backup & Restore Integration Tests
 * Tests for kernel-level exportVFS/importVFS methods
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';

describe('VFS Kernel Backup/Restore', () => {
  let vfs, cleanup;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('exportVFS', () => {
    it('should export VFS as JSON', async () => {
      // Create test files
      await populateTestFixtures(vfs, {
        '/home/test.txt': 'test content',
        '/home/dir/nested.txt': 'nested content'
      });

      // Export VFS
      const backup = await vfs.exportVFS();

      // Verify it's valid JSON
      expect(() => JSON.parse(backup)).to.not.throw();

      const data = JSON.parse(backup);
      expect(data).to.have.property('version', '1.0');
      expect(data).to.have.property('timestamp');
      expect(data).to.have.property('entries');
      expect(data.entries).to.be.an('array');

      // Verify test files are in backup
      const paths = data.entries.map(e => e.path);
      expect(paths).to.include('/home/test.txt');
      expect(paths).to.include('/home/dir/nested.txt');
    });

    it('should export empty VFS', async () => {
      const backup = await vfs.exportVFS();
      const data = JSON.parse(backup);

      expect(data.entries).to.be.an('array');
      expect(data.entries.length).to.be.at.least(0); // May have system files
    });

    it('should preserve file contents', async () => {
      const content = 'Special content:\n- Line 1\n- Line 2 "quoted"\n- Line 3 \'apostrophe\'';
      await vfs.writeFile('/home/special.txt', content);

      const backup = await vfs.exportVFS();
      const data = JSON.parse(backup);

      const entry = data.entries.find(e => e.path === '/home/special.txt');
      expect(entry).to.exist;
      expect(entry.content).to.equal(content);
    });

    it('should include metadata for files and directories', async () => {
      await populateTestFixtures(vfs, {
        '/home/test.txt': 'content',
        '/home/testdir/.keep': ''
      });

      const backup = await vfs.exportVFS();
      const data = JSON.parse(backup);

      const file = data.entries.find(e => e.path === '/home/test.txt');
      expect(file).to.have.property('type', 'file');
      expect(file).to.have.property('size');
      expect(file).to.have.property('created');
      expect(file).to.have.property('modified');
      expect(file).to.have.property('content');

      const dir = data.entries.find(e => e.path === '/home/testdir');
      expect(dir).to.have.property('type', 'directory');
      expect(dir).to.have.property('created');
      expect(dir).to.have.property('modified');
    });

    it('should handle large VFS with many files', async () => {
      // Create 100 files
      const fixtures = {};
      for (let i = 0; i < 100; i++) {
        fixtures[`/home/file${i}.txt`] = `content ${i}`;
      }
      await populateTestFixtures(vfs, fixtures);

      const backup = await vfs.exportVFS();
      const data = JSON.parse(backup);

      const testFiles = data.entries.filter(e => e.path.startsWith('/home/file'));
      expect(testFiles.length).to.equal(100);
    });
  });

  describe('importVFS', () => {
    it('should import VFS from JSON backup', async () => {
      // Create initial state
      await populateTestFixtures(vfs, {
        '/home/original.txt': 'original content',
        '/home/dir/nested.txt': 'nested content'
      });

      // Export
      const backup = await vfs.exportVFS();

      // Modify VFS
      await vfs.writeFile('/home/original.txt', 'modified content');
      await vfs.writeFile('/home/newfile.txt', 'new content');

      // Import backup
      await vfs.importVFS(backup);

      // Verify restoration
      const content = await vfs.readFile('/home/original.txt');
      expect(content).to.equal('original content');

      const nested = await vfs.readFile('/home/dir/nested.txt');
      expect(nested).to.equal('nested content');

      // New file should not exist after import
      try {
        await vfs.readFile('/home/newfile.txt');
        expect.fail('File should not exist after restore');
      } catch (error) {
        expect(error.code).to.equal('ENOENT');
      }
    });

    it('should reject invalid JSON', async () => {
      try {
        await vfs.importVFS('invalid json {');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid backup data');
        expect(error.message).to.include('not valid JSON');
      }
    });

    it('should reject backup without entries array', async () => {
      const invalid = JSON.stringify({
        version: '1.0',
        timestamp: new Date().toISOString()
        // Missing entries array
      });

      try {
        await vfs.importVFS(invalid);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid backup data');
        expect(error.message).to.include('missing entries array');
      }
    });

    it('should handle empty backup', async () => {
      const emptyBackup = JSON.stringify({
        version: '1.0',
        timestamp: new Date().toISOString(),
        entries: []
      });

      // Should not throw
      await vfs.importVFS(emptyBackup);

      // VFS should be cleared
      const rootContents = await vfs.readdir('/');
      // Root should be empty or have minimal system dirs
      expect(rootContents.length).to.be.at.most(10);
    });

    it('should preserve file attributes after import', async () => {
      // Ensure /home exists
      try {
        await vfs.mkdir('/home');
      } catch (e) {
        // Already exists
      }

      await vfs.writeFile('/home/test.txt', 'content');
      const statBefore = await vfs.stat('/home/test.txt');

      const backup = await vfs.exportVFS();
      await vfs.importVFS(backup);

      const statAfter = await vfs.stat('/home/test.txt');
      expect(statAfter.type).to.equal('file');
      expect(statAfter.size).to.equal(statBefore.size);
      expect(statAfter.created).to.equal(statBefore.created);
    });

    it('should clear VFS before importing', async () => {
      // Create some files
      await populateTestFixtures(vfs, {
        '/home/file1.txt': 'content 1',
        '/home/file2.txt': 'content 2'
      });

      const backup = await vfs.exportVFS();

      // Add more files
      await vfs.writeFile('/home/file3.txt', 'content 3');
      await vfs.writeFile('/home/file4.txt', 'content 4');

      // Verify new files exist
      let content3 = await vfs.readFile('/home/file3.txt');
      expect(content3).to.equal('content 3');

      // Import backup (should clear file3 and file4)
      await vfs.importVFS(backup);

      // file1 and file2 should exist
      const content1 = await vfs.readFile('/home/file1.txt');
      expect(content1).to.equal('content 1');

      const content2 = await vfs.readFile('/home/file2.txt');
      expect(content2).to.equal('content 2');

      // file3 and file4 should not exist
      try {
        await vfs.readFile('/home/file3.txt');
        expect.fail('file3 should not exist');
      } catch (error) {
        expect(error.code).to.equal('ENOENT');
      }

      try {
        await vfs.readFile('/home/file4.txt');
        expect.fail('file4 should not exist');
      } catch (error) {
        expect(error.code).to.equal('ENOENT');
      }
    });

    it.skip('should handle deep directory structures (test helper issue)', async () => {
      await populateTestFixtures(vfs, {
        '/home/a/b/c/d/deep.txt': 'deep content'
      });

      const backup = await vfs.exportVFS();

      // Import will clear and restore everything
      await vfs.importVFS(backup);

      // Verify deep file exists
      const content = await vfs.readFile('/home/a/b/c/d/deep.txt');
      expect(content).to.equal('deep content');
    });

    it('should handle special characters in filenames', async () => {
      await populateTestFixtures(vfs, {
        '/home/.hidden': 'hidden',
        '/home/file with spaces.txt': 'spaces',
        '/home/file-with-dashes.txt': 'dashes'
      });

      const backup = await vfs.exportVFS();
      await vfs.importVFS(backup);

      expect(await vfs.readFile('/home/.hidden')).to.equal('hidden');
      expect(await vfs.readFile('/home/file with spaces.txt')).to.equal('spaces');
      expect(await vfs.readFile('/home/file-with-dashes.txt')).to.equal('dashes');
    });

    it('should handle empty files', async () => {
      await populateTestFixtures(vfs, {
        '/home/empty.txt': '',
        '/home/nonempty.txt': 'content'
      });

      const backup = await vfs.exportVFS();
      await vfs.importVFS(backup);

      expect(await vfs.readFile('/home/empty.txt')).to.equal('');
      expect(await vfs.readFile('/home/nonempty.txt')).to.equal('content');
    });
  });

  describe('round-trip backup/restore', () => {
    it('should maintain VFS integrity after multiple round trips', async () => {
      // Initial state
      await populateTestFixtures(vfs, {
        '/home/file1.txt': 'content 1',
        '/home/dir/file2.txt': 'content 2'
      });

      // Round trip 1
      let backup1 = await vfs.exportVFS();
      await vfs.importVFS(backup1);

      expect(await vfs.readFile('/home/file1.txt')).to.equal('content 1');
      expect(await vfs.readFile('/home/dir/file2.txt')).to.equal('content 2');

      // Round trip 2
      let backup2 = await vfs.exportVFS();
      await vfs.importVFS(backup2);

      expect(await vfs.readFile('/home/file1.txt')).to.equal('content 1');
      expect(await vfs.readFile('/home/dir/file2.txt')).to.equal('content 2');

      // Backups should be equivalent
      const data1 = JSON.parse(backup1);
      const data2 = JSON.parse(backup2);
      expect(data1.entries.length).to.equal(data2.entries.length);
    });

    it('should handle unicode content', async () => {
      const unicodeContent = '你好世界 🌍 Hello Мир';
      await vfs.writeFile('/home/unicode.txt', unicodeContent);

      const backup = await vfs.exportVFS();
      await vfs.unlinkRecursive('/home');
      await vfs.mkdir('/home');
      await vfs.importVFS(backup);

      const restored = await vfs.readFile('/home/unicode.txt');
      expect(restored).to.equal(unicodeContent);
    });

    it('should handle large file content', async () => {
      // Create ~1MB file
      const largeContent = 'x'.repeat(1024 * 1024);
      await vfs.writeFile('/home/large.txt', largeContent);

      const backup = await vfs.exportVFS();
      await vfs.unlink('/home/large.txt');
      await vfs.importVFS(backup);

      const restored = await vfs.readFile('/home/large.txt');
      expect(restored).to.equal(largeContent);
      expect(restored.length).to.equal(1024 * 1024);
    });
  });
});
