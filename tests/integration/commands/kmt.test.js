/**
 * Integration tests for kmt (Koma Magnetic Tape) command
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('kmt command', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Inject test kernel into kernelClient
    const { kernelClient } = await import('../../../src/kernel/client.js');
    kernelClient.setTestKernel(vfs);

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    // Create test directory structure using the helper
    const { populateTestFixtures } = await import('../../helpers/vfs-test-helper.js');
    await populateTestFixtures(vfs, {
      '/home/testdir/file1.txt': 'Hello World',
      '/home/testdir/file2.txt': 'Test content',
      '/home/testdir/subdir/file3.txt': 'Nested file'
    });
  });

  afterEach(async () => {
    // Clear test kernel
    const { kernelClient } = await import('../../../src/kernel/client.js');
    kernelClient.clearTestKernel();

    if (cleanup) {
      await cleanup();
    }
  });

  describe('kmt pack', () => {
    it('should create a KMT archive', async () => {
      await shell.execute('kmt pack /home/testdir test.kmt');

      const output = term.getOutput();
      expect(output).to.include('Creating archive from /home/testdir');
      expect(output).to.include('Archive created: test.kmt');
      expect(output).to.include('Files: 3');
      expect(output).to.include('Directories: 1');

      // Verify archive file exists
      const archiveExists = await vfs.exists('/home/test.kmt');
      expect(archiveExists).to.be.true;
    });

    it('should create archive with custom label', async () => {
      await shell.execute('kmt pack /home/testdir test.kmt --label "My Archive"');

      const output = term.getOutput();
      expect(output).to.include('Archive created');

      // Read and verify archive content
      const archiveJSON = await vfs.readFile('/home/test.kmt');
      const archive = JSON.parse(archiveJSON);
      expect(archive.label).to.equal('My Archive');
    });

    it('should support compression flag', async () => {
      await shell.execute('kmt pack /home/testdir test.kmt --compress');

      const archiveJSON = await vfs.readFile('/home/test.kmt');
      const archive = JSON.parse(archiveJSON);
      expect(archive.compression).to.equal('gzip');
    });

    it('should support no-compress flag', async () => {
      await shell.execute('kmt pack /home/testdir test.kmt --no-compress');

      const archiveJSON = await vfs.readFile('/home/test.kmt');
      const archive = JSON.parse(archiveJSON);
      expect(archive.compression).to.equal('none');
    });

    it('should error when source path missing', async () => {
      await shell.execute('kmt pack test.kmt');

      const output = term.getOutput();
      expect(output).to.include('error: pack requires <source> <output.kmt>');
    });
  });

  describe('kmt list', () => {
    beforeEach(async () => {
      // Create archive for testing
      await shell.execute('kmt pack /home/testdir test.kmt');
      term.clear();
    });

    it('should list archive contents', async () => {
      await shell.execute('kmt list test.kmt');

      const output = term.getOutput();
      expect(output).to.include('Archive:');
      expect(output).to.include('testdir');
      expect(output).to.include('Files: 3');
      expect(output).to.include('Directories: 1');
      expect(output).to.include('/home/testdir/file1.txt');
      expect(output).to.include('/home/testdir/file2.txt');
      expect(output).to.include('/home/testdir/subdir/file3.txt');
    });

    it('should show detailed listing with --long flag', async () => {
      await shell.execute('kmt list test.kmt --long');

      const output = term.getOutput();
      expect(output).to.include('/home/testdir/file1.txt');
      // Should show sizes in long format
      expect(output).to.match(/\d+[BK]\s+\/home\/testdir\/file1\.txt/);
    });

    it('should error when archive file missing', async () => {
      await shell.execute('kmt list nonexistent.kmt');

      const output = term.getOutput();
      expect(output).to.include('error:');
    });
  });

  describe('kmt info', () => {
    beforeEach(async () => {
      // Create archive for testing
      await shell.execute('kmt pack /home/testdir test.kmt --label "Test Archive"');
      term.clear();
    });

    it('should show archive information', async () => {
      await shell.execute('kmt info test.kmt');

      const output = term.getOutput();
      expect(output).to.include('KMT Archive Information');
      expect(output).to.include('Format:      kmt');
      expect(output).to.include('Version:     1.0');
      expect(output).to.include('Label:       Test Archive');
      expect(output).to.include('Files:       3');
      expect(output).to.include('Directories: 1');
      expect(output).to.include('Checksums:');
      expect(output).to.include('sha256:');
    });
  });

  describe('kmt unpack', () => {
    beforeEach(async () => {
      // Create archive for testing
      await shell.execute('kmt pack /home/testdir test.kmt');
      term.clear();

      // Remove original directory
      await vfs.unlinkRecursive('/home/testdir');
    });

    it('should extract archive to original paths when dest is /', async () => {
      await shell.execute('kmt unpack test.kmt /');

      const output = term.getOutput();
      expect(output).to.include('Reading archive test.kmt');
      expect(output).to.include('Verifying checksums');
      expect(output).to.include('Extracting to /');
      expect(output).to.include('Extracted 3 files, 1 directories');

      // Verify files were extracted to their original paths
      const file1 = await vfs.readFile('/home/testdir/file1.txt');
      expect(file1).to.equal('Hello World');

      const file2 = await vfs.readFile('/home/testdir/file2.txt');
      expect(file2).to.equal('Test content');

      const file3 = await vfs.readFile('/home/testdir/subdir/file3.txt');
      expect(file3).to.equal('Nested file');
    });

    it('should show verbose output with --verbose flag', async () => {
      await shell.execute('kmt unpack test.kmt / --verbose');

      const output = term.getOutput();
      expect(output).to.include('mkdir');
      expect(output).to.include('/home/testdir/file1.txt');
      expect(output).to.include('/home/testdir/file2.txt');
    });

    it('should warn about existing files without --force', async () => {
      // Extract once
      await shell.execute('kmt unpack test.kmt /');
      term.clear();

      // Try to extract again without --force
      await shell.execute('kmt unpack test.kmt /');

      const output = term.getOutput();
      expect(output).to.include('warning:');
      expect(output).to.include('exists');
    });

    it('should overwrite with --force flag', async () => {
      // Extract once
      await shell.execute('kmt unpack test.kmt /');

      // Modify a file
      await vfs.writeFile('/home/testdir/file1.txt', 'Modified');
      term.clear();

      // Extract again with --force
      await shell.execute('kmt unpack test.kmt / --force');

      const output = term.getOutput();
      expect(output).to.not.include('warning:');

      // Verify file was overwritten
      const file1 = await vfs.readFile('/home/testdir/file1.txt');
      expect(file1).to.equal('Hello World');
    });

    it('should error with corrupted archive', async () => {
      // Corrupt the archive
      const archiveJSON = await vfs.readFile('/home/test.kmt');
      const archive = JSON.parse(archiveJSON);
      archive.data = 'corrupted-data';
      await vfs.writeFile('/home/test.kmt', JSON.stringify(archive));

      await shell.execute('kmt unpack test.kmt /');

      const output = term.getOutput();
      expect(output).to.include('error:');
    });
  });

  describe('kmt help', () => {
    it('should show help with no arguments', async () => {
      await shell.execute('kmt');

      const output = term.getOutput();
      expect(output).to.include('Usage: kmt <command> [options]');
      expect(output).to.include('Commands:');
      expect(output).to.include('pack');
      expect(output).to.include('unpack');
      expect(output).to.include('list');
      expect(output).to.include('info');
    });

    it('should show help with --help flag', async () => {
      await shell.execute('kmt --help');

      const output = term.getOutput();
      expect(output).to.include('Usage: kmt <command> [options]');
    });
  });

  describe('kmt error handling', () => {
    it('should error on unknown subcommand', async () => {
      await shell.execute('kmt unknown test.kmt');

      const output = term.getOutput();
      expect(output).to.include('error: unknown subcommand');
    });
  });

  describe('kmt relative vs absolute paths', () => {
    beforeEach(async () => {
      // Create test directory structure
      const { populateTestFixtures } = await import('../../helpers/vfs-test-helper.js');
      await populateTestFixtures(vfs, {
        '/home/project/file1.txt': 'Content 1',
        '/home/project/subdir/file2.txt': 'Content 2'
      });
    });

    it('should create archive with relative paths by default', async () => {
      await shell.execute('kmt pack /home/project project.kmt');

      const archiveJSON = await vfs.readFile('/home/project.kmt');
      const archive = JSON.parse(archiveJSON);

      // Decompress if needed by reading the data directly
      let entriesJSON;
      if (archive.compression === 'gzip') {
        // For gzip, we need to decompress - use the same method as kmt unpack
        const compressedData = atob(archive.data);
        const compressedArray = new Uint8Array(compressedData.length);
        for (let i = 0; i < compressedData.length; i++) {
          compressedArray[i] = compressedData.charCodeAt(i);
        }
        const decompressed = pako.inflate(compressedArray, { to: 'string' });
        entriesJSON = decompressed;
      } else {
        // For uncompressed, just decode base64
        const decoded = atob(archive.data);
        entriesJSON = decodeURIComponent(escape(decoded));
      }

      const entries = JSON.parse(entriesJSON);

      // Check that paths are relative
      expect(entries[0].path).to.not.include('/home');
      expect(entries.some(e => e.path === 'project')).to.be.true;
      expect(entries.some(e => e.path === 'project/file1.txt')).to.be.true;
      expect(entries.some(e => e.path === 'project/subdir/file2.txt')).to.be.true;
    });

    it('should create archive with absolute paths when --absolute flag used', async () => {
      await shell.execute('kmt pack /home/project project-absolute.kmt --absolute');

      const archiveJSON = await vfs.readFile('/home/project-absolute.kmt');
      const archive = JSON.parse(archiveJSON);

      // Decompress if needed by reading the data directly
      let entriesJSON;
      if (archive.compression === 'gzip') {
        // For gzip, we need to decompress - use the same method as kmt unpack
        const compressedData = atob(archive.data);
        const compressedArray = new Uint8Array(compressedData.length);
        for (let i = 0; i < compressedData.length; i++) {
          compressedArray[i] = compressedData.charCodeAt(i);
        }
        const decompressed = pako.inflate(compressedArray, { to: 'string' });
        entriesJSON = decompressed;
      } else {
        // For uncompressed, just decode base64
        const decoded = atob(archive.data);
        entriesJSON = decodeURIComponent(escape(decoded));
      }

      const entries = JSON.parse(entriesJSON);

      // Check that paths are absolute
      expect(entries[0].path).to.include('/home');
      expect(entries.some(e => e.path === '/home/project')).to.be.true;
      expect(entries.some(e => e.path === '/home/project/file1.txt')).to.be.true;
    });

    it('should extract relative path archive to custom destination', async () => {
      // Create relative path archive
      await shell.execute('kmt pack /home/project project-rel.kmt');

      // Remove original
      await vfs.unlinkRecursive('/home/project');
      term.clear();

      // Extract to /tmp
      try {
        await vfs.mkdir('/tmp');
      } catch (e) {
        // Already exists
      }
      await shell.execute('kmt unpack project-rel.kmt /tmp');

      const output = term.getOutput();
      expect(output).to.include('Extracting relative paths to /tmp');

      // Verify files were extracted to /tmp/project/
      const file1 = await vfs.readFile('/tmp/project/file1.txt');
      expect(file1).to.equal('Content 1');

      const file2 = await vfs.readFile('/tmp/project/subdir/file2.txt');
      expect(file2).to.equal('Content 2');
    });

    it('should extract absolute path archive to original locations', async () => {
      // Create absolute path archive
      await shell.execute('kmt pack /home/project project-abs.kmt --absolute');

      // Remove original
      await vfs.unlinkRecursive('/home/project');
      term.clear();

      // Extract (will go to original paths)
      await shell.execute('kmt unpack project-abs.kmt /');

      const output = term.getOutput();
      expect(output).to.include('Extracting absolute paths to /');

      // Verify files were extracted to their original paths
      const file1 = await vfs.readFile('/home/project/file1.txt');
      expect(file1).to.equal('Content 1');

      const file2 = await vfs.readFile('/home/project/subdir/file2.txt');
      expect(file2).to.equal('Content 2');
    });

    it('should auto-detect path type from archive', async () => {
      // Create relative archive
      await shell.execute('kmt pack /home/project relative.kmt');
      term.clear();

      // List should indicate relative paths
      await shell.execute('kmt list relative.kmt');
      let output = term.getOutput();
      expect(output).to.match(/project\/file1\.txt/);

      term.clear();

      // Create absolute archive
      await shell.execute('kmt pack /home/project absolute.kmt --absolute');
      term.clear();

      // List should indicate absolute paths
      await shell.execute('kmt list absolute.kmt');
      output = term.getOutput();
      expect(output).to.match(/\/home\/project\/file1\.txt/);
    });
  });
});
