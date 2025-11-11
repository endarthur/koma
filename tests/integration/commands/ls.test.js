/**
 * ls Command Integration Tests
 * Tests for the ls command with VFS
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';
import { restoreFromFixture } from '../../helpers/fixture-helper.js';

describe('ls command', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    // Create isolated test VFS
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Restore from fixture - includes /home, /home/dir1, test files, and .hidden
    await restoreFromFixture(vfs, 'ls-test.kmt');

    // Create mock shell
    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should list files in current directory', async () => {
    shell.cwd = '/home';
    await shell.execute('ls');

    const output = term.getOutput();
    expect(output).to.include('file1.txt');
    expect(output).to.include('file2.txt');
    expect(output).to.include('dir1');
  });

  it('should list files in specified directory', async () => {
    await shell.execute('ls /home');

    const output = term.getOutput();
    expect(output).to.include('file1.txt');
    expect(output).to.include('file2.txt');
  });

  it('should support -l flag for long format', async () => {
    shell.cwd = '/home';
    await shell.execute('ls -l');

    const output = term.getOutput();
    // Long format includes file size and timestamps
    expect(output).to.match(/\d+\s+\d{4}-\d{2}-\d{2}/);
  });

  it('should support -a flag to show hidden files', async () => {
    // Hidden file already exists in fixture
    shell.cwd = '/home';
    await shell.execute('ls -a');

    const output = term.getOutput();
    expect(output).to.include('.hidden');
  });

  it('should not show hidden files without -a flag', async () => {
    // Hidden file already exists in fixture
    shell.cwd = '/home';
    await shell.execute('ls');

    const output = term.getOutput();
    expect(output).not.to.include('.hidden');
  });

  it('should work in pipeline (one file per line)', async () => {
    shell.cwd = '/home';
    await shell.execute('ls | grep file1');

    const output = term.getOutput();
    expect(output).to.include('file1.txt');
    expect(output).not.to.include('file2.txt');
  });

  it('should handle empty directory', async () => {
    await vfs.mkdir('/home/empty');

    shell.cwd = '/home/empty';
    await shell.execute('ls');

    const output = term.getOutput();
    // Should have no output or a message
    expect(output.length).to.be.lessThan(100);
  });

  it('should error on non-existent directory', async () => {
    await shell.execute('ls /nonexistent');

    const output = term.getOutput();
    expect(output.toLowerCase()).to.match(/error|not found|enoent/);
  });

  it('should combine flags (-la)', async () => {
    // Hidden file already exists in fixture
    shell.cwd = '/home';
    await shell.execute('ls -la');

    const output = term.getOutput();
    expect(output).to.include('.hidden');
    expect(output).to.match(/\d+\s+\d{4}-\d{2}-\d{2}/);
  });
});
