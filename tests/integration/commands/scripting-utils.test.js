/**
 * Integration tests for scripting utility commands
 * Tests for true, false, sleep, and read commands
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Scripting Utility Commands', () => {
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

  describe('true', () => {
    it('should return exit code 0', async () => {
      await shell.execute('true');
      expect(shell.lastExitCode).to.equal(0);
    });

    it('should work with && operator', async () => {
      await shell.execute('true && echo success');
      const output = term.getOutput();
      expect(output).to.include('success');
    });

    it('should not trigger || operator', async () => {
      term.clear();
      await shell.execute('true || echo "should not appear"');
      const output = term.getOutput();
      expect(output).not.to.include('should not appear');
    });

    it('should ignore arguments', async () => {
      await shell.execute('true anything here');
      expect(shell.lastExitCode).to.equal(0);
    });
  });

  describe('false', () => {
    it('should return exit code 1', async () => {
      await shell.execute('false');
      expect(shell.lastExitCode).to.equal(1);
    });

    it('should not trigger && operator', async () => {
      term.clear();
      await shell.execute('false && echo "should not appear"');
      const output = term.getOutput();
      expect(output).not.to.include('should not appear');
    });

    it('should trigger || operator', async () => {
      term.clear();
      await shell.execute('false || echo fallback');
      const output = term.getOutput();
      expect(output).to.include('fallback');
    });

    it('should ignore arguments', async () => {
      await shell.execute('false anything here');
      expect(shell.lastExitCode).to.equal(1);
    });
  });

  describe('sleep', () => {
    it('should return success after sleeping', async () => {
      const start = Date.now();
      await shell.execute('sleep 0.1');
      const elapsed = Date.now() - start;

      expect(shell.lastExitCode).to.equal(0);
      expect(elapsed).to.be.at.least(90); // Allow some tolerance
    });

    it('should handle fractional seconds', async () => {
      const start = Date.now();
      await shell.execute('sleep 0.05');
      const elapsed = Date.now() - start;

      expect(elapsed).to.be.at.least(40);
    });

    it('should error on missing operand', async () => {
      await shell.execute('sleep');
      expect(shell.lastExitCode).to.equal(1);
      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('missing');
    });

    it('should error on invalid time', async () => {
      term.clear();
      await shell.execute('sleep abc');
      expect(shell.lastExitCode).to.equal(1);
      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('invalid');
    });

    it('should handle zero sleep time', async () => {
      const start = Date.now();
      await shell.execute('sleep 0');
      const elapsed = Date.now() - start;

      expect(shell.lastExitCode).to.equal(0);
      expect(elapsed).to.be.lessThan(100); // Should return almost immediately
    });

    it('should work in && chain', async () => {
      const start = Date.now();
      await shell.execute('sleep 0.05 && echo done');
      const elapsed = Date.now() - start;

      expect(elapsed).to.be.at.least(40);
      expect(term.getOutput()).to.include('done');
    });
  });

  describe('read', () => {
    it('should error on missing variable name', async () => {
      // Note: read requires interactive input which is hard to test
      // We can at least test the error case
      await shell.execute('read');
      expect(shell.lastExitCode).to.equal(1);
      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('missing');
    });

    it('should error on invalid variable name', async () => {
      term.clear();
      await shell.execute('read 123invalid');
      expect(shell.lastExitCode).to.equal(1);
      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('not a valid');
    });

    it('should error on variable name with special chars', async () => {
      term.clear();
      await shell.execute('read my-var');
      expect(shell.lastExitCode).to.equal(1);
    });

    it('should show help with --help', async () => {
      term.clear();
      await shell.execute('read --help');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/read|input|variable/);
    });
  });
});

describe('Combined Scripting Tests', () => {
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

  describe('Exit code chains', () => {
    it('should chain true && true', async () => {
      await shell.execute('true && true');
      expect(shell.lastExitCode).to.equal(0);
    });

    it('should chain true && false', async () => {
      await shell.execute('true && false');
      expect(shell.lastExitCode).to.equal(1);
    });

    it('should chain false || true', async () => {
      await shell.execute('false || true');
      expect(shell.lastExitCode).to.equal(0);
    });

    it('should chain false || false', async () => {
      await shell.execute('false || false');
      expect(shell.lastExitCode).to.equal(1);
    });

    it('should handle complex chain', async () => {
      await shell.execute('false || true && echo success');
      const output = term.getOutput();
      expect(output).to.include('success');
    });
  });

  describe('Sleep in sequences', () => {
    it('should work in semicolon sequence', async () => {
      const start = Date.now();
      await shell.execute('sleep 0.05 ; sleep 0.05');
      const elapsed = Date.now() - start;

      expect(elapsed).to.be.at.least(90);
    });

    it('should allow echo after sleep', async () => {
      await shell.execute('sleep 0.01 ; echo "after sleep"');
      const output = term.getOutput();
      expect(output).to.include('after sleep');
    });
  });
});
