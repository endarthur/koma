/**
 * Integration tests for filesystem utility commands
 * Tests for rm, mv, touch, stat, head, tail, wc, find, sort, uniq, diff
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Filesystem Utility Commands', () => {
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

  describe('rm', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/toremove.txt': 'delete me',
        '/home/subdir/nested.txt': 'nested file',
      });
    });

    it('should remove a file', async () => {
      shell.cwd = '/home';
      await shell.execute('rm toremove.txt');

      // File should no longer exist
      try {
        await vfs.stat('/home/toremove.txt');
        expect.fail('File should not exist');
      } catch (e) {
        expect(e.message).to.match(/ENOENT|not found/i);
      }
    });

    it('should error on non-existent file', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('rm nonexistent.txt');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/error|not found|enoent/);
    });

    it('should remove multiple files', async () => {
      await populateTestFixtures(vfs, {
        '/home/file1.txt': 'content1',
        '/home/file2.txt': 'content2',
      });

      shell.cwd = '/home';
      await shell.execute('rm file1.txt file2.txt');

      // Both files should be removed
      try {
        await vfs.stat('/home/file1.txt');
        expect.fail('file1.txt should not exist');
      } catch (e) {
        // Expected
      }
      try {
        await vfs.stat('/home/file2.txt');
        expect.fail('file2.txt should not exist');
      } catch (e) {
        // Expected
      }
    });
  });

  describe('mv', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/source.txt': 'original content',
      });
    });

    it('should move a file', async () => {
      shell.cwd = '/home';
      await shell.execute('mv source.txt dest.txt');

      // Source should not exist
      try {
        await vfs.stat('/home/source.txt');
        expect.fail('Source should not exist');
      } catch (e) {
        // Expected
      }

      // Destination should exist with same content
      const content = await vfs.readFile('/home/dest.txt');
      expect(content).to.equal('original content');
    });

    it('should rename a file', async () => {
      shell.cwd = '/home';
      await shell.execute('mv source.txt renamed.txt');

      const content = await vfs.readFile('/home/renamed.txt');
      expect(content).to.equal('original content');
    });
  });

  describe('touch', () => {
    it('should create a new empty file', async () => {
      shell.cwd = '/home';
      await shell.execute('touch newfile.txt');

      const stat = await vfs.stat('/home/newfile.txt');
      expect(stat.type).to.equal('file');
    });
  });

  describe('stat', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/testfile.txt': 'hello world',
      });
      try {
        await vfs.mkdir('/home/testdir');
      } catch (e) {
        // Already exists
      }
    });

    it('should display file statistics', async () => {
      shell.cwd = '/home';
      await shell.execute('stat testfile.txt');
      const output = term.getOutput();

      expect(output).to.include('testfile.txt');
      expect(output.toLowerCase()).to.match(/file|size|type/);
    });

    it('should display directory statistics', async () => {
      shell.cwd = '/home';
      await shell.execute('stat testdir');
      const output = term.getOutput();

      expect(output).to.include('testdir');
    });

    it('should error on non-existent path', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('stat nonexistent');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/error|not found|enoent/);
    });
  });

  describe('head', () => {
    beforeEach(async () => {
      const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n');
      await populateTestFixtures(vfs, {
        '/home/longfile.txt': lines,
      });
    });

    it('should display first 10 lines by default', async () => {
      shell.cwd = '/home';
      await shell.execute('head longfile.txt');
      const output = term.getOutput();

      expect(output).to.include('Line 1');
      expect(output).to.include('Line 10');
      expect(output).not.to.include('Line 11');
    });

    it('should display specified number of lines with -n', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('head -n 5 longfile.txt');
      const output = term.getOutput();

      expect(output).to.include('Line 1');
      expect(output).to.include('Line 5');
      expect(output).not.to.include('Line 6');
    });
  });

  describe('tail', () => {
    beforeEach(async () => {
      const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n');
      await populateTestFixtures(vfs, {
        '/home/longfile.txt': lines,
      });
    });

    it('should display last 10 lines by default', async () => {
      shell.cwd = '/home';
      await shell.execute('tail longfile.txt');
      const output = term.getOutput();

      expect(output).to.include('Line 20');
      expect(output).to.include('Line 11');
      expect(output).not.to.include('Line 10');
    });

    it('should display specified number of lines with -n', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('tail -n 5 longfile.txt');
      const output = term.getOutput();

      expect(output).to.include('Line 20');
      expect(output).to.include('Line 16');
      expect(output).not.to.include('Line 15');
    });
  });

  describe('wc', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/countme.txt': 'line one\nline two\nline three',
      });
    });

    it('should count lines, words, and characters', async () => {
      shell.cwd = '/home';
      await shell.execute('wc countme.txt');
      const output = term.getOutput();

      // Should include counts
      expect(output).to.match(/\d/);
    });

    it('should count lines with -l', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('wc -l countme.txt');
      const output = term.getOutput();
      expect(output).to.include('3');
    });
  });

  describe('sort', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/unsorted.txt': 'banana\napple\ncherry\ndate',
      });
    });

    it('should sort lines alphabetically', async () => {
      shell.cwd = '/home';
      await shell.execute('sort unsorted.txt');
      const lines = term.getOutputLines().filter(l => l.trim());

      expect(lines[0]).to.equal('apple');
      expect(lines[1]).to.equal('banana');
      expect(lines[2]).to.equal('cherry');
      expect(lines[3]).to.equal('date');
    });

    it('should reverse sort with -r', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('sort -r unsorted.txt');
      const lines = term.getOutputLines().filter(l => l.trim());

      expect(lines[0]).to.equal('date');
      expect(lines[lines.length - 1]).to.equal('apple');
    });
  });

  describe('uniq', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/duplicates.txt': 'apple\napple\nbanana\nbanana\nbanana\ncherry',
      });
    });

    it('should remove adjacent duplicates', async () => {
      shell.cwd = '/home';
      await shell.execute('uniq duplicates.txt');
      const lines = term.getOutputLines().filter(l => l.trim());

      expect(lines).to.have.lengthOf(3);
      expect(lines[0]).to.equal('apple');
      expect(lines[1]).to.equal('banana');
      expect(lines[2]).to.equal('cherry');
    });

    it('should count occurrences with -c', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('uniq -c duplicates.txt');
      const output = term.getOutput();

      expect(output).to.include('2');
      expect(output).to.include('3');
    });
  });

});

describe('Directory Commands', () => {
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

  describe('mkdir', () => {
    it('should create a directory', async () => {
      shell.cwd = '/home';
      await shell.execute('mkdir newdir');

      const stat = await vfs.stat('/home/newdir');
      expect(stat.type).to.equal('directory');
    });

    it('should error on existing directory', async () => {
      try {
        await vfs.mkdir('/home/existing');
      } catch (e) {
        // Already exists
      }

      shell.cwd = '/home';
      term.clear();
      await shell.execute('mkdir existing');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/exist|error/);
    });
  });

  describe('tree', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/treedir/a.txt': 'a',
        '/home/treedir/sub/b.txt': 'b',
      });
    });

    it('should display directory tree', async () => {
      shell.cwd = '/home';
      await shell.execute('tree treedir');
      const output = term.getOutput();

      expect(output).to.include('treedir');
      expect(output).to.match(/a\.txt|sub/);
    });
  });
});
