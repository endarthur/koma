# Koma Style Guide for Contributors

## Introduction

This style guide provides practical guidelines for maintaining visual consistency when contributing to the Koma Workstation project. Follow these rules when adding commands, modifying UI elements, or creating new features.

## Quick Reference Card

```
Colors:       #00ff88 (green), #ff6b35 (orange), #1a1a1a (charcoal)
Font:         IBM Plex Mono 13px, line-height 1.5
Success:      \x1b[32mtext\x1b[0m  (green)
Error:        \x1b[31mtext\x1b[0m  (red/orange)
Warning:      \x1b[33mtext\x1b[0m  (yellow)
Info:         \x1b[90mtext\x1b[0m  (dim gray)
Bold:         \x1b[1mtext\x1b[0m
Directory:    \x1b[34mname\x1b[0m   (blue)
Reset:        \x1b[0m             (always at end)
```

## Adding New Commands

### Command Structure Template

```javascript
import {
  showError,
  showSuccess,
  showInfo,
  resolvePath
} from '../utils/command-utils.js';
import { kernelClient } from '../kernel/client.js';
import { createArgsModule } from '../stdlib/args.js';

const argparse = createArgsModule();

shell.registerCommand('mycommand', async (args, shell, context) => {
  // 1. Define schema
  const schema = {
    description: 'Brief description of what this command does',
    flags: {
      verbose: { short: 'v', description: 'Verbose output' },
      force: { short: 'f', description: 'Force operation' }
    },
    options: {
      output: { short: 'o', description: 'Output file' }
    },
    positional: { description: '<required> [optional]' },
    examples: [
      { command: 'mycommand file.txt', description: 'Basic usage' },
      { command: 'mycommand -v file.txt', description: 'With verbose flag' }
    ],
    notes: [
      'Additional information about the command',
      'Special behavior or limitations'
    ]
  };

  // 2. Show help if requested
  if (argparse.showHelp('mycommand', args, schema, shell.term)) return;

  // 3. Parse arguments
  const parsed = argparse.parse(args, schema);

  // 4. Validate and show errors
  if (parsed.errors.length > 0) {
    parsed.errors.forEach(err => showError(shell.term, 'mycommand', err));
    return;
  }

  if (parsed.positional.length === 0) {
    showError(shell.term, 'mycommand', 'missing required argument');
    return;
  }

  // 5. Get context for pipe-aware output
  const { createTerminalContext } = await import('../utils/command-context.js');
  const ctx = context || createTerminalContext(shell.term);

  // 6. Execute command logic
  try {
    const kernel = await kernelClient.getKernel();

    // Your command implementation here
    const result = await kernel.someOperation();

    // Output results
    ctx.writeln(result);

  } catch (error) {
    showError(shell.term, 'mycommand', error.message);
  }
}, {
  description: 'Brief description for help system',
  category: 'filesystem' // or 'shell', 'process', 'editor', etc.
});
```

### Command Naming Conventions

**DO**:
- Use lowercase names: `ls`, `grep`, `mkdir`
- Use Unix-style abbreviations: `cd`, `pwd`, `rm`
- Be concise but clear: `cat`, `stat`, `tree`

**DON'T**:
- Use camelCase: `listFiles` ❌
- Use underscores: `list_files` ❌
- Use long names: `listdirectorycontents` ❌

### Help Text Guidelines

#### Description
- One sentence, concise
- Start with verb: "List", "Search", "Create"
- No period at end

**Good**: "Search for patterns in files or input"
**Bad**: "This command searches through files and finds patterns that you specify."

#### Examples
- Show most common use case first
- Include 3-5 examples
- Vary complexity (simple → advanced)
- Inline descriptions after 2 spaces

```javascript
examples: [
  { command: 'grep error log.txt', description: 'Find "error" in log.txt' },
  { command: 'grep -n error log.txt', description: 'Show line numbers' },
  { command: 'grep -i ERROR log.txt', description: 'Case-insensitive' },
  { command: 'cat file.txt | grep pattern', description: 'Search piped input' }
]
```

#### Notes
- Optional section for important details
- Keyboard shortcuts, special behavior, limitations
- Bullet points preferred

```javascript
notes: [
  'Supports regular expressions',
  'Reads from stdin when no file specified',
  'Use -c flag to count matches instead of displaying them'
]
```

## Error Messages

### Format Rules

**Pattern**: `command: description`

**Example**:
```javascript
showError(shell.term, 'cat', 'missing file operand');
// Output: cat: missing file operand
```

### Writing Good Error Messages

**DO**:
- Be specific: "not a directory: foo.txt" not "invalid input"
- Include context: Show filename, path, or value
- Use lowercase (Unix convention)
- Be brief but informative

**DON'T**:
- Use emojis: "❌ Error!" ❌
- Be vague: "something went wrong" ❌
- Use exclamation points excessively ❌
- Include apologies: "Sorry, but..." ❌

### Error Message Examples

**Good**:
```
cat: missing file operand
ls: cannot access '/foo': no such file or directory
grep: missing pattern
mkdir: cannot create directory '/test': file exists
rm: cannot remove '/home': is a directory
```

**Bad**:
```
Error!
Oops, something went wrong 😅
Sorry, we couldn't complete that action
An error has occurred. Please try again.
```

## Color Usage Rules

### When to Use Colors

**Green** (`\x1b[32m`):
- Successful operations: "File saved"
- Completion messages: "Process 1 exited with code 0"
- Confirmations: "3 files copied"
- Status "running" in tables

**Red/Orange** (`\x1b[31m`):
- Error messages: "command: error description"
- Failed operations: "Process 1 exited with code 1"
- Status "failed" in tables
- Highlighting matches in grep (terminal only)

**Yellow** (`\x1b[33m`):
- Warnings: "Restarting Olivine..."
- Cautions: "Operation may take a while"
- Status "killed" in tables

**Blue** (`\x1b[34m`):
- Directory names in listings
- File type indicators
- Path components (in some contexts)

**Dim Gray** (`\x1b[90m`):
- Meta information: "[Process 1 started]"
- Timestamps
- Supplementary details
- Comments in verbose output

**Bold** (`\x1b[1m`):
- Table headers
- Section titles
- Emphasized terms

**Dim** (`\x1b[2m`):
- De-emphasized content
- Shell script command echo: `+ command here`

### Always Reset

**ALWAYS** include `\x1b[0m` after colored text:

```javascript
// Good
term.writeln(`\x1b[32mSuccess\x1b[0m`);

// Bad - color bleeds to next line
term.writeln(`\x1b[32mSuccess`);
```

### Pipe-Aware Coloring

**Rule**: No colors when output is piped or redirected.

```javascript
// Check context before coloring
const name = (ctx.isPiped || ctx.isRedirected)
  ? entry.name
  : `\x1b[34m${entry.name}\x1b[0m`;
ctx.writeln(name);
```

**Why**: Piped output goes to other commands or files. ANSI codes would corrupt data.

## Typography Guidelines

### Text Alignment

**Tables**: Use `.padStart()` and `.padEnd()`

```javascript
// Right-align numbers
const size = (entry.size || 0).toString().padStart(8);

// Left-align text
const name = entry.name.padEnd(20);

// Combine
term.writeln(`${size} ${name}`);
```

**Output**:
```
    1024 file.txt
     512 data.json
   65536 image.png
```

### Column Spacing

**Rule**: 2 spaces between columns (minimum)

```javascript
term.writeln(`${perms}  1 koma koma ${size} ${date} ${name}`);
//                  ^^                    ^       ^
//                  2 spaces          1 space   1 space
```

**Rationale**: Readable separation without excessive whitespace.

### Line Length

**Terminal output**: No hard limit, but prefer < 120 chars
**Tables**: Design for 80-character terminals
**Help text**: Wrap at 80 characters

### Case Conventions

**Command names**: lowercase (`ls`, `grep`, `cat`)
**Flags**: lowercase (`-l`, `-n`, `--verbose`)
**Error messages**: lowercase start ("not a directory")
**Headers**: Uppercase (`PID STATUS TIME`)
**Filenames**: Preserve user's case

## Output Formatting

### Simple Output

**For single values**:
```javascript
shell.term.writeln(result);
```

**For multiple lines**:
```javascript
const lines = content.split('\n');
lines.forEach(line => term.writeln(line));
```

### Structured Output (Tables)

**Pattern**:
1. Bold header
2. Consistent column widths
3. Semantic coloring for status
4. Right-align numbers, left-align text

```javascript
// Header
term.writeln('\x1b[1mPID  STATUS      TIME     COMMAND\x1b[0m');

// Rows
processes.forEach(proc => {
  const pid = String(proc.pid).padEnd(4);
  const status = proc.status.padEnd(11);
  const time = String(proc.time).padStart(8);
  const command = proc.command;

  const color = proc.status === 'running' ? '\x1b[32m' : '\x1b[0m';
  term.writeln(`${pid} ${color}${status}\x1b[0m ${time} ${command}`);
});
```

### List Output

**One item per line** (for piping):
```javascript
entries.forEach(entry => ctx.writeln(entry.name));
```

**Space-separated** (for terminal display):
```javascript
const names = entries.map(e => e.name);
ctx.writeln(names.join('  '));
```

**Rule**: Use `ctx.isPiped` to decide format.

### Empty Output

**For empty results**, either:
1. Output nothing (silent success)
2. Output empty line `ctx.writeln('')`
3. Output info message (if helpful)

**Example**:
```javascript
if (entries.length === 0) {
  ctx.writeln('');  // Just empty line
  return;
}
```

**Don't** output "No results found" for commands that might be piped.

## Pipeline and Context Handling

### Always Use Context

**Rule**: Commands must accept and use context parameter.

```javascript
shell.registerCommand('mycommand', async (args, shell, context) => {
  const { createTerminalContext } = await import('../utils/command-context.js');
  const ctx = context || createTerminalContext(shell.term);

  // Use ctx.writeln() not term.writeln()
  ctx.writeln('output');
});
```

### Check for Stdin

**When command can accept piped input**:

```javascript
if (ctx.hasStdin()) {
  // Read from pipe
  const input = ctx.stdin;
  const lines = ctx.getStdinLines();
} else {
  // Read from file or prompt for input
}
```

### Conditional Formatting

**Adjust output based on context**:

```javascript
// Terminal: colored, space-separated
// Piped: plain text, newline-separated
if (ctx.isPiped || ctx.isRedirected) {
  entries.forEach(e => ctx.writeln(e.name));
} else {
  const names = entries.map(e => `\x1b[34m${e.name}\x1b[0m`);
  ctx.writeln(names.join('  '));
}
```

## UI Element Guidelines

### Activity LED

**When to trigger**:
- **Reading**: Any filesystem read (readFile, readdir, stat)
- **Writing**: Any filesystem write (writeFile, mkdir, rm)
- **Error**: Operation fails with exception

**How to use**:
```javascript
import { activityLED } from '../ui/activity-led.js';

// Wrap operations
async function withTimeout(promise, operation, activityType = 'read') {
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

### Status Bar Updates

**Update when**:
- CWD changes (cd command)
- Process starts/stops
- Editor opens/closes

**Don't** update status bar for every command. Keep it stable.

### Modal Dialogs

**Use modals for**:
- Confirmations (delete, overwrite)
- Important warnings
- Editor unsaved changes

**Don't use modals for**:
- Normal command output
- Routine operations
- Progress indicators

**Keep modals**:
- Brief (1-2 sentences)
- Clear action buttons
- Dismissible with Esc

## Code Organization

### File Structure

**Command files** (`src/commands/`):
- Group by category (filesystem, shell, process)
- One export function: `registerXxxCommands(shell, ...)`
- Import utilities at top

**UI components** (`src/ui/`):
- One class per file
- Export class and/or singleton instance
- Keep focused on single responsibility

**Utilities** (`src/utils/`):
- Shared helpers
- Pure functions preferred
- Export individual functions

### Import Order

```javascript
// 1. External libraries
import { Terminal } from 'xterm';

// 2. Internal modules (absolute imports)
import { kernelClient } from '../kernel/client.js';
import { activityLED } from '../ui/activity-led.js';

// 3. Utilities
import {
  showError,
  showSuccess,
  resolvePath
} from '../utils/command-utils.js';

// 4. Stdlib
import { createArgsModule } from '../stdlib/args.js';
```

### Constants

**Define at module level**:
```javascript
const argparse = createArgsModule();
const DEFAULT_TIMEOUT = 5000;
const MAX_RETRIES = 3;
```

**Don't use magic numbers** in code.

## Testing Your Changes

### Visual Testing Checklist

Before submitting a PR:

- [ ] Test in terminal (does it look correct?)
- [ ] Test with pipes (`ls | grep`)
- [ ] Test with redirection (`ls > file.txt`)
- [ ] Test error cases (invalid input)
- [ ] Test help flag (`command --help`)
- [ ] Test colors (are they reset properly?)
- [ ] Test long output (does it scroll well?)
- [ ] Test copy-paste (can users copy output?)

### Manual Test Commands

```bash
# Basic functionality
mycommand arg1 arg2

# Help text
mycommand --help
mycommand -h

# Piping
echo "test" | mycommand
mycommand | cat

# Redirection
mycommand > output.txt
mycommand >> append.txt

# Error handling
mycommand                    # Missing args
mycommand /nonexistent       # Invalid input
mycommand --invalid-flag     # Unknown flag

# Edge cases
mycommand ""                 # Empty string
mycommand /                  # Root path
mycommand .                  # Current dir
```

## Common Mistakes to Avoid

### Mistake 1: Forgetting to Reset Colors

**Wrong**:
```javascript
term.writeln('\x1b[31mError');
term.writeln('This is also red!');
```

**Right**:
```javascript
term.writeln('\x1b[31mError\x1b[0m');
term.writeln('This is normal color');
```

### Mistake 2: Using term Instead of ctx

**Wrong**:
```javascript
shell.registerCommand('mycommand', async (args, shell, context) => {
  shell.term.writeln('output');  // Ignores pipes!
});
```

**Right**:
```javascript
shell.registerCommand('mycommand', async (args, shell, context) => {
  const ctx = context || createTerminalContext(shell.term);
  ctx.writeln('output');  // Pipe-aware
});
```

### Mistake 3: Hardcoding Paths

**Wrong**:
```javascript
const filePath = '/home/user/file.txt';  // User-specific
```

**Right**:
```javascript
const filePath = resolvePath(args[0], shell.cwd);  // Relative to CWD
```

### Mistake 4: Verbose Error Messages

**Wrong**:
```javascript
showError(shell.term, 'cat', 'We\'re sorry, but we couldn\'t find the file you specified. Please check the path and try again.');
```

**Right**:
```javascript
showError(shell.term, 'cat', `cannot open '${filename}': no such file`);
```

### Mistake 5: Mixing Output Methods

**Wrong**:
```javascript
console.log('File saved');       // Goes to browser console
term.write('File saved');        // No newline
term.writeln('File saved\n');    // Extra newline
```

**Right**:
```javascript
ctx.writeln('File saved');       // Correct
```

### Mistake 6: Not Handling Empty Results

**Wrong**:
```javascript
// Nothing happens, user confused
if (results.length === 0) return;
```

**Right**:
```javascript
// Clear feedback
if (results.length === 0) {
  ctx.writeln('');  // Or appropriate message
  return;
}
```

### Mistake 7: Using Emoji or Decorations

**Wrong**:
```javascript
term.writeln('✅ Success!');
term.writeln('❌ Error!');
term.writeln('⚠️ Warning!');
```

**Right**:
```javascript
showSuccess(shell.term, '', 'Operation completed');
showError(shell.term, 'command', 'error description');
showWarning(shell.term, 'Operation may take a while');
```

## Performance Considerations

### Batch Operations

**For many items**, consider progress indication:

```javascript
// Bad: Silent for long operations
for (const file of files) {
  await processFile(file);
}

// Good: Show progress
for (let i = 0; i < files.length; i++) {
  await processFile(files[i]);
  if (i % 100 === 0) {
    term.write(`Processing ${i}/${files.length}...\r`);
  }
}
```

### Avoid Blocking

**Use async/await** for I/O operations:

```javascript
// Bad: Blocks UI
const content = readFileSync(path);

// Good: Non-blocking
const content = await kernel.readFile(path);
```

### Limit Output Size

**For large outputs**, paginate or warn:

```javascript
if (entries.length > 1000) {
  showInfo(shell.term, `Showing first 1000 of ${entries.length} entries`);
  entries = entries.slice(0, 1000);
}
```

## Documentation Requirements

### JSDoc Comments

**For utility functions**:
```javascript
/**
 * Resolve a path relative to current working directory
 * @param {string} inputPath - Path to resolve
 * @param {string} cwd - Current working directory
 * @returns {string} Absolute path
 *
 * @example
 * resolvePath('file.txt', '/home/user') // '/home/user/file.txt'
 */
export function resolvePath(inputPath, cwd) {
  // ...
}
```

### Inline Comments

**Use sparingly**, only for non-obvious logic:

```javascript
// Process escape sequences (handle \\ first to avoid double-processing)
content = content
  .replace(/\\\\/g, '\x00')  // Temporarily replace \\
  .replace(/\\n/g, '\n')
  .replace(/\\t/g, '\t')
  .replace(/\x00/g, '\\');   // Restore \\
```

### Man Pages

**For significant commands**, create man page in `docs/man/`:

```markdown
# commandname(1)

## NAME
commandname - brief description

## SYNOPSIS
commandname [options] arguments

## DESCRIPTION
Longer description of what the command does.

## OPTIONS
-l, --long
    Description of long format

## EXAMPLES
    commandname file.txt
        Basic usage

## SEE ALSO
relatedcommand(1)
```

## Accessibility Guidelines

### Screen Reader Compatibility

- Use semantic HTML in modals
- Ensure text content is readable
- Avoid ASCII art for critical information
- Provide text alternatives for visual indicators

### Keyboard Navigation

- All features accessible via keyboard
- Clear focus indicators
- No keyboard traps
- Standard shortcuts (Esc to close, Tab to navigate)

### Color Independence

- Don't rely solely on color (use text labels too)
- Maintain high contrast ratios
- Provide alternative feedback (LED + text messages)

## Version Control Guidelines

### Commit Messages

**Format**:
```
Type: Brief description (50 chars max)

Longer explanation if needed (wrap at 72 chars).
Can include multiple paragraphs.

- Bullet points for lists
- Reference issues: #123
```

**Types**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting, visual changes
- `refactor:` Code restructure
- `test:` Adding tests
- `chore:` Build, dependencies

**Examples**:
```
feat: Add grep command with regex support

Implements grep with -n, -i, -v, -c flags.
Supports reading from files or stdin.
Includes man page and help text.

fix: Reset ANSI colors after error messages

Colors were bleeding to subsequent lines.
Now properly resets with \x1b[0m.

docs: Update style guide with color usage rules
```

### Pull Request Checklist

Before submitting:

- [ ] Code follows style guide
- [ ] Help text included
- [ ] Error handling tested
- [ ] Colors properly reset
- [ ] Pipes/redirects work
- [ ] No console.log() in final code
- [ ] Documentation updated
- [ ] Commit messages follow format
- [ ] Visual testing completed

## Getting Help

**Resources**:
- [Visual Language](./visual-language.md) - Color, typography specs
- [UI Patterns](./ui-patterns.md) - Implementation patterns
- [Design README](./README.md) - Design system overview
- [Terminal Aesthetics (Lore)](../lore/terminal-aesthetics.md) - Philosophy
- [Testing Strategy](../TESTING_STRATEGY.md) - Testing guidelines

**Questions?**
- Check existing commands in `src/commands/` for examples
- Read the lore docs for design philosophy
- Ask in project discussions/issues

## Quick Start: Adding Your First Command

1. **Choose a category**: filesystem, shell, process
2. **Copy template** from this guide
3. **Implement core logic**
4. **Add help text** with examples
5. **Test thoroughly** (terminal, pipes, errors)
6. **Update documentation** if needed
7. **Submit PR** with clear description

**Example PR description**:
```
Adds `wc` command for counting lines, words, and characters.

Features:
- Supports -l (lines), -w (words), -c (chars) flags
- Reads from files or stdin
- Works in pipelines

Testing:
- [x] Basic functionality
- [x] Help text
- [x] Piping (cat file.txt | wc -l)
- [x] Error handling
- [x] All flags
```

---

## Summary

**Remember**:
1. **Use context** for pipe-aware output
2. **Reset colors** after every colored section
3. **Follow naming** conventions (lowercase, brief)
4. **Test thoroughly** (terminal, pipes, errors)
5. **Document** with help text and examples
6. **Keep it simple** - Industrial minimalism

**The golden rule**: "Could this have existed in 1987?" If it feels modern and flashy, dial it back. If it feels solid and purposeful, you're on track.

---

## Related Documentation

- [Design README](./README.md) - Design documentation index
- [Visual Language](./visual-language.md) - Complete visual design system
- [UI Patterns](./ui-patterns.md) - UI conventions and patterns

**Last Updated:** 2025-11-10
