/**
 * Integration tests for Schist interactive REPL
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Schist Interactive Mode', () => {
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
    if (cleanup) {
      await cleanup();
    }
  });

  it('should start REPL with schist -i', async () => {
    await shell.execute('schist -i');

    // Should show REPL header
    const output = term.getOutput();
    expect(output).to.include('Schist REPL');
    expect(output).to.include('Type expressions to evaluate');
  });

  // Note: Interactive testing with schist -i is complex because it requires
  // simulating interactive input. For now, we test non-interactive mode.

  it('should execute Schist expressions with -e flag', async () => {
    await shell.execute('schist -e "(+ 1 2 3)"');

    const output = term.getOutput();
    expect(output).to.include('6');
  });

  it('should evaluate lambda expressions', async () => {
    await shell.execute('schist -e "((lambda (x) (* x x)) 5)"');

    const output = term.getOutput();
    expect(output).to.include('25');
  });

  it('should handle list operations', async () => {
    await shell.execute('schist -e "(car (list 1 2 3))"');

    const output = term.getOutput();
    expect(output).to.include('1');
  });

  it('should support arithmetic', async () => {
    await shell.execute('schist -e "(- 10 3 2)"');

    const output = term.getOutput();
    expect(output).to.include('5');
  });

  it('should handle nested expressions', async () => {
    await shell.execute('schist -e "(+ (* 2 3) (- 10 5))"');

    const output = term.getOutput();
    expect(output).to.include('11');
  });

  it('should have access to shell context (the bug we fixed)', async () => {
    // This should not throw an error about readLine
    // Even though we're not actually using readLine in -e mode,
    // the context should have shell instance available
    await shell.execute('schist -e "(+ 1 2)"');

    const output = term.getOutput();
    // Should show result, not error about readLine or context
    expect(output).to.not.include('readLine not available');
    expect(output).to.not.include('not available in piped/redirected context');
    expect(output).to.include('3');
  });
});
