/**
 * Integration tests for pipe operations and command chaining
 * Tests for pipe combinations and data flow
 */

import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Pipe Operations', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    await populateTestFixtures(vfs, {
      '/home/data.txt': 'apple\nbanana\napple\ncherry\napple\nbanana',
      '/home/numbers.txt': '3\n1\n4\n1\n5\n9\n2\n6',
      '/home/search.txt': 'line with foo\nline without\nfoo again here\nnothing',
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('Basic pipes', () => {
    it('should pipe cat to grep', async () => {
      shell.cwd = '/home';
      await shell.execute('cat search.txt | grep foo');
      const lines = term.getOutputLines().filter(l => l.includes('foo'));
      expect(lines.length).to.equal(2);
    });

    it('should pipe cat to sort', async () => {
      shell.cwd = '/home';
      await shell.execute('cat numbers.txt | sort');
      const lines = term.getOutputLines().filter(l => l.trim());
      expect(lines[0]).to.equal('1');
    });

    it('should pipe cat to uniq', async () => {
      shell.cwd = '/home';
      await shell.execute('cat data.txt | sort | uniq');
      const lines = term.getOutputLines().filter(l => l.trim());
      expect(lines.length).to.equal(3); // apple, banana, cherry
    });
  });

  describe('Multi-stage pipes', () => {
    it('should chain three commands', async () => {
      shell.cwd = '/home';
      await shell.execute('cat data.txt | sort | uniq');
      const output = term.getOutput();
      expect(output).to.include('apple');
      expect(output).to.include('banana');
      expect(output).to.include('cherry');
    });

    it('should chain grep to wc', async () => {
      shell.cwd = '/home';
      await shell.execute('cat search.txt | grep foo | wc -l');
      const output = term.getOutput().trim();
      expect(output).to.include('2');
    });
  });

  describe('Pipe to head and tail', () => {
    it('should pipe to head', async () => {
      shell.cwd = '/home';
      await shell.execute('cat data.txt | head -n 2');
      const lines = term.getOutputLines().filter(l => l.trim());
      expect(lines.length).to.be.lessThanOrEqual(2);
    });

    it('should pipe to tail', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('cat data.txt | tail -n 2');
      const lines = term.getOutputLines().filter(l => l.trim());
      expect(lines.length).to.be.lessThanOrEqual(2);
    });
  });
});

describe('Echo and Output', () => {
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

  describe('Echo variations', () => {
    it('should echo simple text', async () => {
      await shell.execute('echo hello');
      expect(term.getOutput()).to.include('hello');
    });

    it('should echo with special characters', async () => {
      await shell.execute('echo "hello world"');
      expect(term.getOutput()).to.include('hello world');
    });

    it('should echo variable expansion', async () => {
      shell.env.NAME = 'test';
      await shell.execute('echo $NAME');
      expect(term.getOutput()).to.include('test');
    });
  });

  describe('Echo to file', () => {
    it('should redirect echo to file', async () => {
      shell.cwd = '/home';
      await shell.execute('echo "test content" > testfile.txt');

      const content = await vfs.readFile('/home/testfile.txt');
      expect(content).to.include('test content');
    });

    it('should append echo to file', async () => {
      await populateTestFixtures(vfs, {
        '/home/append.txt': 'original\n',
      });

      shell.cwd = '/home';
      await shell.execute('echo "appended" >> append.txt');

      const content = await vfs.readFile('/home/append.txt');
      expect(content).to.include('original');
      expect(content).to.include('appended');
    });
  });
});

describe('Command Execution Order', () => {
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

  describe('Semicolon sequences', () => {
    it('should execute commands in sequence', async () => {
      shell.cwd = '/home';
      await shell.execute('echo first ; echo second ; echo third');
      const output = term.getOutput();

      expect(output).to.include('first');
      expect(output).to.include('second');
      expect(output).to.include('third');
    });

    it('should continue after failed command with semicolon', async () => {
      shell.cwd = '/home';
      term.clear();
      await shell.execute('cat nonexistent.txt ; echo "still runs"');
      const output = term.getOutput();

      expect(output).to.include('still runs');
    });
  });
});
