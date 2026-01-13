/**
 * Integration tests for shell execution paths
 * Tests for error handling, edge cases, and less common execution paths
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Shell Execution Paths', () => {
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

  describe('Unknown commands', () => {
    it('should show error for unknown command', async () => {
      await shell.execute('unknowncommand');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/not found|unknown/);
    });

    it('should show help suggestion', async () => {
      await shell.execute('invalidcmd');
      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('help');
    });
  });

  describe('Empty and whitespace', () => {
    it('should handle empty command', async () => {
      await shell.execute('');
      // Should not error
      expect(shell.lastExitCode).to.equal(0);
    });

    it('should handle whitespace-only command', async () => {
      await shell.execute('   ');
      expect(shell.lastExitCode).to.equal(0);
    });
  });

  describe('Variable expansion', () => {
    it('should expand HOME variable', async () => {
      await shell.execute('echo $HOME');
      const output = term.getOutput();
      expect(output).to.include('/home');
    });

    it('should expand custom variables', async () => {
      shell.env.MYVAR = 'myvalue';
      await shell.execute('echo $MYVAR');
      const output = term.getOutput();
      expect(output).to.include('myvalue');
    });

    it('should expand braced variables', async () => {
      shell.env.NAME = 'test';
      await shell.execute('echo ${NAME}');
      const output = term.getOutput();
      expect(output).to.include('test');
    });

    it('should handle undefined variables', async () => {
      await shell.execute('echo $UNDEFINED');
      // Should not error, undefined expands to empty
      expect(shell.lastExitCode).to.equal(0);
    });
  });

  describe('Exit codes', () => {
    it('should set exit code 0 on success', async () => {
      await shell.execute('echo hello');
      expect(shell.lastExitCode).to.equal(0);
    });

    it('should set exit code 127 for unknown command', async () => {
      await shell.execute('notarealcommand');
      expect(shell.lastExitCode).to.equal(127);
    });

    it('should set exit code 1 on file not found', async () => {
      shell.cwd = '/home';
      await shell.execute('cat nonexistent_file.txt');
      expect(shell.lastExitCode).to.equal(1);
    });
  });

  describe('Path resolution', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/testfile.txt': 'content',
      });
    });

    it('should resolve relative paths', async () => {
      shell.cwd = '/home';
      await shell.execute('cat testfile.txt');
      const output = term.getOutput();
      expect(output).to.include('content');
    });

    it('should resolve absolute paths', async () => {
      await shell.execute('cat /home/testfile.txt');
      const output = term.getOutput();
      expect(output).to.include('content');
    });

    it('should handle .. in path', async () => {
      shell.cwd = '/home';
      await populateTestFixtures(vfs, {
        '/tmp/other.txt': 'other content',
      });

      await shell.execute('cat ../tmp/other.txt');
      const output = term.getOutput();
      expect(output).to.include('other content');
    });
  });
});

describe('Redirect Operations', () => {
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

  describe('Output redirect', () => {
    it('should redirect output to new file', async () => {
      shell.cwd = '/home';
      await shell.execute('echo "redirected" > output.txt');

      const content = await vfs.readFile('/home/output.txt');
      expect(content).to.include('redirected');
    });

    it('should overwrite existing file', async () => {
      await populateTestFixtures(vfs, {
        '/home/existing.txt': 'original',
      });

      shell.cwd = '/home';
      await shell.execute('echo "new" > existing.txt');

      const content = await vfs.readFile('/home/existing.txt');
      expect(content).to.include('new');
      expect(content).not.to.include('original');
    });
  });

  describe('Append redirect', () => {
    it('should append to existing file', async () => {
      await populateTestFixtures(vfs, {
        '/home/log.txt': 'line1\n',
      });

      shell.cwd = '/home';
      await shell.execute('echo "line2" >> log.txt');

      const content = await vfs.readFile('/home/log.txt');
      expect(content).to.include('line1');
      expect(content).to.include('line2');
    });

    it('should create new file if not exists', async () => {
      shell.cwd = '/home';
      await shell.execute('echo "first" >> newlog.txt');

      const content = await vfs.readFile('/home/newlog.txt');
      expect(content).to.include('first');
    });
  });

  describe('Input redirect', () => {
    beforeEach(async () => {
      await populateTestFixtures(vfs, {
        '/home/input.txt': 'apple\nbanana\ncherry',
      });
    });

    it('should read input from file', async () => {
      shell.cwd = '/home';
      await shell.execute('sort < input.txt');
      const lines = term.getOutputLines().filter(l => l.trim());

      expect(lines[0]).to.equal('apple');
      expect(lines[1]).to.equal('banana');
      expect(lines[2]).to.equal('cherry');
    });
  });
});

