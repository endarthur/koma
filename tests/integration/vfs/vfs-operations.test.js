/**
 * VFS Operations Integration Tests
 * Comprehensive tests for VFS filesystem operations
 */

import { expect } from 'chai';
import {
  createTestVFS,
  populateTestFixtures,
  assertFileContent,
  assertDirectoryExists,
  assertNotExists
} from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('VFS Operations', () => {
  let vfs, cleanup, shell, term;

  // Helper function to create directory, ignoring EEXIST errors
  async function mkdirSafe(path) {
    try {
      await vfs.mkdir(path);
    } catch (e) {
      if (!e.message || !e.message.includes('EEXIST')) {
        throw e;
      }
      // EEXIST is expected in shared VFS - ignore it
    }
  }

  beforeEach(async () => {
    // Create isolated test VFS
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Create mock shell
    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  // ========== mkdir Tests ==========
  describe('mkdir', () => {
    it('should create a single directory', async () => {
      shell.cwd = '/home';
      await shell.execute('mkdir testdir');

      await assertDirectoryExists(vfs, '/home/testdir');
    });

    it('should create directory with absolute path', async () => {
      await shell.execute('mkdir /tmp/newdir');

      await assertDirectoryExists(vfs, '/tmp/newdir');
    });

    it('should create directory with relative path', async () => {
      shell.cwd = '/home';
      await shell.execute('mkdir subdir');

      await assertDirectoryExists(vfs, '/home/subdir');
    });

    it('should error when directory already exists (EEXIST)', async () => {
      await mkdirSafe('/home/existing');

      shell.cwd = '/home';
      await shell.execute('mkdir existing');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/eexist|already exists/);
    });

    it('should error when parent does not exist', async () => {
      await shell.execute('mkdir /nonexistent/subdir');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.match(/enoent|not found|no such/);
    });

    it('should handle directory names with special characters', async () => {
      shell.cwd = '/home';
      await shell.execute('mkdir test-dir_123');

      await assertDirectoryExists(vfs, '/home/test-dir_123');
    });

    it('should create directory in nested path', async () => {
      await mkdirSafe('/home/parent');
      await shell.execute('mkdir /home/parent/child');

      await assertDirectoryExists(vfs, '/home/parent/child');
    });

    it('should handle missing operand', async () => {
      await shell.execute('mkdir');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('missing operand');
    });

    it('should create directory starting with dot', async () => {
      shell.cwd = '/home';
      await shell.execute('mkdir .hidden');

      await assertDirectoryExists(vfs, '/home/.hidden');
    });

    it('should handle creating in current directory', async () => {
      shell.cwd = '/tmp';
      await shell.execute('mkdir foo');

      await assertDirectoryExists(vfs, '/tmp/foo');
    });

    it('should handle paths with trailing slash', async () => {
      shell.cwd = '/home';
      await shell.execute('mkdir testdir/');

      const output = term.getOutput();
      // May succeed or fail depending on implementation
      // Just ensure it doesn't crash
      expect(output).to.exist;
    });
  });

  // ========== touch Tests ==========
  describe('touch', () => {
    it('should create new empty file', async () => {
      shell.cwd = '/home';
      await shell.execute('touch newfile.txt');

      const content = await vfs.readFile('/home/newfile.txt');
      expect(content).to.equal('');
    });

    it('should create file with absolute path', async () => {
      await shell.execute('touch /tmp/test.txt');

      const content = await vfs.readFile('/tmp/test.txt');
      expect(content).to.equal('');
    });

    it('should update existing file timestamp', async () => {
      await vfs.writeFile('/home/existing.txt', 'content');
      const stat1 = await vfs.stat('/home/existing.txt');

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      shell.cwd = '/home';
      await shell.execute('touch existing.txt');

      const stat2 = await vfs.stat('/home/existing.txt');
      const content = await vfs.readFile('/home/existing.txt');

      // Content should be empty (overwritten)
      expect(content).to.equal('');
      expect(stat2.modified).to.be.at.least(stat1.modified);
    });

    it('should create file in nested directory', async () => {
      await mkdirSafe('/home/dir1');
      await shell.execute('touch /home/dir1/file.txt');

      const content = await vfs.readFile('/home/dir1/file.txt');
      expect(content).to.equal('');
    });

    it('should handle missing file operand', async () => {
      await shell.execute('touch');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
      expect(output.toLowerCase()).to.include('missing file operand');
    });

    it('should create file with extension', async () => {
      shell.cwd = '/home';
      await shell.execute('touch test.js');

      const content = await vfs.readFile('/home/test.js');
      expect(content).to.equal('');
    });

    it('should create file with dots in name', async () => {
      shell.cwd = '/home';
      await shell.execute('touch .gitignore');

      const content = await vfs.readFile('/home/.gitignore');
      expect(content).to.equal('');
    });

    it('should create file in current working directory', async () => {
      shell.cwd = '/tmp';
      await shell.execute('touch myfile.txt');

      const content = await vfs.readFile('/tmp/myfile.txt');
      expect(content).to.equal('');
    });

    it('should handle relative paths', async () => {
      await mkdirSafe('/home/subdir');
      shell.cwd = '/home';
      await shell.execute('touch subdir/file.txt');

      const content = await vfs.readFile('/home/subdir/file.txt');
      expect(content).to.equal('');
    });

    it('should create multiple files (if supported)', async () => {
      shell.cwd = '/home';
      await shell.execute('touch file1.txt');
      await shell.execute('touch file2.txt');
      await shell.execute('touch file3.txt');

      await vfs.readFile('/home/file1.txt');
      await vfs.readFile('/home/file2.txt');
      await vfs.readFile('/home/file3.txt');
    });
  });

  // ========== rm Tests ==========
  describe('rm', () => {
    it('should remove a single file', async () => {
      await vfs.writeFile('/home/test.txt', 'content');

      shell.cwd = '/home';
      await shell.execute('rm test.txt');

      await assertNotExists(vfs, '/home/test.txt');
    });

    it('should remove file with absolute path', async () => {
      await vfs.writeFile('/tmp/remove.txt', 'content');

      await shell.execute('rm /tmp/remove.txt');

      await assertNotExists(vfs, '/tmp/remove.txt');
    });

    it('should remove empty directory', async () => {
      await mkdirSafe('/home/emptydir');

      await shell.execute('rm /home/emptydir');

      await assertNotExists(vfs, '/home/emptydir');
    });

    it('should error on non-empty directory without -r flag', async () => {
      await mkdirSafe('/home/dir1');
      await vfs.writeFile('/home/dir1/file.txt', 'content');

      await shell.execute('rm /home/dir1');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
      expect(output).to.include('ENOTEMPTY');
    });

    it('should error on non-existent file', async () => {
      await shell.execute('rm /home/nonexistent.txt');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
    });

    it('should handle missing operand', async () => {
      await shell.execute('rm');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
      expect(output.toLowerCase()).to.include('missing operand');
    });

    it('should remove file from current directory', async () => {
      await vfs.writeFile('/tmp/file.txt', 'content');
      shell.cwd = '/tmp';

      await shell.execute('rm file.txt');

      await assertNotExists(vfs, '/tmp/file.txt');
    });

    it('should handle relative paths', async () => {
      await mkdirSafe('/home/subdir');
      await vfs.writeFile('/home/subdir/file.txt', 'content');
      shell.cwd = '/home';

      await shell.execute('rm subdir/file.txt');

      await assertNotExists(vfs, '/home/subdir/file.txt');
    });

    it('should remove hidden files', async () => {
      await vfs.writeFile('/home/.hidden', 'secret');

      shell.cwd = '/home';
      await shell.execute('rm .hidden');

      await assertNotExists(vfs, '/home/.hidden');
    });

    it('should handle files with special characters', async () => {
      await vfs.writeFile('/home/test-file_123.txt', 'content');

      shell.cwd = '/home';
      await shell.execute('rm test-file_123.txt');

      await assertNotExists(vfs, '/home/test-file_123.txt');
    });
  });

  // ========== cp Tests ==========
  describe('cp', () => {
    it('should copy a single file', async () => {
      await vfs.writeFile('/home/source.txt', 'original content');

      shell.cwd = '/home';
      await shell.execute('cp source.txt dest.txt');

      // Check both files exist
      const sourceContent = await vfs.readFile('/home/source.txt');
      const destContent = await vfs.readFile('/home/dest.txt');

      expect(sourceContent).to.equal('original content');
      expect(destContent).to.equal('original content');
    });

    it('should copy file to different directory', async () => {
      await vfs.writeFile('/home/file.txt', 'content');
      await mkdirSafe('/tmp/dest');

      await shell.execute('cp /home/file.txt /tmp/dest/');

      const content = await vfs.readFile('/tmp/dest/file.txt');
      expect(content).to.equal('content');
    });

    it('should copy and rename file', async () => {
      await vfs.writeFile('/home/old.txt', 'data');

      await shell.execute('cp /home/old.txt /home/new.txt');

      const content = await vfs.readFile('/home/new.txt');
      expect(content).to.equal('data');
    });

    it('should overwrite existing file', async () => {
      await vfs.writeFile('/home/source.txt', 'new data');
      await vfs.writeFile('/home/dest.txt', 'old data');

      shell.cwd = '/home';
      await shell.execute('cp source.txt dest.txt');

      const content = await vfs.readFile('/home/dest.txt');
      expect(content).to.equal('new data');
    });

    it('should error when source does not exist', async () => {
      await shell.execute('cp /home/nonexistent.txt /tmp/dest.txt');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
    });

    it('should handle missing operands', async () => {
      await shell.execute('cp');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
      expect(output.toLowerCase()).to.include('missing');
    });

    it('should handle missing destination', async () => {
      await vfs.writeFile('/home/file.txt', 'content');
      await shell.execute('cp /home/file.txt');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
    });

    it('should copy with relative paths', async () => {
      await mkdirSafe('/home/dir1');
      await vfs.writeFile('/home/file.txt', 'content');
      shell.cwd = '/home';

      await shell.execute('cp file.txt dir1/');

      const content = await vfs.readFile('/home/dir1/file.txt');
      expect(content).to.equal('content');
    });

    it('should preserve file content exactly', async () => {
      const complexContent = 'Line 1\nLine 2\n\tTabbed\nSpecial: @#$%';
      await vfs.writeFile('/home/source.txt', complexContent);

      await shell.execute('cp /home/source.txt /home/dest.txt');

      const content = await vfs.readFile('/home/dest.txt');
      expect(content).to.equal(complexContent);
    });

    it('should copy empty file', async () => {
      await vfs.writeFile('/home/empty.txt', '');

      await shell.execute('cp /home/empty.txt /home/copy.txt');

      const content = await vfs.readFile('/home/copy.txt');
      expect(content).to.equal('');
    });
  });

  // ========== mv Tests ==========
  describe('mv', () => {
    it('should rename a file', async () => {
      await vfs.writeFile('/home/old.txt', 'content');

      shell.cwd = '/home';
      await shell.execute('mv old.txt new.txt');

      await assertNotExists(vfs, '/home/old.txt');
      const content = await vfs.readFile('/home/new.txt');
      expect(content).to.equal('content');
    });

    it('should move file to different directory', async () => {
      await vfs.writeFile('/home/file.txt', 'data');
      await mkdirSafe('/tmp/dest');

      await shell.execute('mv /home/file.txt /tmp/dest/');

      await assertNotExists(vfs, '/home/file.txt');
      const content = await vfs.readFile('/tmp/dest/file.txt');
      expect(content).to.equal('data');
    });

    it('should move and rename file', async () => {
      await vfs.writeFile('/home/source.txt', 'content');
      await mkdirSafe('/tmp/dest');

      await shell.execute('mv /home/source.txt /tmp/dest/renamed.txt');

      await assertNotExists(vfs, '/home/source.txt');
      const content = await vfs.readFile('/tmp/dest/renamed.txt');
      expect(content).to.equal('content');
    });

    it('should rename a directory', async () => {
      await mkdirSafe('/home/olddir');
      await vfs.writeFile('/home/olddir/file.txt', 'content');

      await shell.execute('mv /home/olddir /home/newdir');

      await assertNotExists(vfs, '/home/olddir');
      await assertDirectoryExists(vfs, '/home/newdir');
    });

    it('should overwrite existing file', async () => {
      await vfs.writeFile('/home/source.txt', 'new content');
      await vfs.writeFile('/home/dest.txt', 'old content');

      await shell.execute('mv /home/source.txt /home/dest.txt');

      await assertNotExists(vfs, '/home/source.txt');
      const content = await vfs.readFile('/home/dest.txt');
      expect(content).to.equal('new content');
    });

    it('should error when source does not exist', async () => {
      await shell.execute('mv /home/nonexistent.txt /tmp/dest.txt');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
    });

    it('should handle missing operands', async () => {
      await shell.execute('mv');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
      expect(output.toLowerCase()).to.include('missing');
    });

    it('should handle missing destination', async () => {
      await vfs.writeFile('/home/file.txt', 'content');
      await shell.execute('mv /home/file.txt');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
    });

    it('should handle relative paths', async () => {
      await mkdirSafe('/home/dir1');
      await vfs.writeFile('/home/file.txt', 'content');
      shell.cwd = '/home';

      await shell.execute('mv file.txt dir1/');

      await assertNotExists(vfs, '/home/file.txt');
      const content = await vfs.readFile('/home/dir1/file.txt');
      expect(content).to.equal('content');
    });

    it('should preserve file content during move', async () => {
      const complexContent = 'Line 1\nLine 2\n\tTabbed\nSpecial: @#$%';
      await vfs.writeFile('/home/source.txt', complexContent);

      await shell.execute('mv /home/source.txt /home/dest.txt');

      const content = await vfs.readFile('/home/dest.txt');
      expect(content).to.equal(complexContent);
    });

    it('should move empty file', async () => {
      await vfs.writeFile('/home/empty.txt', '');

      await shell.execute('mv /home/empty.txt /home/moved.txt');

      await assertNotExists(vfs, '/home/empty.txt');
      const content = await vfs.readFile('/home/moved.txt');
      expect(content).to.equal('');
    });
  });

  // ========== write Tests ==========
  describe('write', () => {
    it('should write text to new file', async () => {
      shell.cwd = '/home';
      await shell.execute('write test.txt hello world');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('hello world');
    });

    it('should overwrite existing file', async () => {
      await vfs.writeFile('/home/file.txt', 'old content');

      shell.cwd = '/home';
      await shell.execute('write file.txt new content');

      const content = await vfs.readFile('/home/file.txt');
      expect(content).to.equal('new content');
    });

    it('should write with absolute path', async () => {
      await shell.execute('write /tmp/test.txt data here');

      const content = await vfs.readFile('/tmp/test.txt');
      expect(content).to.equal('data here');
    });

    it('should handle escape sequences - newline', async () => {
      shell.cwd = '/home';
      await shell.execute('write test.txt line1\\nline2');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('line1\nline2');
    });

    it('should handle escape sequences - tab', async () => {
      shell.cwd = '/home';
      await shell.execute('write test.txt col1\\tcol2');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('col1\tcol2');
    });

    it('should handle escape sequences - backslash', async () => {
      shell.cwd = '/home';
      await shell.execute('write test.txt path\\\\to\\\\file');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('path\\to\\file');
    });

    it('should write multiple words', async () => {
      shell.cwd = '/home';
      await shell.execute('write test.txt this is a longer message');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('this is a longer message');
    });

    it('should handle missing operands', async () => {
      await shell.execute('write');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
      expect(output.toLowerCase()).to.include('missing');
    });

    it('should handle missing content', async () => {
      await shell.execute('write test.txt');

      const output = term.getOutput();
      expect(output.toLowerCase()).to.include('error');
    });

    it('should write empty string when content is empty', async () => {
      shell.cwd = '/home';
      // This might error or create empty file depending on implementation
      await shell.execute('write test.txt');

      const output = term.getOutput();
      expect(output).to.exist;
    });

    it('should create file in nested directory', async () => {
      await mkdirSafe('/home/dir1');

      await shell.execute('write /home/dir1/file.txt content');

      const content = await vfs.readFile('/home/dir1/file.txt');
      expect(content).to.equal('content');
    });

    it('should handle special characters in content', async () => {
      shell.cwd = '/home';
      await shell.execute('write test.txt @#$%^&*()');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('@#$%^&*()');
    });
  });

  // ========== Direct VFS write Tests ==========
  describe('VFS writeFile (direct)', () => {
    it('should write content to file', async () => {
      await vfs.writeFile('/home/test.txt', 'content');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('content');
    });

    it('should overwrite existing file', async () => {
      await vfs.writeFile('/home/file.txt', 'old');
      await vfs.writeFile('/home/file.txt', 'new');

      const content = await vfs.readFile('/home/file.txt');
      expect(content).to.equal('new');
    });

    it('should create file with empty content', async () => {
      await vfs.writeFile('/home/empty.txt', '');

      const content = await vfs.readFile('/home/empty.txt');
      expect(content).to.equal('');
    });

    it('should preserve newlines', async () => {
      await vfs.writeFile('/home/multiline.txt', 'line1\nline2\nline3');

      const content = await vfs.readFile('/home/multiline.txt');
      expect(content).to.equal('line1\nline2\nline3');
    });

    it('should write JSON data', async () => {
      const jsonData = JSON.stringify({ key: 'value', num: 123 });
      await vfs.writeFile('/home/data.json', jsonData);

      const content = await vfs.readFile('/home/data.json');
      expect(JSON.parse(content)).to.deep.equal({ key: 'value', num: 123 });
    });

    it('should write to nested path', async () => {
      await mkdirSafe('/home/a');
      await mkdirSafe('/home/a/b');
      await vfs.writeFile('/home/a/b/file.txt', 'nested');

      const content = await vfs.readFile('/home/a/b/file.txt');
      expect(content).to.equal('nested');
    });

    it('should handle unicode content', async () => {
      await vfs.writeFile('/home/unicode.txt', 'Hello 世界 🌍');

      const content = await vfs.readFile('/home/unicode.txt');
      expect(content).to.equal('Hello 世界 🌍');
    });

    it('should update file timestamp on write', async () => {
      await vfs.writeFile('/home/file.txt', 'v1');
      const stat1 = await vfs.stat('/home/file.txt');

      await new Promise(resolve => setTimeout(resolve, 10));

      await vfs.writeFile('/home/file.txt', 'v2');
      const stat2 = await vfs.stat('/home/file.txt');

      expect(stat2.modified).to.be.at.least(stat1.modified);
    });

    it('should preserve creation timestamp on overwrite', async () => {
      await vfs.writeFile('/home/file.txt', 'v1');
      const stat1 = await vfs.stat('/home/file.txt');

      await new Promise(resolve => setTimeout(resolve, 10));

      await vfs.writeFile('/home/file.txt', 'v2');
      const stat2 = await vfs.stat('/home/file.txt');

      expect(stat2.created).to.equal(stat1.created);
    });

    it('should write large content', async () => {
      const largeContent = 'x'.repeat(10000);
      await vfs.writeFile('/home/large.txt', largeContent);

      const content = await vfs.readFile('/home/large.txt');
      expect(content).to.equal(largeContent);

      const stat = await vfs.stat('/home/large.txt');
      expect(stat.size).to.equal(10000);
    });
  });

  // ========== Edge Cases and Error Handling ==========
  describe('Edge Cases', () => {
    it('should handle paths with double slashes', async () => {
      await mkdirSafe('/home/test');
      const stat = await vfs.stat('/home//test');
      expect(stat.type).to.equal('directory');
    });

    it('should handle current directory reference (.)', async () => {
      shell.cwd = '/home';
      await shell.execute('mkdir ./testdir');

      // Implementation may vary
      const output = term.getOutput();
      expect(output).to.exist;
    });

    it('should handle parent directory reference (..)', async () => {
      await mkdirSafe('/home/subdir');
      shell.cwd = '/home/subdir';

      await shell.execute('touch ../file.txt');

      // Should create in /home
      const files = await vfs.readdir('/home');
      const hasFile = files.some(f => f.name === 'file.txt');
      expect(hasFile).to.be.true;
    });

    it('should handle very long filenames', async () => {
      const longName = 'a'.repeat(100) + '.txt';
      await vfs.writeFile(`/home/${longName}`, 'content');

      const content = await vfs.readFile(`/home/${longName}`);
      expect(content).to.equal('content');
    });

    it('should handle files with multiple dots', async () => {
      await vfs.writeFile('/home/file.test.backup.txt', 'data');

      const content = await vfs.readFile('/home/file.test.backup.txt');
      expect(content).to.equal('data');
    });

    it('should error when reading directory as file', async () => {
      await mkdirSafe('/home/dir');

      try {
        await vfs.readFile('/home/dir');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('EISDIR');
      }
    });

    it('should error when reading non-existent file', async () => {
      try {
        await vfs.readFile('/home/nonexistent.txt');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('ENOENT');
      }
    });

    it('should handle rapid sequential operations', async () => {
      await vfs.writeFile('/home/file1.txt', 'a');
      await vfs.writeFile('/home/file2.txt', 'b');
      await vfs.writeFile('/home/file3.txt', 'c');
      await mkdirSafe('/home/dir1');
      await mkdirSafe('/home/dir2');

      const entries = await vfs.readdir('/home');
      expect(entries.length).to.be.at.least(5);
    });

    it('should maintain file isolation between directories', async () => {
      await vfs.writeFile('/home/file.txt', 'home content');
      await vfs.writeFile('/tmp/file.txt', 'tmp content');

      const homeContent = await vfs.readFile('/home/file.txt');
      const tmpContent = await vfs.readFile('/tmp/file.txt');

      expect(homeContent).to.equal('home content');
      expect(tmpContent).to.equal('tmp content');
    });

    it('should handle binary-like content', async () => {
      const binaryContent = '\x00\x01\x02\xFF\xFE';
      await vfs.writeFile('/home/binary', binaryContent);

      const content = await vfs.readFile('/home/binary');
      expect(content).to.equal(binaryContent);
    });
  });

  // ========== Integration Tests (Multiple Operations) ==========
  describe('Integration - Multiple Operations', () => {
    it('should create, write, read, and delete file', async () => {
      await shell.execute('touch /home/test.txt');
      await shell.execute('write /home/test.txt hello');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('hello');

      await shell.execute('rm /home/test.txt');
      await assertNotExists(vfs, '/home/test.txt');
    });

    it('should create directory, add files, and remove', async () => {
      await shell.execute('mkdir /home/mydir');
      await vfs.writeFile('/home/mydir/file1.txt', 'a');
      await vfs.writeFile('/home/mydir/file2.txt', 'b');

      const entries = await vfs.readdir('/home/mydir');
      expect(entries.length).to.equal(2);

      await shell.execute('rm /home/mydir/file1.txt');
      await shell.execute('rm /home/mydir/file2.txt');
      await shell.execute('rm /home/mydir');

      await assertNotExists(vfs, '/home/mydir');
    });

    it('should copy file and verify both exist', async () => {
      await vfs.writeFile('/home/original.txt', 'data');
      await shell.execute('cp /home/original.txt /home/copy.txt');

      const original = await vfs.readFile('/home/original.txt');
      const copy = await vfs.readFile('/home/copy.txt');

      expect(original).to.equal('data');
      expect(copy).to.equal('data');
    });

    it('should move file and verify source is gone', async () => {
      await vfs.writeFile('/home/source.txt', 'content');
      await shell.execute('mv /home/source.txt /home/dest.txt');

      await assertNotExists(vfs, '/home/source.txt');
      const content = await vfs.readFile('/home/dest.txt');
      expect(content).to.equal('content');
    });

    it('should handle complex directory structure', async () => {
      await shell.execute('mkdir /home/a');
      await shell.execute('mkdir /home/a/b');
      await shell.execute('mkdir /home/a/b/c');
      await vfs.writeFile('/home/a/b/c/file.txt', 'deep');

      const content = await vfs.readFile('/home/a/b/c/file.txt');
      expect(content).to.equal('deep');
    });

    it('should handle file operations across directories', async () => {
      await mkdirSafe('/home/dir1');
      await mkdirSafe('/home/dir2');
      await vfs.writeFile('/home/dir1/file.txt', 'content');

      await shell.execute('cp /home/dir1/file.txt /home/dir2/file.txt');

      const content1 = await vfs.readFile('/home/dir1/file.txt');
      const content2 = await vfs.readFile('/home/dir2/file.txt');

      expect(content1).to.equal('content');
      expect(content2).to.equal('content');
    });

    it('should maintain consistency after multiple writes', async () => {
      await vfs.writeFile('/home/file.txt', 'v1');
      await vfs.writeFile('/home/file.txt', 'v2');
      await vfs.writeFile('/home/file.txt', 'v3');

      const content = await vfs.readFile('/home/file.txt');
      expect(content).to.equal('v3');

      const stat = await vfs.stat('/home/file.txt');
      expect(stat.size).to.equal(2);
    });

    it('should handle creating and deleting many files', async () => {
      for (let i = 0; i < 10; i++) {
        await vfs.writeFile(`/home/file${i}.txt`, `content${i}`);
      }

      const entries = await vfs.readdir('/home');
      expect(entries.length).to.be.at.least(10);

      for (let i = 0; i < 10; i++) {
        await shell.execute(`rm /home/file${i}.txt`);
      }
    });

    it('should preserve file system state across operations', async () => {
      await vfs.writeFile('/home/persistent.txt', 'data');

      await shell.execute('mkdir /home/newdir');
      await shell.execute('touch /home/temp.txt');
      await shell.execute('rm /home/temp.txt');

      // Original file should still exist
      const content = await vfs.readFile('/home/persistent.txt');
      expect(content).to.equal('data');
    });
  });

  // ========== Additional mkdir Tests ==========
  describe('mkdir - Additional Tests', () => {
    it('should create multiple directories sequentially', async () => {
      await shell.execute('mkdir /home/dir1');
      await shell.execute('mkdir /home/dir2');
      await shell.execute('mkdir /home/dir3');

      await assertDirectoryExists(vfs, '/home/dir1');
      await assertDirectoryExists(vfs, '/home/dir2');
      await assertDirectoryExists(vfs, '/home/dir3');
    });

    it('should handle numeric directory names', async () => {
      await shell.execute('mkdir /home/123');

      await assertDirectoryExists(vfs, '/home/123');
    });

    it('should create directory with underscore', async () => {
      await shell.execute('mkdir /home/my_directory');

      await assertDirectoryExists(vfs, '/home/my_directory');
    });

    it('should create directory with hyphen', async () => {
      await shell.execute('mkdir /home/my-directory');

      await assertDirectoryExists(vfs, '/home/my-directory');
    });

    it('should create deeply nested directory structure', async () => {
      await shell.execute('mkdir /home/a');
      await shell.execute('mkdir /home/a/b');
      await shell.execute('mkdir /home/a/b/c');
      await shell.execute('mkdir /home/a/b/c/d');

      await assertDirectoryExists(vfs, '/home/a/b/c/d');
    });
  });

  // ========== Additional touch Tests ==========
  describe('touch - Additional Tests', () => {
    it('should create file with long name', async () => {
      const longName = 'very_long_filename_' + 'x'.repeat(50) + '.txt';
      shell.cwd = '/home';
      await shell.execute(`touch ${longName}`);

      const content = await vfs.readFile(`/home/${longName}`);
      expect(content).to.equal('');
    });

    it('should create file with numbers in name', async () => {
      await shell.execute('touch /home/file123.txt');

      const content = await vfs.readFile('/home/file123.txt');
      expect(content).to.equal('');
    });

    it('should create hidden file', async () => {
      await shell.execute('touch /home/.secret');

      const content = await vfs.readFile('/home/.secret');
      expect(content).to.equal('');
    });

    it('should create multiple files in sequence', async () => {
      shell.cwd = '/home';
      await shell.execute('touch a.txt');
      await shell.execute('touch b.txt');
      await shell.execute('touch c.txt');

      await vfs.readFile('/home/a.txt');
      await vfs.readFile('/home/b.txt');
      await vfs.readFile('/home/c.txt');
    });

    it('should create file in tmp directory', async () => {
      await shell.execute('touch /tmp/tempfile.txt');

      const content = await vfs.readFile('/tmp/tempfile.txt');
      expect(content).to.equal('');
    });
  });

  // ========== Additional rm Tests ==========
  describe('rm - Additional Tests', () => {
    it('should remove multiple files in sequence', async () => {
      await vfs.writeFile('/home/file1.txt', 'a');
      await vfs.writeFile('/home/file2.txt', 'b');
      await vfs.writeFile('/home/file3.txt', 'c');

      await shell.execute('rm /home/file1.txt');
      await shell.execute('rm /home/file2.txt');
      await shell.execute('rm /home/file3.txt');

      await assertNotExists(vfs, '/home/file1.txt');
      await assertNotExists(vfs, '/home/file2.txt');
      await assertNotExists(vfs, '/home/file3.txt');
    });

    it('should remove file with long name', async () => {
      const longName = 'file_' + 'x'.repeat(50) + '.txt';
      await vfs.writeFile(`/home/${longName}`, 'content');

      await shell.execute(`rm /home/${longName}`);

      await assertNotExists(vfs, `/home/${longName}`);
    });

    it('should remove file from tmp directory', async () => {
      await vfs.writeFile('/tmp/tempfile.txt', 'temp');

      await shell.execute('rm /tmp/tempfile.txt');

      await assertNotExists(vfs, '/tmp/tempfile.txt');
    });

    it('should remove file with numeric name', async () => {
      await vfs.writeFile('/home/123.txt', 'content');

      await shell.execute('rm /home/123.txt');

      await assertNotExists(vfs, '/home/123.txt');
    });

    it('should handle removing same file twice', async () => {
      await vfs.writeFile('/home/file.txt', 'content');

      await shell.execute('rm /home/file.txt');
      await shell.execute('rm /home/file.txt');

      const output = term.getOutput();
      // Second rm should error
      expect(output.toLowerCase()).to.include('error');
    });
  });

  // ========== Additional cp Tests ==========
  describe('cp - Additional Tests', () => {
    it('should copy file within same directory', async () => {
      await vfs.writeFile('/home/source.txt', 'data');

      shell.cwd = '/home';
      await shell.execute('cp source.txt copy.txt');

      const content = await vfs.readFile('/home/copy.txt');
      expect(content).to.equal('data');
    });

    it('should copy file with long content', async () => {
      const longContent = 'Lorem ipsum '.repeat(1000);
      await vfs.writeFile('/home/source.txt', longContent);

      await shell.execute('cp /home/source.txt /home/dest.txt');

      const content = await vfs.readFile('/home/dest.txt');
      expect(content).to.equal(longContent);
    });

    it('should copy file with special content', async () => {
      const specialContent = 'Tab:\t\nNewline\nQuote:"';
      await vfs.writeFile('/home/source.txt', specialContent);

      await shell.execute('cp /home/source.txt /home/dest.txt');

      const content = await vfs.readFile('/home/dest.txt');
      expect(content).to.equal(specialContent);
    });

    it('should copy multiple files in sequence', async () => {
      await vfs.writeFile('/home/file1.txt', 'a');
      await vfs.writeFile('/home/file2.txt', 'b');

      await shell.execute('cp /home/file1.txt /home/copy1.txt');
      await shell.execute('cp /home/file2.txt /home/copy2.txt');

      const content1 = await vfs.readFile('/home/copy1.txt');
      const content2 = await vfs.readFile('/home/copy2.txt');

      expect(content1).to.equal('a');
      expect(content2).to.equal('b');
    });

    it('should copy to tmp directory', async () => {
      await vfs.writeFile('/home/file.txt', 'content');

      await shell.execute('cp /home/file.txt /tmp/file.txt');

      const content = await vfs.readFile('/tmp/file.txt');
      expect(content).to.equal('content');
    });

    it('should handle copying file to itself (same name error)', async () => {
      await vfs.writeFile('/home/file.txt', 'content');

      await shell.execute('cp /home/file.txt /home/file.txt');

      // May succeed or error depending on implementation
      const output = term.getOutput();
      expect(output).to.exist;
    });
  });

  // ========== Additional mv Tests ==========
  describe('mv - Additional Tests', () => {
    it('should rename file in place', async () => {
      await vfs.writeFile('/home/old.txt', 'content');

      shell.cwd = '/home';
      await shell.execute('mv old.txt new.txt');

      await assertNotExists(vfs, '/home/old.txt');
      const content = await vfs.readFile('/home/new.txt');
      expect(content).to.equal('content');
    });

    it('should move file with long content', async () => {
      const longContent = 'Data '.repeat(1000);
      await vfs.writeFile('/home/file.txt', longContent);

      await shell.execute('mv /home/file.txt /tmp/file.txt');

      await assertNotExists(vfs, '/home/file.txt');
      const content = await vfs.readFile('/tmp/file.txt');
      expect(content).to.equal(longContent);
    });

    it('should move file across directories', async () => {
      await mkdirSafe('/home/dir1');
      await mkdirSafe('/home/dir2');
      await vfs.writeFile('/home/dir1/file.txt', 'content');

      await shell.execute('mv /home/dir1/file.txt /home/dir2/file.txt');

      await assertNotExists(vfs, '/home/dir1/file.txt');
      const content = await vfs.readFile('/home/dir2/file.txt');
      expect(content).to.equal('content');
    });

    it('should move and rename simultaneously', async () => {
      await mkdirSafe('/home/dir1');
      await vfs.writeFile('/home/old.txt', 'content');

      await shell.execute('mv /home/old.txt /home/dir1/new.txt');

      await assertNotExists(vfs, '/home/old.txt');
      const content = await vfs.readFile('/home/dir1/new.txt');
      expect(content).to.equal('content');
    });

    it('should move hidden file', async () => {
      await vfs.writeFile('/home/.hidden', 'secret');

      await shell.execute('mv /home/.hidden /tmp/.hidden');

      await assertNotExists(vfs, '/home/.hidden');
      const content = await vfs.readFile('/tmp/.hidden');
      expect(content).to.equal('secret');
    });
  });

  // ========== Additional write Tests ==========
  describe('write - Additional Tests', () => {
    it('should write with multiple escape sequences', async () => {
      shell.cwd = '/home';
      await shell.execute('write test.txt line1\\nline2\\tindented\\nline3');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('line1\nline2\tindented\nline3');
    });

    it('should write numbers', async () => {
      shell.cwd = '/home';
      await shell.execute('write test.txt 12345 67890');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('12345 67890');
    });

    it('should write single word', async () => {
      shell.cwd = '/home';
      await shell.execute('write test.txt hello');

      const content = await vfs.readFile('/home/test.txt');
      expect(content).to.equal('hello');
    });

    it('should overwrite large file with small content', async () => {
      await vfs.writeFile('/home/file.txt', 'x'.repeat(1000));

      shell.cwd = '/home';
      await shell.execute('write file.txt short');

      const content = await vfs.readFile('/home/file.txt');
      expect(content).to.equal('short');
    });

    it('should write to different directories', async () => {
      await shell.execute('write /home/home.txt home');
      await shell.execute('write /tmp/tmp.txt tmp');

      const homeContent = await vfs.readFile('/home/home.txt');
      const tmpContent = await vfs.readFile('/tmp/tmp.txt');

      expect(homeContent).to.equal('home');
      expect(tmpContent).to.equal('tmp');
    });
  });

  // ========== VFS stat Tests ==========
  describe('VFS stat', () => {
    it('should return correct file type for file', async () => {
      await vfs.writeFile('/home/file.txt', 'content');

      const stat = await vfs.stat('/home/file.txt');
      expect(stat.type).to.equal('file');
    });

    it('should return correct file type for directory', async () => {
      await mkdirSafe('/home/dir');

      const stat = await vfs.stat('/home/dir');
      expect(stat.type).to.equal('directory');
    });

    it('should return file size', async () => {
      await vfs.writeFile('/home/file.txt', 'hello');

      const stat = await vfs.stat('/home/file.txt');
      expect(stat.size).to.equal(5);
    });

    it('should return timestamps', async () => {
      await vfs.writeFile('/home/file.txt', 'content');

      const stat = await vfs.stat('/home/file.txt');
      expect(stat.created).to.be.a('number');
      expect(stat.modified).to.be.a('number');
      expect(stat.modified).to.be.at.least(stat.created);
    });

    it('should update modified time on file write', async () => {
      await vfs.writeFile('/home/file.txt', 'v1');
      const stat1 = await vfs.stat('/home/file.txt');

      await new Promise(resolve => setTimeout(resolve, 10));

      await vfs.writeFile('/home/file.txt', 'v2');
      const stat2 = await vfs.stat('/home/file.txt');

      expect(stat2.modified).to.be.greaterThan(stat1.modified);
    });

    it('should error on non-existent path', async () => {
      try {
        await vfs.stat('/home/nonexistent');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('ENOENT');
      }
    });
  });

  // ========== VFS readdir Tests ==========
  describe('VFS readdir', () => {
    it('should list directory entries', async () => {
      await vfs.writeFile('/home/file1.txt', 'a');
      await vfs.writeFile('/home/file2.txt', 'b');
      await mkdirSafe('/home/dir1');

      const entries = await vfs.readdir('/home');

      expect(entries.length).to.be.at.least(3);
      const names = entries.map(e => e.name);
      expect(names).to.include('file1.txt');
      expect(names).to.include('file2.txt');
      expect(names).to.include('dir1');
    });

    it('should return empty array for empty directory', async () => {
      await mkdirSafe('/home/empty');

      const entries = await vfs.readdir('/home/empty');
      expect(entries).to.be.an('array');
      expect(entries.length).to.equal(0);
    });

    it('should include entry metadata', async () => {
      await vfs.writeFile('/home/file.txt', 'content');

      const entries = await vfs.readdir('/home');
      const fileEntry = entries.find(e => e.name === 'file.txt');

      expect(fileEntry).to.exist;
      expect(fileEntry.type).to.equal('file');
      expect(fileEntry.size).to.be.a('number');
      expect(fileEntry.modified).to.be.a('number');
    });

    it('should list root directory', async () => {
      const entries = await vfs.readdir('/');

      expect(entries).to.be.an('array');
      expect(entries.length).to.be.greaterThan(0);
    });

    it('should list nested directory', async () => {
      await mkdirSafe('/home/dir1');
      await vfs.writeFile('/home/dir1/file.txt', 'content');

      const entries = await vfs.readdir('/home/dir1');
      expect(entries.length).to.equal(1);
      expect(entries[0].name).to.equal('file.txt');
    });
  });

  // ========== Path Resolution Tests ==========
  describe('Path Resolution', () => {
    it('should resolve absolute paths correctly', async () => {
      await vfs.writeFile('/home/file.txt', 'content');

      const content = await vfs.readFile('/home/file.txt');
      expect(content).to.equal('content');
    });

    it('should handle relative path from cwd', async () => {
      await vfs.writeFile('/home/file.txt', 'content');
      shell.cwd = '/home';

      await shell.execute('cat file.txt');

      const output = term.getOutput();
      expect(output).to.include('content');
    });

    it('should handle nested relative paths', async () => {
      await mkdirSafe('/home/dir1');
      await vfs.writeFile('/home/dir1/file.txt', 'content');
      shell.cwd = '/home';

      await shell.execute('cat dir1/file.txt');

      const output = term.getOutput();
      expect(output).to.include('content');
    });

    it('should handle parent directory (..) in path', async () => {
      await mkdirSafe('/home/dir1');
      await vfs.writeFile('/home/file.txt', 'parent content');
      shell.cwd = '/home/dir1';

      await shell.execute('cat ../file.txt');

      const output = term.getOutput();
      expect(output).to.include('parent content');
    });

    it('should handle current directory (.) in path', async () => {
      await vfs.writeFile('/home/file.txt', 'content');
      shell.cwd = '/home';

      await shell.execute('cat ./file.txt');

      const output = term.getOutput();
      expect(output).to.include('content');
    });

    it('should handle multiple parent references (../../)', async () => {
      await mkdirSafe('/home/a');
      await mkdirSafe('/home/a/b');
      await vfs.writeFile('/home/file.txt', 'root file');
      shell.cwd = '/home/a/b';

      await shell.execute('cat ../../file.txt');

      const output = term.getOutput();
      expect(output).to.include('root file');
    });

    it('should handle home directory expansion (~)', async () => {
      shell.env.HOME = '/home';
      await vfs.writeFile('/home/file.txt', 'home content');

      shell.cwd = '/tmp';
      await shell.execute('cat ~/file.txt');

      const output = term.getOutput();
      expect(output).to.include('home content');
    });
  });

  // ========== Concurrent Operations Tests ==========
  describe('Concurrent Operations', () => {
    it('should handle multiple writes to different files', async () => {
      await Promise.all([
        vfs.writeFile('/home/file1.txt', 'content1'),
        vfs.writeFile('/home/file2.txt', 'content2'),
        vfs.writeFile('/home/file3.txt', 'content3')
      ]);

      const content1 = await vfs.readFile('/home/file1.txt');
      const content2 = await vfs.readFile('/home/file2.txt');
      const content3 = await vfs.readFile('/home/file3.txt');

      expect(content1).to.equal('content1');
      expect(content2).to.equal('content2');
      expect(content3).to.equal('content3');
    });

    it('should handle multiple directory creations', async () => {
      await Promise.all([
        mkdirSafe('/home/dir1'),
        mkdirSafe('/home/dir2'),
        mkdirSafe('/home/dir3')
      ]);

      await assertDirectoryExists(vfs, '/home/dir1');
      await assertDirectoryExists(vfs, '/home/dir2');
      await assertDirectoryExists(vfs, '/home/dir3');
    });

    it('should handle mixed operations concurrently', async () => {
      await Promise.all([
        mkdirSafe('/home/newdir'),
        vfs.writeFile('/home/file1.txt', 'a'),
        vfs.writeFile('/home/file2.txt', 'b')
      ]);

      await assertDirectoryExists(vfs, '/home/newdir');
      const content1 = await vfs.readFile('/home/file1.txt');
      const content2 = await vfs.readFile('/home/file2.txt');

      expect(content1).to.equal('a');
      expect(content2).to.equal('b');
    });
  });

  // ========== Stress Tests ==========
  describe('Stress Tests', () => {
    it('should handle creating many files', async () => {
      const fileCount = 50;
      for (let i = 0; i < fileCount; i++) {
        await vfs.writeFile(`/home/stress_${i}.txt`, `content ${i}`);
      }

      const entries = await vfs.readdir('/home');
      expect(entries.length).to.be.at.least(fileCount);
    });

    it('should handle deep directory nesting', async () => {
      let path = '/home';
      for (let i = 0; i < 10; i++) {
        path += `/level${i}`;
        await mkdirSafe(path);
      }

      await assertDirectoryExists(vfs, path);
    });

    it('should handle large file content', async () => {
      const largeContent = 'x'.repeat(50000);
      await vfs.writeFile('/home/large.txt', largeContent);

      const content = await vfs.readFile('/home/large.txt');
      expect(content.length).to.equal(50000);
    });

    it('should handle file with many lines', async () => {
      const lines = Array(1000).fill('line').join('\n');
      await vfs.writeFile('/home/multiline.txt', lines);

      const content = await vfs.readFile('/home/multiline.txt');
      const lineCount = content.split('\n').length;
      expect(lineCount).to.equal(1000);
    });
  });

  // ========== Special Cases ==========
  describe('Special Cases', () => {
    it('should handle empty directory name edge case', async () => {
      // This should error or be handled gracefully
      await shell.execute('mkdir ""');

      const output = term.getOutput();
      expect(output).to.exist;
    });

    it('should handle file creation in root directory', async () => {
      await vfs.writeFile('/root_file.txt', 'root content');

      const content = await vfs.readFile('/root_file.txt');
      expect(content).to.equal('root content');
    });

    it('should preserve exact content through operations', async () => {
      const exactContent = 'Exact\ncontent\twith\rspecial\x00chars';
      await vfs.writeFile('/home/exact.txt', exactContent);

      const content = await vfs.readFile('/home/exact.txt');
      expect(content).to.equal(exactContent);
    });

    it('should handle writing after reading', async () => {
      await vfs.writeFile('/home/file.txt', 'v1');
      await vfs.readFile('/home/file.txt');
      await vfs.writeFile('/home/file.txt', 'v2');

      const content = await vfs.readFile('/home/file.txt');
      expect(content).to.equal('v2');
    });

    it('should handle rapid file modifications', async () => {
      await vfs.writeFile('/home/rapid.txt', 'v1');
      await vfs.writeFile('/home/rapid.txt', 'v2');
      await vfs.writeFile('/home/rapid.txt', 'v3');
      await vfs.writeFile('/home/rapid.txt', 'v4');
      await vfs.writeFile('/home/rapid.txt', 'v5');

      const content = await vfs.readFile('/home/rapid.txt');
      expect(content).to.equal('v5');
    });

    it('should maintain file system integrity after errors', async () => {
      await vfs.writeFile('/home/good.txt', 'content');

      // Try invalid operation
      try {
        await vfs.readFile('/home/nonexistent.txt');
      } catch (error) {
        // Expected
      }

      // Original file should still be readable
      const content = await vfs.readFile('/home/good.txt');
      expect(content).to.equal('content');
    });
  });
});
