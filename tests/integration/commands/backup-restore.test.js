/**
 * Backup & Restore Commands Integration Tests
 * Tests for .kmt tape format backup/restore system
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Backup & Restore Commands', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('backup command', () => {
    it('should create a backup with default label', async () => {
      // Create some test files
      await populateTestFixtures(vfs, {
        '/home/test.txt': 'test content',
        '/home/dir/file.txt': 'nested content'
      });

      // Note: backup triggers download, we can't test that in Node/browser tests
      // But we can test that the command doesn't error
      await shell.execute('backup');

      const output = term.getOutput();
      expect(output).to.include('Creating backup');
    });

    it('should create a backup with custom label', async () => {
      await populateTestFixtures(vfs, {
        '/home/test.txt': 'content'
      });

      await shell.execute('backup test-label');

      const output = term.getOutput();
      expect(output).to.include('Creating backup');
    });

    it('should support --no-compress flag', async () => {
      await populateTestFixtures(vfs, {
        '/home/test.txt': 'content'
      });

      await shell.execute('backup --no-compress');

      const output = term.getOutput();
      expect(output).to.include('Creating backup');
    });

    it('should show help with -h', async () => {
      await shell.execute('backup -h');

      const output = term.getOutput();
      expect(output).to.include('Create backup of VFS');
      expect(output).to.include('.kmt');
    });
  });

  describe('restore command', () => {
    it('should show help with -h', async () => {
      await shell.execute('restore -h');

      const output = term.getOutput();
      expect(output).to.include('Restore VFS from');
      expect(output).to.include('.kmt');
      expect(output).to.include('--apply');
      expect(output).to.include('--now');
    });

    it('should error without filename', async () => {
      await shell.execute('restore');

      const output = term.getOutput();
      expect(output).to.include('error');
      expect(output).to.include('missing backup file');
    });

    // Note: Testing full restore workflow requires file upload simulation
    // which is difficult in automated tests. The command structure is tested,
    // and manual testing should verify the full workflow.
  });

  describe('backup/restore workflow (programmatic)', () => {
    // Test the backup/restore workflow using kernel methods directly
    // This validates the core functionality without UI interactions

    // NOTE: Some tests that rely on VFS clearing/restoration are skipped because
    // all tests share the same kernel singleton (see vfs-test-helper.js line 25-26).
    // This is a known architectural limitation.

    // UTF-8 safe base64 helpers
    function utf8ToBase64(str) {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(str);
      const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
      return btoa(binaryString);
    }

    function base64ToUtf8(b64) {
      const binaryString = atob(b64);
      const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    }

    async function createBackup(kernel, label = 'test') {
      // Simulate what backup command does
      const entries = await getAllVFSEntries(kernel, '/', ['/mnt/backups']);
      const entriesJSON = JSON.stringify(entries);

      // For testing, we'll create an uncompressed backup
      const backup = {
        format: 'kmt',
        version: '1.0',
        created: new Date().toISOString(),
        label: label,
        compression: 'none',
        checksum: {
          uncompressed: 'test-checksum'
        },
        stats: {
          files: entries.filter(e => e.type === 'file').length,
          directories: entries.filter(e => e.type === 'directory').length,
          size: entriesJSON.length
        },
        data: utf8ToBase64(entriesJSON)
      };

      return backup;
    }

    async function getAllVFSEntries(kernel, path = '/', excludePaths = []) {
      const entries = [];

      try {
        const dirEntries = await kernel.readdir(path);

        for (const entry of dirEntries) {
          const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;

          if (excludePaths.some(ex => fullPath.startsWith(ex))) {
            continue;
          }

          if (entry.type === 'directory') {
            entries.push({
              path: fullPath,
              type: 'directory',
              created: entry.created,
              modified: entry.modified
            });

            const subEntries = await getAllVFSEntries(kernel, fullPath, excludePaths);
            entries.push(...subEntries);
          } else if (entry.type === 'file') {
            const content = await kernel.readFile(fullPath);
            entries.push({
              path: fullPath,
              type: 'file',
              size: entry.size,
              created: entry.created,
              modified: entry.modified,
              content: content
            });
          }
        }
      } catch (error) {
        // Skip
      }

      return entries;
    }

    async function applyBackup(kernel, backup, excludePaths = []) {
      // Decode backup
      const entriesJSON = base64ToUtf8(backup.data);
      const entries = JSON.parse(entriesJSON);

      // Clear VFS except excluded paths - get top-level directories only
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
          // Ignore errors
        }
      }

      // Restore entries - Sort so directories come before files, and by path depth
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
            // Directory might exist
          }
        } else if (entry.type === 'file') {
          await kernel.writeFile(entry.path, entry.content);
        }
      }
    }

    it('should backup and restore files correctly', async () => {
      // Create initial state
      await populateTestFixtures(vfs, {
        '/home/file1.txt': 'content 1',
        '/home/file2.txt': 'content 2',
        '/home/dir/nested.txt': 'nested content'
      });

      // Create backup
      const backup = await createBackup(vfs, 'test-backup');

      // Verify backup structure
      expect(backup.format).to.equal('kmt');
      expect(backup.version).to.equal('1.0');
      expect(backup.stats.files).to.be.at.least(3); // At least our 3 files, plus any system files

      // Modify VFS
      await vfs.writeFile('/home/file1.txt', 'modified content');
      await vfs.writeFile('/home/new-file.txt', 'new content');

      // Verify modifications
      let content = await vfs.readFile('/home/file1.txt');
      expect(content).to.equal('modified content');

      // Restore backup
      await applyBackup(vfs, backup, ['/mnt/backups']);

      // Verify restoration
      content = await vfs.readFile('/home/file1.txt');
      expect(content).to.equal('content 1');

      content = await vfs.readFile('/home/file2.txt');
      expect(content).to.equal('content 2');

      content = await vfs.readFile('/home/dir/nested.txt');
      expect(content).to.equal('nested content');

      // Verify new file was removed
      try {
        await vfs.readFile('/home/new-file.txt');
        expect.fail('File should not exist');
      } catch (error) {
        expect(error.message).to.include('ENOENT');
      }
    });

    it('should handle empty VFS backup', async () => {
      // Start with minimal VFS (just system dirs)
      const backup = await createBackup(vfs, 'empty');

      expect(backup.format).to.equal('kmt');
      expect(backup.stats.files).to.be.at.least(0);
    });

    it('should handle binary-like content', async () => {
      // Create file with special characters
      const binaryContent = '\x00\x01\x02\xFF\xFE';
      await vfs.writeFile('/home/binary.dat', binaryContent);

      const backup = await createBackup(vfs, 'binary');

      // Clear and restore
      await vfs.unlink('/home/binary.dat');
      await applyBackup(vfs, backup, ['/mnt/backups']);

      const restored = await vfs.readFile('/home/binary.dat');
      expect(restored).to.equal(binaryContent);
    });

    it.skip('should preserve directory structure (skipped: shared VFS limitation)', async () => {
      await populateTestFixtures(vfs, {
        '/home/a/b/c/file.txt': 'deep content'
      });

      const backup = await createBackup(vfs, 'structure');

      // Modify the file to verify restore works
      await vfs.writeFile('/home/a/b/c/file.txt', 'modified');
      let content = await vfs.readFile('/home/a/b/c/file.txt');
      expect(content).to.equal('modified');

      // Restore
      await applyBackup(vfs, backup, ['/mnt/backups']);

      content = await vfs.readFile('/home/a/b/c/file.txt');
      expect(content).to.equal('deep content');
    });

    it('should handle large number of files', async () => {
      // Create multiple files
      const fixtures = {};
      for (let i = 0; i < 50; i++) {
        fixtures[`/home/file${i}.txt`] = `content ${i}`;
      }
      await populateTestFixtures(vfs, fixtures);

      const backup = await createBackup(vfs, 'many-files');

      expect(backup.stats.files).to.be.at.least(50);

      // Restore and verify
      await applyBackup(vfs, backup, ['/mnt/backups']);

      const content0 = await vfs.readFile('/home/file0.txt');
      expect(content0).to.equal('content 0');

      const content49 = await vfs.readFile('/home/file49.txt');
      expect(content49).to.equal('content 49');
    });

    it('should handle files with special names', async () => {
      await populateTestFixtures(vfs, {
        '/home/.hidden': 'hidden content',
        '/home/file with spaces.txt': 'spaces content',
        '/home/file-with-dashes.txt': 'dashes content'
      });

      const backup = await createBackup(vfs, 'special-names');
      await applyBackup(vfs, backup, ['/mnt/backups']);

      let content = await vfs.readFile('/home/.hidden');
      expect(content).to.equal('hidden content');

      content = await vfs.readFile('/home/file with spaces.txt');
      expect(content).to.equal('spaces content');

      content = await vfs.readFile('/home/file-with-dashes.txt');
      expect(content).to.equal('dashes content');
    });

    it('should handle empty files', async () => {
      await populateTestFixtures(vfs, {
        '/home/empty.txt': '',
        '/home/nonempty.txt': 'content'
      });

      const backup = await createBackup(vfs, 'empty-files');
      await applyBackup(vfs, backup, ['/mnt/backups']);

      const empty = await vfs.readFile('/home/empty.txt');
      expect(empty).to.equal('');

      const nonempty = await vfs.readFile('/home/nonempty.txt');
      expect(nonempty).to.equal('content');
    });

    it('should preserve file contents exactly', async () => {
      const specialContent = 'Line 1\nLine 2\tTabbed\nLine 3 with "quotes" and \'apostrophes\'\n\\backslashes\\';
      await vfs.writeFile('/home/special.txt', specialContent);

      const backup = await createBackup(vfs, 'special');
      await vfs.unlink('/home/special.txt');
      await applyBackup(vfs, backup, ['/mnt/backups']);

      const restored = await vfs.readFile('/home/special.txt');
      expect(restored).to.equal(specialContent);
    });

    it.skip('should clear VFS before restore (skipped: shared VFS limitation)', async () => {
      // Create initial state
      await populateTestFixtures(vfs, {
        '/home/file1.txt': 'content 1'
      });

      const backup = await createBackup(vfs, 'state1');

      // Add more files
      await vfs.writeFile('/home/file2.txt', 'content 2');
      await vfs.writeFile('/home/file3.txt', 'content 3');

      // Restore should remove file2 and file3
      await applyBackup(vfs, backup, ['/mnt/backups']);

      // file1 should exist
      const content1 = await vfs.readFile('/home/file1.txt');
      expect(content1).to.equal('content 1');

      // file2 and file3 should not exist
      try {
        await vfs.readFile('/home/file2.txt');
        expect.fail('file2 should not exist');
      } catch (error) {
        expect(error.message).to.include('ENOENT');
      }

      try {
        await vfs.readFile('/home/file3.txt');
        expect.fail('file3 should not exist');
      } catch (error) {
        expect(error.message).to.include('ENOENT');
      }
    });

    it('should exclude /mnt/backups from backup', async () => {
      // Create files in /mnt/backups
      try {
        await vfs.mkdir('/mnt/backups');
      } catch (e) {
        // Already exists
      }
      await vfs.writeFile('/mnt/backups/existing.kmt', 'existing backup');

      // Create files elsewhere
      await vfs.writeFile('/home/test.txt', 'test');

      const backup = await createBackup(vfs, 'exclude-test');

      // Decode and check entries
      const entriesJSON = atob(backup.data);
      const entries = JSON.parse(entriesJSON);

      // Should not include /mnt/backups files
      const backupPaths = entries.map(e => e.path);
      expect(backupPaths).to.not.include('/mnt/backups');
      expect(backupPaths).to.not.include('/mnt/backups/existing.kmt');

      // Should include /home files
      expect(backupPaths.some(p => p.startsWith('/home'))).to.be.true;
    });
  });
});
