# xterm-kit API Reference (LLM-Optimized)

**For AI Assistants**: This document is optimized for LLM consumption. Use this when helping users implement xterm-kit features.

## Quick Module Selection Guide

**User wants to...** → **Use this module**

- Parse command arguments → `argparse.js`
- Show colored messages → `output.js` + `themes.js`
- Parse command line text → `parser.js`
- Display long text interactively → `pager.js`
- Store files in browser → `vfs-lite.js`
- Show loading spinner → `progress.js` (Spinner)
- Show progress bar → `progress.js` (ProgressBar)
- Display tabular data → `table.js`
- Draw boxes/borders → `box.js`
- Handle keyboard input → `keys.js`
- Show status LEDs → `indicators.js`
- Manage commands with metadata → `command-registry.js`
- Add tab completion → `autocomplete.js`
- Complete flags/options intelligently → `command-registry.js` + `autocomplete.js`

## Module-by-Module Reference

### argparse.js - Command Argument Parsing

**When to use**: User needs to parse CLI arguments with flags, options, validation

**Core function**: `parse(argv, schema)`

**Schema structure**:
```javascript
{
  description: string,           // Command description
  flags: {                        // Boolean flags
    flagName: {
      short: 'f',                 // Short form (-f)
      description: string         // Help text
    }
  },
  options: {                      // Value options
    optionName: {
      short: 'o',                 // Short form (-o)
      description: string,        // Help text
      choices: ['a', 'b'],       // Valid values (optional)
      default: 'value'            // Default value (optional)
    }
  },
  positional: {
    description: '<arg1> [arg2]'  // Positional args help
  },
  examples: [                     // Usage examples
    { command: 'cmd -f arg', description: 'Description' }
  ]
}
```

**Returns**:
```javascript
{
  flags: { flagName: true/false },
  options: { optionName: 'value' },
  positional: ['arg1', 'arg2'],
  errors: ['error messages'],
  _: ['arg1', 'arg2']  // Alias for positional
}
```

**Common pattern**:
```javascript
import { parse, hasHelp, showHelp } from './lib/xterm-kit/argparse.js';

async function myCommand(args, shell, context) {
  const schema = { /* ... */ };

  // Check for help first
  if (hasHelp(args)) {
    showHelp('mycommand', args, schema, shell.term);
    return 0;
  }

  const parsed = parse(args, schema);

  // Check for errors
  if (parsed.errors.length > 0) {
    parsed.errors.forEach(err => shell.term.writeln(`Error: ${err}`));
    return 1;
  }

  // Use parsed arguments
  const isVerbose = parsed.flags.verbose;
  const outputFile = parsed.options.output;
  const inputFiles = parsed.positional;

  // ... implement command
  return 0;
}
```

**Functions**:
- `parse(argv, schema)` - Main parsing function
- `usage(commandName, schema)` - Generate help text (returns string[])
- `hasHelp(argv)` - Check if --help/-h present
- `showHelp(commandName, argv, schema, term)` - Display help and return true if shown
- `hasFlag(argv, 'flagname')` - Quick flag check
- `getOption(argv, 'optname', defaultValue)` - Quick option get

---

### output.js - Terminal Output Formatting

**When to use**: User needs colored output, formatted data, or text manipulation

**Theme-aware**: All functions accept optional `theme` parameter (uses global theme if omitted)

**Display functions**:
```javascript
import { showError, showSuccess, showWarning, showInfo } from './lib/xterm-kit/output.js';

// Two signatures for showError:
showError(term, 'Error message');              // Just message
showError(term, 'command', 'Error message');   // Command + message

showSuccess(term, 'Operation succeeded');      // Green
showWarning(term, 'Warning message');          // Yellow
showInfo(term, 'Info message');                // Gray/dim
```

**Formatting functions**:
```javascript
import { formatSize, formatDate, formatPermissions, wrapText, pad, truncate } from './lib/xterm-kit/output.js';

formatSize(1536)           // '1.5K'
formatSize(1048576)        // '1.0M'

formatDate(new Date())     // 'Jan 23 14:30' (current year) or 'Jan 23  2024' (other year)

formatPermissions('file')       // '-rw-r--r--'
formatPermissions('directory')  // 'drw-r--r--'

wrapText('long text...', 80)    // Returns array of wrapped lines
pad('text', 20, 'left')         // 'text                '
pad('text', 20, 'right')        // '                text'
pad('text', 20, 'center')       // '        text        '
truncate('very long text', 10)  // 'very lo...'
```

**All functions**:
- `showError(term, commandOrMessage, message?, theme?)`
- `showSuccess(term, message, theme?)`
- `showWarning(term, message, theme?)`
- `showInfo(term, message, theme?)`
- `showPrimary(term, message, theme?)`
- `formatSize(bytes)` → string
- `formatDate(date)` → string
- `formatPermissions(type, writable)` → string
- `wrapText(text, width)` → string[]
- `pad(str, width, align)` → string
- `truncate(str, width, ellipsis)` → string

---

### parser.js - Command Line Parsing

**When to use**: User needs to tokenize/parse command lines (not full shell, just simple parsing)

**Key distinction**: This is for parsing command text, NOT for parsing arguments. Use `argparse.js` for arguments.

**Functions**:
```javascript
import { tokenize, parseCommand, splitBySemicolon } from './lib/xterm-kit/parser.js';

// Split line into tokens (handles quotes)
tokenize('ls -la "My Files"')
// → ['ls', '-la', 'My Files']

// Parse into command + args
parseCommand('echo "hello world"')
// → { command: 'echo', args: ['hello world'], raw: 'echo "hello world"' }

// Split multiple commands by semicolon
splitBySemicolon('ls; pwd; echo "test; more"')
// → ['ls', 'pwd', 'echo "test; more"']

// Check if command has operators
hasOperators('cat file | grep foo')  // → true
hasOperators('ls -la')                // → false

// Extract just the command name
extractCommand('git commit -m "msg"')  // → 'git'
```

**Use case**: Building a command interpreter that needs to split user input into command + arguments before further processing.

---

### themes.js - Color Theming

**When to use**: User wants to customize terminal colors or switch themes

**Global theme pattern** (recommended):
```javascript
import { setTheme, olivineTheme } from './lib/xterm-kit/themes.js';

// Set once at app startup
setTheme(olivineTheme);

// All xterm-kit components automatically use this theme
```

**Built-in themes**:
- `defaultTheme` - Standard terminal colors (neutral)
- `olivineTheme` - Phosphor green theme from koma
- `monokaiTheme` - Popular dark color scheme
- `solarizedDarkTheme` - Solarized dark palette

**Custom theme**:
```javascript
import { createTheme, setTheme } from './lib/xterm-kit/themes.js';

const myTheme = createTheme({
  colors: {
    success: (text) => `\x1b[35m${text}\x1b[0m`,  // Override success color
    error: (text) => `\x1b[38;5;196m${text}\x1b[0m`,
  },
  pager: {
    prompt: '\x1b[35m>>> More >>>\x1b[0m',
  }
});

setTheme(myTheme);
```

**Per-call override**:
```javascript
import { showSuccess, monokaiTheme } from './lib/xterm-kit/index.js';

// Use different theme for specific output
showSuccess(term, 'Done!', monokaiTheme);
```

**Functions**:
- `setTheme(theme)` - Set global theme
- `getTheme()` - Get current theme
- `resetTheme()` - Reset to defaultTheme
- `createTheme(overrides)` - Create custom theme (merges with default)

---

### pager.js - Interactive Text Viewer

**When to use**: User needs to display long text that doesn't fit on screen (man pages, logs, help text)

**Basic usage**:
```javascript
import { Pager } from './lib/xterm-kit/pager.js';

const pager = new Pager(term, {
  pageSize: term.rows - 1,     // Auto-detected by default
  showPercent: true,            // Show percentage indicator
  searchCaseSensitive: false,   // Case-insensitive search
  theme: olivineTheme           // Optional theme override
});

// Show content (blocks until user quits)
await pager.show(longText);   // String or array of lines
```

**Keybindings** (same as less):
- `Space, f, PgDn` - Page down
- `b, PgUp` - Page up
- `d` - Half page down
- `u` - Half page up
- `j, Down, Enter` - Line down
- `k, Up` - Line up
- `g, Home` - Go to start
- `G, End` - Go to end
- `/` - Start search (type pattern, press Enter)
- `n` - Next search match
- `N` - Previous search match
- `q, Esc` - Quit pager
- `h, ?` - Show help

**Auto-skip for short content**: If content fits on one screen, pager automatically displays it without entering interactive mode.

**Common pattern** (man command):
```javascript
async function man(command, shell) {
  const manPage = await vfs.readFile(`/usr/share/man/${command}.1.md`);
  const pager = new Pager(shell.term);
  await pager.show(manPage);
}
```

---

### vfs-lite.js - Virtual Filesystem

**When to use**: User needs to store files/data in browser (config files, downloads, history, etc.)

**Two backends**:
- `indexeddb` - Persistent storage (survives page reload)
- `memory` - Ephemeral storage (lost on reload, faster)

**Setup**:
```javascript
import { VFSLite } from './lib/xterm-kit/vfs-lite.js';

// Persistent
const vfs = new VFSLite({ backend: 'indexeddb', dbName: 'myapp' });

// Ephemeral
const vfs = new VFSLite({ backend: 'memory' });
```

**Common operations**:
```javascript
// Write file
await vfs.writeFile('/config.json', JSON.stringify(config));

// Read file
const data = await vfs.readFile('/config.json');
const config = JSON.parse(data);

// Create directory
await vfs.mkdir('/downloads');

// List directory
const entries = await vfs.readdir('/');
// Returns: [{ name, type, size, created, modified }, ...]

// Check if exists
if (await vfs.exists('/file.txt')) {
  // ...
}

// Get file info
const stats = await vfs.stat('/file.txt');
// { type: 'file', size: 123, created: timestamp, modified: timestamp }

// Delete file or empty directory
await vfs.unlink('/file.txt');

// Rename/move file or directory
await vfs.rename('/old-name.txt', '/new-name.txt');
await vfs.rename('/dir/file.txt', '/another/file.txt');  // Can move between directories

// Copy file (not directories)
await vfs.copyFile('/source.txt', '/destination.txt');

// Backup entire VFS
const backup = await vfs.exportJSON();
localStorage.setItem('vfs-backup', JSON.stringify(backup));

// Restore from backup
const backup = JSON.parse(localStorage.getItem('vfs-backup'));
await vfs.importJSON(backup);
```

**Error codes** (catch and check `error.code`):
- `ENOENT` - File/directory not found
- `EEXIST` - File/directory already exists
- `EISDIR` - Operation on directory when file expected
- `ENOTDIR` - Operation on file when directory expected
- `ENOTEMPTY` - Directory not empty (can't delete)

**Path handling**:
- All paths should be absolute (start with `/`)
- VFS includes `normalizePath()` to clean paths
- Standard directories created: `/`, `/home`, `/tmp`

**Common pattern** (save/load config):
```javascript
async function saveConfig(config) {
  await vfs.writeFile('/.config/app.json', JSON.stringify(config, null, 2));
}

async function loadConfig() {
  try {
    const data = await vfs.readFile('/.config/app.json');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return getDefaultConfig();
    }
    throw error;
  }
}
```

**All methods**:
- `readFile(path)` → Promise<string>
- `writeFile(path, content)` → Promise<void>
- `readdir(path)` → Promise<Array<{name, type, size, created, modified}>>
- `mkdir(path)` → Promise<void>
- `unlink(path)` → Promise<void>
- `rename(oldPath, newPath)` → Promise<void>
- `copyFile(srcPath, destPath)` → Promise<void>
- `stat(path)` → Promise<{type, size, created, modified}>
- `exists(path)` → Promise<boolean>
- `exportJSON()` → Promise<object>
- `importJSON(data)` → Promise<void>
- `normalizePath(path)` → string

---

### progress.js - Progress Indicators

**When to use**: User needs to show loading state or progress for long operations

**Three types**: Spinner, ProgressBar, StepProgress

#### Spinner (indeterminate)

```javascript
import { Spinner } from './lib/xterm-kit/progress.js';

const spinner = new Spinner(term, {
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],  // Optional custom frames
  interval: 80,  // Frame delay (ms)
  theme: olivineTheme
});

spinner.start('Downloading...');
await longOperation();
spinner.succeed('Downloaded!');  // or .fail() or .warn()

// Alternative: manual stop
spinner.stop('Custom message');
spinner.stop(null, true);  // Clear line
```

**Methods**:
- `start(text)` - Begin spinning
- `update(text)` - Change status text
- `stop(finalText?, clearLine?)` - Stop manually
- `succeed(text)` - Stop with ✓ (green)
- `fail(text)` - Stop with ✗ (red)
- `warn(text)` - Stop with ⚠ (yellow)

#### ProgressBar (determinate)

```javascript
import { ProgressBar } from './lib/xterm-kit/progress.js';

const progress = new ProgressBar(term, {
  width: 40,              // Bar width in chars
  complete: '█',          // Complete character
  incomplete: '░',        // Incomplete character
  showPercent: true,      // Show percentage
  theme: olivineTheme
});

for (let i = 0; i <= 100; i++) {
  progress.update(i, 100, `Processing ${i}%`);
  await delay(50);
}
progress.complete('Done!');  // or .fail('Failed!')
```

**Methods**:
- `update(current, total?, text?)` - Update progress
- `complete(text?)` - Mark as complete (green)
- `fail(text?)` - Mark as failed (red)

#### StepProgress (multi-step)

```javascript
import { StepProgress } from './lib/xterm-kit/progress.js';

const steps = new StepProgress(term, [
  'Download files',
  'Extract archive',
  'Install packages',
  'Configure system'
], { theme: olivineTheme });

steps.start(0);        // Mark step 0 as active
await download();
steps.complete(0);     // Mark step 0 as done
steps.start(1);        // Mark step 1 as active
// ... etc
```

**Methods**:
- `start(stepIndex)` - Mark step as active
- `complete(stepIndex)` - Mark step as done
- `error(stepIndex)` - Mark step as failed
- `render()` - Manually trigger redraw

---

### table.js - Tabular Data Formatting

**When to use**: User needs to display data in columns (ls -l, process lists, etc.)

**Basic usage**:
```javascript
import { Table } from './lib/xterm-kit/table.js';

const table = new Table({
  columns: ['Name', 'Size', 'Modified'],
  align: ['left', 'right', 'left'],  // Alignment per column
  widths: null,                       // Auto-calculate (or specify: [20, 10, 30])
  header: true,                       // Show header row
  borders: false,                     // Show row separators
  theme: olivineTheme
});

table.addRow(['file.txt', '1.2K', 'Jan 10 14:30']);
table.addRow(['data.json', '42K', 'Jan 11 09:15']);
table.render(term);

// Or use object rows
table.addRow({ Name: 'file.txt', Size: '1.2K', Modified: 'Jan 10 14:30' });
```

**Quick render**:
```javascript
import { renderTable } from './lib/xterm-kit/table.js';

renderTable(term, {
  columns: ['PID', 'Name', 'Status'],
  rows: [
    ['1', 'init', 'running'],
    ['2', 'worker', 'sleeping']
  ],
  align: ['right', 'left', 'left'],
  borders: true
});
```

**Methods**:
- `addRow(row)` - Add row (array or object)
- `render(term)` - Display table
- `toLines()` - Get as string array (for paging)
- `clear()` - Clear all rows (keep columns)

---

### box.js - Borders and Panels

**When to use**: User needs to draw boxes, panels, dialogs, or separators

**Box styles**: `single`, `double`, `rounded`, `heavy`, `ascii`

**Basic usage**:
```javascript
import { Box } from './lib/xterm-kit/box.js';

const box = new Box({
  title: 'Warning',
  style: 'double',  // Border style
  width: 60,        // Total width
  padding: 1,       // Inner padding
  theme: olivineTheme
});

box.add('This is a warning message!');
box.add(['Line 1', 'Line 2', 'Line 3']);  // Multiple lines
box.render(term);
```

**Quick render**:
```javascript
import { renderBox } from './lib/xterm-kit/box.js';

renderBox(term, {
  title: 'Info',
  content: 'This is an info message',
  style: 'rounded',
  width: 40
});
```

**Separator line**:
```javascript
import { drawSeparator } from './lib/xterm-kit/box.js';

drawSeparator(term, 80);  // Draw 80-char line
drawSeparator(term, 80, '═', olivineTheme);  // Custom char
```

**Box styles reference**:
```
single:   ┌─┐ │ └─┘
double:   ╔═╗ ║ ╚═╝
rounded:  ╭─╮ │ ╰─╯
heavy:    ┏━┓ ┃ ┗━┛
ascii:    +-+ | +-+
```

**Methods**:
- `add(content)` - Add content (string or array)
- `render(term)` - Display box
- `toLines()` - Get as string array
- `clear()` - Clear content

---

### keys.js - Keyboard Input Handling

**When to use**: User needs to handle specific key combinations or build line editor

**Two components**: KeyHandler (low-level), LineEditor (high-level)

#### KeyHandler

```javascript
import { KeyHandler, KEYS } from './lib/xterm-kit/keys.js';

const keys = new KeyHandler(term);

// Register handlers
keys.on('ctrl+c', () => {
  term.writeln('^C');
  cancelOperation();
});

keys.on('up', () => historyPrevious());
keys.on('down', () => historyNext());
keys.on('enter', () => executeCommand());
keys.on('tab', () => complete());

// Default handler for unmatched keys
keys.onDefault((data) => {
  if (KeyHandler.isPrintable(data)) {
    term.write(data);
  }
});

keys.start();  // Begin listening

// Later...
keys.stop();   // Stop listening
```

**Key names**: `ctrl+c`, `ctrl+d`, `ctrl+l`, `ctrl+z`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `backspace`, `delete`, `tab`, `enter`, `escape`/`esc`

**Key constants** (for manual checking):
```javascript
import { KEYS } from './lib/xterm-kit/keys.js';

term.onData(data => {
  if (data === KEYS.CTRL_C) { /* ... */ }
  if (data === KEYS.UP) { /* ... */ }
  if (data === KEYS.ENTER) { /* ... */ }
});
```

**Static helpers**:
- `KeyHandler.matches(data, 'ctrl+c')` - Check if data matches key
- `KeyHandler.isPrintable(data)` - Check if printable char
- `KeyHandler.isControl(data)` - Check if control key

#### LineEditor

```javascript
import { LineEditor } from './lib/xterm-kit/keys.js';

const editor = new LineEditor(term, {
  onSubmit: (line) => {
    console.log('Submitted:', line);
    executeCommand(line);
  },
  onCancel: () => {
    console.log('Cancelled');
  },
  history: previousCommands  // Array of previous commands
});

editor.start();
```

**Features**:
- Arrow up/down - Navigate history
- Arrow left/right - Move cursor
- Home/End - Jump to start/end
- Backspace/Delete - Edit text
- Ctrl+C - Cancel input
- Enter - Submit line

---

### indicators.js - Status LEDs

**When to use**: User wants hardware-style status indicators (optional UI enhancement)

**Requires**: DOM elements with specific classes (or use headless mode)

**Setup with DOM**:
```javascript
import { StatusIndicators } from './lib/xterm-kit/indicators.js';

const indicators = new StatusIndicators({
  sysElement: '.indicator[data-status="sys"] .indicator-light',
  diskElement: '.indicator[data-status="disk"] .indicator-light',
  netElement: '.indicator[data-status="net"] .indicator-light',
  userElement: '.indicator[data-status="user"] .indicator-light',
  theme: olivineTheme
});

indicators.init();  // Boot sequence animation
```

**Headless mode** (state tracking only):
```javascript
const indicators = new StatusIndicators({ headless: true });
indicators.diskActivity();
console.log(indicators.getState());  // { sys: 'active', disk: 'active', net: 'dim', user: 'dim' }
```

**Flash indicators**:
```javascript
indicators.diskActivity();     // Auto-dims after 300ms
indicators.netActivity();      // Auto-dims after 500ms
indicators.userActivity('on', 1000);   // Solid on, auto-dims after 1000ms
indicators.userActivity('blink', 2000, 500);  // Blink for 2s at 500ms interval
indicators.userActivity('off');        // Turn off immediately
indicators.userActivity('on', 0);      // Permanent on (no auto-dim)
```

**Wrap async operations**:
```javascript
await indicators.wrapDiskActivity(
  vfs.writeFile('/file.txt', data)
);

await indicators.wrapNetActivity(
  fetch('https://api.example.com')
);
```

---

### command-registry.js - Command Management

**When to use**: User needs to manage commands with metadata, schemas, and enable intelligent autocomplete

**Central command registry with schema storage**. Enables deep integration with autocomplete for flag/option completion.

**Basic registration**:
```javascript
import { CommandRegistry } from './lib/xterm-kit/command-registry.js';

const registry = new CommandRegistry();

// Register with full metadata
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
    },
    positional: {
      description: 'Directory to list'
    }
  },
  handler: lsCommand,  // Optional command function
  subcommands: null    // Optional subcommand map
});
```

**Querying commands**:
```javascript
// Get specific command
const cmd = registry.getCommand('ls');
// { name: 'ls', description: '...', category: 'filesystem', schema: {...}, handler: fn }

// Get just the schema (for autocomplete)
const schema = registry.getSchema('ls');

// Get handler function
const handler = registry.getHandler('ls');
if (handler) {
  await handler(args, shell, context);
}

// Get all commands
const allCommands = registry.getCommands();

// Get by category
const filesystemCmds = registry.getCommands('filesystem');

// Get categories
const categories = registry.getCategories();
// ['filesystem', 'shell', 'network', ...]

// Get all grouped by category
const byCategory = registry.getByCategory();
// { filesystem: [...], shell: [...], ... }
```

**Management**:
```javascript
// Check existence
if (registry.has('ls')) { /* ... */ }

// Unregister
registry.unregister('ls');

// Clear all
registry.clear();

// Get count
const count = registry.size();  // Number of commands
```

**Integration with autocomplete** (unlocks schema-based completion):
```javascript
import { Autocomplete } from './lib/xterm-kit/autocomplete.js';

const completer = new Autocomplete({ registry });

// Now autocomplete knows about:
// - All registered commands
// - All flags/options from schemas
// - Choice values for options
```

**All methods**:
- `register(name, metadata)` - Register command with schema
- `getCommand(name)` - Get full command metadata
- `getSchema(name)` - Get argparse schema
- `getHandler(name)` - Get handler function
- `getSubcommands(name)` - Get subcommands map
- `getCommands(category?)` - Get all commands (optionally filtered)
- `getCommandNames()` - Get array of command names
- `getCategories()` - Get all categories
- `getByCategory()` - Get commands grouped by category
- `has(name)` - Check if command exists
- `unregister(name)` - Remove command
- `clear()` - Remove all commands
- `size()` - Get command count

---

### autocomplete.js - Tab Completion

**When to use**: User wants bash-style tab completion for commands, flags, and options

**Intelligent autocomplete with schema-based flag/option completion**. Deep integration with CommandRegistry.

**With CommandRegistry (RECOMMENDED)**:
```javascript
import { Autocomplete } from './lib/xterm-kit/autocomplete.js';
import { CommandRegistry } from './lib/xterm-kit/command-registry.js';

const registry = new CommandRegistry();
registry.register('ls', {
  schema: {
    flags: {
      long: { short: 'l', description: 'Long format' },
      all: { short: 'a', description: 'Show all' }
    },
    options: {
      format: {
        description: 'Output format',
        choices: ['json', 'yaml', 'table']
      }
    }
  }
});

const completer = new Autocomplete({ registry });

// Autocomplete now supports:
completer.complete('ls --');      // → --long, --all, --format
completer.complete('ls -');       // → -l, -a
completer.complete('ls --format '); // → json, yaml, table
completer.complete('l');          // → ls (command completion)
```

**Without registry (static lists)**:
```javascript
const completer = new Autocomplete({
  commands: ['help', 'books', 'status'],
  subcommands: {
    'books': ['list', 'search', 'add']
  }
});
```

**With custom completers**:
```javascript
const completer = new Autocomplete({
  registry: registry,
  completers: {
    'cat': async (partial) => {
      // Dynamic file path completion
      const files = await vfs.readdir(currentDir);
      return files
        .filter(f => f.name.startsWith(partial))
        .map(f => f.name);
    }
  }
});
```

**Tab key integration**:
```javascript
import { createTabHandler } from './lib/xterm-kit/autocomplete.js';

const state = { currentLine: '', cursorPos: 0 };

const handleTab = createTabHandler(term, completer, state, (line) => {
  // Redraw function
  term.write('\r\x1b[K\x1b[32m$\x1b[0m ' + line);
});

term.onData(data => {
  if (data === '\t') {
    handleTab();
  }
});
```

**Manual completion**:
```javascript
const result = completer.complete('ls --lo', 7);
if (result) {
  if (result.action === 'completed') {
    // Single match - update line
    currentLine = result.line;      // 'ls --long'
    cursorPos = result.cursor;      // 9
  } else if (result.action === 'show_options') {
    // Multiple matches - show to user
    console.log(result.completions);  // ['--long', '--list', ...]
  }
}
```

**Get completions without applying**:
```javascript
const info = completer.getCompletions('ls -', 4);
// {
//   completions: ['-l', '-a'],
//   partial: '-',
//   type: 'flag',
//   level: 1
// }
```

**Completion types**:
- `'command'` - Command names
- `'subcommand'` - Subcommands
- `'flag'` - Flags and options (--flag, -f)
- `'option-value'` - Choice values for options
- `'custom'` - From custom completer functions

**All methods**:
- `complete(line, cursorPos?)` - Apply completion to line
- `getCompletions(line, cursorPos?)` - Get completion info
- `addCompleter(context, fn)` - Add custom completer
- `setCommands(commands)` - Update command list
- `setSubcommands(subcommands)` - Update subcommand map
- `refresh()` - Re-sync from registry
- `getCommonPrefix(completions)` - Find common prefix

**Helper functions**:
- `createTabHandler(term, completer, state, redrawFn)` - Create Tab key handler
- `fromRegistry(registry, subcommands?)` - Create autocomplete from registry

---

## Common Patterns & Recipes

### Building a Command

```javascript
import { parse, hasHelp, showHelp, showSuccess, showError } from './lib/xterm-kit/index.js';

async function myCommand(args, shell, context) {
  // 1. Define schema
  const schema = {
    description: 'My command does X',
    flags: {
      verbose: { short: 'v', description: 'Verbose output' }
    },
    options: {
      output: { short: 'o', description: 'Output file' }
    },
    positional: { description: '<input>' }
  };

  // 2. Check help
  if (hasHelp(args)) {
    showHelp('mycommand', args, schema, shell.term);
    return 0;
  }

  // 3. Parse
  const parsed = parse(args, schema);

  // 4. Validate
  if (parsed.errors.length > 0) {
    parsed.errors.forEach(e => showError(shell.term, 'mycommand', e));
    return 1;
  }

  if (parsed.positional.length === 0) {
    showError(shell.term, 'mycommand', 'missing input file');
    return 1;
  }

  // 5. Execute
  try {
    const result = await doWork(parsed);
    showSuccess(shell.term, 'Operation completed!');
    return 0;
  } catch (error) {
    showError(shell.term, 'mycommand', error.message);
    return 1;
  }
}
```

### Displaying Long Output

```javascript
import { Pager } from './lib/xterm-kit/pager.js';

async function showLongOutput(content, term) {
  const pager = new Pager(term);
  await pager.show(content);
}
```

### File Download with Progress

```javascript
import { Spinner, VFSLite } from './lib/xterm-kit/index.js';

async function download(url, vfs, term) {
  const spinner = new Spinner(term);
  spinner.start(`Downloading ${url}...`);

  try {
    const response = await fetch(url);
    const content = await response.text();
    const filename = url.split('/').pop();

    await vfs.writeFile(`/downloads/${filename}`, content);
    spinner.succeed(`Downloaded ${filename}`);
    return 0;
  } catch (error) {
    spinner.fail(`Download failed: ${error.message}`);
    return 1;
  }
}
```

### Listing Directory with Table

```javascript
import { Table, formatSize, formatDate } from './lib/xterm-kit/index.js';

async function listDirectory(path, vfs, term, longFormat = false) {
  const entries = await vfs.readdir(path);

  if (longFormat) {
    const table = new Table({
      columns: ['Permissions', 'Size', 'Modified', 'Name'],
      align: ['left', 'right', 'left', 'left']
    });

    for (const entry of entries) {
      const perms = formatPermissions(entry.type);
      const size = formatSize(entry.size);
      const date = formatDate(entry.modified);
      table.addRow([perms, size, date, entry.name]);
    }

    table.render(term);
  } else {
    entries.forEach(e => term.writeln(e.name));
  }
}
```

### Config Management

```javascript
import { VFSLite } from './lib/xterm-kit/vfs-lite.js';

class ConfigManager {
  constructor(vfs, configPath = '/.config/app.json') {
    this.vfs = vfs;
    this.configPath = configPath;
    this.cache = null;
  }

  async load() {
    try {
      const data = await this.vfs.readFile(this.configPath);
      this.cache = JSON.parse(data);
      return this.cache;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.cache = this.getDefaults();
        return this.cache;
      }
      throw error;
    }
  }

  async save(config) {
    this.cache = config;
    await this.vfs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  getDefaults() {
    return {
      theme: 'default',
      editor: 'vim',
      historySize: 1000
    };
  }
}
```

## Migration from Raw xterm.js

### Before (raw xterm.js):

```javascript
// Manual argument parsing
const flags = {
  verbose: args.includes('-v') || args.includes('--verbose'),
  all: args.includes('-a') || args.includes('--all')
};
const positional = args.filter(a => !a.startsWith('-'));

// Manual colored output
term.writeln('\x1b[32mSuccess!\x1b[0m');
term.writeln('\x1b[31mError: file not found\x1b[0m');

// Manual long output handling
if (lines.length > term.rows) {
  // ... complex pagination logic
}
```

### After (with xterm-kit):

```javascript
import { parse, showSuccess, showError, Pager } from './lib/xterm-kit/index.js';

// Schema-based parsing
const parsed = parse(args, schema);
const verbose = parsed.flags.verbose;
const all = parsed.flags.all;
const positional = parsed.positional;

// Themed output
showSuccess(term, 'Success!');
showError(term, 'Error: file not found');

// Automatic pagination
const pager = new Pager(term);
await pager.show(lines);
```

## Troubleshooting

### Theme not applying
**Problem**: Output shows default colors instead of custom theme
**Solution**: Call `setTheme()` before using output functions
```javascript
import { setTheme, olivineTheme } from './lib/xterm-kit/themes.js';
setTheme(olivineTheme);  // Do this once at startup
```

### VFS file not found
**Problem**: `ENOENT` error when reading file
**Solution**: Check path is absolute and parent directory exists
```javascript
// Create parent directories first
await vfs.mkdir('/downloads');
await vfs.writeFile('/downloads/file.txt', data);

// Or check existence
if (await vfs.exists('/file.txt')) {
  const data = await vfs.readFile('/file.txt');
}
```

### Pager not showing
**Problem**: Pager shows nothing or exits immediately
**Solution**: Content might be too short (auto-skips if fits on screen)
```javascript
// Content fits on screen - pager displays and returns immediately
// Content is long - pager enters interactive mode
await pager.show(content);
```

### Progress bar not updating
**Problem**: Progress bar frozen or not visible
**Solution**: Ensure you're calling `update()` and awaiting async operations
```javascript
const progress = new ProgressBar(term);
for (let i = 0; i <= 100; i++) {
  progress.update(i);
  await delay(10);  // Must have delay/async work between updates
}
```

## Module Dependencies

```
argparse.js      → No dependencies
output.js        → themes.js
parser.js        → No dependencies
themes.js        → No dependencies
pager.js         → themes.js
indicators.js    → themes.js
vfs-lite.js      → No dependencies
progress.js      → themes.js
table.js         → themes.js, output.js (pad, truncate)
box.js           → themes.js, output.js (wrapText)
keys.js          → No dependencies
```

**Import order doesn't matter** - ES modules handle dependencies automatically.

**No external dependencies** - All modules use only browser APIs and xterm.js (which you already have).
