/**
 * Koma Built-in Commands
 */

export function registerBuiltins(shell, tabManager = null) {
  // Help command
  shell.registerCommand('help', (args, shell) => {
    shell.term.writeln('Available commands:');
    shell.term.writeln('');
    shell.term.writeln('  \x1b[32mhelp\x1b[0m       - Show this help message');
    shell.term.writeln('  \x1b[32mclear\x1b[0m      - Clear the terminal screen');
    shell.term.writeln('  \x1b[32mecho\x1b[0m       - Echo arguments to output');
    shell.term.writeln('  \x1b[32mpwd\x1b[0m        - Print working directory');
    shell.term.writeln('  \x1b[32mcd\x1b[0m         - Change directory');
    shell.term.writeln('  \x1b[32mls\x1b[0m         - List directory contents');
    shell.term.writeln('  \x1b[32menv\x1b[0m        - Show environment variables');
    shell.term.writeln('  \x1b[32mhistory\x1b[0m    - Show command history');
    shell.term.writeln('  \x1b[32mversion\x1b[0m    - Show version information');
    if (tabManager) {
      shell.term.writeln('  \x1b[32mexit\x1b[0m       - Close current tab');
    }
    shell.term.writeln('');
    shell.term.writeln('Keyboard shortcuts:');
    shell.term.writeln('  Ctrl+C   - Cancel current line');
    shell.term.writeln('  Ctrl+L   - Clear screen');
    shell.term.writeln('  Up/Down  - Navigate command history');
    shell.term.writeln('');
    shell.term.writeln('Command mode (Ctrl+K):');
    shell.term.writeln('  Ctrl+K   - Enter command mode');
    shell.term.writeln('  n        - Next tab');
    shell.term.writeln('  p        - Previous tab');
    shell.term.writeln('  t        - New tab');
    shell.term.writeln('  w        - Close tab');
    shell.term.writeln('  1-9      - Jump to tab N');
    shell.term.writeln('  Esc      - Cancel command mode');
  });

  // Clear screen
  shell.registerCommand('clear', (args, shell) => {
    shell.term.clear();
  });

  // Echo command
  shell.registerCommand('echo', (args, shell) => {
    shell.term.writeln(args.join(' '));
  });

  // Print working directory
  shell.registerCommand('pwd', (args, shell) => {
    shell.term.writeln(shell.cwd);
  });

  // Change directory
  shell.registerCommand('cd', (args, shell) => {
    const path = args[0] || '~';
    shell.cd(path);
  });

  // List directory (mock for now)
  shell.registerCommand('ls', (args, shell) => {
    // Mock directory listing until we have VFS
    const mockDirs = {
      '/': ['home', 'tmp', 'usr', 'mnt', 'proc'],
      '/home': ['projects', 'scripts', '.bashrc'],
      '/tmp': [],
      '/usr': ['bin', 'lib'],
      '/proc': ['self', 'cpuinfo', 'meminfo'],
    };

    const contents = mockDirs[shell.cwd] || [];

    if (contents.length === 0) {
      shell.term.writeln('(empty)');
      return;
    }

    const hasLongFlag = args.includes('-l') || args.includes('-la') || args.includes('-al');

    if (hasLongFlag) {
      // Long format
      contents.forEach(item => {
        const isDir = !item.startsWith('.');
        const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
        const size = isDir ? '4096' : '1024';
        const date = new Date().toISOString().slice(0, 10);
        shell.term.writeln(`${perms}  1 koma koma ${size.padStart(6)} ${date} ${item}`);
      });
    } else {
      // Simple format
      const dirColor = '\x1b[34m'; // Blue
      const fileColor = '\x1b[0m';  // Default
      const reset = '\x1b[0m';

      const colored = contents.map(item => {
        const isDir = !item.startsWith('.');
        return isDir ? `${dirColor}${item}${reset}` : `${fileColor}${item}${reset}`;
      });

      shell.term.writeln(colored.join('  '));
    }
  });

  // Environment variables
  shell.registerCommand('env', (args, shell) => {
    Object.entries(shell.env).forEach(([key, value]) => {
      shell.term.writeln(`${key}=${value}`);
    });
  });

  // Command history
  shell.registerCommand('history', (args, shell) => {
    shell.history.forEach((cmd, i) => {
      const num = (i + 1).toString().padStart(4);
      shell.term.writeln(`${num}  ${cmd}`);
    });
  });

  // Version info
  shell.registerCommand('version', (args, shell) => {
    shell.term.writeln('\x1b[38;5;208mKoma Terminal v0.1\x1b[0m');
    shell.term.writeln('Browser-resident automation workstation');
    shell.term.writeln('');
    shell.term.writeln('Running on:');
    shell.term.writeln(`  User Agent: ${navigator.userAgent.split(' ').slice(-2).join(' ')}`);
    shell.term.writeln(`  Platform: ${navigator.platform}`);
  });

  // Exit - close current tab
  shell.registerCommand('exit', (args, shell) => {
    if (tabManager) {
      // Close the current tab
      tabManager.closeTab(tabManager.activeTabId);
    } else {
      shell.term.writeln('Tab management: Click tabs to switch, [+] to create');
    }
  });
}
