/**
 * VFS Debug Test
 * Minimal reproduction of file creation issue
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('VFS Debug', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Clear VFS
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
          // Ignore
        }
      }
    } catch (e) {
      // Ignore
    }

    // Recreate /home
    try {
      await vfs.mkdir('/home');
    } catch (e) {
      if (!e.message?.includes('EEXIST')) {
        throw e;
      }
    }

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('TEST 1: Direct VFS operations should work', async () => {
    console.log('[TEST 1] Creating file with vfs.writeFile...');
    await vfs.writeFile('/home/test.txt', 'content');
    console.log('[TEST 1] File created');

    console.log('[TEST 1] Reading file back...');
    const content = await vfs.readFile('/home/test.txt');
    console.log('[TEST 1] File read:', content);
    expect(content).to.equal('content');

    console.log('[TEST 1] Checking stat...');
    const stat = await vfs.stat('/home/test.txt');
    console.log('[TEST 1] Stat:', stat);
    expect(stat.type).to.equal('file');

    console.log('[TEST 1] SUCCESS!');
  });

  it('TEST 2: Shell command after VFS write', async () => {
    console.log('[TEST 2] Creating file with vfs.writeFile...');
    await vfs.writeFile('/home/test.txt', 'content');
    console.log('[TEST 2] File created');

    console.log('[TEST 2] Verifying file exists with vfs.stat...');
    const stat = await vfs.stat('/home/test.txt');
    console.log('[TEST 2] File exists, stat:', stat);

    console.log('[TEST 2] Now trying shell command: ls');
    shell.cwd = '/home';
    await shell.execute('ls');
    const lsOutput = term.getOutput();
    console.log('[TEST 2] ls output:', lsOutput);
    expect(lsOutput).to.include('test.txt');

    console.log('[TEST 2] Now trying shell command: cat test.txt');
    term.reset();
    await shell.execute('cat test.txt');
    const catOutput = term.getOutput();
    console.log('[TEST 2] cat output:', catOutput);
    expect(catOutput).to.include('content');

    console.log('[TEST 2] SUCCESS!');
  });

  it('TEST 3: Shell rm command after VFS write', async () => {
    console.log('[TEST 3] Creating file with vfs.writeFile...');
    await vfs.writeFile('/home/test.txt', 'content');
    console.log('[TEST 3] File created');

    console.log('[TEST 3] Verifying file exists...');
    const stat = await vfs.stat('/home/test.txt');
    console.log('[TEST 3] File exists, stat:', stat);

    console.log('[TEST 3] Now trying to remove with: rm test.txt');
    shell.cwd = '/home';
    await shell.execute('rm test.txt');
    const rmOutput = term.getOutput();
    console.log('[TEST 3] rm output:', rmOutput);

    console.log('[TEST 3] Checking if file was removed...');
    try {
      await vfs.stat('/home/test.txt');
      console.log('[TEST 3] ERROR: File still exists!');
      expect.fail('File should not exist after rm');
    } catch (error) {
      console.log('[TEST 3] File removed successfully, got expected error:', error.message);
      expect(error.code).to.equal('ENOENT');
    }

    console.log('[TEST 3] SUCCESS!');
  });

  it('TEST 4: Check kernel instance consistency', async () => {
    console.log('[TEST 4] Getting kernel from kernelClient...');
    const { kernelClient } = await import('../../../src/kernel/client.js');
    const shellKernel = await kernelClient.getKernel();

    console.log('[TEST 4] Testing if both kernels access same underlying VFS...');

    // Write file with test kernel
    await vfs.writeFile('/home/test-kernel-consistency.txt', 'from vfs');
    console.log('[TEST 4] File written via test kernel');

    // Read file with shell kernel
    const content = await shellKernel.readFile('/home/test-kernel-consistency.txt');
    console.log('[TEST 4] File read via shell kernel:', content);

    // Both should access the same underlying data
    expect(content).to.equal('from vfs');
    console.log('[TEST 4] SUCCESS - Both kernels access same VFS!');
  });

  it('TEST 5: Sequential operations with explicit waits', async () => {
    console.log('[TEST 5] Step 1: Write file');
    await vfs.writeFile('/home/test.txt', 'content');

    console.log('[TEST 5] Step 2: Wait 100ms');
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('[TEST 5] Step 3: Verify file exists');
    const stat1 = await vfs.stat('/home/test.txt');
    console.log('[TEST 5] File exists:', stat1);

    console.log('[TEST 5] Step 4: List directory');
    const entries = await vfs.readdir('/home');
    console.log('[TEST 5] Directory entries:', entries.map(e => e.name));
    expect(entries.some(e => e.name === 'test.txt')).to.be.true;

    console.log('[TEST 5] Step 5: Execute rm via shell');
    shell.cwd = '/home';
    await shell.execute('rm test.txt');

    console.log('[TEST 5] Step 6: Wait 100ms');
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('[TEST 5] Step 7: Verify file removed');
    try {
      await vfs.stat('/home/test.txt');
      expect.fail('File should not exist');
    } catch (error) {
      console.log('[TEST 5] File correctly removed');
      expect(error.code).to.equal('ENOENT');
    }

    console.log('[TEST 5] SUCCESS!');
  });
});
