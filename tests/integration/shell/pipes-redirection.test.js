/**
 * Pipes and Redirection Integration Tests
 * Phase 5.6 - CRITICAL: Tests for pipes (|), redirection (>, >>, <, 2>, 2>&1)
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Pipes and Redirection', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Clear VFS state from previous tests (all tests share same kernel singleton)
    try {
      const topLevelDirs = await vfs.readdir('/');
      for (const entry of topLevelDirs) {
        const fullPath = `/${entry.name}`;
        try {
          if (entry.type === 'directory') {
            await vfs.unlinkRecursive(fullPath);
          } else {
            await vfs.unlink(fullPath);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (e) {
      // Ignore if readdir fails
    }

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    // Populate test files
    await populateTestFixtures(vfs, {
      '/home/test.txt': 'apple\nbanana\ncherry\napricot\nblueberry',
      '/home/numbers.txt': '1\n2\n3\n4\n5',
      '/home/mixed.txt': 'hello world\ntest line\nhello again\nanother test',
      '/home/data.csv': 'name,age,city\nalice,30,NYC\nbob,25,LA\ncarol,35,NYC',
      '/home/empty.txt': '',
    });

    shell.cwd = '/home';
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('Simple Pipes (|)', () => {
    it('should pipe cat output to grep', async () => {
      await shell.execute('cat test.txt | grep apple');
      const output = term.getOutput();

      expect(output).to.include('apple');
      expect(output).not.to.include('apricot');
      expect(output).not.to.include('banana');
      expect(output).not.to.include('cherry');
    });

    it('should pipe echo output to cat', async () => {
      await shell.execute('echo "hello world" | cat');
      const output = term.getOutput();

      expect(output).to.include('hello world');
    });

    it('should pipe ls output to grep', async () => {
      await shell.execute('ls | grep test');
      const output = term.getOutput();

      expect(output).to.include('test.txt');
      expect(output).not.to.include('numbers.txt');
    });

    it('should pass stdin data through pipe', async () => {
      await shell.execute('echo "test data" | grep test');
      const output = term.getOutput();

      expect(output).to.include('test');
    });

    it('should handle multiple files through cat pipe', async () => {
      await shell.execute('cat test.txt numbers.txt | grep 1');
      const output = term.getOutput();

      expect(output).to.include('1');
    });

    it('should pipe cat to wc for line count', async () => {
      await shell.execute('cat test.txt | wc -l');
      const output = term.getOutput();

      // test.txt has 5 lines
      expect(output).to.include('5');
    });

    it('should handle empty input through pipe', async () => {
      await shell.execute('cat empty.txt | grep test');
      const output = term.getOutput();

      // Should have no matches
      expect(output.trim().length).to.be.lessThan(50);
    });
  });

  describe('Multi-stage Pipes', () => {
    it('should chain three commands (cat | grep | wc)', async () => {
      await shell.execute('cat test.txt | grep a | wc -l');
      const output = term.getOutput();

      // Lines with 'a': apple, banana, apricot = 3 lines
      expect(output).to.include('3');
    });

    it('should handle echo | cat | cat | cat chain', async () => {
      await shell.execute('echo "test" | cat | cat | cat');
      const output = term.getOutput();

      expect(output).to.include('test');
    });

    it('should count txt files with ls | grep | wc', async () => {
      await shell.execute('ls | grep .txt | wc -l');
      const output = term.getOutput();

      // Should count .txt files
      expect(output).to.match(/[3-9]/); // At least 3 txt files
    });

    it('should filter and sort through pipeline', async () => {
      await shell.execute('cat data.csv | grep NYC');
      const output = term.getOutput();

      expect(output).to.include('alice');
      expect(output).to.include('carol');
      expect(output).not.to.include('bob');
    });

    it('should handle long pipeline chains', async () => {
      await shell.execute('echo "hello" | cat | cat | grep hello | cat');
      const output = term.getOutput();

      expect(output).to.include('hello');
    });
  });

  describe('Output Redirection (>)', () => {
    it('should redirect echo output to new file', async () => {
      await shell.execute('echo "hello redirect" > output.txt');

      const content = await vfs.readFile('/home/output.txt');
      expect(content).to.include('hello redirect');
    });

    it('should redirect cat output to file', async () => {
      await shell.execute('cat test.txt > copy.txt');

      const original = await vfs.readFile('/home/test.txt');
      const copy = await vfs.readFile('/home/copy.txt');

      expect(copy).to.equal(original);
    });

    it('should overwrite existing file with >', async () => {
      await vfs.writeFile('/home/existing.txt', 'old content');

      await shell.execute('echo "new content" > existing.txt');

      const content = await vfs.readFile('/home/existing.txt');
      expect(content).to.include('new content');
      expect(content).not.to.include('old content');
    });

    it('should redirect grep results to file', async () => {
      await shell.execute('grep apple test.txt > results.txt');

      const content = await vfs.readFile('/home/results.txt');
      expect(content).to.include('apple');
      expect(content).not.to.include('apricot');
    });

    it('should create file if it does not exist', async () => {
      await shell.execute('echo "new file" > brand-new.txt');

      const content = await vfs.readFile('/home/brand-new.txt');
      expect(content).to.include('new file');
    });

    it('should not write to terminal when redirected', async () => {
      term.clear();
      await shell.execute('echo "hidden" > silent.txt');

      const output = term.getOutput();
      // Output should not include the echoed text
      expect(output).not.to.include('hidden');
    });

    it('should handle empty output redirect', async () => {
      await shell.execute('cat empty.txt > empty-copy.txt');

      const content = await vfs.readFile('/home/empty-copy.txt');
      expect(content).to.equal('');
    });
  });

  describe('Append Redirection (>>)', () => {
    it('should append to existing file', async () => {
      await shell.execute('echo "line1" > append-test.txt');
      await shell.execute('echo "line2" >> append-test.txt');

      const content = await vfs.readFile('/home/append-test.txt');
      expect(content).to.include('line1');
      expect(content).to.include('line2');
    });

    it('should create file if it does not exist (>>)', async () => {
      await shell.execute('echo "first line" >> new-append.txt');

      const content = await vfs.readFile('/home/new-append.txt');
      expect(content).to.include('first line');
    });

    it('should preserve original content when appending', async () => {
      await vfs.writeFile('/home/log.txt', 'original log\n');

      await shell.execute('echo "new entry" >> log.txt');

      const content = await vfs.readFile('/home/log.txt');
      expect(content).to.include('original log');
      expect(content).to.include('new entry');
    });

    it('should append multiple times', async () => {
      await shell.execute('echo "line1" > multi.txt');
      await shell.execute('echo "line2" >> multi.txt');
      await shell.execute('echo "line3" >> multi.txt');
      await shell.execute('echo "line4" >> multi.txt');

      const content = await vfs.readFile('/home/multi.txt');
      expect(content).to.include('line1');
      expect(content).to.include('line2');
      expect(content).to.include('line3');
      expect(content).to.include('line4');
    });

    it('should append grep results', async () => {
      await shell.execute('echo "=== Results ===" > search.txt');
      await shell.execute('grep apple test.txt >> search.txt');

      const content = await vfs.readFile('/home/search.txt');
      expect(content).to.include('=== Results ===');
      expect(content).to.include('apple');
    });

    it('should append cat output', async () => {
      await shell.execute('cat test.txt > combined.txt');
      await shell.execute('cat numbers.txt >> combined.txt');

      const content = await vfs.readFile('/home/combined.txt');
      expect(content).to.include('apple');
      expect(content).to.include('1');
      expect(content).to.include('5');
    });
  });

  describe('Input Redirection (<)', () => {
    it('should read input from file with grep <', async () => {
      await shell.execute('grep apple < test.txt');
      const output = term.getOutput();

      expect(output).to.include('apple');
      expect(output).not.to.include('apricot');
    });

    it('should read input from file with cat <', async () => {
      await shell.execute('cat < test.txt');
      const output = term.getOutput();

      expect(output).to.include('apple');
      expect(output).to.include('banana');
      expect(output).to.include('cherry');
    });

    it('should count lines with wc -l <', async () => {
      await shell.execute('wc -l < test.txt');
      const output = term.getOutput();

      expect(output).to.include('5');
    });

    it('should work with empty file', async () => {
      await shell.execute('cat < empty.txt');
      const output = term.getOutput();

      expect(output.trim().length).to.be.lessThan(50);
    });

    it('should work with multiple patterns in grep <', async () => {
      await shell.execute('grep test < mixed.txt');
      const output = term.getOutput();

      expect(output).to.include('test line');
      expect(output).to.include('another test');
    });
  });

  describe('Combined Pipes and Redirection', () => {
    it('should pipe and redirect: cat | grep > file', async () => {
      await shell.execute('cat test.txt | grep apple > results.txt');

      const content = await vfs.readFile('/home/results.txt');
      expect(content).to.include('apple');
      expect(content).not.to.include('apricot');
      expect(content).not.to.include('banana');
    });

    it('should use input and output redirect: grep < in.txt > out.txt', async () => {
      await shell.execute('grep apple < test.txt > filtered.txt');

      const content = await vfs.readFile('/home/filtered.txt');
      expect(content).to.include('apple');
    });

    it('should chain pipes with final redirect', async () => {
      await shell.execute('cat test.txt | grep a | wc -l > count.txt');

      const content = await vfs.readFile('/home/count.txt');
      expect(content).to.include('3');
    });

    it('should handle < input | pipe > output', async () => {
      await shell.execute('cat < test.txt | grep berry > berry-results.txt');

      const content = await vfs.readFile('/home/berry-results.txt');
      expect(content).to.include('blueberry');
      expect(content).not.to.include('apple');
    });

    it('should append piped output', async () => {
      await shell.execute('echo "=== Header ===" > report.txt');
      await shell.execute('cat test.txt | grep apple >> report.txt');

      const content = await vfs.readFile('/home/report.txt');
      expect(content).to.include('=== Header ===');
      expect(content).to.include('apple');
    });

    it('should handle complex pipeline with redirects', async () => {
      await shell.execute('cat test.txt | grep a > filtered.txt');
      await shell.execute('cat filtered.txt | wc -l > count.txt');

      const count = await vfs.readFile('/home/count.txt');
      expect(count).to.include('3');
    });

    it('should chain multiple pipes with input redirect', async () => {
      await shell.execute('cat < test.txt | grep a | grep p');
      const output = term.getOutput();

      // Lines with both 'a' and 'p': apple, apricot
      expect(output).to.include('apple');
      expect(output).to.include('apricot');
      expect(output).not.to.include('banana');
    });
  });

  describe('Error Handling', () => {
    it('should handle pipe with failing first command', async () => {
      await shell.execute('cat nonexistent.txt | grep test');
      const output = term.getOutput();

      expect(output.toLowerCase()).to.match(/error|enoent|not found/);
    });

    it('should handle pipe with invalid second command', async () => {
      await shell.execute('echo "test" | invalidcommand');
      const output = term.getOutput();

      expect(output.toLowerCase()).to.include('command not found');
    });

    it('should handle redirect to invalid path', async () => {
      await shell.execute('echo "test" > /invalid/path/file.txt');
      const output = term.getOutput();

      // Should show error (path doesn't exist)
      expect(output.toLowerCase()).to.match(/error|not found|enoent/);
    });

    it('should handle input redirect from nonexistent file', async () => {
      await shell.execute('cat < nonexistent.txt');
      const output = term.getOutput();

      expect(output.toLowerCase()).to.include('error');
    });

    it('should handle empty pipe chain', async () => {
      await shell.execute('| grep test');
      const output = term.getOutput();

      // Should handle gracefully (might show error or do nothing)
      expect(output).to.exist;
    });

    it('should propagate errors through pipe chain', async () => {
      await shell.execute('cat nonexistent.txt | grep test | wc -l');
      const output = term.getOutput();

      expect(output.toLowerCase()).to.match(/error|enoent|not found/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple spaces around pipe operator', async () => {
      await shell.execute('echo "test"    |    grep test');
      const output = term.getOutput();

      expect(output).to.include('test');
    });

    it('should handle multiple spaces around redirect operator', async () => {
      await shell.execute('echo "test"    >    spaced.txt');

      const content = await vfs.readFile('/home/spaced.txt');
      expect(content).to.include('test');
    });

    it('should handle quoted strings with pipes in them', async () => {
      await shell.execute('echo "this | is | not | pipes" > quoted.txt');

      const content = await vfs.readFile('/home/quoted.txt');
      expect(content).to.include('this | is | not | pipes');
    });

    it('should handle empty echo redirect', async () => {
      await shell.execute('echo "" > empty-echo.txt');

      const content = await vfs.readFile('/home/empty-echo.txt');
      expect(content).to.exist;
    });

    it('should preserve newlines through pipe', async () => {
      await shell.execute('cat test.txt | cat > pipe-copy.txt');

      const original = await vfs.readFile('/home/test.txt');
      const copy = await vfs.readFile('/home/pipe-copy.txt');

      expect(copy).to.equal(original);
    });

    it('should handle very long pipeline', async () => {
      await shell.execute('echo "test" | cat | cat | cat | cat | cat | grep test');
      const output = term.getOutput();

      expect(output).to.include('test');
    });

    it('should handle file names with special characters', async () => {
      await shell.execute('echo "special" > "test-file.txt"');

      const content = await vfs.readFile('/home/test-file.txt');
      expect(content).to.include('special');
    });

    it('should handle >> on first write (same as >)', async () => {
      await shell.execute('echo "first" >> never-existed.txt');

      const content = await vfs.readFile('/home/never-existed.txt');
      expect(content).to.include('first');
    });
  });

  describe('Command Context Integration', () => {
    it('should properly buffer output in piped context', async () => {
      // This tests that commands recognize they're being piped
      await shell.execute('ls | grep test');
      const output = term.getOutput();

      // Should show grep results, not raw ls output
      expect(output).to.include('test.txt');
    });

    it('should not show redirected content in terminal', async () => {
      term.clear();
      await shell.execute('cat test.txt > hidden.txt');

      const termOutput = term.getOutput();
      const fileContent = await vfs.readFile('/home/hidden.txt');

      // File should have content, terminal should not
      expect(fileContent).to.include('apple');
      expect(termOutput).not.to.include('apple');
    });

    it('should handle stdin data correctly in piped context', async () => {
      await shell.execute('echo "piped data" | cat | cat');
      const output = term.getOutput();

      expect(output).to.include('piped data');
    });

    it('should accumulate output through multiple pipes', async () => {
      // Each stage should pass complete output to next
      await shell.execute('cat test.txt | grep a > multi-pipe.txt');

      const content = await vfs.readFile('/home/multi-pipe.txt');
      expect(content).to.include('apple');
      expect(content).to.include('banana');
      expect(content).to.include('apricot');
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should filter and save log files', async () => {
      await vfs.writeFile('/home/app.log', 'INFO: Starting\nERROR: Failed\nINFO: Running\nERROR: Crashed');

      await shell.execute('grep ERROR app.log > errors.log');

      const content = await vfs.readFile('/home/errors.log');
      expect(content).to.include('ERROR: Failed');
      expect(content).to.include('ERROR: Crashed');
      expect(content).not.to.include('INFO');
    });

    it('should count specific file types', async () => {
      await shell.execute('ls | grep .txt | wc -l > txt-count.txt');

      const content = await vfs.readFile('/home/txt-count.txt');
      expect(content).to.match(/[3-9]/);
    });

    it('should build reports with headers and content', async () => {
      await shell.execute('echo "=== System Report ===" > report.txt');
      await shell.execute('echo "" >> report.txt');
      await shell.execute('echo "Files:" >> report.txt');
      await shell.execute('ls >> report.txt');

      const content = await vfs.readFile('/home/report.txt');
      expect(content).to.include('=== System Report ===');
      expect(content).to.include('Files:');
      expect(content).to.include('test.txt');
    });

    it('should extract and transform data', async () => {
      await shell.execute('cat data.csv | grep NYC > nyc-only.csv');

      const content = await vfs.readFile('/home/nyc-only.csv');
      expect(content).to.include('alice');
      expect(content).to.include('carol');
      expect(content).not.to.include('bob');
    });

    it('should combine multiple files and filter', async () => {
      await shell.execute('cat test.txt numbers.txt | grep 1 > combined-filtered.txt');

      const content = await vfs.readFile('/home/combined-filtered.txt');
      expect(content).to.include('1'); // from numbers.txt
    });
  });
});
