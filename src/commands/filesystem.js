/**
 * Koma Filesystem Commands
 */

import { kernelClient } from '../kernel/client.js';
import { activityLED } from '../ui/activity-led.js';
import {
  resolvePath,
  showError,
  showSuccess,
  showInfo,
  hasHelpFlag,
  formatSize,
  formatDate,
  formatPermissions,
  path
} from '../utils/command-utils.js';
import { createArgsModule } from '../stdlib/args.js';

// Create argparse instance for commands
const argparse = createArgsModule();

/**
 * Wrap a kernel operation with timeout detection and activity LED
 * @param {Promise} promise - The async operation
 * @param {string} operation - Operation name for error messages
 * @param {string} activityType - 'read' or 'write' for LED indication
 * @param {number} timeoutMs - Timeout in milliseconds
 */
async function withTimeout(promise, operation, activityType = 'read', timeoutMs = 5000) {
  try {
    // Show activity LED
    if (activityType === 'read') {
      activityLED.reading();
    } else if (activityType === 'write') {
      activityLED.writing();
    }

    const result = await Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms - Olivine kernel may be unresponsive`)), timeoutMs)
      )
    ]);

    activityLED.idle();
    return result;
  } catch (error) {
    activityLED.error();
    throw error;
  }
}

export function registerFilesystemCommands(shell, editor = null) {
  // Change directory
  shell.registerCommand('cd', async (args, shell) => {
    const schema = {
      description: 'Change the current working directory',
      positional: { description: '[directory]' },
      examples: [
        { command: 'cd /home', description: 'Change to /home' },
        { command: 'cd ..', description: 'Go to parent directory' },
        { command: 'cd ~', description: 'Go to home directory' },
        { command: 'cd', description: 'Go to home directory' }
      ]
    };

    if (argparse.showHelp('cd', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);
    const inputPath = parsed.positional[0] || '~';

    try {
      const kernel = await kernelClient.getKernel();

      // Resolve the target path
      let targetPath;
      if (!inputPath || inputPath === '~') {
        targetPath = shell.env.HOME;
      } else {
        targetPath = resolvePath(inputPath, shell.cwd);
      }

      // Check if path exists and is a directory
      const stat = await kernel.stat(targetPath);
      if (stat.type !== 'directory') {
        showError(shell.term, 'cd', `not a directory: ${inputPath}`);
        return;
      }

      // Update current directory
      shell.cwd = targetPath;
    } catch (error) {
      showError(shell.term, 'cd', error.message);
    }
  }, {
    description: 'Change working directory',
    category: 'filesystem'
  });

  // List directory
  shell.registerCommand('ls', async (args, shell) => {
    const schema = {
      description: 'List directory contents',
      flags: {
        long: { short: 'l', description: 'Long format with details' },
        all: { short: 'a', description: 'Show all files (including hidden)' }
      },
      positional: { description: '[path]' },
      examples: [
        { command: 'ls', description: 'List current directory' },
        { command: 'ls -l', description: 'Detailed listing' },
        { command: 'ls -la', description: 'Detailed listing with all files' },
        { command: 'ls /home', description: 'List /home directory' }
      ]
    };

    if (argparse.showHelp('ls', args, schema, shell.term)) return;

    try {
      const kernel = await kernelClient.getKernel();
      const parsed = argparse.parse(args, schema);

      // Show errors if any
      if (parsed.errors.length > 0) {
        parsed.errors.forEach(err => showError(shell.term, 'ls', err));
        return;
      }

      // Default to current directory if no path specified
      const targetPath = parsed.positional.length > 0
        ? resolvePath(parsed.positional[0], shell.cwd)
        : shell.cwd;

      const entries = await withTimeout(kernel.readdir(targetPath), 'ls');

      if (entries.length === 0) {
        shell.term.writeln('');
        return;
      }

      if (parsed.flags.long) {
        // Long format
        for (const entry of entries) {
          const perms = entry.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--';
          const size = (entry.size || 0).toString().padStart(8);
          const date = new Date(entry.modified).toISOString().slice(0, 16).replace('T', ' ');
          const name = entry.type === 'directory' ? `\x1b[34m${entry.name}\x1b[0m` : entry.name;
          shell.term.writeln(`${perms}  1 koma koma ${size} ${date} ${name}`);
        }
      } else {
        // Simple format
        const names = entries.map(entry => {
          return entry.type === 'directory'
            ? `\x1b[34m${entry.name}\x1b[0m`  // Blue for directories
            : entry.name;
        });
        shell.term.writeln(names.join('  '));
      }
    } catch (error) {
      showError(shell.term, 'ls', error.message);
    }
  }, {
    description: 'List directory contents',
    category: 'filesystem'
  });

  // Display file contents
  shell.registerCommand('cat', async (args, shell) => {
    const schema = {
      description: 'Display file contents',
      positional: { description: '<file>' },
      examples: [
        { command: 'cat file.txt', description: 'Display file.txt' },
        { command: 'cat /home/test.js', description: 'Display test.js' }
      ]
    };

    if (argparse.showHelp('cat', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'cat', 'missing file operand');
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const filePath = resolvePath(parsed.positional[0], shell.cwd);
      const content = await withTimeout(kernel.readFile(filePath), 'cat', 'read');

      // Split by newlines and write each line separately
      // This handles embedded newlines properly in xterm
      const lines = content.split('\n');
      lines.forEach(line => shell.term.writeln(line));
    } catch (error) {
      showError(shell.term, 'cat', error.message);
    }
  }, {
    description: 'Display file contents',
    category: 'filesystem'
  });

  // Create directory
  shell.registerCommand('mkdir', async (args, shell) => {
    const schema = {
      description: 'Create a new directory',
      positional: { description: '<directory>' },
      examples: [
        { command: 'mkdir foo', description: 'Create directory foo' },
        { command: 'mkdir /home/test', description: 'Create /home/test' }
      ]
    };

    if (argparse.showHelp('mkdir', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'mkdir', 'missing operand');
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const dirPath = resolvePath(parsed.positional[0], shell.cwd);
      await withTimeout(kernel.mkdir(dirPath), 'mkdir', 'write');
    } catch (error) {
      showError(shell.term, 'mkdir', error.message);
    }
  }, {
    description: 'Create new directory',
    category: 'filesystem'
  });

  // Create empty file
  shell.registerCommand('touch', async (args, shell) => {
    const schema = {
      description: 'Create an empty file or update timestamp',
      positional: { description: '<file>' },
      examples: [
        { command: 'touch file.txt', description: 'Create empty file.txt' },
        { command: 'touch test.js', description: 'Create empty test.js' }
      ]
    };

    if (argparse.showHelp('touch', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'touch', 'missing file operand');
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const filePath = resolvePath(parsed.positional[0], shell.cwd);
      await withTimeout(kernel.writeFile(filePath, ''), 'touch', 'write');
    } catch (error) {
      showError(shell.term, 'touch', error.message);
    }
  }, {
    description: 'Create empty file or update timestamp',
    category: 'filesystem'
  });

  // Remove file or directory
  shell.registerCommand('rm', async (args, shell) => {
    const schema = {
      description: 'Remove files or empty directories',
      positional: { description: '<file|directory>' },
      examples: [
        { command: 'rm file.txt', description: 'Remove file.txt' },
        { command: 'rm test/', description: 'Remove empty directory' }
      ]
    };

    if (argparse.showHelp('rm', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'rm', 'missing operand');
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const targetPath = resolvePath(parsed.positional[0], shell.cwd);
      await withTimeout(kernel.unlink(targetPath), 'rm', 'write');
    } catch (error) {
      showError(shell.term, 'rm', error.message);
    }
  }, {
    description: 'Remove file or directory',
    category: 'filesystem'
  });

  // Copy file
  shell.registerCommand('cp', async (args, shell) => {
    const schema = {
      description: 'Copy files',
      positional: { description: '<source> <destination>' },
      examples: [
        { command: 'cp file.txt copy.txt', description: 'Copy file.txt to copy.txt' },
        { command: 'cp test.js /home/', description: 'Copy test.js to /home/' }
      ]
    };

    if (argparse.showHelp('cp', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length < 2) {
      showError(shell.term, 'cp', 'missing file operand');
      shell.term.writeln('Usage: cp SOURCE DEST');
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const srcPath = resolvePath(parsed.positional[0], shell.cwd);
      const destPath = resolvePath(parsed.positional[1], shell.cwd);
      await kernel.copyFile(srcPath, destPath);
    } catch (error) {
      showError(shell.term, 'cp', error.message);
    }
  }, {
    description: 'Copy files',
    category: 'filesystem'
  });

  // Move/rename file or directory
  shell.registerCommand('mv', async (args, shell) => {
    const schema = {
      description: 'Move or rename files and directories',
      positional: { description: '<source> <destination>' },
      examples: [
        { command: 'mv old.txt new.txt', description: 'Rename old.txt to new.txt' },
        { command: 'mv file.txt /home/', description: 'Move file.txt to /home/' },
        { command: 'mv foo/ bar/', description: 'Rename directory' }
      ]
    };

    if (argparse.showHelp('mv', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length < 2) {
      showError(shell.term, 'mv', 'missing file operand');
      shell.term.writeln('Usage: mv SOURCE DEST');
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const srcPath = resolvePath(parsed.positional[0], shell.cwd);
      const destPath = resolvePath(parsed.positional[1], shell.cwd);
      await kernel.move(srcPath, destPath);
    } catch (error) {
      showError(shell.term, 'mv', error.message);
    }
  }, {
    description: 'Move or rename files and directories',
    category: 'filesystem'
  });

  // Print working directory
  shell.registerCommand('pwd', (args, shell) => {
    shell.term.writeln(shell.cwd);
  }, {
    description: 'Print working directory',
    category: 'filesystem'
  });

  // Tree - visualize directory structure
  shell.registerCommand('tree', async (args, shell) => {
    try {
      const kernel = await kernelClient.getKernel();
      const targetPath = args[0]
        ? (args[0].startsWith('/') ? args[0] : `${shell.cwd}/${args[0]}`)
        : shell.cwd;

      // Helper function to recursively build tree
      async function buildTree(path, prefix = '', isLast = true) {
        const entries = await kernel.readdir(path);
        const stat = await kernel.stat(path);

        // Print current directory name
        if (prefix === '') {
          shell.term.writeln(`\x1b[34m${path}\x1b[0m`);
        }

        // Sort entries: directories first, then files
        entries.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'directory' ? -1 : 1;
        });

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const isLastEntry = i === entries.length - 1;
          const connector = isLastEntry ? '└── ' : '├── ';
          const name = entry.type === 'directory'
            ? `\x1b[34m${entry.name}\x1b[0m`
            : entry.name;

          shell.term.writeln(`${prefix}${connector}${name}`);

          // Recurse into directories
          if (entry.type === 'directory') {
            const newPrefix = prefix + (isLastEntry ? '    ' : '│   ');
            const childPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
            await buildTree(childPath, newPrefix, isLastEntry);
          }
        }
      }

      await buildTree(targetPath);
    } catch (error) {
      showError(shell.term, 'tree', error.message);
    }
  }, {
    description: 'Visualize directory structure',
    category: 'filesystem'
  });

  // Write - write content to a file
  shell.registerCommand('write', async (args, shell) => {
    if (args.length < 2) {
      shell.term.writeln('\x1b[31mwrite: missing file operand or content\x1b[0m');
      shell.term.writeln('Usage: write <file> <content...>');
      shell.term.writeln('Supports escape sequences: \\n \\t \\r \\\\');
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const path = args[0].startsWith('/') ? args[0] : `${shell.cwd}/${args[0]}`;
      let content = args.slice(1).join(' ');

      // Process escape sequences (handle \\ first to avoid double-processing)
      content = content
        .replace(/\\\\/g, '\x00')  // Temporarily replace \\ with null char
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\x00/g, '\\');   // Restore escaped backslashes

      await kernel.writeFile(path, content);
    } catch (error) {
      showError(shell.term, 'write', error.message);
    }
  }, {
    description: 'Write content to a file',
    category: 'filesystem'
  });

  // Grep - search file contents
  shell.registerCommand('grep', async (args, shell) => {
    if (args.length < 2) {
      shell.term.writeln('\x1b[31mgrep: missing pattern or file operand\x1b[0m');
      shell.term.writeln('Usage: grep <pattern> <file>');
      return;
    }

    try {
      const pattern = args[0];
      const path = args[1].startsWith('/') ? args[1] : `${shell.cwd}/${args[1]}`;
      const kernel = await kernelClient.getKernel();
      const content = await kernel.readFile(path);

      const regex = new RegExp(pattern, 'i'); // Case-insensitive
      const lines = content.split('\n');

      lines.forEach((line, i) => {
        if (regex.test(line)) {
          // Highlight matches
          const highlighted = line.replace(regex, match => `\x1b[31m${match}\x1b[0m`);
          shell.term.writeln(`${i + 1}:${highlighted}`);
        }
      });
    } catch (error) {
      showError(shell.term, 'grep', error.message);
    }
  }, {
    description: 'Search file contents with pattern',
    category: 'filesystem'
  });

  // Head - show first N lines of file
  shell.registerCommand('head', async (args, shell) => {
    if (args.length === 0) {
      shell.term.writeln('\x1b[31mhead: missing file operand\x1b[0m');
      return;
    }

    try {
      let numLines = 10;
      let filePath = args[0];

      // Check for -n flag
      if (args[0] === '-n' && args.length >= 3) {
        numLines = parseInt(args[1], 10);
        filePath = args[2];
      }

      const path = filePath.startsWith('/') ? filePath : `${shell.cwd}/${filePath}`;
      const kernel = await kernelClient.getKernel();
      const content = await kernel.readFile(path);
      const lines = content.split('\n');

      lines.slice(0, numLines).forEach(line => shell.term.writeln(line));
    } catch (error) {
      showError(shell.term, 'head', error.message);
    }
  }, {
    description: 'Show first N lines of file',
    category: 'filesystem'
  });

  // Tail - show last N lines of file
  shell.registerCommand('tail', async (args, shell) => {
    if (args.length === 0) {
      shell.term.writeln('\x1b[31mtail: missing file operand\x1b[0m');
      return;
    }

    try {
      let numLines = 10;
      let filePath = args[0];

      // Check for -n flag
      if (args[0] === '-n' && args.length >= 3) {
        numLines = parseInt(args[1], 10);
        filePath = args[2];
      }

      const path = filePath.startsWith('/') ? filePath : `${shell.cwd}/${filePath}`;
      const kernel = await kernelClient.getKernel();
      const content = await kernel.readFile(path);
      const lines = content.split('\n');

      lines.slice(-numLines).forEach(line => shell.term.writeln(line));
    } catch (error) {
      showError(shell.term, 'tail', error.message);
    }
  }, {
    description: 'Show last N lines of file',
    category: 'filesystem'
  });

  // Word count - count lines, words, characters
  shell.registerCommand('wc', async (args, shell) => {
    if (args.length === 0) {
      shell.term.writeln('\x1b[31mwc: missing file operand\x1b[0m');
      return;
    }

    try {
      const path = args[0].startsWith('/') ? args[0] : `${shell.cwd}/${args[0]}`;
      const kernel = await kernelClient.getKernel();
      const content = await kernel.readFile(path);

      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(w => w.length > 0).length;
      const chars = content.length;

      shell.term.writeln(`  ${lines.toString().padStart(7)} ${words.toString().padStart(7)} ${chars.toString().padStart(7)} ${args[0]}`);
    } catch (error) {
      showError(shell.term, 'wc', error.message);
    }
  }, {
    description: 'Count lines, words, and characters',
    category: 'filesystem'
  });

  // Stat - show file metadata
  shell.registerCommand('stat', async (args, shell) => {
    if (args.length === 0) {
      shell.term.writeln('\x1b[31mstat: missing file operand\x1b[0m');
      return;
    }

    try {
      const path = args[0].startsWith('/') ? args[0] : `${shell.cwd}/${args[0]}`;
      const kernel = await kernelClient.getKernel();
      const stat = await kernel.stat(path);

      shell.term.writeln(`  File: ${stat.path}`);
      shell.term.writeln(`  Type: ${stat.type}`);
      shell.term.writeln(`  Size: ${stat.size || 0} bytes`);
      shell.term.writeln(`  Created: ${new Date(stat.created).toISOString()}`);
      shell.term.writeln(`  Modified: ${new Date(stat.modified).toISOString()}`);
    } catch (error) {
      showError(shell.term, 'stat', error.message);
    }
  }, {
    description: 'Show file metadata',
    category: 'filesystem'
  });

  // Vein - open file in editor
  if (editor) {
    shell.registerCommand('vein', async (args, shell) => {
      const schema = {
        description: 'Edit text files',
        flags: {
          force: { short: 'f', description: 'Open even with unsaved changes' }
        },
        positional: { description: '<file>' },
        examples: [
          { command: 'vein file.txt', description: 'Open file.txt' },
          { command: 'vein test.js -f', description: 'Force open test.js' }
        ],
        notes: [
          'Keyboard Shortcuts:',
          '  F2 / Ctrl+`     Toggle terminal/editor',
          '  Ctrl+S          Save file',
          '  Esc             Close editor'
        ]
      };

      if (argparse.showHelp('vein', args, schema, shell.term)) return;

      const parsed = argparse.parse(args, schema);

      // Show errors if any
      if (parsed.errors.length > 0) {
        parsed.errors.forEach(err => showError(shell.term, 'vein', err));
        return;
      }

      if (parsed.positional.length === 0) {
        showError(shell.term, 'vein', 'missing file operand');
        shell.term.writeln('Usage: vein <file> [-f|--force]');
        return;
      }

      try{
        // Check if editor is already open
        const editorView = document.getElementById('editor-view');
        if (editorView && !editorView.hidden) {
          showError(shell.term, 'vein', 'editor already open (use Ctrl+` or Esc to close first)');
          return;
        }

        // Resolve path
        const targetPath = resolvePath(parsed.positional[0], shell.cwd);

        // Open file in editor
        await editor.openFile(targetPath, parsed.flags.force);
      } catch (error) {
        console.error('[vein] Error:', error);
        showError(shell.term, 'vein', error.message);
      }
    }, {
      description: 'Edit text files',
      category: 'editor'
    });
  }
}
