/**
 * Koma Built-in Commands
 * Main entry point for command registration
 */

import { registerFilesystemCommands } from './filesystem.js';
import { registerShellCommands } from './shell.js';

export function registerBuiltins(shell, tabManager = null, editor = null) {
  registerFilesystemCommands(shell, editor);
  registerShellCommands(shell, tabManager);
}
