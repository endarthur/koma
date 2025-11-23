# xterm-kit Quick Reference Card

**For LLMs**: Ultra-concise lookup table. Use this for rapid answers.

## Import Patterns

### From jsDelivr CDN (External Projects)
```javascript
// Recommended: Use version tag
import { parse, showSuccess, Pager, VFSLite } from 'https://cdn.jsdelivr.net/gh/endar/koma@v1.0.0/src/lib/xterm-kit/index.js';

// Or: Use latest from main
import { parse, showSuccess, Pager, VFSLite } from 'https://cdn.jsdelivr.net/gh/endar/koma@main/src/lib/xterm-kit/index.js';

// With import map
{
  "imports": {
    "xterm-kit": "https://cdn.jsdelivr.net/gh/endar/koma@v1.0.0/src/lib/xterm-kit/index.js",
    "xterm-kit/": "https://cdn.jsdelivr.net/gh/endar/koma@v1.0.0/src/lib/xterm-kit/"
  }
}
// Then: import { parse } from 'xterm-kit';
```

### Local Copy
```javascript
// Full import
import * as kit from './lib/xterm-kit/index.js';

// Selective imports (tree-shakeable)
import { parse, showSuccess, Pager, VFSLite } from './lib/xterm-kit/index.js';

// Individual modules
import { parse } from './lib/xterm-kit/argparse.js';
```

## One-Liner Solutions

| Task | Solution |
|------|----------|
| Parse CLI args | `const {flags, options, positional} = parse(args, schema)` |
| Show success | `showSuccess(term, 'Done!')` |
| Show error | `showError(term, 'cmd', 'Error message')` |
| Show long text | `await new Pager(term).show(text)` |
| Save file | `await vfs.writeFile('/path', content)` |
| Read file | `const data = await vfs.readFile('/path')` |
| Rename/move file | `await vfs.rename('/old', '/new')` |
| Copy file | `await vfs.copyFile('/src', '/dest')` |
| Show spinner | `spinner.start('Loading...'); await op(); spinner.succeed('Done!')` |
| Show progress | `progress.update(current, total, 'Status')` |
| Draw table | `renderTable(term, {columns: [...], rows: [...]})` |
| Draw box | `renderBox(term, {title: 'Title', content: 'Text'})` |
| Set theme | `setTheme(olivineTheme)` |
| Tab completion | `const completer = new Autocomplete({commands: [...]})` |

## Function Signatures (Most Common)

```javascript
// argparse.js
parse(argv: string[], schema: object): {flags, options, positional, errors}
showHelp(name: string, argv: string[], schema: object, term: Terminal): boolean

// output.js
showError(term: Terminal, cmd: string, msg: string, theme?: object): void
showSuccess(term: Terminal, msg: string, theme?: object): void
formatSize(bytes: number): string
formatDate(date: Date|string|number): string

// parser.js
tokenize(line: string): string[]
parseCommand(line: string): {command, args, raw}

// themes.js
setTheme(theme: object): void
createTheme(overrides: object): object

// pager.js
new Pager(term: Terminal, options?: object)
pager.show(content: string|string[]): Promise<void>

// vfs-lite.js
new VFSLite({backend: 'indexeddb'|'memory', dbName?: string})
vfs.readFile(path: string): Promise<string>
vfs.writeFile(path: string, content: string): Promise<void>
vfs.readdir(path: string): Promise<Entry[]>
vfs.mkdir(path: string): Promise<void>
vfs.unlink(path: string): Promise<void>
vfs.rename(oldPath: string, newPath: string): Promise<void>
vfs.copyFile(srcPath: string, destPath: string): Promise<void>
vfs.exists(path: string): Promise<boolean>
vfs.stat(path: string): Promise<Stats>

// progress.js
new Spinner(term: Terminal, options?: object)
spinner.start(text: string): void
spinner.succeed(text: string): void
new ProgressBar(term: Terminal, options?: object)
progress.update(current: number, total?: number, text?: string): void

// table.js
new Table({columns: string[], align?: string[], borders?: boolean})
table.addRow(row: string[]|object): void
table.render(term: Terminal): void
renderTable(term: Terminal, options: object): void

// box.js
new Box({title?: string, style?: string, width?: number})
box.add(content: string|string[]): void
box.render(term: Terminal): void
renderBox(term: Terminal, options: object): void

// keys.js
new KeyHandler(term: Terminal)
keys.on(key: string, handler: Function): void
keys.start(): void

// autocomplete.js
new Autocomplete(options: {commands?, subcommands?, registry?})
autocomplete.complete(line: string, cursorPos?: number): {line, cursor, action}
autocomplete.getCompletions(line: string): {completions, partial, type}
createTabHandler(term: Terminal, completer: Autocomplete, state: object, redrawFn: Function): Function
fromRegistry(registry: object, subcommands?: object): Autocomplete
```

## Common Schemas

### argparse schema
```javascript
{
  description: string,
  flags: { name: {short: 'x', description: string} },
  options: { name: {short: 'x', description: string, choices?: [], default?: any} },
  positional: { description: string },
  examples: [{command: string, description: string}]
}
```

### Table options
```javascript
{
  columns: string[],
  rows: Array<string[]|object>,
  align: ('left'|'right'|'center')[],
  borders: boolean
}
```

### Box options
```javascript
{
  title: string,
  content: string,
  style: 'single'|'double'|'rounded'|'heavy'|'ascii',
  width: number,
  padding: number
}
```

### VFSLite options
```javascript
{
  backend: 'indexeddb' | 'memory',
  dbName: string  // Only for indexeddb
}
```

### Autocomplete options
```javascript
{
  commands: string[],              // Static command list
  subcommands: object,             // Map of command -> subcommands
  registry: object,                // CommandRegistry with getCommands()
  completers: object,              // Custom completion functions
  caseSensitive: boolean           // Default: false
}
```

## Error Handling

```javascript
// VFS errors (check error.code)
try {
  await vfs.readFile('/file');
} catch (error) {
  if (error.code === 'ENOENT') { /* not found */ }
  if (error.code === 'EISDIR') { /* is directory */ }
  if (error.code === 'ENOTEMPTY') { /* dir not empty */ }
}

// Parse errors
const parsed = parse(args, schema);
if (parsed.errors.length > 0) {
  parsed.errors.forEach(e => showError(term, e));
}
```

## Built-in Themes

```javascript
import { defaultTheme, olivineTheme, monokaiTheme, solarizedDarkTheme } from './lib/xterm-kit/themes.js';

setTheme(defaultTheme);        // Standard terminal colors
setTheme(olivineTheme);        // Phosphor green (koma)
setTheme(monokaiTheme);        // Popular dark
setTheme(solarizedDarkTheme);  // Solarized
```

## Pager Keybindings

```
Space/f/PgDn → Page down    |  /   → Search
b/PgUp       → Page up      |  n   → Next match
d/u          → Half page    |  N   → Prev match
j/k/↓/↑      → Line scroll  |  q/Esc → Quit
g/G/Home/End → Jump         |  h/? → Help
```

## Progress Pattern

```javascript
// Spinner (indeterminate)
const s = new Spinner(term);
s.start('Loading...'); await op(); s.succeed('Done!');

// Bar (determinate)
const p = new ProgressBar(term);
for (let i=0; i<=100; i++) { p.update(i); await delay(10); }
p.complete('Done!');

// Steps
const steps = new StepProgress(term, ['Step 1', 'Step 2']);
steps.start(0); await op1(); steps.complete(0);
steps.start(1); await op2(); steps.complete(1);
```

## VFS Pattern

```javascript
// Setup
const vfs = new VFSLite({backend: 'indexeddb', dbName: 'app'});

// Write
await vfs.mkdir('/config');
await vfs.writeFile('/config/settings.json', JSON.stringify(data));

// Read
const exists = await vfs.exists('/config/settings.json');
if (exists) {
  const content = await vfs.readFile('/config/settings.json');
  const data = JSON.parse(content);
}

// List
const entries = await vfs.readdir('/config');
entries.forEach(e => console.log(e.name, e.type, e.size));

// Rename/move
await vfs.rename('/config/old.json', '/config/new.json');
await vfs.rename('/config/file.txt', '/archive/file.txt');  // Move to different dir

// Copy
await vfs.copyFile('/config/template.json', '/config/settings.json');

// Backup
const backup = await vfs.exportJSON();
localStorage.setItem('backup', JSON.stringify(backup));

// Restore
const backup = JSON.parse(localStorage.getItem('backup'));
await vfs.importJSON(backup);
```

## Autocomplete Pattern

```javascript
import { Autocomplete, createTabHandler } from './lib/xterm-kit/autocomplete.js';

// Option 1: Static lists
const completer = new Autocomplete({
  commands: ['help', 'books', 'status', 'clear'],
  subcommands: {
    'books': ['list', 'search', 'add'],
    'status': ['show', 'daemon']
  }
});

// Option 2: With command registry (DRY - no duplication!)
import { commandRegistry } from './utils/command-registry.js';
const completer = new Autocomplete({
  registry: commandRegistry,
  subcommands: {
    'books': ['list', 'search', 'add']
  }
});

// Option 3: With custom completers (e.g., dynamic file paths)
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
    // ... execute command
  } else {
    // ... handle other input
    state.currentLine += data;
    state.cursorPos++;
  }
});
```

## Command Template

```javascript
import { parse, hasHelp, showHelp, showSuccess, showError } from './lib/xterm-kit/index.js';

async function cmd(args, shell, context) {
  const schema = {/* ... */};

  if (hasHelp(args)) {
    showHelp('cmd', args, schema, shell.term);
    return 0;
  }

  const p = parse(args, schema);
  if (p.errors.length > 0) {
    p.errors.forEach(e => showError(shell.term, 'cmd', e));
    return 1;
  }

  try {
    // ... do work
    showSuccess(shell.term, 'Done!');
    return 0;
  } catch (error) {
    showError(shell.term, 'cmd', error.message);
    return 1;
  }
}
```

## Color Codes (Manual)

```javascript
'\x1b[31m'  // Red
'\x1b[32m'  // Green
'\x1b[33m'  // Yellow
'\x1b[90m'  // Gray/dim
'\x1b[36m'  // Cyan
'\x1b[1m'   // Bold
'\x1b[2m'   // Dim
'\x1b[7m'   // Inverse
'\x1b[0m'   // Reset

// Better: Use output.js functions (theme-aware)
showError(term, 'message')    // Red
showSuccess(term, 'message')  // Green
showWarning(term, 'message')  // Yellow
showInfo(term, 'message')     // Gray
```

## Key Constants

```javascript
import { KEYS } from './lib/xterm-kit/keys.js';

KEYS.CTRL_C, KEYS.CTRL_D, KEYS.CTRL_L, KEYS.CTRL_Z
KEYS.UP, KEYS.DOWN, KEYS.LEFT, KEYS.RIGHT
KEYS.HOME, KEYS.END, KEYS.PAGE_UP, KEYS.PAGE_DOWN
KEYS.BACKSPACE, KEYS.DELETE, KEYS.TAB, KEYS.ENTER, KEYS.ESCAPE
```

## Module File Sizes

```
argparse.js      ~360 lines   Argument parsing
output.js        ~200 lines   Formatted output
parser.js        ~157 lines   Command parsing
themes.js        ~248 lines   Theme system
pager.js         ~401 lines   Interactive viewer
indicators.js    ~265 lines   Status LEDs
vfs-lite.js      ~620 lines   Virtual filesystem
progress.js      ~248 lines   Progress indicators
table.js         ~153 lines   Tables
box.js           ~258 lines   Borders/boxes
keys.js          ~265 lines   Keyboard handling
autocomplete.js  ~320 lines   Tab completion
Total: ~3,900 lines, 0 dependencies
```

## When to Use What

| User wants... | Use this |
|---------------|----------|
| Parse `-v --file=x arg` | argparse.js |
| Parse `"cmd arg"` into parts | parser.js |
| Color output | output.js + themes.js |
| Page long text | pager.js |
| Store files in browser | vfs-lite.js |
| Show loading | progress.js (Spinner) |
| Show % complete | progress.js (ProgressBar) |
| Show data in columns | table.js |
| Draw borders | box.js |
| Handle Ctrl+C, arrows | keys.js |
| Build line editor | keys.js (LineEditor) |
| Show status LEDs | indicators.js |
| Tab completion for commands | autocomplete.js |

## Zero to Hero in 5 Minutes

```javascript
import { Terminal } from 'xterm';
import {
  setTheme, olivineTheme,
  parse, showSuccess, showError,
  Pager, VFSLite, Spinner, Table
} from './lib/xterm-kit/index.js';

// Setup
const term = new Terminal();
term.open(document.getElementById('terminal'));
setTheme(olivineTheme);
const vfs = new VFSLite({backend: 'indexeddb', dbName: 'myapp'});

// Command with args
async function list(args) {
  const parsed = parse(args, {
    flags: { long: {short: 'l', description: 'Long format'} }
  });

  const entries = await vfs.readdir('/');

  if (parsed.flags.long) {
    const t = new Table({columns: ['Name', 'Size']});
    entries.forEach(e => t.addRow([e.name, e.size]));
    t.render(term);
  } else {
    entries.forEach(e => term.writeln(e.name));
  }
}

// Download with progress
async function download(url) {
  const s = new Spinner(term);
  s.start(`Downloading ${url}...`);
  const resp = await fetch(url);
  const data = await resp.text();
  await vfs.writeFile('/download.txt', data);
  s.succeed('Downloaded!');
}

// View file with pager
async function view(path) {
  const content = await vfs.readFile(path);
  await new Pager(term).show(content);
}

// Done! You now have a functional terminal app.
```
