/**
 * Debug test for error output
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Error Output Debug', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    // Create /home for tests
    try {
      await vfs.mkdir('/home');
    } catch (e) {
      // Already exists
    }
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should capture error from ls non-existent directory', async () => {
    console.log('[DEBUG] Executing: ls /nonexistent');
    await shell.execute('ls /nonexistent');

    const output = term.getOutput();
    console.log('[DEBUG] Output:', JSON.stringify(output));
    console.log('[DEBUG] Output lines:', term.getOutputLines());

    expect(output).to.not.be.empty;
  });

  it('should capture error from rm non-existent file', async () => {
    console.log('[DEBUG] Executing: rm /home/nonexistent.txt');
    await shell.execute('rm /home/nonexistent.txt');

    const output = term.getOutput();
    console.log('[DEBUG] Output:', JSON.stringify(output));
    console.log('[DEBUG] Output lines:', term.getOutputLines());

    expect(output).to.not.be.empty;
  });

  it('should capture error from mkdir with non-existent parent', async () => {
    console.log('[DEBUG] Executing: mkdir /nonexistent/newdir');
    await shell.execute('mkdir /nonexistent/newdir');

    const output = term.getOutput();
    console.log('[DEBUG] Output:', JSON.stringify(output));
    console.log('[DEBUG] Output lines:', term.getOutputLines());

    expect(output).to.not.be.empty;
  });
});
