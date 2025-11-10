/**
 * Shell Test Helper
 * Utilities for testing shell execution and commands
 */

import { Shell } from '../../src/shell.js';

/**
 * Create a mock terminal that captures output
 * @returns {object} Mock terminal with output capture
 */
export function createMockTerminal() {
  const output = [];
  const writes = [];

  return {
    output,
    writes,

    write(text) {
      writes.push(text);
    },

    writeln(text) {
      output.push(text);
    },

    getOutput() {
      return output.join('\n');
    },

    getOutputLines() {
      return [...output];
    },

    getWrites() {
      return writes.join('');
    },

    clear() {
      output.length = 0;
      writes.length = 0;
    },

    reset() {
      output.length = 0;
      writes.length = 0;
    }
  };
}

/**
 * Create a mock shell with output capture
 * Automatically registers all commands
 *
 * @returns {Promise<object>} Shell instance and helpers
 */
export async function createMockShell() {
  const term = createMockTerminal();
  const shell = new Shell(term);

  // Register all commands
  try {
    const { registerBuiltins } = await import('../../src/commands/index.js');
    registerBuiltins(shell);
  } catch (error) {
    console.warn('[Test] Could not register commands:', error.message);
  }

  return {
    shell,
    term,
    output: term.output,

    /**
     * Execute command and return output
     */
    async exec(command) {
      term.clear();
      await shell.execute(command);
      return term.getOutput();
    },

    /**
     * Execute command and check for expected output
     */
    async expectOutput(command, expectedSubstring) {
      const output = await this.exec(command);
      if (!output.includes(expectedSubstring)) {
        throw new Error(
          `Expected output to include "${expectedSubstring}"\n` +
          `Got: ${output}`
        );
      }
      return output;
    },

    /**
     * Execute command and check it doesn't include output
     */
    async expectNoOutput(command, unexpectedSubstring) {
      const output = await this.exec(command);
      if (output.includes(unexpectedSubstring)) {
        throw new Error(
          `Expected output NOT to include "${unexpectedSubstring}"\n` +
          `Got: ${output}`
        );
      }
      return output;
    },

    /**
     * Get shell state
     */
    getState() {
      return {
        cwd: shell.cwd,
        env: { ...shell.env },
        historyLength: shell.history.length
      };
    },

    /**
     * Reset shell state
     */
    reset() {
      term.clear();
      shell.cwd = '/home';
      shell.history = [];
      shell.historyIndex = -1;
    }
  };
}

/**
 * Create a minimal command context for testing
 * @param {object} options - Context options
 * @returns {object} CommandContext instance
 */
export async function createTestContext(options = {}) {
  const { CommandContext } = await import('../../src/utils/command-context.js');

  const mockTerm = createMockTerminal();

  return new CommandContext({
    term: mockTerm,
    stdin: options.stdin || '',
    isPiped: options.isPiped || false,
    isRedirected: options.isRedirected || false
  });
}

/**
 * Parse shell arguments for testing
 * @param {string} argString - Argument string (e.g., '-l --verbose file.txt')
 * @returns {string[]} Array of arguments
 */
export function parseTestArgs(argString) {
  // Simple split for now, can be enhanced
  return argString.trim().split(/\s+/).filter(Boolean);
}

/**
 * Assert command output contains expected text
 * @param {string} output - Command output
 * @param {string} expected - Expected substring
 * @throws {Error} If output doesn't contain expected text
 */
export function assertOutputContains(output, expected) {
  if (!output.includes(expected)) {
    throw new Error(
      `Output does not contain expected text\n` +
      `Expected: ${expected}\n` +
      `Got: ${output}`
    );
  }
}

/**
 * Assert command output matches regex
 * @param {string} output - Command output
 * @param {RegExp} regex - Regular expression
 * @throws {Error} If output doesn't match regex
 */
export function assertOutputMatches(output, regex) {
  if (!regex.test(output)) {
    throw new Error(
      `Output does not match regex\n` +
      `Regex: ${regex}\n` +
      `Got: ${output}`
    );
  }
}

/**
 * Assert command was successful (no error output)
 * @param {string} output - Command output
 * @throws {Error} If output contains error indicators
 */
export function assertSuccess(output) {
  const errorIndicators = ['error:', 'Error:', 'failed', 'not found'];

  for (const indicator of errorIndicators) {
    if (output.toLowerCase().includes(indicator.toLowerCase())) {
      throw new Error(
        `Command appears to have failed\n` +
        `Found error indicator: "${indicator}"\n` +
        `Output: ${output}`
      );
    }
  }
}

/**
 * Assert command failed (contains error output)
 * @param {string} output - Command output
 * @throws {Error} If output doesn't contain error indicators
 */
export function assertFailure(output) {
  const errorIndicators = ['error:', 'Error:', 'failed', 'not found'];

  const hasError = errorIndicators.some(indicator =>
    output.toLowerCase().includes(indicator.toLowerCase())
  );

  if (!hasError) {
    throw new Error(
      `Expected command to fail but it appears to have succeeded\n` +
      `Output: ${output}`
    );
  }
}

/**
 * Wait for async operation with timeout
 * @param {Promise} promise - Promise to wait for
 * @param {number} timeout - Timeout in ms
 * @returns {Promise} Resolved promise or timeout error
 */
export function withTimeout(promise, timeout = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Test timeout')), timeout)
    )
  ]);
}
