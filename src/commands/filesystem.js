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
        targetPath = resolvePath(inputPath, shell.cwd, shell.env.HOME);
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
  shell.registerCommand('ls', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

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
        ? resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME)
        : shell.cwd;

      // Check if path exists first
      const stat = await withTimeout(kernel.stat(targetPath), 'ls');
      if (stat.type !== 'directory') {
        ctx.writeln(`\x1b[31mls: ${targetPath}: Not a directory\x1b[0m`);
        return;
      }

      let entries = await withTimeout(kernel.readdir(targetPath), 'ls');

      // Filter hidden files unless -a flag is present
      if (!parsed.flags.all) {
        entries = entries.filter(entry => !entry.name.startsWith('.'));
      }

      if (entries.length === 0) {
        ctx.writeln('');
        return;
      }

      if (parsed.flags.long) {
        // Long format
        for (const entry of entries) {
          const perms = entry.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--';
          const size = (entry.size || 0).toString().padStart(8);
          const date = new Date(entry.modified).toISOString().slice(0, 16).replace('T', ' ');
          // No color formatting in pipes
          const name = (ctx.isPiped || ctx.isRedirected)
            ? entry.name
            : (entry.type === 'directory' ? `\x1b[34m${entry.name}\x1b[0m` : entry.name);
          ctx.writeln(`${perms}  1 koma koma ${size} ${date} ${name}`);
        }
      } else {
        // Simple format - one name per line when piped, space-separated otherwise
        if (ctx.isPiped || ctx.isRedirected) {
          // One per line for piping
          entries.forEach(entry => ctx.writeln(entry.name));
        } else {
          // Space-separated with colors
          const names = entries.map(entry => {
            return entry.type === 'directory'
              ? `\x1b[34m${entry.name}\x1b[0m`  // Blue for directories
              : entry.name;
          });
          ctx.writeln(names.join('  '));
        }
      }
    } catch (error) {
      ctx.writeln(`\x1b[31mls: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'List directory contents',
    category: 'filesystem'
  });

  // Display file contents
  shell.registerCommand('cat', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

    const schema = {
      description: 'Concatenate and display file contents',
      positional: { description: '<file> [files...]' },
      examples: [
        { command: 'cat file.txt', description: 'Display file.txt' },
        { command: 'cat file1.txt file2.txt', description: 'Concatenate and display multiple files' },
        { command: 'cat /home/test.js', description: 'Display test.js' }
      ]
    };

    if (argparse.showHelp('cat', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    // If no files provided, read from stdin if available
    if (parsed.positional.length === 0) {
      if (ctx.hasStdin()) {
        // Read from stdin
        const lines = ctx.getStdinLines();
        lines.forEach(line => ctx.writeln(line));
        return;
      } else {
        showError(shell.term, 'cat', 'missing file operand');
        return;
      }
    }

    try {
      const kernel = await kernelClient.getKernel();

      // Process each file in order
      for (const fileArg of parsed.positional) {
        const filePath = resolvePath(fileArg, shell.cwd, shell.env.HOME);
        const content = await withTimeout(kernel.readFile(filePath), 'cat', 'read');

        // Split by newlines and write each line separately
        const lines = content.split('\n');
        lines.forEach(line => ctx.writeln(line));
      }
    } catch (error) {
      showError(shell.term, 'cat', error.message);
    }
  }, {
    description: 'Concatenate and display file contents',
    category: 'filesystem'
  });

  // Create directory
  shell.registerCommand('mkdir', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

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
      ctx.writeln(`\x1b[31mmkdir: missing operand\x1b[0m`);
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const dirPath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);
      await withTimeout(kernel.mkdir(dirPath), 'mkdir', 'write');
    } catch (error) {
      ctx.writeln(`\x1b[31mmkdir: ${error.message}\x1b[0m`);
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
      const filePath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);
      await withTimeout(kernel.writeFile(filePath, ''), 'touch', 'write');
    } catch (error) {
      showError(shell.term, 'touch', error.message);
    }
  }, {
    description: 'Create empty file or update timestamp',
    category: 'filesystem'
  });

  // Remove file or directory
  shell.registerCommand('rm', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

    const schema = {
      description: 'Remove files or directories',
      positional: { description: '<file|directory> [files...]' },
      flags: {
        'recursive': { short: 'r', description: 'Remove directories and their contents recursively' }
      },
      examples: [
        { command: 'rm file.txt', description: 'Remove file.txt' },
        { command: 'rm test/', description: 'Remove empty directory' },
        { command: 'rm -r test/', description: 'Remove directory and all contents' }
      ]
    };

    if (argparse.showHelp('rm', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      ctx.writeln(`\x1b[31mrm: missing operand\x1b[0m`);
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const recursive = parsed.flags.recursive;

      for (const target of parsed.positional) {
        const targetPath = resolvePath(target, shell.cwd, shell.env.HOME);

        if (recursive) {
          // Check if it's a directory first
          try {
            const stat = await kernel.stat(targetPath);
            if (stat.type === 'directory') {
              await withTimeout(kernel.unlinkRecursive(targetPath), 'rm', 'write');
            } else {
              await withTimeout(kernel.unlink(targetPath), 'rm', 'write');
            }
          } catch (error) {
            // If stat fails, try regular unlink anyway
            await withTimeout(kernel.unlink(targetPath), 'rm', 'write');
          }
        } else {
          await withTimeout(kernel.unlink(targetPath), 'rm', 'write');
        }
      }
    } catch (error) {
      ctx.writeln(`\x1b[31mrm: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'Remove files or directories',
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
      const srcPath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);
      let destPath = resolvePath(parsed.positional[1], shell.cwd, shell.env.HOME);

      // If destination is a directory, append source filename
      try {
        const destStat = await kernel.stat(destPath);
        if (destStat.type === 'directory') {
          const srcFilename = path.basename(srcPath);
          destPath = path.join(destPath, srcFilename);
        }
      } catch (e) {
        // Destination doesn't exist, use as-is (creating new file)
      }

      await withTimeout(kernel.copyFile(srcPath, destPath), 'cp', 'write');
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
      const srcPath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);
      let destPath = resolvePath(parsed.positional[1], shell.cwd, shell.env.HOME);

      // If destination is a directory, append source filename
      try {
        const destStat = await kernel.stat(destPath);
        if (destStat.type === 'directory') {
          const srcFilename = path.basename(srcPath);
          destPath = path.join(destPath, srcFilename);
        }
      } catch (e) {
        // Destination doesn't exist, use as-is (renaming)
      }

      await withTimeout(kernel.move(srcPath, destPath), 'mv', 'write');
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
  shell.registerCommand('grep', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

    const schema = {
      description: 'Search for patterns in files or input',
      flags: {
        number: { short: 'n', description: 'Show line numbers' },
        ignoreCase: { short: 'i', description: 'Case-insensitive search' },
        invert: { short: 'v', description: 'Invert match (show non-matching lines)' },
        count: { short: 'c', description: 'Only show count of matching lines' }
      },
      positional: { description: '<pattern> [file]' },
      examples: [
        { command: 'grep error log.txt', description: 'Find "error" in log.txt' },
        { command: 'grep -n error log.txt', description: 'Show line numbers' },
        { command: 'grep -i ERROR log.txt', description: 'Case-insensitive search' },
        { command: 'cat file.txt | grep pattern', description: 'Search piped input' },
        { command: 'grep -c error log.txt', description: 'Count matches' }
      ]
    };

    if (argparse.showHelp('grep', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length < 1) {
      showError(shell.term, 'grep', 'missing pattern');
      return;
    }

    try {
      const pattern = parsed.positional[0];
      const flags = parsed.flags.ignoreCase ? 'i' : '';
      const regex = new RegExp(pattern, flags);
      let lines = [];

      // Get input from stdin or file
      if (ctx.hasStdin()) {
        // Reading from pipe
        lines = ctx.getStdinLines();
      } else if (parsed.positional.length >= 2) {
        // Reading from file
        const filePath = resolvePath(parsed.positional[1], shell.cwd, shell.env.HOME);
        const kernel = await kernelClient.getKernel();
        const content = await kernel.readFile(filePath);
        lines = content.split('\n');
      } else {
        showError(shell.term, 'grep', 'no input provided');
        return;
      }

      // Filter lines
      const matches = [];
      lines.forEach((line, i) => {
        const isMatch = regex.test(line);
        const shouldOutput = parsed.flags.invert ? !isMatch : isMatch;

        if (shouldOutput) {
          matches.push({ line, lineNum: i + 1 });
        }
      });

      // Output based on flags
      if (parsed.flags.count) {
        // Just show count
        ctx.writeln(matches.length.toString());
      } else {
        // Output matching lines
        matches.forEach(({ line, lineNum }) => {
          let output = line;

          // Add line numbers if requested
          if (parsed.flags.number) {
            output = `${lineNum}:${output}`;
          }

          // Add color highlighting if in terminal (not piped/redirected)
          if (!ctx.isPiped && !ctx.isRedirected && !parsed.flags.invert) {
            output = output.replace(regex, match => `\x1b[31m${match}\x1b[0m`);
          }

          ctx.writeln(output);
        });
      }
    } catch (error) {
      showError(shell.term, 'grep', error.message);
    }
  }, {
    description: 'Search for patterns in files or input',
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
  shell.registerCommand('wc', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

    const schema = {
      description: 'Count lines, words, and characters',
      flags: {
        lines: { short: 'l', description: 'Count lines only' },
        words: { short: 'w', description: 'Count words only' },
        chars: { short: 'c', description: 'Count characters only' }
      },
      positional: { description: '[file]' },
      examples: [
        { command: 'wc file.txt', description: 'Count lines, words, and characters' },
        { command: 'wc -l file.txt', description: 'Count lines only' },
        { command: 'wc -w file.txt', description: 'Count words only' },
        { command: 'cat file.txt | wc -l', description: 'Count lines from pipe' }
      ]
    };

    if (argparse.showHelp('wc', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    try {
      let content = '';
      let filename = '';

      // Get input from stdin or file
      if (ctx.hasStdin()) {
        content = ctx.stdin;
      } else if (parsed.positional.length > 0) {
        const kernel = await kernelClient.getKernel();
        const filePath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);
        content = await kernel.readFile(filePath);
        filename = parsed.positional[0];
      } else {
        showError(shell.term, 'wc', 'no input provided');
        return;
      }

      // Calculate counts
      const lineCount = content.split('\n').length;
      const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
      const charCount = content.length;

      // Determine what to show
      const showLines = parsed.flags.lines || (!parsed.flags.words && !parsed.flags.chars);
      const showWords = parsed.flags.words || (!parsed.flags.lines && !parsed.flags.chars);
      const showChars = parsed.flags.chars || (!parsed.flags.lines && !parsed.flags.words);

      // Build output
      let output = ' ';
      if (showLines) output += lineCount.toString().padStart(7) + ' ';
      if (showWords) output += wordCount.toString().padStart(7) + ' ';
      if (showChars) output += charCount.toString().padStart(7) + ' ';
      if (filename) output += filename;

      ctx.writeln(output.trimEnd());
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
        const targetPath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);

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

  // Find files by name or type
  shell.registerCommand('find', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

    const schema = {
      description: 'Search for files in directory hierarchy',
      positional: { description: '[path]' },
      options: {
        name: { short: 'n', description: 'File name pattern (supports * wildcards)' },
        type: { short: 't', description: 'File type: f (file) or d (directory)' }
      },
      examples: [
        { command: 'find /home', description: 'List all files under /home' },
        { command: 'find -name "*.txt"', description: 'Find all .txt files' },
        { command: 'find -type d', description: 'Find all directories' },
        { command: 'find /home -name "*.js" -type f', description: 'Find JS files in /home' }
      ]
    };

    if (argparse.showHelp('find', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    try {
      const kernel = await kernelClient.getKernel();
      const searchPath = parsed.positional[0] ? resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME) : shell.cwd;
      const namePattern = parsed.options.name;
      const typeFilter = parsed.options.type;

      // Recursive directory traversal
      const results = [];
      async function search(dirPath) {
        try {
          const entries = await kernel.readdir(dirPath);

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const stat = await kernel.stat(fullPath);

            // Apply filters
            let matches = true;

            // Type filter
            if (typeFilter) {
              if (typeFilter === 'f' && stat.type !== 'file') matches = false;
              if (typeFilter === 'd' && stat.type !== 'directory') matches = false;
            }

            // Name pattern filter (simple wildcard matching)
            if (matches && namePattern) {
              const regex = new RegExp('^' + namePattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
              if (!regex.test(entry.name)) matches = false;
            }

            if (matches) {
              results.push(fullPath);
            }

            // Recurse into directories
            if (stat.type === 'directory') {
              await search(fullPath);
            }
          }
        } catch (error) {
          // Skip directories we can't read
        }
      }

      await search(searchPath);

      // Output results
      if (results.length === 0) {
        if (!ctx.isPiped) {
          ctx.writeln('No files found');
        }
      } else {
        results.forEach(file => ctx.writeln(file));
      }
    } catch (error) {
      showError(shell.term, 'find', error.message);
    }
  }, {
    description: 'Search for files in directory hierarchy',
    category: 'filesystem'
  });

  // Sort lines alphabetically
  shell.registerCommand('sort', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

    const schema = {
      description: 'Sort lines of text',
      flags: {
        reverse: { short: 'r', description: 'Reverse sort order' },
        numeric: { short: 'n', description: 'Sort numerically' }
      },
      positional: { description: '[file]' },
      examples: [
        { command: 'sort file.txt', description: 'Sort lines in file.txt' },
        { command: 'ls | sort', description: 'Sort directory listing' },
        { command: 'sort -r file.txt', description: 'Reverse sort' },
        { command: 'sort -n numbers.txt', description: 'Numeric sort' }
      ]
    };

    if (argparse.showHelp('sort', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    try {
      let lines = [];

      // Get input from stdin or file
      if (ctx.hasStdin()) {
        lines = ctx.getStdinLines();
      } else if (parsed.positional.length > 0) {
        const kernel = await kernelClient.getKernel();
        const filePath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);
        const content = await kernel.readFile(filePath);
        lines = content.split('\n');
      } else {
        showError(shell.term, 'sort', 'no input provided');
        return;
      }

      // Sort lines
      if (parsed.flags.numeric) {
        lines.sort((a, b) => parseFloat(a) - parseFloat(b));
      } else {
        lines.sort();
      }

      if (parsed.flags.reverse) {
        lines.reverse();
      }

      // Output
      lines.forEach(line => ctx.writeln(line));
    } catch (error) {
      showError(shell.term, 'sort', error.message);
    }
  }, {
    description: 'Sort lines of text',
    category: 'filesystem'
  });

  // Remove duplicate consecutive lines
  shell.registerCommand('uniq', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

    const schema = {
      description: 'Remove duplicate consecutive lines',
      flags: {
        count: { short: 'c', description: 'Prefix lines with occurrence count' }
      },
      positional: { description: '[file]' },
      examples: [
        { command: 'uniq file.txt', description: 'Remove duplicate lines' },
        { command: 'sort file.txt | uniq', description: 'Sort then remove duplicates' },
        { command: 'uniq -c file.txt', description: 'Count occurrences' }
      ]
    };

    if (argparse.showHelp('uniq', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    try {
      let lines = [];

      // Get input from stdin or file
      if (ctx.hasStdin()) {
        lines = ctx.getStdinLines();
      } else if (parsed.positional.length > 0) {
        const kernel = await kernelClient.getKernel();
        const filePath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);
        const content = await kernel.readFile(filePath);
        lines = content.split('\n');
      } else {
        showError(shell.term, 'sort', 'no input provided');
        return;
      }

      // Remove duplicates
      const result = [];
      let prevLine = null;
      let count = 0;

      for (const line of lines) {
        if (line === prevLine) {
          count++;
        } else {
          if (prevLine !== null) {
            if (parsed.flags.count) {
              result.push(`${count.toString().padStart(7)} ${prevLine}`);
            } else {
              result.push(prevLine);
            }
          }
          prevLine = line;
          count = 1;
        }
      }

      // Add last line
      if (prevLine !== null) {
        if (parsed.flags.count) {
          result.push(`${count.toString().padStart(7)} ${prevLine}`);
        } else {
          result.push(prevLine);
        }
      }

      // Output
      result.forEach(line => ctx.writeln(line));
    } catch (error) {
      showError(shell.term, 'uniq', error.message);
    }
  }, {
    description: 'Remove duplicate consecutive lines',
    category: 'filesystem'
  });

  // Tee - write to file and stdout
  shell.registerCommand('tee', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

    const schema = {
      description: 'Read from stdin and write to file and stdout',
      flags: {
        append: { short: 'a', description: 'Append to file instead of overwriting' }
      },
      positional: { description: '<file> [files...]' },
      examples: [
        { command: 'ls | tee output.txt', description: 'Save ls output and display it' },
        { command: 'cat file.txt | tee copy.txt', description: 'Copy and display' },
        { command: 'echo "log" | tee -a log.txt', description: 'Append to log file' },
        { command: 'ls | tee file1.txt file2.txt', description: 'Write to multiple files' }
      ]
    };

    if (argparse.showHelp('tee', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'tee', 'missing file operand');
      return;
    }

    if (!ctx.hasStdin()) {
      showError(shell.term, 'tee', 'no input provided (tee requires piped input)');
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const content = ctx.stdin;

      // Write to each file
      for (const fileArg of parsed.positional) {
        const filePath = resolvePath(fileArg, shell.cwd, shell.env.HOME);

        if (parsed.flags.append) {
          // Append mode
          try {
            const existing = await kernel.readFile(filePath);
            await kernel.writeFile(filePath, existing + '\n' + content);
          } catch (error) {
            // File doesn't exist, create it
            await kernel.writeFile(filePath, content);
          }
        } else {
          // Overwrite mode
          await kernel.writeFile(filePath, content);
        }
      }

      // Also write to stdout
      const lines = content.split('\n');
      lines.forEach(line => ctx.writeln(line));

    } catch (error) {
      showError(shell.term, 'tee', error.message);
    }
  }, {
    description: 'Read from stdin and write to file and stdout',
    category: 'filesystem'
  });
}
