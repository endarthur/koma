/**
 * Shell Parser Unit Tests
 * Tests for command parsing, tokenization, and pipeline parsing
 */

import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { Shell } from '../../../src/shell.js';

// Mock terminal for testing
const mockTerm = {
  write: () => {},
  writeln: () => {},
};

// ============================================================================
// Basic Command Parsing
// ============================================================================

test('parseCommand: simple command with no arguments', () => {
  const shell = new Shell(mockTerm);
  const parsed = shell.parseCommand('ls');

  assert.is(parsed.command, 'ls');
  assert.equal(parsed.args, []);
});

test('parseCommand: command with arguments', () => {
  const shell = new Shell(mockTerm);
  const parsed = shell.parseCommand('ls -l /home');

  assert.is(parsed.command, 'ls');
  assert.equal(parsed.args, ['-l', '/home']);
});

test('parseCommand: command with multiple spaces', () => {
  const shell = new Shell(mockTerm);
  const parsed = shell.parseCommand('echo   hello    world');

  assert.is(parsed.command, 'echo');
  assert.equal(parsed.args, ['hello', 'world']);
});

// ============================================================================
// Tokenization Tests
// ============================================================================

test('tokenize: basic tokens', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('cat file.txt');

  assert.equal(tokens, ['cat', 'file.txt']);
});

test('tokenize: double quoted string', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('echo "hello world"');

  assert.equal(tokens, ['echo', 'hello world']);
});

test('tokenize: single quoted string', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize("echo 'hello world'");

  assert.equal(tokens, ['echo', 'hello world']);
});

test('tokenize: mixed quotes', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('echo "hello" world "foo bar"');

  assert.equal(tokens, ['echo', 'hello', 'world', 'foo bar']);
});

test('tokenize: pipe operator', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('cat file.txt | grep foo');

  assert.equal(tokens, ['cat', 'file.txt', '|', 'grep', 'foo']);
});

test('tokenize: output redirect', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('ls > output.txt');

  assert.equal(tokens, ['ls', '>', 'output.txt']);
});

test('tokenize: append redirect', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('echo text >> log.txt');

  assert.equal(tokens, ['echo', 'text', '>>', 'log.txt']);
});

test('tokenize: input redirect', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('sort < input.txt');

  assert.equal(tokens, ['sort', '<', 'input.txt']);
});

test('tokenize: quoted pipe (should not split)', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('grep "foo | bar" file.txt');

  assert.equal(tokens, ['grep', 'foo | bar', 'file.txt']);
});

test('tokenize: quoted redirect (should not split)', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('echo "file > output" test.txt');

  assert.equal(tokens, ['echo', 'file > output', 'test.txt']);
});

test('tokenize: complex pipeline', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('cat file.txt | grep "hello world" | sort -r');

  assert.equal(tokens, [
    'cat', 'file.txt', '|',
    'grep', 'hello world', '|',
    'sort', '-r'
  ]);
});

// ============================================================================
// Pipeline Parsing Tests
// ============================================================================

test('parsePipeline: simple command (no pipeline)', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('ls -l');

  assert.is(pipeline.stages.length, 1);
  assert.is(pipeline.stages[0].command, 'ls');
  assert.equal(pipeline.stages[0].args, ['-l']);
  assert.is(pipeline.isPipeline, false);
  assert.is(pipeline.inputFile, null);
  assert.is(pipeline.outputFile, null);
});

test('parsePipeline: two-stage pipeline', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('cat file.txt | grep foo');

  assert.is(pipeline.stages.length, 2);
  assert.is(pipeline.stages[0].command, 'cat');
  assert.equal(pipeline.stages[0].args, ['file.txt']);
  assert.is(pipeline.stages[1].command, 'grep');
  assert.equal(pipeline.stages[1].args, ['foo']);
  assert.is(pipeline.isPipeline, true);
});

test('parsePipeline: three-stage pipeline', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('cat file.txt | grep foo | sort');

  assert.is(pipeline.stages.length, 3);
  assert.is(pipeline.stages[2].command, 'sort');
  assert.equal(pipeline.stages[2].args, []);
});

test('parsePipeline: output redirection', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('ls > output.txt');

  assert.is(pipeline.stages.length, 1);
  assert.is(pipeline.outputFile, 'output.txt');
  assert.is(pipeline.outputMode, 'write');
  assert.is(pipeline.isPipeline, true);
});

test('parsePipeline: append redirection', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('echo text >> log.txt');

  assert.is(pipeline.outputFile, 'log.txt');
  assert.is(pipeline.outputMode, 'append');
});

test('parsePipeline: input redirection', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('sort < input.txt');

  assert.is(pipeline.stages.length, 1);
  assert.is(pipeline.inputFile, 'input.txt');
  assert.is(pipeline.isPipeline, true);
});

test('parsePipeline: pipeline with output redirect', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('cat file.txt | grep foo > result.txt');

  assert.is(pipeline.stages.length, 2);
  assert.is(pipeline.outputFile, 'result.txt');
  assert.is(pipeline.outputMode, 'write');
});

test('parsePipeline: input and output redirect', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('sort < input.txt > output.txt');

  assert.is(pipeline.stages.length, 1);
  assert.is(pipeline.inputFile, 'input.txt');
  assert.is(pipeline.outputFile, 'output.txt');
});

// ============================================================================
// Semicolon Separator Tests
// ============================================================================

test('splitBySemicolon: single command', () => {
  const shell = new Shell(mockTerm);
  const segments = shell.splitBySemicolon('ls -l');

  assert.equal(segments, ['ls -l']);
});

test('splitBySemicolon: two commands', () => {
  const shell = new Shell(mockTerm);
  const segments = shell.splitBySemicolon('cd /home ; ls');

  assert.equal(segments, ['cd /home', 'ls']);
});

test('splitBySemicolon: three commands', () => {
  const shell = new Shell(mockTerm);
  const segments = shell.splitBySemicolon('mkdir test ; cd test ; pwd');

  assert.equal(segments, ['mkdir test', 'cd test', 'pwd']);
});

test('splitBySemicolon: quoted semicolon (should not split)', () => {
  const shell = new Shell(mockTerm);
  const segments = shell.splitBySemicolon('echo "foo ; bar" ; ls');

  assert.equal(segments, ['echo "foo ; bar"', 'ls']);
});

test('splitBySemicolon: multiple semicolons', () => {
  const shell = new Shell(mockTerm);
  const segments = shell.splitBySemicolon('echo a ; echo b ; echo c');

  assert.equal(segments, ['echo a', 'echo b', 'echo c']);
});

test('splitBySemicolon: with extra spaces', () => {
  const shell = new Shell(mockTerm);
  const segments = shell.splitBySemicolon('cd /home  ;  ls  ;  pwd');

  assert.equal(segments, ['cd /home', 'ls', 'pwd']);
});

test('splitBySemicolon: empty segments ignored', () => {
  const shell = new Shell(mockTerm);
  const segments = shell.splitBySemicolon('ls ; ; pwd');

  assert.equal(segments, ['ls', 'pwd']);
});

// ============================================================================
// Edge Cases
// ============================================================================

test('tokenize: empty string', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('');

  assert.equal(tokens, []);
});

test('tokenize: only spaces', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('   ');

  assert.equal(tokens, []);
});

test('tokenize: unclosed quote (edge case)', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('echo "hello');

  // Depending on implementation, may include unclosed quote
  // This documents current behavior
  assert.ok(tokens.length > 0);
});

test('parsePipeline: multiple redirects of same type (last wins)', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('ls > file1.txt > file2.txt');

  // Last redirect should win
  assert.is(pipeline.outputFile, 'file2.txt');
});

// Run all tests
test.run();
