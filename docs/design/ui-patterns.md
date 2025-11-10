# Koma UI Patterns

## Introduction

This document catalogs the UI patterns and conventions used throughout the Koma Workstation codebase. These patterns ensure consistency and help developers maintain the retrospec engineering aesthetic when adding new features.

All examples are drawn from actual code in `src/commands/` and `src/ui/`.

## Command Output Patterns

### Simple Text Output

**Pattern**: Direct text output for simple results.

**Example: `pwd` command**
```javascript
shell.registerCommand('pwd', (args, shell) => {
  shell.term.writeln(shell.cwd);
});
```

**Usage**: Commands with single-line results (paths, values, simple confirmations).

### Multi-Line Content

**Pattern**: Split content by newlines, write each line separately.

**Example: `cat` command**
```javascript
const content = await kernel.readFile(filePath);
const lines = content.split('\n');
lines.forEach(line => ctx.writeln(line));
```

**Why**: Proper terminal line handling, supports piping, enables line-by-line processing.

### Formatted Tables

**Pattern**: Fixed-width columns with padded content.

**Example: `ls -l` long format**
```javascript
const perms = entry.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--';
const size = (entry.size || 0).toString().padStart(8);
const date = new Date(entry.modified).toISOString().slice(0, 16).replace('T', ' ');
ctx.writeln(`${perms}  1 koma koma ${size} ${date} ${name}`);
```

**Format**:
```
drwxr-xr-x  1 koma koma     4096 2025-11-10 14:30 documents
-rw-r--r--  1 koma koma     1024 2025-11-09 09:15 file.txt
```

**Guidelines**:
- Use `.padStart()` and `.padEnd()` for alignment
- Consistent column widths
- Readable spacing (2 spaces between columns)
- Right-align numbers, left-align text

### Conditional Formatting (Pipes vs Terminal)

**Pattern**: Plain text for pipes, colored text for terminal display.

**Example: `ls` with colors**
```javascript
// Long format
const name = (ctx.isPiped || ctx.isRedirected)
  ? entry.name
  : (entry.type === 'directory' ? `\x1b[34m${entry.name}\x1b[0m` : entry.name);
ctx.writeln(`${perms}  1 koma koma ${size} ${date} ${name}`);

// Simple format
if (ctx.isPiped || ctx.isRedirected) {
  // One per line for piping
  entries.forEach(entry => ctx.writeln(entry.name));
} else {
  // Space-separated with colors
  const names = entries.map(entry => {
    return entry.type === 'directory'
      ? `\x1b[34m${entry.name}\x1b[0m`
      : entry.name;
  });
  ctx.writeln(names.join('  '));
}
```

**Rationale**:
- Pipes need clean text (no ANSI codes)
- Terminal benefits from visual distinction (colors)
- `ctx.isPiped` and `ctx.isRedirected` flags control behavior

### Process Tables

**Pattern**: Header with bold, aligned columns, status-colored rows.

**Example: `ps` command**
```javascript
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
```

**Output**:
```
PID  STATUS      TIME(ms)  SCRIPT
1    running     1250      /home/backup.js
2    completed   45        /home/test.js
3    failed      890       /home/error.js
```

**Guidelines**:
- Bold header (`\x1b[1m`)
- Semantic status colors (green=running, red=failed, yellow=killed)
- Reset after colored text (`\x1b[0m`)
- Consistent column widths

## Error Message Patterns

### Standard Error Format

**Pattern**: Command name, colon, error description.

**Helper function** (`src/utils/command-utils.js`):
```javascript
export function showError(term, commandName, message) {
  term.writeln(`\x1b[31m${commandName}: ${message}\x1b[0m`);
}
```

**Usage**:
```javascript
showError(shell.term, 'cd', `not a directory: ${inputPath}`);
// Output: cd: not a directory: foo.txt
```

**Color**: Red (`\x1b[31m`)

**Guidelines**:
- Lowercase error messages (Unix convention)
- Be specific (include filename, path, or context)
- No punctuation at end (except for multi-sentence errors)
- No emojis or decorations

### Warning Messages

**Pattern**: Similar to errors but yellow.

**Helper function**:
```javascript
export function showWarning(term, message) {
  term.writeln(`\x1b[33m${message}\x1b[0m`);
}
```

**Usage**:
```javascript
showWarning(shell.term, 'Restarting Olivine...');
// Output: Restarting Olivine... (in yellow)
```

**Color**: Yellow (`\x1b[33m`)

### Success Messages

**Pattern**: Green text for confirmations.

**Helper function**:
```javascript
export function showSuccess(term, commandName, message) {
  term.writeln(`\x1b[32m${commandName}: ${message}\x1b[0m`);
}
```

**Usage**:
```javascript
showSuccess(shell.term, '', `Saved to ${filename} (${sizeStr})`);
// Output: Saved to data.json (2.5 KB) (in green)
```

**Color**: Green (`\x1b[32m`)

**Note**: Empty command name (`''`) when success message stands alone.

### Info Messages

**Pattern**: Dim gray for supplementary information.

**Helper function**:
```javascript
export function showInfo(term, message) {
  term.writeln(`\x1b[90m${message}\x1b[0m`);
}
```

**Usage**:
```javascript
showInfo(shell.term, '[Process 1 started]');
// Output: [Process 1 started] (in dim gray)
```

**Color**: Dim gray (`\x1b[90m`)

## Status Indicator Patterns

### Activity LED States

**Implementation** (`src/ui/activity-led.js`):

```javascript
export class ActivityLED {
  reading() {
    this.setActivity('reading');
  }

  writing() {
    this.setActivity('writing');
  }

  error() {
    this.setActivity('error');
    setTimeout(() => this.idle(), 1000);
  }

  idle() {
    this.setActivity(null);
  }
}
```

**Usage in filesystem operations**:
```javascript
async function withTimeout(promise, operation, activityType = 'read', timeoutMs = 5000) {
  try {
    if (activityType === 'read') {
      activityLED.reading();
    } else if (activityType === 'write') {
      activityLED.writing();
    }

    const result = await promise;
    activityLED.idle();
    return result;
  } catch (error) {
    activityLED.error();
    throw error;
  }
}
```

**States**:
- **Reading**: Green pulse (filesystem reads)
- **Writing**: Orange pulse (filesystem writes)
- **Error**: Orange flash 3x (operation failure)
- **Idle**: Transparent (no activity)

### Process Count Display

**Location**: Status bar (bottom)

**Pattern**: Show count only when processes exist.

**Implementation**:
```javascript
// CSS hides when empty
.process-count:empty {
  display: none;
}

// JavaScript updates content
const processCountEl = document.querySelector('.process-count');
if (processes.length > 0) {
  processCountEl.textContent = `${processes.length} process${processes.length > 1 ? 'es' : ''}`;
} else {
  processCountEl.textContent = '';
}
```

**Display**: "2 processes" (in green)

### Editor Status

**Location**: Tab bar (between LED and system info)

**States**:
- **Inactive**: Empty or dim text
- **Active**: File path in green
- **Dirty**: File path in orange (unsaved changes)

**Pattern**:
```javascript
const statusEl = document.querySelector('.editor-status');
if (editor.isOpen) {
  statusEl.textContent = editor.currentFile;
  statusEl.classList.toggle('dirty', editor.isDirty);
} else {
  statusEl.textContent = '';
}
```

## Shell Prompt Pattern

### Standard Prompt

**Format**: `path $ `

**Implementation** (`src/shell.js`):
```javascript
writePrompt() {
  const promptColor = '\x1b[38;5;208m'; // Orange (256-color)
  const reset = '\x1b[0m';
  this.term.write(`${promptColor}${this.cwd}${reset} $ `);
}
```

**Example output**:
```
/home $ ls
/home/user $ cd documents
/home/user/documents $ pwd
```

**Guidelines**:
- Current directory in orange
- Dollar sign with spaces before and after
- Reset color before user input
- No newline (user types on same line)

## Tree Visualization Pattern

**Pattern**: Box-drawing characters for directory structure.

**Implementation** (`src/commands/filesystem.js`):
```javascript
async function buildTree(path, prefix = '', isLast = true) {
  const entries = await kernel.readdir(path);

  // Print current directory name
  if (prefix === '') {
    shell.term.writeln(`\x1b[34m${path}\x1b[0m`);
  }

  // Sort: directories first, then files
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
      await buildTree(childPath, newPrefix, isLastEntry);
    }
  }
}
```

**Output**:
```
/home
├── documents/
│   ├── file1.txt
│   └── file2.txt
└── projects/
    └── koma/
        ├── src/
        └── docs/
```

**Characters**:
- `├──` Branch (not last)
- `└──` Branch (last)
- `│` Vertical continuation
- `    ` Empty space (after last branch)

## Help/Man Page Pattern

### Inline Help (--help flag)

**Pattern**: Structured help using argparse schema.

**Example** (`src/commands/filesystem.js`):
```javascript
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
```

**Output**:
```
cd - Change the current working directory

Usage: cd [directory]

Examples:
  cd /home          Change to /home
  cd ..             Go to parent directory
  cd ~              Go to home directory
  cd                Go to home directory
```

**Guidelines**:
- Brief description
- Usage line with placeholders
- Examples with inline descriptions
- Optional notes section

### Man Pages

**Pattern**: Markdown-formatted man pages in `/usr/share/man/`.

**Rendering** (`src/utils/man-renderer.js`):
- Converts Markdown to terminal-formatted text
- Wraps to 80 columns
- Headers in bold
- Code blocks in monospace
- Lists with bullet points

**Display**:
```javascript
const lines = renderManPage(content, 80);
lines.forEach(line => shell.term.writeln(line));
```

## Argument Parsing Pattern

### Using Args Module

**Pattern**: Define schema, parse args, check for errors.

**Implementation**:
```javascript
import { createArgsModule } from '../stdlib/args.js';
const argparse = createArgsModule();

const schema = {
  description: 'Search for patterns in files or input',
  flags: {
    number: { short: 'n', description: 'Show line numbers' },
    ignoreCase: { short: 'i', description: 'Case-insensitive search' },
    invert: { short: 'v', description: 'Invert match' },
    count: { short: 'c', description: 'Count matches only' }
  },
  positional: { description: '<pattern> [file]' },
  examples: [
    { command: 'grep error log.txt', description: 'Find "error" in log.txt' },
    { command: 'grep -n error log.txt', description: 'Show line numbers' }
  ]
};

// Show help if requested
if (argparse.showHelp('grep', args, schema, shell.term)) return;

// Parse arguments
const parsed = argparse.parse(args, schema);

// Handle errors
if (parsed.errors.length > 0) {
  parsed.errors.forEach(err => showError(shell.term, 'grep', err));
  return;
}

// Access parsed values
const showLineNumbers = parsed.flags.number;
const pattern = parsed.positional[0];
```

**Benefits**:
- Consistent help output
- Automatic error checking
- Flag/option parsing handled
- Positional argument extraction

## Pipeline and Redirection Pattern

### Command Context

**Pattern**: Commands receive context object for pipe-aware output.

**Context types** (`src/utils/command-context.js`):

```javascript
// Terminal output (default)
const ctx = createTerminalContext(term);
ctx.writeln('text');  // Directly to terminal

// Piped output (captures for next command)
const ctx = createPipedContext(term, stdin);
ctx.writeln('text');  // Captured to buffer
const output = ctx.getStdout();  // Retrieved by pipeline

// Redirected output (captures for file)
const ctx = createRedirectedContext(term, stdin);
ctx.writeln('text');  // Captured to buffer
const output = ctx.getStdout();  // Written to file
```

**Command signature**:
```javascript
shell.registerCommand('cat', async (args, shell, context) => {
  const ctx = context || createTerminalContext(shell.term);

  // Check if input from pipe
  if (ctx.hasStdin()) {
    const lines = ctx.getStdinLines();
    lines.forEach(line => ctx.writeln(line));
  }

  // Output goes to ctx (might be terminal, pipe, or file)
  ctx.writeln('some output');
});
```

**Guidelines**:
- Always use `ctx.writeln()` instead of `term.writeln()`
- Check `ctx.isPiped` or `ctx.isRedirected` for format decisions
- Use `ctx.hasStdin()` to detect piped input
- Get stdin with `ctx.stdin` or `ctx.getStdinLines()`

## Modal Dialog Pattern

### Confirmation Modal

**Pattern**: Async function returns user choice.

**Implementation** (`src/ui/modal-system.js` - conceptual):
```javascript
async function showConfirmation(title, message, options = {}) {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.textContent = title;

    // Content
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.textContent = message;

    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-button';
    cancelBtn.textContent = options.cancelText || 'Cancel';
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    const okBtn = document.createElement('button');
    okBtn.className = 'modal-button primary';
    okBtn.textContent = options.okText || 'OK';
    okBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };

    buttons.appendChild(cancelBtn);
    buttons.appendChild(okBtn);

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}
```

**Usage**:
```javascript
const confirmed = await showConfirmation(
  'Confirm Action',
  'Are you sure you want to delete this file?',
  { okText: 'Delete', cancelText: 'Cancel' }
);

if (confirmed) {
  await kernel.unlink(filePath);
}
```

## Tab Management Pattern

### Tab Structure

**HTML**:
```html
<div class="tab active" data-id="1">
  <span class="tab-name">1:main</span>
</div>
```

**States**:
- **Active**: `.active` class, 2px orange left border
- **Inactive**: Plain styling
- **Hover**: Elevated background

**Naming**: `{number}:{name}` format

### Tab Switching

**Pattern**: Hide/show terminal views, transfer focus.

**Implementation**:
```javascript
switchTab(tabId) {
  // Deactivate old tab
  const oldTab = this.tabs.get(this.activeTabId);
  oldTab.element.classList.remove('active');

  // Activate new tab
  const newTab = this.tabs.get(tabId);
  newTab.element.classList.add('active');
  this.activeTabId = tabId;

  // Transfer xterm focus
  newTab.terminal.focus();

  // Update status bar
  this.updateStatusBar();
}
```

## Version Display Pattern

**Pattern**: Branded version info with color.

**Example** (`src/commands/shell.js`):
```javascript
shell.term.writeln('\x1b[38;5;208mKoma Terminal v0.1\x1b[0m');
shell.term.writeln('Browser-resident automation workstation');
```

**Output**:
```
Koma Terminal v0.1  (in orange)
Browser-resident automation workstation
```

**Guidelines**:
- Version in orange (brand color)
- Tagline in default color
- Keep branding minimal

## Common Anti-Patterns

### Don't: Mix writeln() and write()

**Bad**:
```javascript
term.write('File: ');
term.writeln(filename);
term.write('\n');
```

**Good**:
```javascript
term.writeln(`File: ${filename}`);
```

**Why**: `writeln()` adds newline automatically. Mixing creates extra lines.

### Don't: Manual ANSI reset mid-string

**Bad**:
```javascript
term.writeln(`\x1b[32mSuccess\x1b[0m: File saved\x1b[0m`);
```

**Good**:
```javascript
term.writeln(`\x1b[32mSuccess: File saved\x1b[0m`);
```

**Why**: One reset at end is sufficient. Multiple resets are redundant.

### Don't: Hardcode colors without reset

**Bad**:
```javascript
term.writeln('\x1b[31mError occurred');
term.writeln('This will also be red!');
```

**Good**:
```javascript
term.writeln('\x1b[31mError occurred\x1b[0m');
term.writeln('This is normal color');
```

**Why**: ANSI codes persist until reset. Always reset after colored text.

### Don't: Use console.log() for user output

**Bad**:
```javascript
console.log('Command completed');
```

**Good**:
```javascript
shell.term.writeln('Command completed');
```

**Why**: `console.log()` goes to browser console, not terminal. Use `term.writeln()` for user-visible output.

### Don't: Forget pipe context

**Bad**:
```javascript
shell.term.writeln(`\x1b[34m${entry.name}\x1b[0m`);
```

**Good**:
```javascript
const name = ctx.isPiped
  ? entry.name
  : `\x1b[34m${entry.name}\x1b[0m`;
ctx.writeln(name);
```

**Why**: Pipes need plain text. Detect pipe context and adjust output.

## Testing UI Patterns

### Visual Testing Checklist

When implementing UI patterns:

1. **Test in terminal**: Does it look correct in the main view?
2. **Test in pipe**: Does `ls | grep` work correctly?
3. **Test with redirect**: Does `ls > file.txt` capture properly?
4. **Test colors**: Are ANSI codes reset correctly?
5. **Test alignment**: Do tables/columns align with monospace?
6. **Test wrapping**: Does long output wrap gracefully?
7. **Test copy-paste**: Can users copy output cleanly?

### Example Test Commands

```bash
# Test basic output
echo "Hello World"

# Test piping
ls | grep "doc"

# Test redirection
echo "test" > file.txt

# Test table formatting
ps

# Test colors
ls -l

# Test tree structure
tree /home

# Test error messages
cat nonexistent.txt
```

## Summary of Key Patterns

| Pattern | Purpose | Key Elements |
|---------|---------|--------------|
| Simple output | Single values | Direct `writeln()` |
| Multi-line | File content | Split by `\n`, iterate |
| Tables | Structured data | `padStart()`, `padEnd()`, alignment |
| Conditional format | Pipes vs terminal | Check `ctx.isPiped` |
| Errors | User feedback | Red color, command prefix |
| Success | Confirmations | Green color, descriptive |
| Tree | Directory structure | Box-drawing chars, recursion |
| Help | Documentation | Schema-based, examples |
| Pipeline | Data flow | Context objects, stdin/stdout |
| Activity LED | System status | State machine, colors |

---

## Related Documentation

- [Design README](./README.md) - Overview and index
- [Visual Language](./visual-language.md) - Color, typography, UI elements
- [Style Guide](./style-guide.md) - Implementation guidelines

**Last Updated:** 2025-11-10
