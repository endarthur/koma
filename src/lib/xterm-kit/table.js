/**
 * xterm-kit: Table Formatter
 * Tabular data formatting for terminal output
 */

import { getTheme } from './themes.js';
import { pad, truncate } from './output.js';

/**
 * Table formatter for structured data display
 */
export class Table {
  /**
   * Create a table
   * @param {object} options - Configuration options
   * @param {string[]} options.columns - Column headers
   * @param {string[]} [options.align] - Column alignments ('left', 'right', 'center')
   * @param {number[]} [options.widths] - Column widths (auto if not specified)
   * @param {boolean} [options.header=true] - Show header row
   * @param {boolean} [options.borders=false] - Show borders between rows
   * @param {object} [options.theme] - Theme override
   */
  constructor(options = {}) {
    this.columns = options.columns || [];
    this.align = options.align || new Array(this.columns.length).fill('left');
    this.widths = options.widths || null; // Will be auto-calculated
    this.showHeader = options.header ?? true;
    this.showBorders = options.borders ?? false;
    this.theme = options.theme || getTheme();

    this.rows = [];
  }

  /**
   * Add a row to the table
   * @param {string[]|object} row - Row data (array or object with column names as keys)
   */
  addRow(row) {
    // Convert object to array if needed
    if (!Array.isArray(row)) {
      row = this.columns.map(col => row[col] || '');
    }

    this.rows.push(row.map(cell => String(cell)));
  }

  /**
   * Calculate column widths based on content
   */
  calculateWidths() {
    if (this.widths) return this.widths;

    const widths = this.columns.map(col => col.length);

    for (const row of this.rows) {
      row.forEach((cell, i) => {
        widths[i] = Math.max(widths[i], String(cell).length);
      });
    }

    return widths;
  }

  /**
   * Render table to terminal
   * @param {object} term - xterm.js Terminal instance
   */
  render(term) {
    const widths = this.calculateWidths();

    // Render header
    if (this.showHeader) {
      const headerRow = this.columns.map((col, i) => {
        const cell = pad(col, widths[i], this.align[i]);
        return this.theme.table.header(cell);
      }).join('  ');

      term.writeln(headerRow);

      // Header separator
      if (this.showBorders) {
        const separator = widths.map(w => '-'.repeat(w)).join('--');
        term.writeln(this.theme.table.border + separator + '\x1b[0m');
      }
    }

    // Render rows
    this.rows.forEach((row, rowIndex) => {
      const formattedRow = row.map((cell, i) => {
        return pad(cell, widths[i], this.align[i]);
      }).join('  ');

      term.writeln(formattedRow);

      // Row separator
      if (this.showBorders && rowIndex < this.rows.length - 1) {
        const separator = widths.map(w => '─'.repeat(w)).join('──');
        term.writeln(this.theme.table.border + separator + '\x1b[0m');
      }
    });
  }

  /**
   * Render table as lines (useful for piping)
   * @returns {string[]} Array of formatted lines
   */
  toLines() {
    const widths = this.calculateWidths();
    const lines = [];

    // Header
    if (this.showHeader) {
      const headerRow = this.columns.map((col, i) => {
        return pad(col, widths[i], this.align[i]);
      }).join('  ');

      lines.push(headerRow);

      // Header separator
      if (this.showBorders) {
        const separator = widths.map(w => '-'.repeat(w)).join('--');
        lines.push(separator);
      }
    }

    // Rows
    this.rows.forEach((row, rowIndex) => {
      const formattedRow = row.map((cell, i) => {
        return pad(cell, widths[i], this.align[i]);
      }).join('  ');

      lines.push(formattedRow);

      // Row separator
      if (this.showBorders && rowIndex < this.rows.length - 1) {
        const separator = widths.map(w => '─'.repeat(w)).join('──');
        lines.push(separator);
      }
    });

    return lines;
  }

  /**
   * Clear all rows (keeps columns)
   */
  clear() {
    this.rows = [];
  }
}

/**
 * Quick table rendering helper
 * @param {object} term - xterm.js Terminal instance
 * @param {object} options - Table options
 * @param {string[]} options.columns - Column headers
 * @param {Array<string[]|object>} options.rows - Row data
 * @param {string[]} [options.align] - Column alignments
 * @param {boolean} [options.borders=false] - Show borders
 * @param {object} [options.theme] - Theme override
 */
export function renderTable(term, options) {
  const table = new Table(options);

  for (const row of options.rows) {
    table.addRow(row);
  }

  table.render(term);
}
