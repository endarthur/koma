/**
 * Command Utilities
 * Shared helpers for command implementations
 */

import { kernelClient } from '../kernel/client.js';
import { createPathModule } from '../stdlib/path.js';

// Create path module for use in commands
const path = createPathModule();

/**
 * Resolve a path relative to current working directory
 * @param {string} inputPath - Path to resolve (can be absolute or relative)
 * @param {string} cwd - Current working directory
 * @param {string} [homeDir='/home'] - Home directory for tilde expansion
 * @returns {string} Absolute path
 *
 * @example
 * resolvePath('file.txt', '/home/user') // '/home/user/file.txt'
 * resolvePath('/etc/config', '/home/user') // '/etc/config'
 * resolvePath('../admin', '/home/user') // '/home/admin'
 * resolvePath('~/file.txt', '/tmp', '/home') // '/home/file.txt'
 */
export function resolvePath(inputPath, cwd, homeDir = '/home') {
  if (!inputPath) return cwd;

  // Handle tilde expansion
  if (inputPath === '~') {
    return homeDir;
  }
  if (inputPath.startsWith('~/')) {
    inputPath = path.join(homeDir, inputPath.slice(2));
  }

  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }

  return path.normalize(path.join(cwd, inputPath));
}

/**
 * Display error message in terminal with consistent formatting
 * @param {object} term - xterm.js terminal instance
 * @param {string} commandName - Name of the command that errored
 * @param {string} message - Error message
 *
 * @example
 * showError(shell.term, 'ls', 'No such file or directory')
 */
export function showError(term, commandName, message) {
  term.writeln(`\x1b[31m${commandName}: ${message}\x1b[0m`);
}

/**
 * Display warning message in terminal
 * @param {object} term - xterm.js terminal instance
 * @param {string} message - Warning message
 */
export function showWarning(term, message) {
  term.writeln(`\x1b[33m${message}\x1b[0m`);
}

/**
 * Display success message in terminal
 * @param {object} term - xterm.js terminal instance
 * @param {string} message - Success message
 */
export function showSuccess(term, message) {
  term.writeln(`\x1b[32m${message}\x1b[0m`);
}

/**
 * Display info message in terminal (gray)
 * @param {object} term - xterm.js terminal instance
 * @param {string} message - Info message
 */
export function showInfo(term, message) {
  term.writeln(`\x1b[90m${message}\x1b[0m`);
}

/**
 * Safely get kernel with error handling
 * @returns {Promise<object>} Kernel instance
 * @throws {Error} If kernel cannot be accessed
 */
export async function getKernel() {
  try {
    return await kernelClient.getKernel();
  } catch (error) {
    throw new Error(`Cannot access kernel: ${error.message}`);
  }
}

/**
 * Execute a kernel operation with timeout and consistent error handling
 * @param {Function} operation - Async operation to execute
 * @param {string} commandName - Name of command for error messages
 * @param {string} operationType - Type of operation (for timeout message)
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<*>} Result of the operation
 */
export async function withTimeout(operation, commandName, operationType = 'operation', timeout = 5000) {
  return Promise.race([
    operation,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${operationType} timed out after ${timeout}ms`)), timeout)
    )
  ]);
}

/**
 * Check if command arguments include help flag
 * @param {Array<string>} args - Command arguments
 * @returns {boolean} True if --help or -h is present
 */
export function hasHelpFlag(args) {
  return args.includes('--help') || args.includes('-h');
}

/**
 * Check if command arguments include a specific flag
 * @param {Array<string>} args - Command arguments
 * @param {string} flagName - Flag to check for (without dashes)
 * @param {string} [shortName] - Short flag name (single character)
 * @returns {boolean} True if flag is present
 *
 * @example
 * hasFlag(args, 'verbose', 'v') // checks for --verbose or -v
 */
export function hasFlag(args, flagName, shortName = null) {
  const hasLong = args.includes(`--${flagName}`);
  const hasShort = shortName && args.includes(`-${shortName}`);
  return hasLong || hasShort;
}

/**
 * Get value of an option from arguments
 * @param {Array<string>} args - Command arguments
 * @param {string} optionName - Option to get (without dashes)
 * @param {string} [shortName] - Short option name (single character)
 * @param {*} [defaultValue=null] - Default value if not found
 * @returns {*} Option value or default
 *
 * @example
 * getOption(args, 'output', 'o', 'default.txt')
 * // Matches: --output=file.txt, --output file.txt, -o file.txt
 */
export function getOption(args, optionName, shortName = null, defaultValue = null) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Check --option=value
    if (arg.startsWith(`--${optionName}=`)) {
      return arg.slice((`--${optionName}=`).length);
    }

    // Check --option value
    if (arg === `--${optionName}` && i + 1 < args.length) {
      return args[i + 1];
    }

    // Check -o value
    if (shortName && arg === `-${shortName}` && i + 1 < args.length) {
      return args[i + 1];
    }
  }

  return defaultValue;
}

/**
 * Get positional arguments (non-flag arguments)
 * @param {Array<string>} args - Command arguments
 * @returns {Array<string>} Positional arguments
 *
 * @example
 * getPositionalArgs(['file.txt', '--verbose', 'output.txt'])
 * // Returns: ['file.txt', 'output.txt']
 */
export function getPositionalArgs(args) {
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Skip flags and options
    if (arg.startsWith('-')) {
      // If it's an option with separate value, skip the value too
      if (arg.startsWith('--') && !arg.includes('=') && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        i++; // Skip next arg (the value)
      }
      continue;
    }

    // Check if this is a value for a previous option
    if (i > 0 && args[i - 1].startsWith('-') && !args[i - 1].includes('=')) {
      continue;
    }

    positional.push(arg);
  }

  return positional;
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Human-readable size
 *
 * @example
 * formatSize(1024) // '1.0K'
 * formatSize(1536) // '1.5K'
 * formatSize(1048576) // '1.0M'
 */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;
}

/**
 * Format date for display
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date
 *
 * @example
 * formatDate(new Date()) // 'Jan 10 14:30'
 */
export function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // If same year, show month and day with time
  if (date.getFullYear() === now.getFullYear()) {
    const month = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, ' ');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day} ${hours}:${minutes}`;
  }

  // Different year, show year instead of time
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, ' ');
  const year = date.getFullYear();
  return `${month} ${day}  ${year}`;
}

/**
 * Format permissions for display (Unix-style)
 * @param {string} type - 'file' or 'directory'
 * @param {boolean} [writable=true] - Whether writable
 * @returns {string} Permission string (e.g., 'drwxr-xr-x')
 */
export function formatPermissions(type, writable = true) {
  const typeChar = type === 'directory' ? 'd' : '-';
  const writePerms = writable ? 'w' : '-';
  return `${typeChar}rw${writePerms}r--r--`;
}

// Re-export path utilities for commands to use
export { path };
