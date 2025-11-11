/**
 * Unit tests for test command
 */

import { expect } from 'chai';
import { test } from '../../../src/commands/test.js';

// Mock Shell
class MockShell {
  constructor() {
    this.cwd = '/home';
    this.env = {
      HOME: '/home',
      USER: 'testuser'
    };
    this.lastExitCode = 0;
  }
}

// Mock Context
class MockContext {
  constructor(commandName = 'test') {
    this.lines = [];
    this.commandName = commandName;
  }

  writeln(line) {
    this.lines.push(line);
  }

  getOutput() {
    return this.lines.join('\n');
  }
}

describe('test command', () => {
  let shell;
  let context;

  beforeEach(() => {
    shell = new MockShell();
    context = new MockContext();
  });

  describe('String Tests', () => {
    it('should return 0 for non-empty string', async () => {
      const exitCode = await test(['hello'], shell, context);
      expect(exitCode).to.equal(0);
      expect(shell.lastExitCode).to.equal(0);
    });

    it('should return 1 for empty string', async () => {
      const exitCode = await test([''], shell, context);
      expect(exitCode).to.equal(1);
      expect(shell.lastExitCode).to.equal(1);
    });

    it('should return 0 for -n with non-empty string', async () => {
      const exitCode = await test(['-n', 'hello'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 1 for -n with empty string', async () => {
      const exitCode = await test(['-n', ''], shell, context);
      expect(exitCode).to.equal(1);
    });

    it('should return 0 for -z with empty string', async () => {
      const exitCode = await test(['-z', ''], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 1 for -z with non-empty string', async () => {
      const exitCode = await test(['-z', 'hello'], shell, context);
      expect(exitCode).to.equal(1);
    });

    it('should return 0 for equal strings (=)', async () => {
      const exitCode = await test(['foo', '=', 'foo'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 1 for non-equal strings (=)', async () => {
      const exitCode = await test(['foo', '=', 'bar'], shell, context);
      expect(exitCode).to.equal(1);
    });

    it('should return 0 for non-equal strings (!=)', async () => {
      const exitCode = await test(['foo', '!=', 'bar'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 1 for equal strings (!=)', async () => {
      const exitCode = await test(['foo', '!=', 'foo'], shell, context);
      expect(exitCode).to.equal(1);
    });
  });

  describe('Numeric Tests', () => {
    it('should return 0 for equal numbers (-eq)', async () => {
      const exitCode = await test(['5', '-eq', '5'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 1 for non-equal numbers (-eq)', async () => {
      const exitCode = await test(['5', '-eq', '3'], shell, context);
      expect(exitCode).to.equal(1);
    });

    it('should return 0 for non-equal numbers (-ne)', async () => {
      const exitCode = await test(['5', '-ne', '3'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 0 for less-than (-lt)', async () => {
      const exitCode = await test(['3', '-lt', '5'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 1 for not less-than (-lt)', async () => {
      const exitCode = await test(['5', '-lt', '3'], shell, context);
      expect(exitCode).to.equal(1);
    });

    it('should return 0 for greater-than (-gt)', async () => {
      const exitCode = await test(['5', '-gt', '3'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 0 for less-than-or-equal (-le)', async () => {
      const exitCode = await test(['3', '-le', '5'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 0 for equal with -le', async () => {
      const exitCode = await test(['5', '-le', '5'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 0 for greater-than-or-equal (-ge)', async () => {
      const exitCode = await test(['5', '-ge', '3'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should return 0 for equal with -ge', async () => {
      const exitCode = await test(['5', '-ge', '5'], shell, context);
      expect(exitCode).to.equal(0);
    });
  });

  describe('Logical Operators', () => {
    it('should negate true expression', async () => {
      const exitCode = await test(['!', 'hello'], shell, context);
      expect(exitCode).to.equal(1); // 'hello' is true, ! makes it false
    });

    it('should negate false expression', async () => {
      const exitCode = await test(['!', ''], shell, context);
      expect(exitCode).to.equal(0); // '' is false, ! makes it true
    });

    it('should handle AND with both true', async () => {
      const exitCode = await test(['hello', '-a', 'world'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should handle AND with first false', async () => {
      const exitCode = await test(['', '-a', 'world'], shell, context);
      expect(exitCode).to.equal(1);
    });

    it('should handle OR with both true', async () => {
      const exitCode = await test(['hello', '-o', 'world'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should handle OR with first false', async () => {
      const exitCode = await test(['', '-o', 'world'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should handle OR with both false', async () => {
      const exitCode = await test(['', '-o', ''], shell, context);
      expect(exitCode).to.equal(1);
    });
  });

  describe('[ command syntax', () => {
    it('should require closing ]', async () => {
      const bracketContext = new MockContext('[');
      const exitCode = await test(['hello'], shell, bracketContext);
      expect(exitCode).to.equal(2); // Syntax error
      expect(bracketContext.getOutput()).to.include('missing ]');
    });

    it('should work with closing ]', async () => {
      const bracketContext = new MockContext('[');
      const exitCode = await test(['hello', ']'], shell, bracketContext);
      expect(exitCode).to.equal(0);
    });

    it('should evaluate expression between [ ]', async () => {
      const bracketContext = new MockContext('[');
      const exitCode = await test(['5', '-eq', '5', ']'], shell, bracketContext);
      expect(exitCode).to.equal(0);
    });
  });

  describe('Edge Cases', () => {
    it('should return 1 for empty expression', async () => {
      const exitCode = await test([], shell, context);
      expect(exitCode).to.equal(1);
    });

    it('should handle parentheses', async () => {
      const exitCode = await test(['(', 'hello', ')'], shell, context);
      expect(exitCode).to.equal(0);
    });

    it('should handle syntax errors gracefully', async () => {
      const exitCode = await test(['too', 'many', 'args', 'here'], shell, context);
      expect(exitCode).to.equal(2); // Syntax error
    });
  });
});
