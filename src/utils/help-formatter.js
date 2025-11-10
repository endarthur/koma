/**
 * Help Formatter
 * Generates formatted help output from command registry
 */

import { commandRegistry } from './command-registry.js';

/**
 * Format and display help to terminal
 * @param {object} term - xterm.js terminal instance
 * @param {boolean} showCategories - Group by category (default: true)
 */
export function displayHelp(term, showCategories = true) {
  const COLORS = {
    green: '\x1b[32m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
  };

  term.writeln('Available commands:');
  term.writeln('');

  // Always show man first (most important)
  term.writeln(`  ${COLORS.green}man${COLORS.reset}        - Display manual pages ${COLORS.dim}(use \`man <command>\` for details)${COLORS.reset}`);
  term.writeln('');

  if (showCategories) {
    // Show commands grouped by category
    const byCategory = commandRegistry.getByCategory();

    // Define category order
    const categoryOrder = ['shell', 'filesystem', 'process', 'editor', 'other'];
    const categoryTitles = {
      shell: 'Shell Commands',
      filesystem: 'File System',
      process: 'Process Management',
      editor: 'Editor',
      other: 'Other',
    };

    for (const category of categoryOrder) {
      const commands = byCategory[category];
      if (!commands || commands.length === 0) continue;

      // Category header
      term.writeln(`${COLORS.bold}${categoryTitles[category]}:${COLORS.reset}`);

      // Commands in this category
      for (const cmd of commands) {
        const name = cmd.name.padEnd(10);
        term.writeln(`  ${COLORS.green}${name}${COLORS.reset} - ${cmd.description}`);
      }

      term.writeln('');
    }
  } else {
    // Simple alphabetical list
    const commands = commandRegistry.getCommands();
    commands.sort((a, b) => a.name.localeCompare(b.name));

    for (const cmd of commands) {
      const name = cmd.name.padEnd(10);
      term.writeln(`  ${COLORS.green}${name}${COLORS.reset} - ${cmd.description}`);
    }
    term.writeln('');
  }

  // Keyboard shortcuts (these don't change)
  term.writeln('Keyboard shortcuts:');
  term.writeln('  Ctrl+C   - Cancel current line');
  term.writeln('  Ctrl+L   - Clear screen');
  term.writeln('  Up/Down  - Navigate command history');
  term.writeln('');
  term.writeln('Command mode (Ctrl+K):');
  term.writeln('  Ctrl+K   - Enter command mode');
  term.writeln('  n        - Next tab');
  term.writeln('  p        - Previous tab');
  term.writeln('  t        - New tab');
  term.writeln('  w        - Close tab');
  term.writeln('  1-9      - Jump to tab N');
  term.writeln('  Esc      - Cancel command mode');
}
