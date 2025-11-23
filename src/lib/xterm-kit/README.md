# xterm-kit

**Terminal utilities for xterm.js applications**

A comprehensive, zero-dependency toolkit for building shell-like applications in the browser. Includes argument parsing, virtual filesystem, interactive paging, progress indicators, and more.

Extracted from [koma](https://github.com/your-org/koma) - battle-tested in production.

## Features

- 🎯 **Argument Parsing** - Schema-based CLI argument parsing
- 📁 **Virtual Filesystem** - Browser-based file storage (IndexedDB/Memory)
- 📖 **Interactive Pager** - less-like text viewer with search
- 🎨 **Theming** - Configurable color schemes
- 📊 **Tables & Boxes** - Formatted data display
- ⏳ **Progress Indicators** - Spinners and progress bars
- ⌨️  **Key Handling** - Simplified keyboard input
- ⚡ **Tab Completion** - Bash-style autocomplete with flag/option completion
- 📋 **Command Registry** - Central command management with schema storage
- 💅 **Output Formatting** - Colors, sizing, dates
- 🔍 **Command Parsing** - Quote-aware tokenization

## Installation

### From CDN (jsDelivr) - Recommended for External Projects

Use xterm-kit directly from GitHub via jsDelivr CDN:

```javascript
// Use specific version (recommended)
import { parse, showSuccess, Pager, VFSLite } from 'https://cdn.jsdelivr.net/gh/endar/koma@v1.1.0/src/lib/xterm-kit/index.js';

// Or use latest from main branch
import { parse, showSuccess, Pager, VFSLite } from 'https://cdn.jsdelivr.net/gh/endar/koma@main/src/lib/xterm-kit/index.js';

// Individual modules
import { Pager } from 'https://cdn.jsdelivr.net/gh/endar/koma@v1.1.0/src/lib/xterm-kit/pager.js';
```

**Benefits:**
- No installation or copying needed
- Version pinning with git tags
- Fast global CDN
- Perfect for ES modules and import maps
- Always up-to-date

**In your import map:**
```html
<script type="importmap">
{
  "imports": {
    "xterm-kit": "https://cdn.jsdelivr.net/gh/endar/koma@v1.1.0/src/lib/xterm-kit/index.js",
    "xterm-kit/": "https://cdn.jsdelivr.net/gh/endar/koma@v1.1.0/src/lib/xterm-kit/"
  }
}
</script>
```

Then use:
```javascript
import { parse, Pager } from 'xterm-kit';
import { VFSLite } from 'xterm-kit/vfs-lite.js';
```

### Local Copy (For Offline-First Apps)

Copy the `xterm-kit/` folder to your project:

```javascript
import { parse, showSuccess, Pager, VFSLite } from './lib/xterm-kit/index.js';
```

### Individual Modules

```javascript
import { parse } from './lib/xterm-kit/argparse.js';
import { showSuccess } from './lib/xterm-kit/output.js';
import { Pager } from './lib/xterm-kit/pager.js';
import { VFSLite } from './lib/xterm-kit/vfs-lite.js';
```

## Quick Start

```javascript
import { Terminal } from 'xterm';
import { setTheme, olivineTheme, showSuccess, Pager, VFSLite } from './lib/xterm-kit/index.js';

const term = new Terminal();
term.open(document.getElementById('terminal'));

// Set global theme
setTheme(olivineTheme);

// Show colored output
showSuccess(term, 'Terminal initialized!');

// Use interactive pager
const pager = new Pager(term);
await pager.show(longContent);

// Create virtual filesystem
const vfs = new VFSLite({ backend: 'indexeddb', dbName: 'myapp' });
await vfs.writeFile('/config.json', JSON.stringify(config));
```

## Modules

### 1. Argument Parsing (`argparse.js`)

Schema-based command-line argument parsing with flags, options, and validation.

```javascript
import { parse, usage, hasHelp, showHelp } from './lib/xterm-kit/argparse.js';

const schema = {
  description: 'List directory contents',
  flags: {
    all: { short: 'a', description: 'Show hidden files' },
    long: { short: 'l', description: 'Long format' },
  },
  options: {
    sort: { short: 's', description: 'Sort by', choices: ['name', 'size', 'date'] }
  },
  positional: { description: '[directory]' },
  examples: [
    { command: 'ls -la', description: 'List all files in long format' },
    { command: 'ls --sort=size /tmp', description: 'List /tmp sorted by size' }
  ]
};

const parsed = parse(args, schema);
// {
//   flags: { all: true, long: true },
//   options: { sort: 'size' },
//   positional: ['/tmp'],
//   errors: []
// }

// Show help if requested
if (hasHelp(args)) {
  showHelp('ls', args, schema, term);
  return;
}
```

**API:**
- `parse(argv, schema)` - Parse arguments
- `usage(commandName, schema)` - Generate usage text
- `hasHelp(argv)` - Check for help flag
- `showHelp(commandName, argv, schema, term)` - Display help
- `hasFlag(argv, flag)` - Quick flag check
- `getOption(argv, option, defaultValue)` - Quick option get

### 2. Output Formatting (`output.js`)

Colored terminal output and formatting utilities.

```javascript
import { showError, showSuccess, showWarning, showInfo, formatSize, formatDate } from './lib/xterm-kit/output.js';

showError(term, 'ls', 'File not found');     // Red error
showSuccess(term, 'File saved!');            // Green success
showWarning(term, 'Disk almost full');       // Yellow warning
showInfo(term, 'Loading...');                // Gray info

formatSize(1536);                            // '1.5K'
formatDate(new Date());                      // 'Jan 23 14:30'
```

**API:**
- `showError(term, commandOrMessage, message?, theme?)` - Display error
- `showSuccess(term, message, theme?)` - Display success
- `showWarning(term, message, theme?)` - Display warning
- `showInfo(term, message, theme?)` - Display info
- `formatSize(bytes)` - Human-readable file size
- `formatDate(date)` - Terminal-friendly date
- `formatPermissions(type, writable)` - Unix-style permissions
- `wrapText(text, width)` - Wrap text to width
- `pad(str, width, align)` - Pad string
- `truncate(str, width, ellipsis)` - Truncate with ellipsis

### 3. Command Parsing (`parser.js`)

Quote-aware tokenization and simple command parsing.

```javascript
import { tokenize, parseCommand, splitBySemicolon, hasOperators } from './lib/xterm-kit/parser.js';

tokenize('ls -la "My Files"');
// ['ls', '-la', 'My Files']

parseCommand('echo "hello world"');
// { command: 'echo', args: ['hello world'], raw: 'echo "hello world"' }

splitBySemicolon('ls; pwd; echo "test; more"');
// ['ls', 'pwd', 'echo "test; more"']

hasOperators('cat file.txt | grep foo');
// true
```

**API:**
- `tokenize(line)` - Split line into tokens (quote-aware)
- `parseCommand(line)` - Parse into command + args
- `splitBySemicolon(line)` - Split by `;` (quote-aware)
- `hasOperators(line)` - Check for pipes/redirects
- `extractCommand(line)` - Get command name

### 4. Theming (`themes.js`)

Global theme management with built-in presets.

```javascript
import { setTheme, getTheme, createTheme, defaultTheme, olivineTheme, monokaiTheme, solarizedDarkTheme } from './lib/xterm-kit/themes.js';

// Use built-in theme
setTheme(olivineTheme);

// Create custom theme
const myTheme = createTheme({
  colors: {
    success: (text) => `\x1b[35m${text}\x1b[0m`, // Magenta success
  }
});
setTheme(myTheme);

// All components respect global theme
showSuccess(term, 'Uses current theme!');
```

**Built-in themes:**
- `defaultTheme` - Standard terminal colors
- `olivineTheme` - Phosphor green (koma theme)
- `monokaiTheme` - Popular dark theme
- `solarizedDarkTheme` - Precision terminal colors

**API:**
- `setTheme(theme)` - Set global theme
- `getTheme()` - Get current theme
- `resetTheme()` - Reset to default
- `createTheme(overrides)` - Create custom theme

### 5. Interactive Pager (`pager.js`)

less-like text viewer with navigation and search.

```javascript
import { Pager } from './lib/xterm-kit/pager.js';

const pager = new Pager(term, {
  pageSize: 24,             // Lines per page
  showPercent: true,        // Show percentage
  searchCaseSensitive: false,
  theme: olivineTheme
});

await pager.show(longText);  // Blocks until user quits
```

**Keybindings:**
- `Space, f, PgDn` - Page down
- `b, PgUp` - Page up
- `d` - Half page down
- `u` - Half page up
- `j, Down, Enter` - Line down
- `k, Up` - Line up
- `g, Home` - Go to start
- `G, End` - Go to end
- `/` - Start search
- `n` - Next match
- `N` - Previous match
- `q, Esc` - Quit
- `h, ?` - Show help

### 6. Virtual Filesystem (`vfs-lite.js`)

Browser-based filesystem with IndexedDB or memory backend.

```javascript
import { VFSLite } from './lib/xterm-kit/vfs-lite.js';

// Create persistent VFS
const vfs = new VFSLite({ backend: 'indexeddb', dbName: 'myapp' });

// Or ephemeral VFS
const vfs = new VFSLite({ backend: 'memory' });

// File operations
await vfs.writeFile('/config.json', JSON.stringify(config));
const data = await vfs.readFile('/config.json');

// Directory operations
await vfs.mkdir('/downloads');
const entries = await vfs.readdir('/');

// File info
const stats = await vfs.stat('/config.json');
// { type: 'file', size: 123, created: 1234567890, modified: 1234567890 }

// Check existence
const exists = await vfs.exists('/file.txt');

// Delete
await vfs.unlink('/file.txt');

// Backup/restore
const backup = await vfs.exportJSON();
await vfs.importJSON(backup);
```

**API:**
- `readFile(path)` - Read file content
- `writeFile(path, content)` - Write file
- `readdir(path)` - List directory
- `mkdir(path)` - Create directory
- `unlink(path)` - Delete file/directory
- `stat(path)` - Get file info
- `exists(path)` - Check if exists
- `exportJSON()` - Export entire VFS
- `importJSON(data)` - Import VFS dump

### 7. Progress Indicators (`progress.js`)

Spinners and progress bars for long-running operations.

```javascript
import { Spinner, ProgressBar, StepProgress } from './lib/xterm-kit/progress.js';

// Spinner
const spinner = new Spinner(term);
spinner.start('Loading...');
await someOperation();
spinner.succeed('Done!');

// Progress bar
const progress = new ProgressBar(term, { width: 40 });
for (let i = 0; i <= 100; i++) {
  progress.update(i, 100, `Processing ${i}%`);
  await delay(50);
}
progress.complete('Finished!');

// Multi-step progress
const steps = new StepProgress(term, [
  'Download files',
  'Extract archive',
  'Install packages',
  'Configure system'
]);
steps.start(0);
await download();
steps.complete(0);
steps.start(1);
// ...
```

**Spinner API:**
- `start(text)` - Start spinning
- `update(text)` - Update text
- `stop(finalText?, clearLine?)` - Stop spinner
- `succeed(text)` - Stop with success
- `fail(text)` - Stop with error
- `warn(text)` - Stop with warning

**ProgressBar API:**
- `update(current, total?, text?)` - Update progress
- `complete(text?)` - Mark as complete
- `fail(text?)` - Mark as failed

### 8. Table Formatting (`table.js`)

Tabular data display with auto-sizing and alignment.

```javascript
import { Table, renderTable } from './lib/xterm-kit/table.js';

const table = new Table({
  columns: ['Name', 'Size', 'Modified'],
  align: ['left', 'right', 'left'],
  borders: true
});

table.addRow(['file.txt', '1.2K', 'Jan 10 14:30']);
table.addRow(['data.json', '42K', 'Jan 11 09:15']);
table.render(term);

// Quick render
renderTable(term, {
  columns: ['PID', 'Name', 'Status'],
  rows: [
    ['1', 'init', 'running'],
    ['2', 'worker', 'sleeping']
  ],
  align: ['right', 'left', 'left']
});
```

**API:**
- `new Table(options)` - Create table
- `addRow(row)` - Add row (array or object)
- `render(term)` - Display table
- `toLines()` - Get as string array
- `clear()` - Clear rows
- `renderTable(term, options)` - Quick render

### 9. Box Drawing (`box.js`)

Bordered panels and separators.

```javascript
import { Box, renderBox, drawSeparator } from './lib/xterm-kit/box.js';

const box = new Box({
  title: 'Warning',
  style: 'double',  // 'single', 'double', 'rounded', 'heavy', 'ascii'
  width: 60,
  padding: 1
});

box.add('This is a warning message!');
box.add(['Line 1', 'Line 2', 'Line 3']);
box.render(term);

// Quick render
renderBox(term, {
  title: 'Info',
  content: 'This is an info box',
  style: 'rounded',
  width: 40
});

// Separator
drawSeparator(term, 80);
```

**API:**
- `new Box(options)` - Create box
- `add(content)` - Add content
- `render(term)` - Display box
- `toLines()` - Get as string array
- `clear()` - Clear content
- `renderBox(term, options)` - Quick render
- `drawSeparator(term, width?, char?, theme?)` - Draw line

### 10. Key Handling (`keys.js`)

Simplified keyboard input handling.

```javascript
import { KeyHandler, LineEditor, KEYS } from './lib/xterm-kit/keys.js';

// Key handler
const keys = new KeyHandler(term);
keys.on('ctrl+c', () => cancelOperation());
keys.on('up', () => historyPrevious());
keys.on('enter', () => executeCommand());
keys.start();

// Line editor with history
const editor = new LineEditor(term, {
  onSubmit: (line) => console.log('Submitted:', line),
  onCancel: () => console.log('Cancelled'),
  history: ['previous', 'commands']
});
editor.start();

// Check keys manually
if (KeyHandler.matches(data, 'ctrl+c')) {
  // Handle Ctrl+C
}
```

**Key constants:**
- `KEYS.CTRL_C`, `KEYS.CTRL_D`, `KEYS.CTRL_L`, `KEYS.CTRL_Z`
- `KEYS.UP`, `KEYS.DOWN`, `KEYS.LEFT`, `KEYS.RIGHT`
- `KEYS.HOME`, `KEYS.END`, `KEYS.PAGE_UP`, `KEYS.PAGE_DOWN`
- `KEYS.BACKSPACE`, `KEYS.DELETE`, `KEYS.TAB`, `KEYS.ENTER`, `KEYS.ESCAPE`

**KeyHandler API:**
- `on(key, handler)` - Register key binding
- `off(key)` - Unregister binding
- `onDefault(handler)` - Set default handler
- `start()` - Start listening
- `stop()` - Stop listening
- `static matches(data, key)` - Check if data matches key
- `static isPrintable(data)` - Check if printable
- `static isControl(data)` - Check if control key

**LineEditor API:**
- `new LineEditor(term, options)` - Create editor
- `start()` - Start editing
- `stop()` - Stop editing

### 11. Command Registry (`command-registry.js`)

Central command management with schema storage. Enables intelligent autocomplete with flag/option completion.

```javascript
import { CommandRegistry } from './lib/xterm-kit/command-registry.js';

const registry = new CommandRegistry();

// Register command with full schema
registry.register('ls', {
  description: 'List directory contents',
  category: 'filesystem',
  schema: {
    description: 'List files and directories',
    flags: {
      long: { short: 'l', description: 'Long format' },
      all: { short: 'a', description: 'Show hidden files' }
    },
    options: {
      format: {
        description: 'Output format',
        choices: ['json', 'yaml', 'table']
      }
    }
  },
  handler: lsCommand  // Optional
});

// Get command metadata
const cmd = registry.getCommand('ls');
const schema = registry.getSchema('ls');
const handler = registry.getHandler('ls');

// Query commands
const allCommands = registry.getCommands();
const filesystemCmds = registry.getCommands('filesystem');
const categories = registry.getCategories();
const byCategory = registry.getByCategory();

// Management
registry.has('ls');      // true
registry.unregister('ls');
registry.clear();
registry.size();         // Number of commands
```

**API:**
- `register(name, metadata)` - Register command with schema
- `getCommand(name)` - Get command metadata
- `getSchema(name)` - Get argparse schema
- `getHandler(name)` - Get handler function
- `getCommands(category?)` - Get all commands
- `getCategories()` - Get all categories
- `has(name)` / `unregister(name)` / `clear()` - Management

### 12. Tab Completion (`autocomplete.js`)

Intelligent command and argument completion with bash-style behavior and schema-based flag/option completion.

```javascript
import { Autocomplete, createTabHandler } from './lib/xterm-kit/autocomplete.js';
import { CommandRegistry } from './lib/xterm-kit/command-registry.js';

// Option 1: With CommandRegistry (RECOMMENDED - unlocks schema-based completion!)
const registry = new CommandRegistry();
registry.register('ls', {
  schema: {
    flags: { long: { short: 'l' }, all: { short: 'a' } },
    options: { format: { choices: ['json', 'yaml', 'table'] } }
  }
});

const completer = new Autocomplete({ registry });

// Now autocomplete supports:
// ls --<tab>        → --long, --all, --format
// ls -<tab>         → -l, -a
// ls --format <tab> → json, yaml, table

// Option 2: Static command/subcommand lists (no schema support)
const completer = new Autocomplete({
  commands: ['help', 'books', 'status', 'clear'],
  subcommands: {
    'books': ['list', 'search', 'add'],
    'status': ['show', 'daemon']
  }
});

// Option 3: With custom completion functions
const completer = new Autocomplete({
  commands: ['cat', 'ls', 'cd'],
  completers: {
    'cat': async (partial) => {
      // Return matching file names
      const files = await vfs.readdir('/');
      return files.filter(f => f.name.startsWith(partial)).map(f => f.name);
    }
  }
});

// Integrate with input handler
const state = { currentLine: '', cursorPos: 0 };

const handleTab = createTabHandler(term, completer, state, (line) => {
  // Redraw prompt + line
  term.write('\r\x1b[K\x1b[32m$\x1b[0m ' + line);
});

term.onData(data => {
  if (data === '\t') {  // Tab key
    handleTab();
  } else if (data === '\r') {  // Enter
    // Execute command
  } else {
    // Handle regular input
    state.currentLine += data;
    state.cursorPos++;
  }
});

// Manual completion (without tab handler)
const result = completer.complete('boo', 3);
// {
//   line: 'books',
//   cursor: 5,
//   completions: ['books'],
//   action: 'completed'
// }

// Get completion options only
const options = completer.getCompletions('books ');
// {
//   completions: ['list', 'search', 'add'],
//   partial: '',
//   type: 'subcommand',
//   level: 1
// }
```

**Completion Behavior:**
- **Single match**: Auto-completes immediately
- **Multiple matches**: Shows options (bash-style)
- **No matches**: Silent (like real terminals)
- **Multi-level**: Commands → subcommands → flags → option values → custom completers
- **Schema-based**: Auto-completes --flags, -f, and option choices from argparse schemas

**API:**
- `new Autocomplete(options)` - Create completer
- `complete(line, cursorPos?)` - Apply completion
- `getCompletions(line, cursorPos?)` - Get completion options
- `addCompleter(context, fn)` - Add custom completer
- `setCommands(commands)` - Update command list
- `setSubcommands(subcommands)` - Update subcommand map
- `refresh()` - Re-sync from registry
- `createTabHandler(term, completer, state, redrawFn)` - Create Tab key handler
- `fromRegistry(registry, subcommands?)` - Create from command registry

**Options:**
- `commands`: Static list of command names
- `subcommands`: Map of command → subcommands
- `registry`: CommandRegistry with `getCommands()` method
- `completers`: Map of context → completion functions
- `caseSensitive`: Case-sensitive matching (default: false)

## Status Indicators (`indicators.js`)

4-LED status indicator system (SYS, DISK, NET, USER).

```javascript
import { StatusIndicators } from './lib/xterm-kit/indicators.js';

// With DOM elements
const indicators = new StatusIndicators({
  sysElement: '.indicator[data-status="sys"] .indicator-light',
  diskElement: '.indicator[data-status="disk"] .indicator-light',
  netElement: '.indicator[data-status="net"] .indicator-light',
  userElement: '.indicator[data-status="user"] .indicator-light'
});

indicators.init();  // Boot sequence

// Flash indicators
indicators.diskActivity();  // Auto-dims after 300ms
indicators.netActivity();   // Auto-dims after 500ms
indicators.userActivity('on', 1000);  // Custom duration

// Wrap operations
await indicators.wrapDiskActivity(vfs.writeFile('/file.txt', data));
await indicators.wrapNetActivity(fetch('https://api.example.com'));

// Headless mode (state tracking only)
const indicators = new StatusIndicators({ headless: true });
indicators.diskActivity();
console.log(indicators.getState());  // { sys: 'active', disk: 'active', ... }
```

## Complete Example

```javascript
import { Terminal } from 'xterm';
import {
  setTheme,
  olivineTheme,
  parse,
  showSuccess,
  showError,
  Pager,
  VFSLite,
  Spinner,
  Table,
  renderBox
} from './lib/xterm-kit/index.js';

const term = new Terminal();
term.open(document.getElementById('terminal'));

// Set theme
setTheme(olivineTheme);

// Create VFS
const vfs = new VFSLite({ backend: 'indexeddb', dbName: 'myapp' });

// Command: ls
async function ls(args) {
  const schema = {
    description: 'List directory contents',
    flags: {
      long: { short: 'l', description: 'Long format' },
    }
  };

  const parsed = parse(args, schema);
  const path = parsed.positional[0] || '/';

  try {
    const entries = await vfs.readdir(path);

    if (parsed.flags.long) {
      // Table format
      const table = new Table({
        columns: ['Name', 'Type', 'Size'],
        align: ['left', 'left', 'right']
      });

      for (const entry of entries) {
        table.addRow([entry.name, entry.type, formatSize(entry.size)]);
      }

      table.render(term);
    } else {
      // Simple list
      entries.forEach(e => term.writeln(e.name));
    }

    showSuccess(term, `Listed ${entries.length} items`);
  } catch (error) {
    showError(term, 'ls', error.message);
  }
}

// Command: download
async function download(url) {
  const spinner = new Spinner(term);
  spinner.start(`Downloading ${url}...`);

  try {
    const response = await fetch(url);
    const content = await response.text();
    const filename = url.split('/').pop();

    await vfs.writeFile(`/downloads/${filename}`, content);

    spinner.succeed(`Downloaded ${filename}`);
  } catch (error) {
    spinner.fail(`Download failed: ${error.message}`);
  }
}

// Command: man
async function man(command) {
  const content = await vfs.readFile(`/usr/share/man/${command}.1.md`);
  const pager = new Pager(term);
  await pager.show(content);
}
```

## License

MIT

## Credits

Extracted from [koma](https://github.com/your-org/koma) - a browser-resident automation workstation.

Built with industrial minimalism and retrospec engineering principles.
