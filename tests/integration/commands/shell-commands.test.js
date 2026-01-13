/**
 * Integration tests for shell utility commands
 * Tests for echo, env, history, clear, etc.
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Shell Utility Commands', () => {
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

  describe('echo', () => {
    it('should output text', async () => {
      await shell.execute('echo hello world');
      const output = term.getOutput();
      expect(output).to.include('hello world');
    });

    it('should handle empty echo', async () => {
      term.clear();
      await shell.execute('echo');
      // Echo with no args should output empty line
      const output = term.getOutput();
      expect(output.length).to.be.lessThan(10); // Just whitespace or minimal
    });

    it('should handle quoted strings', async () => {
      await shell.execute('echo "hello world"');
      const output = term.getOutput();
      expect(output).to.include('hello world');
    });

    it('should expand variables', async () => {
      shell.env.TESTVAR = 'test_value';
      await shell.execute('echo $TESTVAR');
      const output = term.getOutput();
      expect(output).to.include('test_value');
    });

    it('should handle multiple arguments', async () => {
      await shell.execute('echo one two three');
      const output = term.getOutput();
      expect(output).to.include('one');
      expect(output).to.include('two');
      expect(output).to.include('three');
    });
  });

  describe('env', () => {
    it('should display environment variables', async () => {
      shell.env.TEST_VAR = 'test_value';
      await shell.execute('env');
      const output = term.getOutput();
      expect(output).to.include('TEST_VAR=test_value');
    });

    it('should display HOME variable', async () => {
      await shell.execute('env');
      const output = term.getOutput();
      expect(output).to.include('HOME=');
    });

    it('should display USER variable', async () => {
      shell.env.USER = 'testuser';
      await shell.execute('env');
      const output = term.getOutput();
      expect(output).to.include('USER=testuser');
    });
  });

  describe('history', () => {
    it('should show command history', async () => {
      // Execute some commands first
      await shell.execute('echo first');
      await shell.execute('echo second');
      term.clear();
      await shell.execute('history');
      const output = term.getOutput();
      expect(output).to.include('echo first');
      expect(output).to.include('echo second');
    });

    it('should number history entries', async () => {
      await shell.execute('echo test');
      term.clear();
      await shell.execute('history');
      const output = term.getOutput();
      // Should have numbered entries
      expect(output).to.match(/\d+/);
    });
  });

  describe('pwd', () => {
    it('should display current directory', async () => {
      shell.cwd = '/home/test';
      await shell.execute('pwd');
      const output = term.getOutput();
      expect(output).to.include('/home/test');
    });

    it('should display root when at root', async () => {
      shell.cwd = '/';
      await shell.execute('pwd');
      const output = term.getOutput();
      expect(output).to.include('/');
    });
  });

  describe('clear', () => {
    it('should clear terminal output', async () => {
      await shell.execute('echo some text');
      await shell.execute('clear');
      // After clear, the terminal should have been reset
      // The mock terminal's clear is called
    });
  });

  describe('version', () => {
    it('should display version information', async () => {
      await shell.execute('version');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('koma');
    });
  });

  describe('help', () => {
    it('should display help information', async () => {
      await shell.execute('help');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/command|help|available/);
    });
  });
});

describe('Variable Assignment', () => {
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

  describe('Basic assignments', () => {
    it('should set a variable', async () => {
      await shell.execute('FOO=bar');
      expect(shell.env.FOO).to.equal('bar');
    });

    it('should allow using variable after setting', async () => {
      await shell.execute('MYVAR=hello');
      term.clear();
      await shell.execute('echo $MYVAR');
      const output = term.getOutput();
      expect(output).to.include('hello');
    });

    it('should allow numeric values', async () => {
      await shell.execute('NUM=42');
      expect(shell.env.NUM).to.equal('42');
    });

    it('should allow path values', async () => {
      await shell.execute('PATH=/usr/bin:/bin');
      expect(shell.env.PATH).to.equal('/usr/bin:/bin');
    });
  });

  describe('Multiple assignments', () => {
    it('should handle assignments in sequence', async () => {
      await shell.execute('A=1 ; B=2 ; C=3');
      expect(shell.env.A).to.equal('1');
      expect(shell.env.B).to.equal('2');
      expect(shell.env.C).to.equal('3');
    });
  });
});

describe('Special Variables', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    // Create test file
    await populateTestFixtures(vfs, {
      '/home/test.txt': 'test content'
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('$?', () => {
    it('should be 0 after successful command', async () => {
      await shell.execute('echo hello');
      term.clear();
      await shell.execute('echo $?');
      const output = term.getOutput().trim();
      expect(output).to.include('0');
    });

    it('should be non-zero after failed command', async () => {
      await shell.execute('cat nonexistent_file_xyz');
      term.clear();
      await shell.execute('echo $?');
      const output = term.getOutput().trim();
      expect(output).not.to.equal('0');
    });
  });
});
