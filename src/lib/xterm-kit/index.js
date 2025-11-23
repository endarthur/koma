/**
 * xterm-kit
 * Terminal utilities for xterm.js applications
 *
 * A comprehensive toolkit for building shell-like applications in the browser.
 * Includes argument parsing, VFS, paging, progress indicators, and more.
 *
 * @version 1.0.0
 * @license MIT
 */

// Argument parsing
export * from './argparse.js';

// Output formatting
export * from './output.js';

// Command parsing
export * from './parser.js';

// Theming
export * from './themes.js';

// Interactive pager
export { Pager } from './pager.js';

// Status indicators
export { StatusIndicators } from './indicators.js';

// Virtual filesystem
export { VFSLite } from './vfs-lite.js';

// Progress indicators
export { Spinner, ProgressBar, StepProgress } from './progress.js';

// Table formatting
export { Table, renderTable } from './table.js';

// Box drawing
export { Box, renderBox, drawSeparator } from './box.js';

// Key handling
export { KeyHandler, LineEditor, KEYS } from './keys.js';
