/**
 * xterm-kit: Terminal Output Utilities
 * Colored output and formatting helpers
 *
 * Extracted from koma's command-utils.js with theme support added
 */

import { getTheme } from './themes.js';

/**
 * Display error message in terminal with consistent formatting
 * @param {object} term - xterm.js terminal instance
 * @param {string} commandOrMessage - Command name or error message
 * @param {string} [message] - Error message (if first arg is command name)
 * @param {object} [theme] - Theme override (uses global theme if not provided)
 *
 * @example
 * showError(term, 'ls', 'No such file or directory')
 * showError(term, 'Something went wrong')
 */
export function showError(term, commandOrMessage, message = null, theme = null) {
  const currentTheme = theme || getTheme();

  if (message === null) {
    // Single argument form: showError(term, 'error message')
    term.writeln(currentTheme.colors.error(commandOrMessage));
  } else {
    // Two argument form: showError(term, 'command', 'error message')
    term.writeln(currentTheme.colors.error(`${commandOrMessage}: ${message}`));
  }
}

/**
 * Display warning message in terminal
 * @param {object} term - xterm.js terminal instance
 * @param {string} message - Warning message
 * @param {object} [theme] - Theme override
 */
export function showWarning(term, message, theme = null) {
  const currentTheme = theme || getTheme();
  term.writeln(currentTheme.colors.warning(message));
}

/**
 * Display success message in terminal
 * @param {object} term - xterm.js terminal instance
 * @param {string} message - Success message
 * @param {object} [theme] - Theme override
 */
export function showSuccess(term, message, theme = null) {
  const currentTheme = theme || getTheme();
  term.writeln(currentTheme.colors.success(message));
}

/**
 * Display info message in terminal (gray/dimmed)
 * @param {object} term - xterm.js terminal instance
 * @param {string} message - Info message
 * @param {object} [theme] - Theme override
 */
export function showInfo(term, message, theme = null) {
  const currentTheme = theme || getTheme();
  term.writeln(currentTheme.colors.info(message));
}

/**
 * Display primary/highlighted message in terminal
 * @param {object} term - xterm.js terminal instance
 * @param {string} message - Primary message
 * @param {object} [theme] - Theme override
 */
export function showPrimary(term, message, theme = null) {
  const currentTheme = theme || getTheme();
  term.writeln(currentTheme.colors.primary(message));
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
 * Format date for display in terminal
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date
 *
 * @example
 * formatDate(new Date()) // 'Jan 10 14:30'
 * formatDate('2025-01-10') // 'Jan 10  2025'
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

/**
 * Wrap text at specified width
 * @param {string} text - Text to wrap
 * @param {number} width - Maximum line width
 * @returns {string[]} Array of wrapped lines
 */
export function wrapText(text, width = 80) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Pad string to specified width
 * @param {string} str - String to pad
 * @param {number} width - Desired width
 * @param {string} align - Alignment: 'left', 'right', or 'center'
 * @returns {string} Padded string
 */
export function pad(str, width, align = 'left') {
  const strLen = str.length;
  if (strLen >= width) return str;

  const padding = width - strLen;

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + str;
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
    default: // 'left'
      return str + ' '.repeat(padding);
  }
}

/**
 * Truncate string to specified width with ellipsis
 * @param {string} str - String to truncate
 * @param {number} width - Maximum width
 * @param {string} ellipsis - Ellipsis string (default: '...')
 * @returns {string} Truncated string
 */
export function truncate(str, width, ellipsis = '...') {
  if (str.length <= width) return str;
  return str.slice(0, width - ellipsis.length) + ellipsis;
}
