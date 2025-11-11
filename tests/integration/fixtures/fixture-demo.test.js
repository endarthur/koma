/**
 * Fixture Demo Test
 * Demonstrates how to use pre-generated .kmt fixtures in tests
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';
import { restoreFromFixture } from '../../helpers/fixture-helper.js';

describe('Fixture Demo', () => {
  let vfs, cleanup, shell, term;

  describe('Using basic-vfs fixture', () => {
    beforeEach(async () => {
      const testVFS = await createTestVFS();
      vfs = testVFS.kernel;
      cleanup = testVFS.cleanup;

      // Restore from fixture - much faster than creating files manually!
      await restoreFromFixture(vfs, 'basic-vfs.kmt');

      const mockShell = await createMockShell();
      shell = mockShell.shell;
      term = mockShell.term;
      shell.cwd = '/home';
    });

    afterEach(async () => {
      await cleanup();
    });

    it('should have /home directory', async () => {
      const entries = await vfs.readdir('/');
      const dirNames = entries.map(e => e.name);
      expect(dirNames).to.include('home');
    });

    it('should have /tmp directory', async () => {
      const entries = await vfs.readdir('/');
      const dirNames = entries.map(e => e.name);
      expect(dirNames).to.include('tmp');
    });
  });

  describe('Using ls-test fixture', () => {
    beforeEach(async () => {
      const testVFS = await createTestVFS();
      vfs = testVFS.kernel;
      cleanup = testVFS.cleanup;

      // This fixture includes pre-created files for ls tests
      await restoreFromFixture(vfs, 'ls-test.kmt');

      const mockShell = await createMockShell();
      shell = mockShell.shell;
      term = mockShell.term;
      shell.cwd = '/home';
    });

    afterEach(async () => {
      await cleanup();
    });

    it('should have test files', async () => {
      const content1 = await vfs.readFile('/home/file1.txt');
      expect(content1).to.equal('content 1');

      const content2 = await vfs.readFile('/home/file2.txt');
      expect(content2).to.equal('content 2');
    });

    it('should have nested directory with file', async () => {
      const content3 = await vfs.readFile('/home/dir1/file3.txt');
      expect(content3).to.equal('content 3');
    });

    it('should have hidden file', async () => {
      const hidden = await vfs.readFile('/home/.hidden');
      expect(hidden).to.equal('hidden content');
    });

    it('should work with ls command', async () => {
      await shell.execute('ls');
      const output = term.getOutput();

      expect(output).to.include('file1.txt');
      expect(output).to.include('file2.txt');
      expect(output).to.include('dir1');
      // Hidden files not shown without -a
      expect(output).not.to.include('.hidden');
    });

    it('should work with ls -a command', async () => {
      await shell.execute('ls -a');
      const output = term.getOutput();

      expect(output).to.include('.hidden');
    });
  });

  describe('Using pipes-test fixture', () => {
    beforeEach(async () => {
      const testVFS = await createTestVFS();
      vfs = testVFS.kernel;
      cleanup = testVFS.cleanup;

      await restoreFromFixture(vfs, 'pipes-test.kmt');

      const mockShell = await createMockShell();
      shell = mockShell.shell;
      term = mockShell.term;
      shell.cwd = '/home';
    });

    afterEach(async () => {
      await cleanup();
    });

    it('should have test.txt with fruit data', async () => {
      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.include('apple');
      expect(content).to.include('banana');
      expect(content).to.include('cherry');
      expect(content).to.include('apricot');
      expect(content).to.include('blueberry');
    });

    it('should work with cat | grep pipeline', async () => {
      await shell.execute('cat test.txt | grep apple');
      const output = term.getOutput();

      expect(output).to.include('apple');
      expect(output).not.to.include('banana');
    });
  });
});
