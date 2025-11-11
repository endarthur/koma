/**
 * Debug test for redirect error output
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Redirect Error Output Debug', () => {
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

  it('should show error when redirecting to invalid path', async () => {
    console.log('[DEBUG] Executing: echo "test" > /invalid/path/file.txt');
    await shell.execute('echo "test" > /invalid/path/file.txt');

    const output = term.getOutput();
    console.log('[DEBUG] Output:', JSON.stringify(output));
    console.log('[DEBUG] Output lines:', term.getOutputLines());
    console.log('[DEBUG] Output length:', output.length);

    expect(output).to.not.be.empty;
  });

  it('should show error when appending to invalid path', async () => {
    console.log('[DEBUG] Executing: echo "test" >> /invalid/path/file.txt');
    await shell.execute('echo "test" >> /invalid/path/file.txt');

    const output = term.getOutput();
    console.log('[DEBUG] Output:', JSON.stringify(output));
    console.log('[DEBUG] Output lines:', term.getOutputLines());

    expect(output).to.not.be.empty;
  });
});
