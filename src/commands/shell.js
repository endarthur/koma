/**
 * Koma Shell Commands
 */

import {
  hasHelpFlag,
  showError,
  showSuccess,
  showWarning,
  showInfo,
  resolvePath,
  getKernel
} from '../utils/command-utils.js';
import { renderManPage } from '../utils/man-renderer.js';
import { displayHelp } from '../utils/help-formatter.js';
import { createArgsModule } from '../stdlib/args.js';
import { kernelClient } from '../kernel/client.js';

// Create argparse instance for commands
const argparse = createArgsModule();

export function registerShellCommands(shell, tabManager = null) {
  // Help command - now uses the registry!
  shell.registerCommand('help', (args, shell) => {
    displayHelp(shell.term, true); // true = show categories
  }, {
    description: 'Show available commands',
    category: 'shell'
  });

  // Koma system commands (Phase 5.5)
  shell.registerCommand('koma', async (args, shell) => {
    const schema = {
      description: 'Koma system management',
      positional: { description: '<subcommand>' },
      examples: [
        { command: 'koma version', description: 'Show system version' },
        { command: 'koma update', description: 'Check for system updates' },
        { command: 'koma upgrade', description: 'Apply system updates' },
        { command: 'koma reset', description: 'Reset system files' }
      ]
    };

    if (argparse.showHelp('koma', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'koma', 'missing subcommand');
      shell.term.writeln('Usage: koma <subcommand>');
      shell.term.writeln('Subcommands: version, update, upgrade, reset');
      return;
    }

    const subcommand = parsed.positional[0];
    const kernel = await kernelClient.getKernel();

    try {
      switch (subcommand) {
        case 'version': {
          const info = await kernel.getSystemInfo();
          shell.term.writeln(`Koma ${info.currentVersion}`);
          shell.term.writeln(`Build date: ${info.buildDate}`);
          shell.term.writeln(`Man pages: ${info.manPagesCount}`);
          if (info.storedVersion) {
            shell.term.writeln(`System version: ${info.storedVersion}`);
            if (info.lastUpdate) {
              shell.term.writeln(`Last update: ${new Date(info.lastUpdate).toLocaleString()}`);
            }
          }
          if (info.hasUpdate) {
            showInfo(shell.term, '', 'Updates available - run "koma update" to check');
          }
          break;
        }

        case 'update': {
          shell.term.writeln('Checking for updates...');
          const update = await kernel.checkSystemUpdate();

          if (update.hasUpdate) {
            shell.term.writeln('');
            showInfo(shell.term, '', `New version available: ${update.availableVersion}`);
            shell.term.writeln(`Current version: ${update.currentVersion}`);
            shell.term.writeln('');
            shell.term.writeln('Changes:');
            update.changes.forEach(change => {
              shell.term.writeln(`  - ${change}`);
            });
            shell.term.writeln('');
            showInfo(shell.term, '', 'Run "koma upgrade" to apply updates');
          } else {
            showSuccess(shell.term, '', 'System is up to date');
          }
          break;
        }

        case 'upgrade': {
          shell.term.writeln('Upgrading system files...');
          const result = await kernel.upgradeSystem();

          if (result.success) {
            showSuccess(shell.term, '', `Upgraded from ${result.previousVersion} to ${result.newVersion}`);
            shell.term.writeln(`Updated ${result.filesUpdated} files`);
            shell.term.writeln('');
            showInfo(shell.term, '', 'System files have been updated');
          } else {
            showError(shell.term, 'koma', 'upgrade failed');
          }
          break;
        }

        case 'reset': {
          shell.term.writeln('Resetting system files...');
          const result = await kernel.resetSystem();

          if (result.success) {
            showSuccess(shell.term, '', result.message);
            shell.term.writeln(`Reset ${result.filesReset} files`);
          } else {
            showError(shell.term, 'koma', 'reset failed');
          }
          break;
        }

        default:
          showError(shell.term, 'koma', `unknown subcommand: ${subcommand}`);
          shell.term.writeln('Subcommands: version, update, upgrade, reset');
      }
    } catch (error) {
      showError(shell.term, 'koma', error.message);
      console.error('[koma]', error);
    }
  }, {
    description: 'System management (version, update, upgrade, reset)',
    category: 'shell'
  });

  // Man pages
  shell.registerCommand('man', async (args, shell) => {
    const schema = {
      description: 'Display manual page for a command',
      positional: { description: '<command>' },
      examples: [
        { command: 'man ls', description: 'Show manual for ls command' },
        { command: 'man cat', description: 'Show manual for cat command' }
      ]
    };

    if (argparse.showHelp('man', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'man', 'missing command operand');
      shell.term.writeln('Usage: man <command>');
      return;
    }

    const command = parsed.positional[0];

    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();

      // Try to read man page from /usr/share/man/
      const manPath = `/usr/share/man/${command}.1.md`;

      let content;
      try {
        content = await kernel.readFile(manPath);
      } catch (error) {
        if (error.message.includes('ENOENT')) {
          showError(shell.term, 'man', `no manual entry for ${command}`);
          shell.term.writeln('');
          shell.term.writeln('Try `help` to see available commands');
          return;
        }
        throw error;
      }

      // Render man page
      const lines = renderManPage(content, 80);

      // Display to terminal
      lines.forEach(line => shell.term.writeln(line));

    } catch (error) {
      showError(shell.term, 'man', error.message);
    }
  }, {
    description: 'Display manual page for command',
    category: 'shell'
  });

  // Clear screen
  shell.registerCommand('clear', (args, shell) => {
    shell.term.clear();
  }, {
    description: 'Clear the terminal screen',
    category: 'shell'
  });

  // Echo command
  shell.registerCommand('echo', async (args, shell, context) => {
    const { createTerminalContext } = await import('../utils/command-context.js');
    const ctx = context || createTerminalContext(shell.term);

    if (hasHelpFlag(args)) {
      shell.term.writeln('Usage: echo [text...]');
      shell.term.writeln('');
      shell.term.writeln('Display text to output');
      shell.term.writeln('');
      shell.term.writeln('Examples:');
      shell.term.writeln('  echo Hello World      Print "Hello World"');
      shell.term.writeln('  echo test             Print "test"');
      return;
    }
    ctx.writeln(args.join(' '));
  }, {
    description: 'Display text to output',
    category: 'shell'
  });

  // Environment variables
  shell.registerCommand('env', (args, shell) => {
    if (hasHelpFlag(args)) {
      shell.term.writeln('Usage: env');
      shell.term.writeln('');
      shell.term.writeln('Display environment variables');
      return;
    }
    Object.entries(shell.env).forEach(([key, value]) => {
      shell.term.writeln(`${key}=${value}`);
    });
  }, {
    description: 'Display environment variables',
    category: 'shell'
  });

  // Command history
  shell.registerCommand('history', (args, shell) => {
    if (hasHelpFlag(args)) {
      shell.term.writeln('Usage: history');
      shell.term.writeln('');
      shell.term.writeln('Display command history');
      shell.term.writeln('');
      shell.term.writeln('Navigate with Up/Down arrow keys');
      return;
    }
    shell.history.forEach((cmd, i) => {
      const num = (i + 1).toString().padStart(4);
      shell.term.writeln(`${num}  ${cmd}`);
    });
  }, {
    description: 'Display command history',
    category: 'shell'
  });

  // Version info
  shell.registerCommand('version', (args, shell) => {
    if (hasHelpFlag(args)) {
      shell.term.writeln('Usage: version');
      shell.term.writeln('');
      shell.term.writeln('Display version and system information');
      return;
    }
    shell.term.writeln('\x1b[38;5;208mKoma Terminal v0.1\x1b[0m');
    shell.term.writeln('Browser-resident automation workstation');
    shell.term.writeln('');
    shell.term.writeln('Running on:');
    shell.term.writeln(`  User Agent: ${navigator.userAgent.split(' ').slice(-2).join(' ')}`);
    shell.term.writeln(`  Platform: ${navigator.platform}`);
  }, {
    description: 'Show version and system information',
    category: 'shell'
  });

  // Exit - close current tab
  shell.registerCommand('exit', (args, shell) => {
    if (tabManager) {
      // Close the current tab
      tabManager.closeTab(tabManager.activeTabId);
    } else {
      shell.term.writeln('Tab management: Click tabs to switch, [+] to create');
    }
  }, {
    description: 'Close current tab',
    category: 'shell'
  });

  // Restart - restart the Olivine kernel
  shell.registerCommand('restart', async (args, shell) => {
    if (hasHelpFlag(args)) {
      shell.term.writeln('Usage: restart');
      shell.term.writeln('');
      shell.term.writeln('Restart the Olivine kernel');
      shell.term.writeln('');
      shell.term.writeln('Use this if the VFS becomes unresponsive');
      return;
    }

    shell.term.writeln('\x1b[33mRestarting Olivine...\x1b[0m');

    try {
      const { kernelClient } = await import('../kernel/client.js');
      await kernelClient.restart();
      shell.term.writeln('\x1b[32mOlivine restarted successfully\x1b[0m');
    } catch (error) {
      shell.term.writeln(`\x1b[31mRestart failed: ${error.message}\x1b[0m`);
      shell.term.writeln('\x1b[33mTry refreshing the page (F5)\x1b[0m');
    }
  }, {
    description: 'Restart Olivine kernel',
    category: 'shell'
  });

  // Sh - execute shell script
  shell.registerCommand('sh', async (args, shell) => {
    const schema = {
      description: 'Execute a shell script file',
      positional: { description: '<script>' },
      flags: {
        verbose: { short: 'v', description: 'Show each command before executing' }
      },
      examples: [
        { command: 'sh setup.sh', description: 'Execute setup.sh script' },
        { command: 'sh -v build.sh', description: 'Execute with verbose output' }
      ],
      notes: [
        'Shell scripts are text files with commands (one per line)',
        'Lines starting with # are comments and are ignored',
        'Empty lines are skipped',
        'Each command is executed as if typed in the shell',
        'Supports pipes, redirects, and all built-in commands'
      ]
    };

    if (argparse.showHelp('sh', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'sh', 'missing script file');
      return;
    }

    try {
      const kernel = await kernelClient.getKernel();
      const scriptPath = resolvePath(parsed.positional[0], shell.cwd);
      const content = await kernel.readFile(scriptPath);

      // Split into lines and filter
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));

      if (lines.length === 0) {
        showInfo(shell.term, '', 'Script is empty or contains only comments');
        return;
      }

      // Execute each line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (parsed.flags.verbose) {
          shell.term.writeln(`\x1b[2m+ ${line}\x1b[0m`);
        }

        try {
          await shell.execute(line);
        } catch (error) {
          showError(shell.term, 'sh', `line ${i + 1}: ${error.message}`);
          // Continue executing remaining lines
        }
      }

      if (parsed.flags.verbose) {
        showSuccess(shell.term, '', `Executed ${lines.length} commands`);
      }
    } catch (error) {
      showError(shell.term, 'sh', error.message);
    }
  }, {
    description: 'Execute shell script file',
    category: 'shell'
  });

  // Wget - download files from URLs
  shell.registerCommand('wget', async (args, shell) => {
    const schema = {
      description: 'Download files from URLs',
      positional: { description: '<url>' },
      options: {
        output: { short: 'O', description: 'Output filename' }
      },
      flags: {
        quiet: { short: 'q', description: 'Quiet mode (no progress output)' }
      },
      examples: [
        { command: 'wget https://example.com/data.json', description: 'Download to current directory' },
        { command: 'wget https://example.com/file.txt -O myfile.txt', description: 'Save with custom name' },
        { command: 'wget -q https://api.github.com/users/octocat', description: 'Quiet download' }
      ],
      notes: [
        'Downloads files from HTTP/HTTPS URLs',
        'Automatically extracts filename from URL if -O not specified',
        'Saves to current working directory',
        'Supports JSON, text, and other text-based formats'
      ]
    };

    if (argparse.showHelp('wget', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'wget', 'missing URL');
      return;
    }

    const url = parsed.positional[0];

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      showError(shell.term, 'wget', `invalid URL: ${url}`);
      return;
    }

    // Determine output filename
    let filename = parsed.options.output;
    if (!filename) {
      // Extract filename from URL
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        filename = pathname.split('/').pop() || 'index.html';

        // If no filename in path, use domain
        if (!filename || filename === '') {
          filename = urlObj.hostname.replace(/\./g, '_') + '.txt';
        }
      } catch (error) {
        filename = 'downloaded_file.txt';
      }
    }

    const outputPath = resolvePath(filename, shell.cwd);

    try {
      if (!parsed.flags.quiet) {
        shell.term.writeln(`Downloading ${url}...`);
      }

      // Fetch the URL
      const response = await fetch(url);

      if (!response.ok) {
        showError(shell.term, 'wget', `HTTP ${response.status}: ${response.statusText}`);
        return;
      }

      // Get content type
      const contentType = response.headers.get('content-type') || '';

      // Read response as text
      const content = await response.text();

      // Save to VFS
      const kernel = await kernelClient.getKernel();
      await kernel.writeFile(outputPath, content);

      if (!parsed.flags.quiet) {
        const size = content.length;
        const sizeStr = size > 1024
          ? `${(size / 1024).toFixed(2)} KB`
          : `${size} bytes`;

        showSuccess(shell.term, '', `Saved to ${filename} (${sizeStr})`);

        if (contentType) {
          shell.term.writeln(`Content-Type: ${contentType}`);
        }
      }
    } catch (error) {
      showError(shell.term, 'wget', error.message);
      console.error('[wget]', error);
    }
  }, {
    description: 'Download files from URLs',
    category: 'shell'
  });

  // Run - execute a JavaScript script
  shell.registerCommand('run', async (args, shell) => {
    const schema = {
      description: 'Execute a JavaScript file as a process',
      positional: { description: '<script> [args...]' },
      examples: [
        { command: 'run /home/hello.js', description: 'Run hello.js' },
        { command: 'run script.js arg1 arg2', description: 'Run with arguments' }
      ],
      notes: [
        'Scripts have access to:',
        '  args       - Command line arguments array',
        '  env        - Environment variables object',
        '  console    - Console for stdout/stderr',
        '  fs         - Filesystem module (koma:fs)',
        '  http       - HTTP module (koma:http)',
        '  notify     - Notifications module (koma:notify)',
        '  path       - Path utilities (join, resolve, etc.)',
        '  argparse   - Argument parsing (parse, usage, etc.)'
      ]
    };

    if (argparse.showHelp('run', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'run', 'no script specified');
      shell.term.writeln('Usage: run <script> [args...]');
      return;
    }

    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();

      // Resolve script path
      const scriptPath = resolvePath(parsed.positional[0], shell.cwd);

      // Extract script arguments (everything after script path)
      const scriptArgs = parsed.positional.slice(1);

      // Spawn process
      const pid = await kernel.spawn(scriptPath, scriptArgs, shell.env);

      shell.term.writeln(`\x1b[90m[Process ${pid} started]\x1b[0m`);

      // Poll for output and stream to terminal
      const pollInterval = setInterval(async () => {
        try {
          const output = await kernel.getOutput(pid);

          // Write stdout
          output.stdout.forEach(line => {
            shell.term.writeln(line);
          });

          // Write stderr in red
          output.stderr.forEach(line => {
            shell.term.writeln(`\x1b[31m${line}\x1b[0m`);
          });
        } catch (error) {
          // Process might have been cleaned up
          clearInterval(pollInterval);
        }
      }, 100); // Poll every 100ms

      // Wait for process to complete
      try {
        const exitCode = await kernel.wait(pid);
        clearInterval(pollInterval);

        // Get any remaining output
        const finalOutput = await kernel.getOutput(pid);
        finalOutput.stdout.forEach(line => shell.term.writeln(line));
        finalOutput.stderr.forEach(line => shell.term.writeln(`\x1b[31m${line}\x1b[0m`));

        // Show exit status
        if (exitCode === 0) {
          shell.term.writeln(`\x1b[90m[Process ${pid} exited with code ${exitCode}]\x1b[0m`);
        } else {
          shell.term.writeln(`\x1b[31m[Process ${pid} exited with code ${exitCode}]\x1b[0m`);
        }
      } catch (error) {
        clearInterval(pollInterval);
        shell.term.writeln(`\x1b[31m[Process ${pid} failed: ${error.message}]\x1b[0m`);
      }

    } catch (error) {
      shell.term.writeln(`\x1b[31merror: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'Execute JavaScript file as process',
    category: 'process'
  });

  // PS - list processes
  shell.registerCommand('ps', async (args, shell) => {
    const schema = {
      description: 'List all running and recent processes',
      notes: [
        'Columns:',
        '  PID      - Process ID',
        '  STATUS   - running, completed, failed, killed',
        '  TIME     - Runtime in milliseconds',
        '  SCRIPT   - Script path'
      ]
    };

    if (argparse.showHelp('ps', args, schema, shell.term)) return;

    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();

      const processes = await kernel.ps();

      if (processes.length === 0) {
        shell.term.writeln('No processes');
        return;
      }

      // Header
      shell.term.writeln('\x1b[1mPID  STATUS      TIME(ms)  SCRIPT\x1b[0m');

      // Process rows
      processes.forEach(proc => {
        const pid = String(proc.pid).padEnd(4);
        const status = proc.status.padEnd(11);
        const time = String(proc.runtime).padEnd(9);
        const script = proc.script;

        // Color code by status
        let statusColor = '\x1b[0m'; // Default
        if (proc.status === 'running') statusColor = '\x1b[32m'; // Green
        else if (proc.status === 'failed') statusColor = '\x1b[31m'; // Red
        else if (proc.status === 'killed') statusColor = '\x1b[33m'; // Yellow

        shell.term.writeln(`${pid} ${statusColor}${status}\x1b[0m ${time} ${script}`);
      });

    } catch (error) {
      shell.term.writeln(`\x1b[31merror: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'List running and recent processes',
    category: 'process'
  });

  // Kill - terminate a process
  shell.registerCommand('kill', async (args, shell) => {
    const schema = {
      description: 'Terminate a running process',
      positional: { description: '<pid>' },
      examples: [
        { command: 'kill 1', description: 'Kill process with PID 1' }
      ]
    };

    if (argparse.showHelp('kill', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'kill', 'no PID specified');
      shell.term.writeln('Usage: kill <pid>');
      return;
    }

    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();

      const pid = parseInt(parsed.positional[0], 10);
      if (isNaN(pid)) {
        showError(shell.term, 'kill', `invalid PID: ${parsed.positional[0]}`);
        return;
      }

      const result = await kernel.kill(pid);
      shell.term.writeln(`\x1b[32mKilled process ${result.pid}\x1b[0m`);

    } catch (error) {
      shell.term.writeln(`\x1b[31merror: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'Terminate a running process',
    category: 'process'
  });

  // Cron - schedule a job
  shell.registerCommand('cron', async (args, shell) => {
    const schema = {
      description: 'Schedule a script to run periodically',
      positional: { description: '<schedule> <script>' },
      examples: [
        { command: 'cron "*/5 * * * *" /home/backup.js', description: 'Every 5 minutes' },
        { command: 'cron "0 */2 * * *" /home/check.js', description: 'Every 2 hours' },
        { command: 'cron "30 9 * * 1-5" /home/work.js', description: '9:30 AM weekdays' },
        { command: 'cron "0 0 1 * *" /home/monthly.js', description: 'First of month' }
      ],
      notes: [
        'Schedule format: minute hour day month weekday',
        '  *         - Any value',
        '  */N       - Every N (e.g., */5 = every 5)',
        '  N-M       - Range from N to M',
        '  N,M,P     - List of values'
      ]
    };

    if (argparse.showHelp('cron', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length < 2) {
      showError(shell.term, 'cron', 'missing arguments');
      shell.term.writeln('Usage: cron <schedule> <script>');
      shell.term.writeln('Example: cron "*/5 * * * *" /home/backup.js');
      return;
    }

    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();

      // First arg is schedule (might be quoted)
      const schedule = parsed.positional[0];

      // Second arg is script path
      const scriptPath = resolvePath(parsed.positional[1], shell.cwd);

      const job = await kernel.crontab(schedule, scriptPath);

      shell.term.writeln(`\x1b[32mScheduled job ${job.id}\x1b[0m`);
      shell.term.writeln(`  Schedule: ${job.schedule}`);
      shell.term.writeln(`  Script: ${job.scriptPath}`);
      shell.term.writeln(`  Next run: ${new Date(job.nextRun).toLocaleString()}`);

    } catch (error) {
      shell.term.writeln(`\x1b[31merror: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'Schedule script to run periodically',
    category: 'process'
  });

  // Cronlist - list scheduled jobs
  shell.registerCommand('cronlist', async (args, shell) => {
    const schema = {
      description: 'List all scheduled cron jobs',
      notes: [
        'Columns:',
        '  ID        - Job ID',
        '  SCHEDULE  - Cron expression',
        '  SCRIPT    - Script path',
        '  NEXT RUN  - Next execution time'
      ]
    };

    if (argparse.showHelp('cronlist', args, schema, shell.term)) return;

    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();

      const jobs = await kernel.cronlist();

      if (jobs.length === 0) {
        shell.term.writeln('No scheduled jobs');
        return;
      }

      // Header
      shell.term.writeln('\x1b[1mID   SCHEDULE        SCRIPT                    NEXT RUN\x1b[0m');

      // Job rows
      jobs.forEach(job => {
        const id = String(job.id).padEnd(4);
        const schedule = job.schedule.padEnd(15);
        const script = job.scriptPath.padEnd(25).substring(0, 25);
        const nextRun = new Date(job.nextRun).toLocaleString();

        shell.term.writeln(`${id} ${schedule} ${script} ${nextRun}`);
      });

    } catch (error) {
      shell.term.writeln(`\x1b[31merror: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'List all scheduled cron jobs',
    category: 'process'
  });

  // Cronrm - remove a scheduled job
  shell.registerCommand('cronrm', async (args, shell) => {
    const schema = {
      description: 'Remove a scheduled cron job',
      positional: { description: '<job-id>' },
      examples: [
        { command: 'cronrm 1', description: 'Remove job with ID 1' }
      ]
    };

    if (argparse.showHelp('cronrm', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'cronrm', 'no job ID specified');
      shell.term.writeln('Usage: cronrm <job-id>');
      return;
    }

    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();

      const jobId = parseInt(parsed.positional[0], 10);
      if (isNaN(jobId)) {
        showError(shell.term, 'cronrm', `invalid job ID: ${parsed.positional[0]}`);
        return;
      }

      const result = await kernel.cronrm(jobId);
      shell.term.writeln(`\x1b[32mRemoved job ${result.id}\x1b[0m`);

    } catch (error) {
      shell.term.writeln(`\x1b[31merror: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'Remove a scheduled cron job',
    category: 'process'
  });
}
