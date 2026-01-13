/**
 * Extended Filesystem Commands Integration Tests
 * Tests for cp -r, grep -r, grep -l, and logical operators
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Extended Filesystem Commands', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    // Create test directory structure
    await populateTestFixtures(vfs, {
      '/home/src/file1.txt': 'content of file1\nline with TODO here',
      '/home/src/file2.txt': 'content of file2\nanother line',
      '/home/src/sub/nested.txt': 'nested file content\nTODO: fix this',
      '/home/src/sub/deep/deeper.txt': 'deeply nested\nTODO item',
      '/home/searchdir/a.js': 'function test() { return true; }',
      '/home/searchdir/b.js': 'const TODO = "fix me";\nexport default TODO;',
      '/home/searchdir/c.txt': 'just a text file',
      '/home/searchdir/sub/d.js': '// TODO: implement\nfunction foo() {}',
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('cp -r (recursive copy)', () => {
    it('should copy a directory recursively', async () => {
      shell.cwd = '/home';
      await shell.execute('cp -r src dest');

      // Check that destination exists
      const stat = await vfs.stat('/home/dest');
      expect(stat.type).to.equal('directory');

      // Check that files were copied
      const file1 = await vfs.readFile('/home/dest/file1.txt');
      expect(file1).to.include('content of file1');

      const file2 = await vfs.readFile('/home/dest/file2.txt');
      expect(file2).to.include('content of file2');
    });

    it('should copy nested directories recursively', async () => {
      shell.cwd = '/home';
      await shell.execute('cp -r src backup');

      // Check nested file
      const nested = await vfs.readFile('/home/backup/sub/nested.txt');
      expect(nested).to.include('nested file content');

      // Check deeply nested file
      const deep = await vfs.readFile('/home/backup/sub/deep/deeper.txt');
      expect(deep).to.include('deeply nested');
    });

    it('should error when copying directory without -r flag', async () => {
      shell.cwd = '/home';
      await shell.execute('cp src dest');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/omitting directory|use -r/);
    });

    it('should copy single file without -r flag', async () => {
      shell.cwd = '/home';
      await shell.execute('cp src/file1.txt copy.txt');

      const content = await vfs.readFile('/home/copy.txt');
      expect(content).to.include('content of file1');
    });

    it('should copy directory into existing directory', async () => {
      shell.cwd = '/home';
      await vfs.mkdir('/home/existing');
      await shell.execute('cp -r src existing/');

      // Should create src inside existing
      const content = await vfs.readFile('/home/existing/src/file1.txt');
      expect(content).to.include('content of file1');
    });
  });

  describe('grep -r (recursive search)', () => {
    it('should search directory recursively', async () => {
      shell.cwd = '/home';
      await shell.execute('grep -r TODO searchdir');

      const output = term.getOutput();
      // Should find TODO in multiple files
      expect(output).to.include('b.js');
      expect(output).to.include('d.js');
    });

    it('should show file paths in recursive output', async () => {
      shell.cwd = '/home';
      await shell.execute('grep -r TODO searchdir');

      const output = term.getOutput();
      // Output should include file paths
      expect(output).to.match(/searchdir.*\.js/);
    });

    it('should error when searching directory without -r flag', async () => {
      shell.cwd = '/home';
      await shell.execute('grep TODO searchdir');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/is a directory|use -r/);
    });

    it('should search with case-insensitive flag', async () => {
      shell.cwd = '/home';
      await shell.execute('grep -ri todo searchdir');

      const output = term.getOutput();
      // Should find both TODO and todo
      expect(output).to.include('b.js');
    });

    it('should combine -r with -n for line numbers', async () => {
      shell.cwd = '/home';
      await shell.execute('grep -rn TODO searchdir');

      const output = term.getOutput();
      // Should include line numbers
      expect(output).to.match(/:\d+:/);
    });
  });

  describe('grep -l (files with matches only)', () => {
    it('should show only filenames with -l flag', async () => {
      shell.cwd = '/home';
      await shell.execute('grep -rl TODO searchdir');

      const output = term.getOutput();
      const lines = term.getOutputLines().filter(l => l.trim());

      // Should only show file paths, not content
      lines.forEach(line => {
        expect(line).to.match(/\.js$/);
        expect(line).not.to.include('TODO'); // Should not include the match content
      });
    });

    it('should show unique filenames', async () => {
      shell.cwd = '/home';
      await shell.execute('grep -rl TODO src');

      const lines = term.getOutputLines().filter(l => l.trim());
      const uniqueLines = [...new Set(lines)];

      // Each file should only appear once
      expect(lines.length).to.equal(uniqueLines.length);
    });
  });

  describe('grep -c (count matches)', () => {
    it('should count matches across recursive search', async () => {
      shell.cwd = '/home';
      await shell.execute('grep -rc TODO src');

      const output = term.getOutput().trim();
      // Should return a count (number)
      expect(parseInt(output, 10)).to.be.greaterThan(0);
    });
  });
});

describe('Logical Operators Integration', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    // Create minimal test files
    await populateTestFixtures(vfs, {
      '/home/exists.txt': 'file content',
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('&& (AND) operator', () => {
    it('should execute second command when first succeeds', async () => {
      shell.cwd = '/home';
      await shell.execute('mkdir testdir && touch testdir/file.txt');

      // Both commands should have executed
      const stat = await vfs.stat('/home/testdir/file.txt');
      expect(stat.type).to.equal('file');
    });

    it('should not execute second command when first fails', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('cat nonexistent.txt && echo "should not appear"');

      const output = term.getOutput();
      expect(output).not.to.include('should not appear');
      expect(output.toLowerCase()).to.match(/error|not found|enoent/);
    });

    it('should chain multiple && operators', async () => {
      shell.cwd = '/home';
      await shell.execute('mkdir a && mkdir a/b && touch a/b/c.txt');

      const stat = await vfs.stat('/home/a/b/c.txt');
      expect(stat.type).to.equal('file');
    });
  });

  describe('|| (OR) operator', () => {
    it('should not execute second command when first succeeds', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('cat exists.txt || echo "fallback"');

      const output = term.getOutput();
      expect(output).to.include('file content');
      expect(output).not.to.include('fallback');
    });

    it('should execute second command when first fails', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('cat nonexistent.txt || echo "fallback executed"');

      const output = term.getOutput();
      expect(output).to.include('fallback executed');
    });

    it('should chain multiple || operators', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('cat no1.txt || cat no2.txt || echo "all failed"');

      const output = term.getOutput();
      expect(output).to.include('all failed');
    });
  });

  describe('Mixed && and ||', () => {
    it('should handle && followed by ||', async () => {
      shell.cwd = '/home';
      term.clear();
      // First mkdir succeeds, but cat fails, so || triggers
      await shell.execute('mkdir mixed && cat nonexistent.txt || echo "recovered"');

      const output = term.getOutput();
      expect(output).to.include('recovered');
    });

    it('should set correct exit code with $?', async () => {
      shell.cwd = '/home';

      // Successful command
      await shell.execute('cat exists.txt');
      term.clear();
      await shell.execute('echo $?');
      expect(term.getOutput()).to.include('0');

      // Failed command
      term.clear();
      await shell.execute('cat nonexistent.txt');
      term.clear();
      await shell.execute('echo $?');
      const output = term.getOutput();
      expect(output).not.to.equal('0');
    });
  });

  describe('Logical operators with pipes', () => {
    it('should allow pipeline on left side of &&', async () => {
      shell.cwd = '/home';
      await populateTestFixtures(vfs, {
        '/home/data.txt': 'line1\nmatch\nline3',
      });

      term.clear();
      await shell.execute('cat data.txt | grep match && echo "found"');

      const output = term.getOutput();
      expect(output).to.include('found');
    });
  });
});
