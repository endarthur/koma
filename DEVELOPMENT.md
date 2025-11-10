# Koma Development Guide

**Last Updated:** 2025-11-10

This guide documents Koma's architecture patterns, conventions, and common pitfalls to help maintain consistency and avoid bugs.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Import Patterns](#import-patterns)
3. [Command Implementation](#command-implementation)
4. [Kernel Access](#kernel-access)
5. [VFS Patterns](#vfs-patterns)
6. [Common Pitfalls](#common-pitfalls)
7. [Testing Checklist](#testing-checklist)
8. [Code Style](#code-style)

---

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Main Thread)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Terminal   │  │  Tab Manager │  │    Editor    │ │
│  │  (xterm.js)  │  │              │  │ (CodeMirror) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘ │
│         │                 │                             │
│         └─────────────────┼─────────────────────────────┤
│                           │                             │
│                    ┌──────▼───────┐                     │
│                    │   Shell.js   │                     │
│                    │  (Commands)  │                     │
│                    └──────┬───────┘                     │
│                           │                             │
│                    ┌──────▼────────┐                    │
│                    │ KernelClient  │ (Singleton)        │
│                    │  (Comlink)    │                    │
│                    └───────────────┘                    │
└────────────────────────────┬────────────────────────────┘
                             │ Comlink RPC
                             │
┌────────────────────────────▼────────────────────────────┐
│              Web Worker (Olivine Kernel)                │
│  ┌─────────────────────────────────────────────────┐   │
│  │              KomaKernel Class                   │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │   VFS    │  │ ProcessMgr   │  │Scheduler │ │   │
│  │  │(IndexedDB)│  │(AsyncFunction)│ │  (Cron)  │ │   │
│  │  └──────────┘  └──────────────┘  └──────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Olivine kernel runs in a Web Worker** - All filesystem, process, and scheduling operations happen in the worker
2. **Comlink bridges UI ↔ Worker** - All kernel methods are async (return Promises)
3. **VFS is backed by IndexedDB** - Persistent across page reloads
4. **Commands are registered in Shell** - Each command is a function that receives `(args, shell)`
5. **No build system** - Pure ES modules, import maps, CDN dependencies

---

## Import Patterns

### ❌ WRONG: Namespace import of singleton
```javascript
import * as kernelClient from '../kernel/client.js';
// kernelClient.getKernel is NOT a function! It's an object with a getKernel method
```

### ✅ CORRECT: Named import of singleton
```javascript
import { kernelClient } from '../kernel/client.js';
// kernelClient.getKernel() works correctly
```

### Common Imports in Commands

**In `src/commands/*.js` files:**
```javascript
// Utilities (always available)
import {
  showError,
  showSuccess,
  showInfo,
  showWarning,
  resolvePath
} from '../utils/command-utils.js';

// Kernel access (singleton!)
import { kernelClient } from '../kernel/client.js';

// Argparse for command schemas
import { createArgsModule } from '../stdlib/args.js';
const argparse = createArgsModule();

// Man page rendering (if needed)
import { renderManPage } from '../utils/man-renderer.js';
```

### Stdlib Module Patterns

All stdlib modules use factory functions:

```javascript
// In src/stdlib/fs.js
export function createFsModule(vfs) {
  return {
    readFile: async (path) => vfs.readFile(path),
    // ...
  };
}

// In scripts (automatically injected by kernel)
const content = await fs.readFile('/home/file.txt');
```

---

## Command Implementation

### Standard Command Structure

```javascript
shell.registerCommand('mycommand', async (args, shell) => {
  // 1. Define schema
  const schema = {
    description: 'Brief description of command',
    flags: {
      verbose: { short: 'v', description: 'Verbose output' }
    },
    options: {
      output: { short: 'o', description: 'Output file' }
    },
    positional: { description: '<input> [files...]' },
    examples: [
      { command: 'mycommand file.txt', description: 'Process file' },
      { command: 'mycommand -v file.txt', description: 'Verbose mode' }
    ]
  };

  // 2. Show help if requested
  if (argparse.showHelp('mycommand', args, schema, shell.term)) return;

  // 3. Parse arguments
  const parsed = argparse.parse(args, schema);

  // 4. Check for errors
  if (parsed.errors.length > 0) {
    parsed.errors.forEach(err => showError(shell.term, 'mycommand', err));
    return;
  }

  // 5. Validate required arguments
  if (parsed.positional.length === 0) {
    showError(shell.term, 'mycommand', 'missing required argument');
    return;
  }

  // 6. Get kernel access
  const kernel = await kernelClient.getKernel();

  // 7. Execute command logic
  try {
    // Your command logic here
    const result = await kernel.someMethod();
    showSuccess(shell.term, '', 'Operation complete');
  } catch (error) {
    showError(shell.term, 'mycommand', error.message);
    console.error('[mycommand]', error);
  }
}, {
  description: 'Brief description for help listing',
  category: 'filesystem' // or 'shell', 'process', etc.
});
```

### Command Categories

When registering commands, use these categories:
- `filesystem` - File/directory operations (ls, cat, mkdir, etc.)
- `shell` - Shell utilities (help, man, clear, history, etc.)
- `process` - Process management (run, ps, kill)
- `editor` - Editor commands (vein)
- `system` - System management (koma, restart)

---

## Kernel Access

### The Singleton Pattern

**`kernelClient` is a singleton instance** created in `src/kernel/client.js`:

```javascript
// In src/kernel/client.js
export const kernelClient = new KernelClient();
```

### Getting Kernel Reference

**Always use this pattern:**
```javascript
const kernel = await kernelClient.getKernel();
```

**Why?**
- `getKernel()` waits for the kernel to initialize
- Returns the Comlink-wrapped kernel proxy
- Throws clear error if initialization failed

### Available Kernel Methods

```javascript
// VFS operations
await kernel.readFile(path)
await kernel.writeFile(path, content)
await kernel.readdir(path)
await kernel.mkdir(path)
await kernel.unlink(path)
await kernel.stat(path)
await kernel.rename(oldPath, newPath)

// Process operations
await kernel.spawn(script, args, env)
await kernel.kill(pid)
await kernel.ps()
await kernel.getOutput(pid)

// Scheduler operations
await kernel.crontab(schedule, script)
await kernel.cronlist()
await kernel.cronrm(id)

// System operations (Phase 5.5+)
await kernel.getSystemInfo()
await kernel.checkSystemUpdate()
await kernel.upgradeSystem()
await kernel.resetSystem()
```

---

## VFS Patterns

### Directory Structure

```
/                   Root
├── home/          User files (NEVER touched by updates)
├── tmp/           Temporary files (can be cleared)
├── usr/           System files
│   ├── bin/       System scripts
│   └── share/
│       └── man/   Man pages (updated by koma upgrade)
├── etc/           System config
│   └── koma-version  Version tracking
├── mnt/           Mount points (future: File System Access API)
└── proc/          Process metadata (future)
```

### Safe Update Pattern

**Rule:** Only overwrite files in `/usr/` and `/etc/` during updates. **NEVER** touch `/home/`.

```javascript
// Good: Update system files
await kernel.writeFile('/usr/share/man/ls.1.md', manPageContent);
await kernel.writeFile('/etc/koma-version', versionData);

// Bad: Touching user data
await kernel.writeFile('/home/config.json', newConfig); // DON'T DO THIS!
```

### Path Resolution

Use the `path` stdlib module (or `resolvePath` util):

```javascript
import { resolvePath } from '../utils/command-utils.js';

// In a command
const absolutePath = resolvePath(userPath, shell.cwd);
```

---

## Common Pitfalls

### 1. ❌ Wrong Import Pattern for Singleton

```javascript
// WRONG
import * as kernelClient from '../kernel/client.js';
await kernelClient.getKernel(); // Error: getKernel is not a function

// CORRECT
import { kernelClient } from '../kernel/client.js';
await kernelClient.getKernel(); // Works!
```

### 2. ❌ Forgetting to Await Kernel Methods

```javascript
// WRONG
const files = kernel.readdir('/home'); // Returns Promise, not array!

// CORRECT
const files = await kernel.readdir('/home');
```

### 3. ❌ Not Checking Parsed Errors

```javascript
// WRONG
const parsed = argparse.parse(args, schema);
const file = parsed.positional[0]; // Might have validation errors!

// CORRECT
const parsed = argparse.parse(args, schema);
if (parsed.errors.length > 0) {
  parsed.errors.forEach(err => showError(shell.term, 'cmd', err));
  return;
}
const file = parsed.positional[0];
```

### 4. ❌ Inconsistent Error Handling

```javascript
// WRONG - unclear error message
shell.term.writeln('Error: something failed');

// CORRECT - use showError with context
showError(shell.term, 'mycommand', 'file not found: ' + path);
```

### 5. ❌ Modifying User Data During Updates

```javascript
// WRONG - destroys user work!
async updateSystemFiles() {
  await this.writeFile('/home/config.json', defaultConfig);
}

// CORRECT - only update system paths
async updateSystemFiles() {
  await this.writeFile('/etc/koma-version', versionData);
  await this.writeFile('/usr/share/man/ls.1.md', manPage);
}
```

### 6. ❌ Not Using showHelp Helper

```javascript
// WRONG - verbose boilerplate
if (argparse.hasHelp(args)) {
  const helpLines = argparse.usage('cmd', schema);
  helpLines.forEach(line => shell.term.writeln(line));
  return;
}

// CORRECT - one-liner
if (argparse.showHelp('cmd', args, schema, shell.term)) return;
```

---

## Testing Checklist

### Before Committing a New Command

- [ ] Help text works (`mycommand --help`)
- [ ] Error handling for missing arguments
- [ ] Error handling for invalid paths/files
- [ ] Success messages use `showSuccess()`
- [ ] Error messages use `showError()` with command name
- [ ] Command registered with proper category
- [ ] Argparse schema has description and examples
- [ ] Works with both relative and absolute paths (if applicable)
- [ ] Doesn't modify `/home/` during system operations
- [ ] Console errors logged for debugging (`console.error('[cmd]', error)`)

### Before Committing System Changes

- [ ] Version constants updated (KOMA_VERSION, KOMA_BUILD_DATE)
- [ ] ROADMAP.md updated with changes
- [ ] Man pages built (`python build-man-pages.py`)
- [ ] No hardcoded dates (except in version constants)
- [ ] User data preservation tested
- [ ] Backward compatibility maintained

---

## Code Style

### Naming Conventions

```javascript
// Constants: SCREAMING_SNAKE_CASE
const KOMA_VERSION = '0.5.0';

// Classes: PascalCase
class KomaKernel { }
class ProcessManager { }

// Functions/methods: camelCase
async getSystemInfo() { }
function resolvePath() { }

// Files: kebab-case
// command-utils.js, man-pages.js, olivine.js
```

### Async/Await Patterns

```javascript
// Prefer async/await over .then()
// GOOD
async function loadData() {
  const data = await kernel.readFile('/home/data.json');
  return JSON.parse(data);
}

// AVOID
function loadData() {
  return kernel.readFile('/home/data.json')
    .then(data => JSON.parse(data));
}
```

### Error Messages

```javascript
// Command name first, lowercase message
showError(shell.term, 'mycommand', 'file not found: ' + path);

// Success messages - empty string for command name
showSuccess(shell.term, '', 'Operation completed successfully');

// Info messages
showInfo(shell.term, '', 'Updates available - run "koma update"');
```

### Comments

```javascript
// Single-line comments for brief explanations
// Check if file exists before reading

/**
 * Multi-line JSDoc comments for functions
 * @param {string} path - File path to read
 * @returns {Promise<string>} File contents
 */
async function readFile(path) { }
```

---

## Version Management

### When to Bump Version

**Patch (0.5.0 → 0.5.1):**
- Bug fixes
- Man page updates
- Minor improvements

**Minor (0.5.0 → 0.6.0):**
- New commands
- New stdlib modules
- New features (backward compatible)

**Major (0.5.0 → 1.0.0):**
- Breaking changes
- Major architecture changes
- Complete phase milestones

### Update Process

1. Update `KOMA_VERSION` in `src/kernel/olivine.js`
2. Update `KOMA_BUILD_DATE` to today's date
3. Update "Last Updated" in ROADMAP.md
4. Commit with message: `chore: bump version to X.Y.Z`
5. Users run `koma upgrade` to get updates

---

## Quick Reference

### File Locations

```
Commands:        src/commands/filesystem.js, src/commands/shell.js
Kernel:          src/kernel/olivine.js
Kernel Client:   src/kernel/client.js
Stdlib:          src/stdlib/*.js
Utilities:       src/utils/*.js
Man Pages:       docs/man/**/*.md
Build Script:    build-man-pages.py
Roadmap:         ROADMAP.md
```

### Common Operations

```bash
# Build man pages
python build-man-pages.py

# Test in browser
python -m http.server 8000
# Open http://localhost:8000

# Check version
koma version

# Update system files
koma upgrade
```

---

## Contributing

When adding new features:

1. Follow the patterns in this guide
2. Update ROADMAP.md phase sections
3. Add man pages for new commands
4. Test error cases, not just happy path
5. Use descriptive commit messages
6. Preserve user data (`/home/`) at all costs

---

**Questions?** Check existing command implementations in `src/commands/` for examples.

**Found a pattern not documented here?** Add it to this guide!
