/**
 * Integration tests for text processing commands
 * Tests for grep and its various options
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Text Processing Commands', () => {
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

  describe('grep', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/search.txt': 'hello world\nHELLO WORLD\ntest line\nhello again\nnothing',
      });
    });

    it('should find matching lines', async () => {
      shell.cwd = '/home';
      await shell.execute('grep hello search.txt');
      const lines = term.getOutputLines().filter(l => l.includes('hello'));
      expect(lines.length).to.equal(2);
    });

    it('should support case insensitive with -i', async () => {
      shell.cwd = '/home';
      await shell.execute('grep -i hello search.txt');
      const output = term.getOutput();
      expect(output).to.include('hello');
      expect(output).to.include('HELLO');
    });

    it('should show line numbers with -n', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('grep -n hello search.txt');
      const output = term.getOutput();
      expect(output).to.match(/\d+:/);
    });

    it('should count matches with -c', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('grep -c hello search.txt');
      const output = term.getOutput().trim();
      expect(parseInt(output, 10)).to.be.greaterThan(0);
    });

    it('should invert match with -v', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('grep -v hello search.txt');
      const output = term.getOutput();
      expect(output).not.to.match(/^hello/m);
    });

    it('should work from stdin with pipe', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('cat search.txt | grep test');
      const output = term.getOutput();
      expect(output).to.include('test');
    });

    it('should handle no matches gracefully', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('grep nomatchxyz search.txt');
      // Should not error, just no output
    });
  });

  describe('grep combined flags', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/multi.txt': 'Apple\napple\nBANANA\nbanana\nCherry',
      });
    });

    it('should combine -i and -n', async () => {
      shell.cwd = '/home';
      await shell.execute('grep -in apple multi.txt');
      const output = term.getOutput();
      expect(output).to.match(/\d+:.*[Aa]pple/);
    });

    it('should combine -v and -c', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('grep -vc apple multi.txt');
      const output = term.getOutput().trim();
      // Count lines NOT matching apple (case sensitive)
      expect(parseInt(output, 10)).to.be.greaterThan(0);
    });
  });
});

describe('Additional ls tests', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    await populateTestFixtures(vfs, {
      '/home/dir1/file1.txt': 'content1',
      '/home/dir1/file2.txt': 'content2',
      '/home/dir2/.hidden': 'hidden file',
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('ls options', () => {
    it('should list files in directory', async () => {
      shell.cwd = '/home/dir1';
      await shell.execute('ls');
      const output = term.getOutput();
      expect(output).to.include('file1.txt');
      expect(output).to.include('file2.txt');
    });

    it('should list with -l for long format', async () => {
      shell.cwd = '/home/dir1';
      term.clear();
      await shell.execute('ls -l');
      const output = term.getOutput();
      // Long format includes more details
      expect(output).to.include('file1.txt');
    });

    it('should show hidden files with -a', async () => {
      shell.cwd = '/home/dir2';
      term.clear();
      await shell.execute('ls -a');
      const output = term.getOutput();
      expect(output).to.include('.hidden');
    });

    it('should handle non-existent directory', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('ls nonexistent_dir');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/error|not found|enoent/);
    });
  });
});

describe('Additional cd tests', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    try {
      await vfs.mkdir('/home/subdir');
    } catch (e) {}
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('cd navigation', () => {
    it('should change to directory', async () => {
      await shell.execute('cd /home');
      expect(shell.cwd).to.equal('/home');
    });

    it('should handle relative path', async () => {
      shell.cwd = '/home';
      await shell.execute('cd subdir');
      expect(shell.cwd).to.equal('/home/subdir');
    });

    it('should handle .. path', async () => {
      shell.cwd = '/home/subdir';
      await shell.execute('cd ..');
      expect(shell.cwd).to.equal('/home');
    });

    it('should handle ~ for home', async () => {
      shell.cwd = '/tmp';
      await shell.execute('cd ~');
      expect(shell.cwd).to.equal('/home');
    });

    it('should error on non-existent directory', async () => {
      term.clear();
      await shell.execute('cd /nonexistent');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/error|not found|enoent/);
    });

    it('should error when trying to cd into file', async () => {
      await populateTestFixtures(vfs, {
        '/home/file.txt': 'content',
      });

      term.clear();
      await shell.execute('cd /home/file.txt');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/not a directory|error/);
    });
  });
});
