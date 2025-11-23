/**
 * xterm-kit: Box Drawing
 * Borders and panels for terminal UI
 */

import { getTheme } from './themes.js';
import { wrapText } from './output.js';

/**
 * Box drawing characters for different styles
 */
const BOX_STYLES = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    topJoin: '┬',
    bottomJoin: '┴',
    leftJoin: '├',
    rightJoin: '┤',
    cross: '┼',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    topJoin: '╦',
    bottomJoin: '╩',
    leftJoin: '╠',
    rightJoin: '╣',
    cross: '╬',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    topJoin: '┬',
    bottomJoin: '┴',
    leftJoin: '├',
    rightJoin: '┤',
    cross: '┼',
  },
  heavy: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
    topJoin: '┳',
    bottomJoin: '┻',
    leftJoin: '┣',
    rightJoin: '┫',
    cross: '╋',
  },
  ascii: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    horizontal: '-',
    vertical: '|',
    topJoin: '+',
    bottomJoin: '+',
    leftJoin: '+',
    rightJoin: '+',
    cross: '+',
  }
};

/**
 * Box drawer for creating bordered panels
 */
export class Box {
  /**
   * Create a box
   * @param {object} options - Configuration options
   * @param {string} [options.style='single'] - Box style: 'single', 'double', 'rounded', 'heavy', 'ascii'
   * @param {string} [options.title] - Box title
   * @param {number} [options.width=60] - Box width
   * @param {number} [options.padding=1] - Inner padding
   * @param {object} [options.theme] - Theme override
   */
  constructor(options = {}) {
    this.style = BOX_STYLES[options.style || 'single'];
    this.title = options.title || null;
    this.width = options.width || 60;
    this.padding = options.padding ?? 1;
    this.theme = options.theme || getTheme();

    this.lines = [];
  }

  /**
   * Add content line(s)
   * @param {string|string[]} content - Content to add
   */
  add(content) {
    if (Array.isArray(content)) {
      this.lines.push(...content);
    } else {
      // Wrap text to fit inside box
      const maxWidth = this.width - (this.padding * 2) - 2; // 2 for borders
      const wrapped = wrapText(content, maxWidth);
      this.lines.push(...wrapped);
    }
  }

  /**
   * Render box to terminal
   * @param {object} term - xterm.js Terminal instance
   */
  render(term) {
    const borderColor = this.theme.box.border;
    const titleColor = this.theme.box.title;
    const reset = '\x1b[0m';

    // Top border
    if (this.title) {
      const titleText = ` ${this.title} `;
      const remainingWidth = this.width - titleText.length - 2;
      const leftWidth = Math.floor(remainingWidth / 2);
      const rightWidth = remainingWidth - leftWidth;

      term.writeln(
        borderColor + this.style.topLeft +
        this.style.horizontal.repeat(leftWidth) +
        reset + titleColor(titleText) + borderColor +
        this.style.horizontal.repeat(rightWidth) +
        this.style.topRight + reset
      );
    } else {
      term.writeln(
        borderColor + this.style.topLeft +
        this.style.horizontal.repeat(this.width - 2) +
        this.style.topRight + reset
      );
    }

    // Top padding
    for (let i = 0; i < this.padding; i++) {
      term.writeln(
        borderColor + this.style.vertical + reset +
        ' '.repeat(this.width - 2) +
        borderColor + this.style.vertical + reset
      );
    }

    // Content lines
    const contentWidth = this.width - (this.padding * 2) - 2;
    for (const line of this.lines) {
      const paddedLine = line.padEnd(contentWidth);
      term.writeln(
        borderColor + this.style.vertical + reset +
        ' '.repeat(this.padding) +
        paddedLine +
        ' '.repeat(this.padding) +
        borderColor + this.style.vertical + reset
      );
    }

    // Bottom padding
    for (let i = 0; i < this.padding; i++) {
      term.writeln(
        borderColor + this.style.vertical + reset +
        ' '.repeat(this.width - 2) +
        borderColor + this.style.vertical + reset
      );
    }

    // Bottom border
    term.writeln(
      borderColor + this.style.bottomLeft +
      this.style.horizontal.repeat(this.width - 2) +
      this.style.bottomRight + reset
    );
  }

  /**
   * Render as lines (useful for including in other output)
   * @returns {string[]} Array of box lines
   */
  toLines() {
    const lines = [];
    const borderColor = this.theme.box.border;
    const titleColor = this.theme.box.title;
    const reset = '\x1b[0m';

    // Top border
    if (this.title) {
      const titleText = ` ${this.title} `;
      const remainingWidth = this.width - titleText.length - 2;
      const leftWidth = Math.floor(remainingWidth / 2);
      const rightWidth = remainingWidth - leftWidth;

      lines.push(
        borderColor + this.style.topLeft +
        this.style.horizontal.repeat(leftWidth) +
        reset + titleColor(titleText) + borderColor +
        this.style.horizontal.repeat(rightWidth) +
        this.style.topRight + reset
      );
    } else {
      lines.push(
        borderColor + this.style.topLeft +
        this.style.horizontal.repeat(this.width - 2) +
        this.style.topRight + reset
      );
    }

    // Top padding
    for (let i = 0; i < this.padding; i++) {
      lines.push(
        borderColor + this.style.vertical + reset +
        ' '.repeat(this.width - 2) +
        borderColor + this.style.vertical + reset
      );
    }

    // Content
    const contentWidth = this.width - (this.padding * 2) - 2;
    for (const line of this.lines) {
      const paddedLine = line.padEnd(contentWidth);
      lines.push(
        borderColor + this.style.vertical + reset +
        ' '.repeat(this.padding) +
        paddedLine +
        ' '.repeat(this.padding) +
        borderColor + this.style.vertical + reset
      );
    }

    // Bottom padding
    for (let i = 0; i < this.padding; i++) {
      lines.push(
        borderColor + this.style.vertical + reset +
        ' '.repeat(this.width - 2) +
        borderColor + this.style.vertical + reset
      );
    }

    // Bottom border
    lines.push(
      borderColor + this.style.bottomLeft +
      this.style.horizontal.repeat(this.width - 2) +
      this.style.bottomRight + reset
    );

    return lines;
  }

  /**
   * Clear content
   */
  clear() {
    this.lines = [];
  }
}

/**
 * Quick box rendering helper
 * @param {object} term - xterm.js Terminal instance
 * @param {object} options - Box options
 * @param {string} options.content - Box content
 * @param {string} [options.title] - Box title
 * @param {string} [options.style='single'] - Box style
 * @param {number} [options.width=60] - Box width
 * @param {object} [options.theme] - Theme override
 */
export function renderBox(term, options) {
  const box = new Box(options);
  box.add(options.content);
  box.render(term);
}

/**
 * Draw a horizontal separator line
 * @param {object} term - xterm.js Terminal instance
 * @param {number} [width=80] - Line width
 * @param {string} [char='─'] - Character to use
 * @param {object} [theme] - Theme override
 */
export function drawSeparator(term, width = 80, char = '─', theme = null) {
  const currentTheme = theme || getTheme();
  const borderColor = currentTheme.box.border;
  const reset = '\x1b[0m';

  term.writeln(borderColor + char.repeat(width) + reset);
}
