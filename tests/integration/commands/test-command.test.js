/**
 * Integration tests for the test command (conditionals)
 * Tests for file checks, string comparisons, and numeric comparisons
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('test command', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    // Create test files and directories
    await populateTestFixtures(vfs, {
      '/home/file.txt': 'hello world',
      '/home/empty.txt': '',
    });

    try {
      await vfs.mkdir('/home/testdir');
    } catch (e) {
      // Already exists
    }
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('File tests', () => {
    describe('-f (regular file)', () => {
      it('should return 0 for existing file', async () => {
        shell.cwd = '/home';
        const result = await shell.execute('test -f file.txt');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for non-existing file', async () => {
        shell.cwd = '/home';
        await shell.execute('test -f nonexistent.txt');
        expect(shell.lastExitCode).to.equal(1);
      });

      it('should return 1 for directory', async () => {
        shell.cwd = '/home';
        await shell.execute('test -f testdir');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-d (directory)', () => {
      it('should return 0 for existing directory', async () => {
        shell.cwd = '/home';
        await shell.execute('test -d testdir');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for file', async () => {
        shell.cwd = '/home';
        await shell.execute('test -d file.txt');
        expect(shell.lastExitCode).to.equal(1);
      });

      it('should return 1 for non-existing path', async () => {
        shell.cwd = '/home';
        await shell.execute('test -d nonexistent');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-e (exists)', () => {
      it('should return 0 for existing file', async () => {
        shell.cwd = '/home';
        await shell.execute('test -e file.txt');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 0 for existing directory', async () => {
        shell.cwd = '/home';
        await shell.execute('test -e testdir');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for non-existing path', async () => {
        shell.cwd = '/home';
        await shell.execute('test -e nonexistent');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-s (non-empty file)', () => {
      it('should return 0 for non-empty file', async () => {
        shell.cwd = '/home';
        await shell.execute('test -s file.txt');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for empty file', async () => {
        shell.cwd = '/home';
        await shell.execute('test -s empty.txt');
        expect(shell.lastExitCode).to.equal(1);
      });

      it('should return 1 for non-existing file', async () => {
        shell.cwd = '/home';
        await shell.execute('test -s nonexistent.txt');
        expect(shell.lastExitCode).to.equal(1);
      });
    });
  });

  describe('String tests', () => {
    describe('-z (zero length)', () => {
      it('should return 0 for empty string', async () => {
        await shell.execute('test -z ""');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for non-empty string', async () => {
        await shell.execute('test -z "hello"');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-n (non-zero length)', () => {
      it('should return 0 for non-empty string', async () => {
        await shell.execute('test -n "hello"');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for empty string', async () => {
        await shell.execute('test -n ""');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('= (string equality)', () => {
      it('should return 0 for equal strings', async () => {
        await shell.execute('test hello = hello');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for different strings', async () => {
        await shell.execute('test hello = world');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('!= (string inequality)', () => {
      it('should return 0 for different strings', async () => {
        await shell.execute('test hello != world');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for equal strings', async () => {
        await shell.execute('test hello != hello');
        expect(shell.lastExitCode).to.equal(1);
      });
    });
  });

  describe('Numeric tests', () => {
    describe('-eq (equal)', () => {
      it('should return 0 for equal numbers', async () => {
        await shell.execute('test 5 -eq 5');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for different numbers', async () => {
        await shell.execute('test 5 -eq 10');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-ne (not equal)', () => {
      it('should return 0 for different numbers', async () => {
        await shell.execute('test 5 -ne 10');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 for equal numbers', async () => {
        await shell.execute('test 5 -ne 5');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-lt (less than)', () => {
      it('should return 0 when first is less', async () => {
        await shell.execute('test 5 -lt 10');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 when first is greater', async () => {
        await shell.execute('test 10 -lt 5');
        expect(shell.lastExitCode).to.equal(1);
      });

      it('should return 1 when equal', async () => {
        await shell.execute('test 5 -lt 5');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-gt (greater than)', () => {
      it('should return 0 when first is greater', async () => {
        await shell.execute('test 10 -gt 5');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 when first is less', async () => {
        await shell.execute('test 5 -gt 10');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-le (less than or equal)', () => {
      it('should return 0 when first is less', async () => {
        await shell.execute('test 5 -le 10');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 0 when equal', async () => {
        await shell.execute('test 5 -le 5');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 when first is greater', async () => {
        await shell.execute('test 10 -le 5');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-ge (greater than or equal)', () => {
      it('should return 0 when first is greater', async () => {
        await shell.execute('test 10 -ge 5');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 0 when equal', async () => {
        await shell.execute('test 5 -ge 5');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 when first is less', async () => {
        await shell.execute('test 5 -ge 10');
        expect(shell.lastExitCode).to.equal(1);
      });
    });
  });

  describe('Logical operators', () => {
    describe('! (negation)', () => {
      it('should negate true to false', async () => {
        await shell.execute('test ! -f /home/nonexistent');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should negate false to true', async () => {
        shell.cwd = '/home';
        await shell.execute('test ! -f file.txt');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-a (AND)', () => {
      it('should return 0 when both true', async () => {
        shell.cwd = '/home';
        await shell.execute('test -f file.txt -a -d testdir');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 when first is false', async () => {
        shell.cwd = '/home';
        await shell.execute('test -f nonexistent -a -d testdir');
        expect(shell.lastExitCode).to.equal(1);
      });

      it('should return 1 when second is false', async () => {
        shell.cwd = '/home';
        await shell.execute('test -f file.txt -a -d nonexistent');
        expect(shell.lastExitCode).to.equal(1);
      });
    });

    describe('-o (OR)', () => {
      it('should return 0 when both true', async () => {
        shell.cwd = '/home';
        await shell.execute('test -f file.txt -o -d testdir');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 0 when first is true', async () => {
        shell.cwd = '/home';
        await shell.execute('test -f file.txt -o -d nonexistent');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 0 when second is true', async () => {
        shell.cwd = '/home';
        await shell.execute('test -f nonexistent -o -d testdir');
        expect(shell.lastExitCode).to.equal(0);
      });

      it('should return 1 when both false', async () => {
        shell.cwd = '/home';
        await shell.execute('test -f nonexistent -o -d alsonot');
        expect(shell.lastExitCode).to.equal(1);
      });
    });
  });

  describe('[ ] syntax', () => {
    it('should work with bracket syntax', async () => {
      shell.cwd = '/home';
      await shell.execute('[ -f file.txt ]');
      expect(shell.lastExitCode).to.equal(0);
    });

    it('should return 1 for false condition with brackets', async () => {
      shell.cwd = '/home';
      await shell.execute('[ -f nonexistent ]');
      expect(shell.lastExitCode).to.equal(1);
    });

    it('should error on missing closing bracket', async () => {
      await shell.execute('[ -f file.txt');
      expect(shell.lastExitCode).to.equal(2);
    });
  });

  describe('Empty expression', () => {
    it('should return 1 for empty test', async () => {
      await shell.execute('test');
      expect(shell.lastExitCode).to.equal(1);
    });
  });
});
