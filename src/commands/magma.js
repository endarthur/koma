/**
 * Magma - Raw VFS dump/inject commands
 * Named after molten rock from which olivine crystallizes
 *
 * These commands provide low-level VFS backup/restore functionality
 * for disaster recovery. They must be rock-solid and work even when
 * other parts of the system are broken.
 */

import { kernelClient } from '../kernel/client.js';

/**
 * Register magma commands
 */
export function registerMagmaCommands(shell) {
  shell.registerCommand('magma', magmaCommand, {
    description: 'Raw VFS dump and inject operations',
    category: 'system'
  });
}

/**
 * Main magma command with subcommands
 */
async function magmaCommand(args, shell, context) {
  // Show help if no subcommand
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    showHelp(context);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  try {
    switch (subcommand) {
      case 'dump':
        await dumpCommand(subArgs, shell, context);
        break;

      case 'inject':
        await injectCommand(subArgs, shell, context);
        break;

      case 'list':
        await listCommand(subArgs, shell, context);
        break;

      default:
        context.writeln(`\x1b[31mUnknown subcommand: ${subcommand}\x1b[0m`);
        context.writeln('Run \x1b[1mmagma --help\x1b[0m for usage information');
        break;
    }
  } catch (error) {
    context.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
    console.error('[magma]', error);
  }
}

/**
 * Show help message
 */
function showHelp(context) {
  context.writeln('\x1b[1mUsage:\x1b[0m magma <subcommand> [options]');
  context.writeln('');
  context.writeln('\x1b[1mSubcommands:\x1b[0m');
  context.writeln('  \x1b[1mdump\x1b[0m [filename]       Export raw VFS dump to .magma file');
  context.writeln('  \x1b[1minject\x1b[0m <filename>     Inject (restore) VFS from .magma file');
  context.writeln('  \x1b[1mlist\x1b[0m                 List .magma files in /home');
  context.writeln('');
  context.writeln('\x1b[1mExamples:\x1b[0m');
  context.writeln('  magma dump                    # Export to magma-dump-[timestamp].magma');
  context.writeln('  magma dump pre-update         # Export to pre-update.magma');
  context.writeln('  magma inject backup.magma     # Restore from backup.magma');
  context.writeln('  magma list                    # Show available backups');
  context.writeln('');
  context.writeln('\x1b[1mFile Format:\x1b[0m');
  context.writeln('  .magma files are raw, uncompressed JSON dumps of the VFS.');
  context.writeln('  They are larger but faster than .kmt archives and designed');
  context.writeln('  for emergency recovery when the system is unstable.');
  context.writeln('');
  context.writeln('\x1b[1mSee Also:\x1b[0m man magma, man recovery, backup(1), restore(1)');
}

/**
 * Dump subcommand - Export VFS to .magma file
 */
async function dumpCommand(args, shell, context) {
  try {
    // Get kernel with minimal dependencies
    const kernel = await kernelClient.getKernel();

    // Determine filename
    let filename;
    if (args.length > 0 && !args[0].startsWith('-')) {
      filename = args[0];
      // Add .magma extension if not present
      if (!filename.endsWith('.magma')) {
        filename += '.magma';
      }
    } else {
      // Generate timestamp-based filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `magma-dump-${timestamp}.magma`;
    }

    context.writeln(`\x1b[36mExporting VFS...\x1b[0m`);

    // Export VFS (this is the core operation)
    const magmaData = await kernel.exportVFS();

    // Determine where to save
    const isDownload = args.includes('--download') || args.includes('-d');

    if (isDownload || !filename.startsWith('/')) {
      // Download to user's computer
      const blob = new Blob([magmaData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      context.writeln(`\x1b[32m✓ Exported to download: ${filename}\x1b[0m`);
    } else {
      // Save to VFS
      await kernel.writeFile(filename, magmaData);
      context.writeln(`\x1b[32m✓ Exported to VFS: ${filename}\x1b[0m`);
    }

    // Show stats
    const data = JSON.parse(magmaData);
    const fileCount = data.entries.filter(e => e.type === 'file').length;
    const dirCount = data.entries.filter(e => e.type === 'directory').length;
    const sizeKB = (magmaData.length / 1024).toFixed(1);

    context.writeln(`\x1b[90m  Files: ${fileCount}, Directories: ${dirCount}, Size: ${sizeKB} KB\x1b[0m`);
  } catch (error) {
    context.writeln(`\x1b[31mFailed to export VFS: ${error.message}\x1b[0m`);
    throw error;
  }
}

/**
 * Inject subcommand - Import VFS from .magma file
 */
async function injectCommand(args, shell, context) {
  if (args.length === 0) {
    context.writeln('\x1b[31mError: Missing filename\x1b[0m');
    context.writeln('Usage: magma inject <filename>');
    return;
  }

  const filename = args[0];

  try {
    // Get kernel
    const kernel = await kernelClient.getKernel();

    // Check for confirmation flag
    const skipConfirm = args.includes('--yes') || args.includes('-y') || args.includes('--now');

    if (!skipConfirm) {
      context.writeln(`\x1b[33m⚠ WARNING: This will REPLACE the entire VFS!\x1b[0m`);
      context.writeln('All current files will be deleted and replaced with the backup.');
      context.writeln('');
      context.writeln('To proceed, run: \x1b[1mmagma inject ' + filename + ' --yes\x1b[0m');
      return;
    }

    context.writeln(`\x1b[36mReading backup file...\x1b[0m`);

    // Read the .magma file
    let magmaData;
    try {
      magmaData = await kernel.readFile(filename);
    } catch (error) {
      context.writeln(`\x1b[31mFailed to read file: ${filename}\x1b[0m`);
      context.writeln(`\x1b[90mMake sure the file exists in the VFS.\x1b[0m`);
      context.writeln(`\x1b[90mRun 'magma list' to see available backups.\x1b[0m`);
      throw error;
    }

    // Validate format
    try {
      const data = JSON.parse(magmaData);
      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error('Invalid magma format: missing entries array');
      }
      context.writeln(`\x1b[90m  Found ${data.entries.length} entries\x1b[0m`);
    } catch (error) {
      context.writeln(`\x1b[31mInvalid .magma file: ${error.message}\x1b[0m`);
      throw error;
    }

    context.writeln(`\x1b[36mInjecting VFS (this will clear everything)...\x1b[0m`);

    // Import VFS (this is the core operation)
    await kernel.importVFS(magmaData);

    context.writeln(`\x1b[32m✓ VFS injected successfully\x1b[0m`);
    context.writeln(`\x1b[90m  You may need to refresh the page or run 'restart' to see changes.\x1b[0m`);
  } catch (error) {
    context.writeln(`\x1b[31mFailed to inject VFS: ${error.message}\x1b[0m`);
    throw error;
  }
}

/**
 * List subcommand - Show .magma files
 */
async function listCommand(args, shell, context) {
  try {
    const kernel = await kernelClient.getKernel();

    // Find all .magma files in /home
    const entries = await kernel.readdir('/home');
    const magmaFiles = entries.filter(e =>
      e.type === 'file' && e.name.endsWith('.magma')
    );

    if (magmaFiles.length === 0) {
      context.writeln('No .magma files found in /home');
      context.writeln('Run \x1b[1mmagma dump\x1b[0m to create a backup.');
      return;
    }

    context.writeln(`\x1b[1mMagma backups in /home:\x1b[0m`);
    context.writeln('');

    // Sort by modified time (newest first)
    magmaFiles.sort((a, b) => b.modified - a.modified);

    for (const file of magmaFiles) {
      const sizeKB = (file.size / 1024).toFixed(1);
      const date = new Date(file.modified).toLocaleString();
      context.writeln(`  \x1b[36m${file.name}\x1b[0m`);
      context.writeln(`    ${sizeKB} KB, modified ${date}`);
    }

    context.writeln('');
    context.writeln('To restore: \x1b[1mmagma inject <filename> --yes\x1b[0m');
  } catch (error) {
    context.writeln(`\x1b[31mFailed to list backups: ${error.message}\x1b[0m`);
    throw error;
  }
}
