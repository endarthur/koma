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
import { test } from './test.js';
import { parseSchist, evaluateSchist, createSchistEnv, schistToString, schistWrite } from '../parser/schist.js';

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
      const scriptPath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);
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

    const outputPath = resolvePath(filename, shell.cwd, shell.env.HOME);

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
      const scriptPath = resolvePath(parsed.positional[0], shell.cwd, shell.env.HOME);

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
      const scriptPath = resolvePath(parsed.positional[1], shell.cwd, shell.env.HOME);

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

  // ========== Backup/Restore Commands ==========

  /**
   * Utility: Compute SHA-256 hash of data
   */
  async function computeSHA256(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Utility: Compress string data using gzip
   */
  async function compressString(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const stream = new Blob([bytes]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const compressedBlob = await new Response(compressedStream).blob();
    const compressedBytes = new Uint8Array(await compressedBlob.arrayBuffer());
    return String.fromCharCode(...compressedBytes);
  }

  /**
   * Utility: Decompress gzip data to string
   */
  async function decompressString(compressedStr) {
    const compressedBytes = Uint8Array.from(compressedStr, c => c.charCodeAt(0));
    const stream = new Blob([compressedBytes]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const decompressedBlob = await new Response(decompressedStream).blob();
    const text = await decompressedBlob.text();
    return text;
  }

  /**
   * Utility: UTF-8 safe base64 encoding
   */
  function utf8ToBase64(str) {
    // Convert UTF-8 string to base64 safely
    // Use TextEncoder to properly handle UTF-8, then convert bytes to binary string
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  }

  /**
   * Utility: UTF-8 safe base64 decoding
   */
  function base64ToUtf8(b64) {
    // Decode base64 to binary string, then convert to UTF-8
    const binaryString = atob(b64);
    const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  /**
   * Utility: Recursively get all VFS entries
   */
  async function getAllVFSEntries(kernel, path = '/', excludePaths = []) {
    const entries = [];

    try {
      const dirEntries = await kernel.readdir(path);

      for (const entry of dirEntries) {
        const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;

        // Skip excluded paths
        if (excludePaths.some(ex => fullPath.startsWith(ex))) {
          continue;
        }

        if (entry.type === 'directory') {
          entries.push({
            path: fullPath,
            type: 'directory',
            created: entry.created,
            modified: entry.modified
          });

          // Recurse into subdirectories
          const subEntries = await getAllVFSEntries(kernel, fullPath, excludePaths);
          entries.push(...subEntries);
        } else if (entry.type === 'file') {
          const content = await kernel.readFile(fullPath);
          entries.push({
            path: fullPath,
            type: 'file',
            size: entry.size,
            created: entry.created,
            modified: entry.modified,
            content: content
          });
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return entries;
  }

  // Backup - Create VFS backup as .kmt file
  shell.registerCommand('backup', async (args, shell) => {
    const schema = {
      description: 'Create backup of VFS to Koma Magnetic Tape (.kmt) format',
      positional: { description: '[label]' },
      flags: {
        'no-compress': { description: 'Disable compression' }
      },
      examples: [
        { command: 'backup', description: 'Create compressed backup' },
        { command: 'backup project-v1', description: 'Create backup with label' },
        { command: 'backup --no-compress', description: 'Create uncompressed backup' }
      ]
    };

    if (argparse.showHelp('backup', args, schema, shell.term)) return;
    const parsed = argparse.parse(args, schema);

    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();

      shell.term.writeln('Creating backup...');

      // Get all VFS entries except /mnt/backups/
      const entries = await getAllVFSEntries(kernel, '/', ['/mnt/backups']);

      // Build entries JSON
      const entriesJSON = JSON.stringify(entries);

      // Generate timestamp for filename
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const label = parsed.positional[0] || 'backup';
      const filename = `backup-${timestamp}-${label}.kmt`;

      // Determine if we should compress
      const shouldCompress = !parsed.flags['no-compress'];

      let data, compressedHash, uncompressedHash, compressedSize, stats;

      if (shouldCompress) {
        shell.term.writeln('Compressing data...');

        // Hash uncompressed
        uncompressedHash = await computeSHA256(entriesJSON);

        // Compress
        const compressed = await compressString(entriesJSON);

        // Hash compressed
        compressedHash = await computeSHA256(compressed);

        // Base64 encode
        data = btoa(compressed);
        compressedSize = compressed.length;

        stats = {
          files: entries.filter(e => e.type === 'file').length,
          directories: entries.filter(e => e.type === 'directory').length,
          size_uncompressed: entriesJSON.length,
          size_compressed: compressedSize,
          compression_ratio: `${(100 - (compressedSize / entriesJSON.length * 100)).toFixed(1)}%`
        };
      } else {
        // No compression
        uncompressedHash = await computeSHA256(entriesJSON);
        data = utf8ToBase64(entriesJSON);

        stats = {
          files: entries.filter(e => e.type === 'file').length,
          directories: entries.filter(e => e.type === 'directory').length,
          size: entriesJSON.length
        };
      }

      // Build backup structure
      const backup = {
        format: 'kmt',
        version: '1.0',
        created: now.toISOString(),
        label: label,
        compression: shouldCompress ? 'gzip' : 'none',
        checksum: {
          uncompressed: `sha256:${uncompressedHash}`,
          ...(shouldCompress && { compressed: `sha256:${compressedHash}` })
        },
        stats: stats,
        data: data
      };

      // Convert to JSON
      const backupJSON = JSON.stringify(backup, null, 2);

      // Create download
      const blob = new Blob([backupJSON], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      // Show stats
      shell.term.writeln('');
      shell.term.writeln(`\x1b[32mBackup created: ${filename}\x1b[0m`);
      shell.term.writeln(`  Files: ${stats.files}`);
      shell.term.writeln(`  Directories: ${stats.directories}`);
      if (shouldCompress) {
        shell.term.writeln(`  Size: ${(stats.size_compressed / 1024).toFixed(1)} KB (compressed)`);
        shell.term.writeln(`  Uncompressed: ${(stats.size_uncompressed / 1024).toFixed(1)} KB`);
        shell.term.writeln(`  Compression: ${stats.compression_ratio}`);
      } else {
        shell.term.writeln(`  Size: ${(stats.size / 1024).toFixed(1)} KB`);
      }
      shell.term.writeln(`  Checksum: ${uncompressedHash.slice(0, 16)}...`);

    } catch (error) {
      shell.term.writeln(`\x1b[31merror: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'Create VFS backup (.kmt tape format)',
    category: 'filesystem'
  });

  // Restore - Restore VFS from .kmt backup
  shell.registerCommand('restore', async (args, shell) => {
    const schema = {
      description: 'Restore VFS from Koma Magnetic Tape (.kmt) backup',
      positional: { description: '<file>' },
      flags: {
        'apply': { description: 'Apply staged backup' },
        'now': { description: 'Verify and apply immediately (skip staging)' }
      },
      examples: [
        { command: 'restore backup.kmt', description: 'Verify and stage backup' },
        { command: 'restore backup.kmt --apply', description: 'Apply staged backup' },
        { command: 'restore backup.kmt --now', description: 'Verify and apply immediately' }
      ]
    };

    if (argparse.showHelp('restore', args, schema, shell.term)) return;
    const parsed = argparse.parse(args, schema);

    if (!parsed.positional[0]) {
      shell.term.writeln('\x1b[31merror: missing backup file\x1b[0m');
      return;
    }

    try {
      const { kernelClient } = await import('../kernel/client.js');
      const kernel = await kernelClient.getKernel();

      const backupPath = parsed.positional[0].startsWith('/')
        ? parsed.positional[0]
        : `/mnt/backups/${parsed.positional[0]}`;

      // If --apply, restore from staged backup
      if (parsed.flags.apply) {
        shell.term.writeln(`Restoring from ${backupPath}...`);

        // Read backup file
        const backupJSON = await kernel.readFile(backupPath);
        const backup = JSON.parse(backupJSON);

        // Decompress and parse entries
        let entriesJSON;
        if (backup.compression === 'gzip') {
          const compressedData = atob(backup.data);
          entriesJSON = await decompressString(compressedData);
        } else {
          entriesJSON = base64ToUtf8(backup.data);
        }

        const entries = JSON.parse(entriesJSON);

        // Clear VFS (except /mnt/backups/)
        shell.term.writeln('Clearing current VFS...');
        const topLevelDirs = await kernel.readdir('/');

        for (const entry of topLevelDirs) {
          const fullPath = `/${entry.name}`;

          // Skip /mnt/backups/
          if (fullPath.startsWith('/mnt/backups')) {
            continue;
          }

          try {
            if (entry.type === 'directory') {
              await kernel.unlinkRecursive(fullPath);
            } else {
              await kernel.unlink(fullPath);
            }
          } catch (e) {
            // Ignore errors
          }
        }

        // Restore entries - Sort so directories come before files, and by path depth
        shell.term.writeln('Restoring files...');
        const sortedEntries = entries.slice().sort((a, b) => {
          // Directories first
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          // Then by path depth (parent directories before children)
          const aDepth = a.path.split('/').length;
          const bDepth = b.path.split('/').length;
          return aDepth - bDepth;
        });

        for (const entry of sortedEntries) {
          if (entry.type === 'directory') {
            try {
              await kernel.mkdir(entry.path);
            } catch (e) {
              // Directory might exist
            }
          } else if (entry.type === 'file') {
            await kernel.writeFile(entry.path, entry.content);
          }
        }

        shell.term.writeln('');
        shell.term.writeln(`\x1b[32mRestored ${backup.stats.files} files from ${backup.label}\x1b[0m`);
        return;
      }

      // Otherwise, verify and stage (or apply with --now)
      shell.term.writeln('Reading backup file...');

      // For initial load, we need file input from user
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.kmt,application/json';

      input.onchange = async (e) => {
        try {
          const file = e.target.files[0];
          if (!file) return;

          const backupJSON = await file.text();
          const backup = JSON.parse(backupJSON);

          // Verify format
          if (backup.format !== 'kmt') {
            shell.term.writeln('\x1b[31merror: invalid backup format\x1b[0m');
            shell.writePrompt();
            return;
          }

          shell.term.writeln('Verifying backup...');

          // Decompress if needed
          let entriesJSON;
          if (backup.compression === 'gzip') {
            const compressedData = atob(backup.data);

            // Verify compressed hash
            const compressedHash = await computeSHA256(compressedData);
            const expectedCompressed = backup.checksum.compressed.replace('sha256:', '');
            if (compressedHash !== expectedCompressed) {
              shell.term.writeln('\x1b[31merror: backup file is corrupted (compressed hash mismatch)\x1b[0m');
              shell.writePrompt();
              return;
            }

            entriesJSON = await decompressString(compressedData);
          } else {
            entriesJSON = base64ToUtf8(backup.data);
          }

          // Verify uncompressed hash
          const uncompressedHash = await computeSHA256(entriesJSON);
          const expectedUncompressed = backup.checksum.uncompressed.replace('sha256:', '');
          if (uncompressedHash !== expectedUncompressed) {
            shell.term.writeln('\x1b[31merror: backup data is corrupted (uncompressed hash mismatch)\x1b[0m');
            shell.writePrompt();
            return;
          }

          // Show metadata
          shell.term.writeln('');
          shell.term.writeln('\x1b[32m✓ Backup verified\x1b[0m');
          shell.term.writeln('');
          shell.term.writeln(`  Format: kmt v${backup.version}`);
          shell.term.writeln(`  Created: ${backup.created}`);
          shell.term.writeln(`  Label: ${backup.label}`);
          shell.term.writeln(`  Files: ${backup.stats.files}`);
          shell.term.writeln(`  Directories: ${backup.stats.directories}`);
          if (backup.compression === 'gzip') {
            shell.term.writeln(`  Size: ${(backup.stats.size_compressed / 1024).toFixed(1)} KB (compressed)`);
            shell.term.writeln(`  Compression: ${backup.stats.compression_ratio}`);
          } else {
            shell.term.writeln(`  Size: ${(backup.stats.size / 1024).toFixed(1)} KB`);
          }
          shell.term.writeln(`  Checksum: ✓ Valid`);
          shell.term.writeln('');

          // If --now, apply immediately
          if (parsed.flags.now) {
            shell.term.writeln('Applying backup...');
            const entries = JSON.parse(entriesJSON);

            // Clear VFS (except /mnt/backups/)
            const topLevelDirs = await kernel.readdir('/');

            for (const entry of topLevelDirs) {
              const fullPath = `/${entry.name}`;

              // Skip /mnt/backups/
              if (fullPath.startsWith('/mnt/backups')) {
                continue;
              }

              try {
                if (entry.type === 'directory') {
                  await kernel.unlinkRecursive(fullPath);
                } else {
                  await kernel.unlink(fullPath);
                }
              } catch (e) {
                // Ignore errors
              }
            }

            // Restore - Sort entries by type and depth
            const sortedEntries = entries.slice().sort((a, b) => {
              // Directories first
              if (a.type === 'directory' && b.type !== 'directory') return -1;
              if (a.type !== 'directory' && b.type === 'directory') return 1;
              // Then by path depth (parent directories before children)
              const aDepth = a.path.split('/').length;
              const bDepth = b.path.split('/').length;
              return aDepth - bDepth;
            });

            for (const entry of sortedEntries) {
              if (entry.type === 'directory') {
                try {
                  await kernel.mkdir(entry.path);
                } catch (e) {
                  // Directory might exist
                }
              } else if (entry.type === 'file') {
                await kernel.writeFile(entry.path, entry.content);
              }
            }

            shell.term.writeln(`\x1b[32mRestored ${backup.stats.files} files from ${backup.label}\x1b[0m`);
          } else {
            // Stage to /mnt/backups/
            const backupFilename = file.name;
            const stagePath = `/mnt/backups/${backupFilename}`;

            // Ensure /mnt/backups exists
            try {
              await kernel.mkdir('/mnt/backups');
            } catch (e) {
              // Already exists
            }

            await kernel.writeFile(stagePath, backupJSON);

            shell.term.writeln(`Backup staged to: ${stagePath}`);
            shell.term.writeln('');
            shell.term.writeln(`Run '\x1b[1mrestore ${backupFilename} --apply\x1b[0m' to restore.`);
          }

          shell.writePrompt();
        } catch (error) {
          shell.term.writeln(`\x1b[31merror: ${error.message}\x1b[0m`);
          shell.writePrompt();
        }
      };

      input.click();

    } catch (error) {
      shell.term.writeln(`\x1b[31merror: ${error.message}\x1b[0m`);
    }
  }, {
    description: 'Restore VFS from tape backup (.kmt)',
    category: 'filesystem'
  });

  // test command - Evaluate conditional expressions
  shell.registerCommand('test', test, {
    description: 'Evaluate conditional expression',
    category: 'shell'
  });

  // [ command - Alias for test (requires closing ])
  shell.registerCommand('[', test, {
    description: 'Evaluate conditional expression (requires ])',
    category: 'shell'
  });

  // schist command - Lisp/Scheme interpreter
  shell.registerCommand('schist', async (args, shell, context) => {
    const schema = {
      description: 'Schist - A minimal Lisp/Scheme interpreter',
      flags: {
        '-i': 'Interactive REPL mode',
        '-e': 'Evaluate expression from arguments'
      },
      positional: { description: '[file.scm]' },
      examples: [
        { command: 'schist -i', description: 'Start interactive REPL' },
        { command: 'schist -e "(+ 1 2 3)"', description: 'Evaluate expression' },
        { command: 'schist -e "(list 1 2 3)"', description: 'Create list' },
        { command: 'schist -e "(car (list 1 2 3))"', description: 'Get first element' },
        { command: 'schist -e "(if (= 1 1) \\'yes \\'no)"', description: 'Conditional' },
        { command: 'schist -e "((lambda (x) (* x x)) 5)"', description: 'Lambda function' },
        { command: 'schist examples/metacircular.scm', description: 'Run Schist file' }
      ],
      notes: [
        'Built-in functions:',
        '  Arithmetic: +, -, *, /',
        '  Comparison: =, eq, <, >, <=, >=',
        '  Lists: list, car, cdr, cons, length, null?',
        '  Logic: not, and, or',
        '  Types: number?, symbol?, list?, function?',
        '  Meta: eval, apply',
        '  I/O: display, write, print, newline, read',
        '',
        'Special forms:',
        '  quote, if, cond, lambda, define, set!',
        '  begin, let',
        '',
        'Supports metacircular evaluation - write Lisp in Lisp!',
        'Named after the metamorphic rock (layered like s-expressions)'
      ]
    };

    if (argparse.showHelp('schist', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    try {
      // -i flag: Interactive REPL mode
      if (parsed.flags['-i'] !== undefined) {
        context.writeln('Schist REPL v1.0');
        context.writeln('Type expressions to evaluate, Ctrl+C to exit');
        context.writeln('');

        const env = createSchistEnv();

        while (true) {
          // Read input
          const input = await context.readLine('schist> ');

          // Ctrl+C returns null
          if (input === null) {
            context.writeln('');
            return 0;
          }

          // Skip empty lines
          const trimmed = input.trim();
          if (!trimmed) continue;

          // Skip comments
          if (trimmed.startsWith(';')) continue;

          try {
            // Parse and evaluate
            const expr = parseSchist(trimmed);
            const result = await evaluateSchist(expr, env, context);

            // Handle special I/O return values
            if (typeof result === 'object' && result !== null) {
              if (result.type === 'display') {
                context.write(schistToString(result.value));
                continue;
              }
              if (result.type === 'write') {
                context.write(schistWrite(result.value));
                continue;
              }
              if (result.type === 'print') {
                context.writeln(schistToString(result.value));
                continue;
              }
              if (result.type === 'newline') {
                context.writeln('');
                continue;
              }
            }

            // Show result (unless it's undefined, like define)
            if (result !== undefined) {
              context.writeln(schistToString(result));
            }
          } catch (error) {
            context.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
          }
        }
      }

      // -e flag: evaluate expression
      if (parsed.flags['-e'] !== undefined) {
        const exprIndex = args.indexOf('-e');
        if (exprIndex === -1 || exprIndex + 1 >= args.length) {
          showError(shell.term, 'schist', 'missing expression after -e');
          return 1;
        }

        const exprStr = args[exprIndex + 1];
        const expr = parseSchist(exprStr);
        const env = createSchistEnv();
        const result = await evaluateSchist(expr, env, context);
        context.writeln(schistToString(result));
        return 0;
      }

      // File execution
      if (parsed.positional.length > 0) {
        const kernel = await getKernel();
        const filePath = resolvePath(parsed.positional[0], shell.cwd);

        // Read file
        const content = await kernel.readFile(filePath);
        const lines = content.split('\n');

        // Execute each line
        const env = createSchistEnv();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(';')) continue; // Skip comments and blank lines

          const expr = parseSchist(trimmed);
          const result = await evaluateSchist(expr, env, context);

          // Only show result if it's not undefined (like define)
          if (result !== undefined) {
            context.writeln(schistToString(result));
          }
        }
        return 0;
      }

      // No args: show help
      showError(shell.term, 'schist', 'missing expression or file');
      shell.term.writeln('Usage: schist -e "<expression>" or schist <file.scm>');
      return 1;

    } catch (error) {
      showError(shell.term, 'schist', error.message);
      return 1;
    }
  }, {
    description: 'Schist Lisp/Scheme interpreter',
    category: 'shell'
  });
}
