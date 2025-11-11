# Koma Terminal - Development Roadmap

## Project Vision
Browser-resident automation workstation that emulates a single-user Unix terminal. Runs entirely client-side using a service worker "kernel" with no servers required after install.

## Technology Stack
- **Pure vanilla:** HTML + ES modules + CSS (no build tools, no npm)
- **Terminal:** xterm.js for terminal emulation
- **Editor:** CodeMirror 6 (called `vein`) with vim mode
- **Storage:** IndexedDB for virtual filesystem
- **Worker:** Service worker as OS kernel layer
- **RPC:** Comlink for UI ↔ worker communication
- **Server:** Python's http.server for local development
- **Deploy:** GitHub Pages (static hosting)

## Development Phases

### ✅ Phase 1: Foundation (COMPLETE)
**Goal:** Get pixels on screen, validate aesthetic

**Completed:**
- [x] Project structure (vanilla JS, ES modules)
- [x] HTML skeleton with import maps
- [x] CSS theme system with industrial minimalism aesthetic
  - Deep charcoal (#1a1a1a) background
  - Lava orange (#ff6b35) accents
  - Phosphor green (#00ff88) for status
  - IBM Plex Mono 13px
  - CSS custom properties (theme-ready)
- [x] xterm.js integration and rendering
- [x] Tab bar + terminal container + status bar layout
- [x] Python http.server running on :8000

**Files Created:**
- `index.html` - Entry point with import maps
- `styles/koma.css` - Complete theme and layout
- `src/terminal.js` - Main entry point
- `.gitignore`

---

### ✅ Phase 2: Terminal Shell (COMPLETE)
**Goal:** Make it interactive with proper shell semantics

**Completed:**
- [x] Command parser with argument splitting
- [x] Command registry system
- [x] Built-in commands:
  - `help` - Command listing and shortcuts
  - `clear` - Clear screen (Ctrl+L)
  - `echo` - Echo arguments
  - `pwd` - Print working directory
  - `cd` - Change directory (basic path handling)
  - `ls` - List directory (mock data for now)
  - `env` - Show environment variables
  - `history` - Show command history
  - `version` - Version info
  - `exit` - Close current tab
- [x] Tab manager with independent shell sessions
  - Create tabs (click [+] button)
  - Switch tabs (click tab name)
  - Close tabs (`exit` command)
  - Each tab has its own: cwd, history, current line
- [x] Command history with up/down arrows
- [x] Tab persistence via localStorage
  - Saves: tab names, cwd, history, active tab
  - Restores on page reload
- [x] `.komarc` initialization file (executed on new tab creation)
- [x] Status bar updates (shows current cwd)
- [x] Input handling:
  - Enter - Execute command
  - Backspace - Delete character
  - Ctrl+C - Cancel current line
  - Ctrl+L - Clear screen (ANSI escape codes)
  - Up/Down - Navigate history

**Files Created:**
- `src/shell.js` - Shell class with command execution
- `src/commands.js` - Built-in command implementations
- `src/ui/tab-manager.js` - Multi-tab management

**Design Decisions:**
- **No keyboard shortcuts for tabs** - All browser shortcut combos conflict (Ctrl+T, Ctrl+W, Alt+N, Ctrl+Shift+T, etc.). Using click-only UI for now.
- **Mock filesystem** - `ls` shows hardcoded directory trees until VFS is built
- **Simple path handling** - Basic cd logic (/, .., ~, absolute/relative) until VFS

**Bugs Fixed:**
- Duplicate tabs on reload (tab ID restoration logic)
- Missing prompts on new/restored tabs
- Ctrl+L showing multiple prompts (fixed with ANSI codes instead of term.clear())
- Input handler duplication on tab switch

---

### ✅ Phase 3: Service Worker Kernel (COMPLETE)
**Goal:** Build the OS layer with persistent storage

**Completed:**
- [x] Service worker registration and lifecycle
- [x] Virtual filesystem (VFS) structure:
  - `/home` - User files
  - `/tmp` - Temporary storage
  - `/usr/bin` - System binaries (scripts)
  - `/mnt` - File System Access API mounts (structure only)
  - `/proc` - Process metadata (structure only)
- [x] IndexedDB schema for VFS:
  - Inode-based structure
  - File metadata (type, parent, timestamps, size)
  - Directory tree navigation
  - Database migrations for schema upgrades
- [x] Comlink setup:
  - UI ↔ Service Worker RPC bridge
  - Expose kernel APIs to shell
  - Auto-reload on first install
- [x] Real filesystem commands:
  - `ls [path] [-l]` - Read actual VFS directories
  - `cat <file>` - Read file contents
  - `mkdir <dir>` - Create directories
  - `touch <file>` - Create empty files
  - `rm <path>` - Delete files/directories
  - `cp <src> <dest>` - Copy files
  - `mv <src> <dest>` - Move/rename files and directories
  - `cd <path>` - Change directory (with validation)
- [x] File I/O operations:
  - Read/write text files

**Deferred to Later Phases:**
- `find` command - ✅ **Implemented in Phase 5.6**
- Binary file support (when needed)
- Stream large files (when needed)
- File System Access API integration for `/mnt` (Phase 12+)
- Permissions enforcement (single-user system, not needed)

**Architecture Notes:**
- Service worker stays alive as "kernel"
- All filesystem state in IndexedDB
- UI shells connect via Comlink channels
- Multiple tabs share same VFS state
- Auto-reload on first service worker install

**Files Created:**
- `sw.js` - Service worker kernel with VFS
- `src/kernel/client.js` - Comlink client for kernel access

---

### ✅ Phase 4: Editor Integration (COMPLETE)
**Goal:** Add CodeMirror as `vein` command + UX polish

**Completed:**
- [x] CodeMirror 6 integration via import map (Skypack CDN)
- [x] Editor view layer (full-screen overlay toggles with terminal)
- [x] `vein <file>` command to open files
- [x] F2 and Ctrl+` to toggle terminal ↔ editor (F2 works on all keyboard layouts)
- [x] File save/load from VFS
- [x] Theme matching Koma aesthetic (dark mode with orange accents)
- [x] Undo/redo support (Ctrl+Z, history extension)
- [x] Dirty state tracking (shows `[+]` for unsaved changes)
- [x] Custom confirm modal (Koma-styled, keyboard navigation)
- [x] Activity LED indicator (thin vertical bar shows read/write/error states)
- [x] Tab completion (commands + nested file paths with `..` support)
- [x] Terminal copy/paste (right-click)
- [x] Command-specific help (`--help` / `-h` flag on all commands)
- [x] Keyboard shortcuts:
  - F2 or Ctrl+` - Toggle between terminal and editor
  - Ctrl+S - Save file
  - Esc - Close editor (with unsaved changes prompt)
  - Ctrl+Z - Undo
  - Right-click - Copy (if selection) or paste
  - Tab - Auto-complete commands and paths
  - F12 - Open dev console (passthrough)

**Architecture Improvement:**
- [x] **Migrated from Service Worker to Olivine (Web Worker kernel)**
  - Service Workers are ephemeral (browser terminates after ~30s idle)
  - Olivine (Web Worker) persists with page lifecycle
  - Eliminated random hangs and timeouts
  - `restart` command now works without page reload
  - Clean separation: VFS/Process/Scheduler layers ready for Phase 5

**Deferred to Future (CDN Dependency Conflicts):**
- [ ] Vim mode - `@replit/codemirror-vim` causes @codemirror/state duplication
- [ ] Syntax highlighting - Language extensions cause same dependency conflicts
- [ ] Multi-file editing - Not yet implemented

**Design Decisions:**
- **Skypack over esm.sh** - Better dependency deduplication for CodeMirror modules
- **F2 as primary toggle** - Ctrl+` doesn't work on international keyboard layouts (dead key)
- **Esc to close** - Ctrl+W closes browser tab, Esc is safer
- **Plain text editing** - Deferred syntax highlighting until proper bundler setup
- **Manual save (Ctrl+S)** - No auto-save, explicit user control
- **Olivine kernel (Web Worker)** - Lives with page, never randomly dies
- **Activity LED** - Industrial aesthetic (3px vertical bar, green/orange/red)
- **Tab completion debouncing** - 150ms delay prevents VFS spam

**Files Created:**
- `src/ui/editor.js` - Complete Editor class with CodeMirror integration
- `src/ui/activity-led.js` - Activity LED controller
- `src/kernel/olivine.js` - Olivine kernel (Web Worker, replaces sw.js)

**Files Modified:**
- `index.html` - Added CodeMirror imports, activity LED element
- `src/terminal.js` - Initialize Editor, F12 passthrough in xterm config
- `src/kernel/client.js` - Olivine kernel initialization (replaced SW registration)
- `src/ui/tab-manager.js` - Tab completion, copy/paste, F2 handling, path normalization
- `src/commands/index.js` - Pass editor to filesystem commands
- `src/commands/filesystem.js` - Added `vein` command, `--help` to all commands, activity LED integration
- `src/commands/shell.js` - `--help` to all commands, updated `restart` for Olivine
- `styles/koma.css` - Modal system, activity LED, editor status styles

---

### ✅ Phase 5: Process & Execution (COMPLETE)
**Goal:** Run JavaScript as processes

**Completed:**
- [x] JavaScript execution environment (AsyncFunction-based)
- [x] Standard library with dynamic imports:
  - `fs` - All VFS operations + helpers (exists, isFile, isDirectory, appendFile)
  - `http` - Fetch wrapper (get, post, put, delete, json, text)
  - `notify` - Browser notifications (disabled in worker context, ready for future)
- [x] Process manager:
  - One-shot jobs (`run script.js [args...]`)
  - Stdout/stderr capture and streaming to terminal
  - Process listing (`ps`) with color-coded status
  - Process killing (`kill <pid>`)
  - Process state tracking (running, completed, failed, killed)
  - Exit codes and error handling
- [x] Cron scheduler:
  - Full cron expression parser (5-field format)
  - Schedule periodic tasks (`cron "<schedule>" <script>`)
  - List jobs (`cronlist`)
  - Remove jobs (`cronrm <id>`)
  - Automatic job execution and rescheduling
- [x] Environment variables passed to processes
- [x] Quote-aware shell parser (handles `"quoted strings"`)

**Deferred to Future:**
- [ ] Background daemon processes (not needed yet)
- [ ] Process metadata in `/proc` (not needed yet)
- [ ] Interactive `crontab -e` editor (using direct commands for now)

**Architecture:**
- Scripts execute using AsyncFunction in Olivine worker context
- Console output captured via custom console object
- Stdout/stderr polled and streamed to terminal every 100ms
- Stdlib modules loaded via dynamic imports (maintainable and modular)
- Process cleanup after 60 seconds of completion

**Files Created:**
- `src/stdlib/fs.js` - Filesystem module
- `src/stdlib/http.js` - HTTP module
- `src/stdlib/notify.js` - Notifications module

**Files Modified:**
- `src/kernel/olivine.js` - Added Process, ProcessManager, Scheduler classes
- `src/commands/shell.js` - Added run, ps, kill, cron, cronlist, cronrm commands
- `src/shell.js` - Improved command parser with quote handling
- `src/ui/editor.js` - Handle creating new files (ENOENT gracefully)

#### ✨ Phase 5 Maintenance (November 2025)

**Stdlib Expansion:**
- [x] Created `src/stdlib/path.js` - POSIX path utilities
  - `join`, `resolve`, `dirname`, `basename`, `extname`, `normalize`, `relative`, `isAbsolute`
  - Replaces duplicated `normalizePath` implementations across codebase
- [x] Created `src/stdlib/args.js` - Command-line argument parsing
  - `parse` - Full argument parser with flags, options, positional args
  - `usage` - Auto-generate usage text from schema
  - `hasHelp`, `hasFlag`, `getOption` - Convenience helpers
  - Supports `--flag`, `-f`, `--option=value`, `-o value`, combined flags (`-abc`)
- [x] Updated olivine.js to expose `path` and `argparse` to scripts
  - Scripts now have 8 modules: args, env, console, fs, http, notify, path, argparse

**Code Cleanup & Refactoring:**
- [x] Created `src/utils/command-utils.js` - Shared command helpers
  - `resolvePath` - Unified path resolution using stdlib path
  - `showError`, `showSuccess`, `showWarning`, `showInfo` - Consistent terminal output
  - `hasHelpFlag`, `getOption`, `getPositionalArgs` - Argument parsing helpers
  - `formatSize`, `formatDate`, `formatPermissions` - Display formatting
  - `withTimeout`, `getKernel` - Kernel access utilities
- [x] Refactored `src/commands/filesystem.js`
  - Removed 26-line `normalizePath` function (replaced with stdlib)
  - Standardized all help checks with `hasHelpFlag()`
  - Unified error handling with `showError()` across all 17 commands
  - ~100+ lines of duplicated code eliminated
- [x] Refactored `src/commands/shell.js`
  - Updated 11 commands to use utilities
  - Added `path` and `argparse` to `run` command help text
  - Replaced path resolution patterns with `resolvePath()`
  - Standardized help flag checks
- [x] Kept essential debug logs (kernel init, VFS, errors)

**Argparse Enhancement & Command Migration:**
- [x] Enhanced `args.js` with optional help sections
  - `description` - Command description text
  - `examples` - Array of {command, description} usage examples
  - `notes` - Array of additional notes/information
  - `seeAlso` - Array of related command references
  - `showHelp()` - New helper function (reduced help display from 4 lines to 1 line)
- [x] Migrated 16 commands to argparse schemas with enhanced help
  - Filesystem (7): cd, cat, mkdir, touch, rm, cp, mv
  - Shell/Process (7): man, run, ps, kill, cron, cronlist, cronrm
  - Editor (2): ls, vein (already done)
  - Eliminated manual flag parsing (args.includes('-l'))
  - Automatic combined flag support (-la works without special code)
  - Consistent help text generation from schemas
  - Standardized error messages

**Man Pages Build System:**
- [x] Created `docs/man/` directory with individual markdown files
  - 31 man pages covering all commands
  - Standard sections: NAME, SYNOPSIS, DESCRIPTION, OPTIONS, EXAMPLES, SEE ALSO
  - Easy to edit with markdown preview
  - Git-friendly (clear diffs per command)
- [x] Created `build-man-pages.py` Python build script
  - Reads all .md files from docs/man/
  - Escapes content for JavaScript template literals
  - Generates `src/utils/man-pages.js` as single module
  - Outputs build summary with file count
- [x] Created `docs/man/README.md` with build system documentation
  - Editing workflow instructions
  - Build process explanation
  - GitHub Pages deployment integration
- [x] Existing `man` command now uses markdown sources
  - Already working with markdown-to-ANSI rendering
  - Man pages bundled into single JS module for efficient loading

**Impact:**
- **~200 lines** of duplicated code removed
- **2 new stdlib modules** available to all scripts
- **Consistent patterns** across all 31 commands
- **Better maintainability** for future development
- **Man pages system complete** - 37 man pages (31 commands + 5 stdlib APIs) fully documented
- **Schema-based help** - All commands now use argparse for consistent UX

**Files Created:**
- `src/stdlib/path.js` - Path utilities module
- `src/stdlib/args.js` - Argument parsing module (enhanced with help sections)
- `src/utils/command-utils.js` - Shared command helpers
- `src/utils/man-pages.js` - Auto-generated man pages bundle (DO NOT EDIT)
- `docs/man/filesystem/*.1.md` - 17 command man pages
- `docs/man/shell/*.1.md` - 15 command man pages
- `docs/man/stdlib/*.3.md` - 5 stdlib API man pages
- `docs/man/README.md` - Build system documentation
- `build-man-pages.py` - Man pages build script (with recursive directory support)

**Files Modified:**
- `src/kernel/olivine.js` - Added path and argparse to stdlib initialization
- `src/commands/filesystem.js` - Refactored with command-utils, migrated to argparse schemas
- `src/commands/shell.js` - Refactored with command-utils, migrated to argparse schemas, updated help text

---

### ✅ Phase 5.5: System Updates (COMPLETE)
**Goal:** Update system files without losing user data

**Completed:**
- [x] Version tracking system:
  - `/etc/koma-version` file with version metadata
  - Embedded KOMA_VERSION constant in code (0.5.0)
  - KOMA_BUILD_DATE constant (2025-11-10)
- [x] `koma version` command:
  - Show current Koma version and build date
  - Display system files version
  - Show man pages count
  - Indicate if updates are available
- [x] `koma update` command:
  - Check for updates (read-only)
  - Compare current vs embedded version
  - List changes that would be applied
- [x] `koma upgrade` command:
  - Apply system updates
  - Overwrite man pages from embedded data (37 pages)
  - Update `/etc/koma-version` with new version
  - Preserve all user data in `/home/`
- [x] `koma reset` command:
  - Force reinstall all system files
  - Useful for troubleshooting

**Architecture:**
- System paths separated from user paths:
  - `/usr/` - System binaries (can overwrite)
  - `/etc/` - System config (can update)
  - `/home/` - User data (NEVER touched)
  - `/tmp/` - Temporary (can clear)
- VFS methods: `getSystemVersion()`, `setSystemVersion()`, `updateSystemFiles()`
- Kernel methods: `getSystemInfo()`, `checkSystemUpdate()`, `upgradeSystem()`, `resetSystem()`

**Benefits:**
- Users can get updated man pages without resetting VFS
- Future-proof for delivering system improvements
- Establishes update patterns for package management
- Preserves user work and data

**Files Modified:**
- `src/kernel/olivine.js` - Added version constants, VFS update methods, kernel system methods
- `src/commands/shell.js` - Added `koma` command with version/update/upgrade/reset subcommands

---

### ✅ Phase 5.6: Pipes and Redirection (COMPLETE)
**Goal:** Implement Unix-style pipes and I/O redirection for command composition

**Completed:**
- [x] **Pipeline Operator (`|`):**
  - Chain commands: `cat file.txt | grep foo | sort`
  - Pass stdout of one command to stdin of next
  - Support multi-stage pipelines
  - Works with all commands
- [x] **Output Redirection (`>`, `>>`):**
  - Redirect stdout to file: `ls > files.txt`
  - Append to file: `echo "line" >> log.txt`
  - Overwrite or append modes
- [x] **Input Redirection (`<`):**
  - Read stdin from file: `sort < unsorted.txt`
  - Feed file contents to commands
  - Works with all stdin-capable commands
- [x] **Command Separator (`;`):**
  - Execute multiple commands sequentially: `mkdir test ; cd test ; ls`
  - Respects quotes (semicolons in strings don't split)
  - Each segment can contain pipes and redirects
  - Commands execute regardless of success/failure
- [x] **CommandContext Abstraction:**
  - Created `src/utils/command-context.js`
  - Abstract stdin/stdout for all commands
  - Commands write to context, not directly to terminal
  - Automatic adaptation for terminal vs pipe mode
- [x] **New Commands:**
  - `find` - Search filesystem by name/pattern with wildcards
  - `sort` - Sort lines (with `-r` reverse, `-n` numeric)
  - `uniq` - Remove duplicate lines (with `-c` count)
  - `tee` - Write to file and stdout (with `-a` append)
  - `sh` - Execute shell scripts (with `-v` verbose)
  - `wget` - Download files from URLs (with `-O` output, `-q` quiet)
- [x] **Command Updates:**
  - `cat` - Now supports multiple files (true concatenation!)
  - `grep` - Full argparse with `-n`, `-i`, `-v`, `-c` flags, stdin support
  - `ls` - Context-aware (one-per-line in pipes, no colors when piped)
  - `echo` - Context-aware output
  - `wc` - Full argparse with `-l`, `-w`, `-c` flags, stdin support
- [x] **Parser Enhancements:**
  - `tokenize()` - Quote-aware tokenization with operator detection
  - `parsePipeline()` - Detects `|`, `>`, `>>`, `<` operators
  - `executePipeline()` - Chains commands with proper stdin/stdout flow
  - Preserves existing simple command execution

**Architecture:**
- **CommandContext** provides:
  - `write(text)` - Write to stdout
  - `writeln(text)` - Write line to stdout
  - `getStdin()` - Read from stdin
  - `hasStdin()` - Check if stdin available
  - `isPiped` / `isRedirected` - Detect pipeline position
- **Pipeline execution:**
  - Parse entire line for operators
  - Build command chain
  - Execute stages with stdin → stdout flow
  - Handle input/output file redirection
- **Backward compatible:**
  - Simple commands work unchanged
  - Context parameter optional (defaults to terminal)

**Shell Scripting:**
- `sh script.sh` executes shell scripts line-by-line
- Comments (`#`) and blank lines ignored
- Each command uses full shell features (pipes, redirects)
- Verbose mode (`-v`) for debugging
- Enables automation and batch operations

**Network Operations:**
- `wget` downloads from HTTP/HTTPS URLs
- Automatic filename detection from URLs
- Saves to VFS for persistent storage
- Useful for fetching data, configs, scripts

**Man Pages:**
- Created man pages for all new commands
- Updated grep.1.md with full flag documentation
- **Total: 44 man pages** (38 commands + 5 stdlib APIs + sh + wget)
  - Section 1: User commands (filesystem, shell, process)
  - Section 3: Library APIs (fs, http, notify, path, argparse)

**Examples Working:**
```bash
# Find and filter
find /usr/share/man -name "*.1" | grep cron

# Multi-stage pipelines
cat file1.txt file2.txt | grep error | sort | uniq > errors.txt

# Tee to save and display
ls | tee files.txt | wc -l

# Download and process
wget https://api.github.com/users/octocat -O user.json
cat user.json

# Shell scripting
vein setup.sh  # Create script
sh setup.sh    # Execute it

# Complex pipeline
find /home -name "*.txt" | sort | tee found.txt | wc -l

# Command separator (sequential execution)
mkdir test ; cd test ; pwd ; ls

# Semicolons with pipes and redirects
cd /home ; echo "data" > file.txt ; cat file.txt | grep data
```

**Benefits Achieved:**
- ✅ True Unix-like shell composition
- ✅ Commands are building blocks
- ✅ Powerful data processing
- ✅ Matches user expectations
- ✅ Shell scripting enables automation
- ✅ wget enables data fetching

**Files Modified:**
- `src/shell.js` - Added tokenize(), parsePipeline(), executePipeline(), splitBySemicolon(), executeSegment()
- `src/utils/command-context.js` - Created CommandContext abstraction
- `src/commands/filesystem.js` - Added find, sort, uniq, tee; updated cat, grep, ls, wc
- `src/commands/shell.js` - Added sh, wget; updated echo
- `docs/man/` - Added 6 new man pages, updated grep.1.md
- `DEVELOPMENT.md` - Added "Shell Command Composition" section documenting pipes, redirects, and semicolons

---

### ✅ Phase 5.7: Backup & Restore (COMPLETE)
**Goal:** Implement VFS backup/restore system with tape aesthetic for testing and data preservation

**Completed:**
- [x] **backup Command:**
  - Creates compressed VFS snapshots in .kmt format (Koma Magnetic Tape)
  - Gzip compression (70-85% size reduction)
  - Dual SHA-256 checksums (compressed + uncompressed)
  - Downloads to browser's Downloads folder
  - Excludes `/mnt/backups/` directory (avoids backup loops)
  - Optional label: `backup project-v1`
  - Optional no-compress flag: `backup --no-compress`
- [x] **restore Command:**
  - Three-phase restore workflow:
    1. Verify integrity (dual checksum validation)
    2. Stage to `/mnt/backups/` for review
    3. Apply restoration (clears VFS, restores backup)
  - Flags:
    - Default: Verify and stage (`restore backup.kmt`)
    - `--apply`: Apply staged backup
    - `--now`: Verify and apply immediately (for tests)
  - Shows metadata (format, date, label, files, size, compression ratio)
  - File picker integration for uploading backups
  - Preserves `/mnt/backups/` during restoration
- [x] **.kmt File Format:**
  - JSON structure with metadata and compressed data
  - Format version tracking
  - Base64-encoded gzip data
  - Binary file support
  - Timestamp preservation
- [x] **Compression Utilities:**
  - Browser-native CompressionStream/DecompressionStream
  - No external dependencies
  - Compresses entire VFS as single unit (better ratio)
  - Matches tape aesthetic (sequential access)
- [x] **Testing Benefits:**
  - Create clean-state snapshots
  - Restore between test runs
  - Guarantees test isolation
  - Fast setup/teardown

**Use Cases:**
```bash
# Create backup
backup daily-backup

# Test isolation
backup clean-state
sh run-tests.sh
restore clean-state.kmt --now
sh more-tests.sh

# Data preservation
backup project-v1
# Make risky changes
# If broken: restore project-v1.kmt --now
```

**Man Pages:**
- Created `docs/man/filesystem/backup.1.md`
- Created `docs/man/filesystem/restore.1.md`
- **Total: 47 man pages** (40 commands + 5 stdlib APIs + 2 config formats)

**Files Modified:**
- `src/commands/shell.js` - Added backup and restore commands
- `src/utils/man-pages.js` - Regenerated with new man pages

**Tape Aesthetic:**
- Format: .kmt (Koma Magnetic Tape)
- Sequential access (whole archive compressed)
- Dual checksums (tape integrity)
- Write-once semantics
- Metadata headers

**Architecture:**
- Pure browser APIs (CompressionStream, SubtleCrypto, Blob API)
- Zero external dependencies
- Compression happens in-memory
- File download via createObjectURL
- File upload via file input element

---

## Shell Compatibility & Evolution

### Current Level: Thompson Shell (1971) + Modern Commands

Koma is currently at the level of the **original Thompson Shell from 1971 Unix** - a command interpreter with pipes, redirects, and sequential execution, but no programming constructs.

**What We Have:**
- ✅ Interactive command execution
- ✅ Pipes (`|`) for command chaining
- ✅ Redirects (`>`, `>>`, `<`) for I/O
- ✅ Sequential execution (`;`) for one-liners
- ✅ Quote handling (`"..."`, `'...'`)
- ✅ Comments in scripts (`#`)
- ✅ Command history
- ✅ Modern commands (find, grep, sort, wget, etc.)
- ✅ Shell script execution (`sh`)

**What We're Missing for POSIX sh (dash) Compatibility:**

**Critical for Scripting:**
- ❌ Variables (`NAME=value`, `$NAME`, `${NAME}`)
- ❌ Exit codes (`$?` for last command status)
- ❌ Conditionals (`if [ condition ]; then ... fi`)
- ❌ Loops (`for`, `while`, `until`)
- ❌ Functions (`name() { ... }`)
- ❌ Test command (`[ -f file ]`, `[ "$a" = "$b" ]`)
- ❌ Command substitution (`` `command` `` or `$(command)`)
- ❌ Logical operators (`&&`, `||`) - **planned Phase 9**

**Nice-to-Have:**
- ❌ Heredocs (`<< EOF`) - **planned Phase 9**
- ❌ Case statements (`case $var in ... esac`)
- ❌ Parameter expansion (`${var:-default}`)
- ❌ Arithmetic (`$((1 + 2))`)
- ❌ Glob expansion (`*.txt` expands to files)
- ❌ Subshells (`(command)`)
- ❌ Background jobs (`command &`)

### Target: dash (Debian Almquist Shell) - POSIX sh Compliance

**dash** is the minimal POSIX-compliant shell - the "least common denominator" that `/bin/sh` points to on Debian/Ubuntu systems. It's what we should aim for to run standard shell scripts.

**Roadmap to POSIX sh:**

**Phase 6** (Parser Refactoring):
1. Exit codes and `$?` variable
2. Test command for conditionals
3. Basic variable assignment and expansion

**Phase 8** (Shell Programming):
1. Variables and parameter expansion
2. Conditionals (if/then/else)
3. Loops (for/while)
4. Functions

**Phase 10** (Advanced Features):
1. `&&` and `||` operators
2. Heredoc support
3. Command substitution

With these additions, Koma would be **POSIX sh compatible** and could run any standard shell script that works in dash!

**Current Status:**
- **Interactive use:** Excellent! Pipes, redirects, and modern commands make it powerful
- **Scripting:** Good for linear automation, but no conditionals or loops yet
- **Compatibility:** Thompson Shell era (1971), not yet POSIX sh (1992)

### POSIX Compliance Study: Beyond dash

After completing Phases 6, 8, & 10, Koma would achieve **core POSIX sh scripting capability** - enough to run most standard shell scripts. However, full POSIX.1-2017 shell specification includes additional features that would still be missing.

This section documents the gap between "dash-level scripting" and "100% POSIX compliance" for future reference.

#### Features Planned (Phases 6, 8, & 10)

These would make us **~80% POSIX compliant**:
- ✅ Variables (`NAME=value`, `$NAME`, `${NAME}`)
- ✅ Exit codes (`$?`)
- ✅ Conditionals (`if/then/else/elif/fi`)
- ✅ Loops (`for/while/until/do/done`, `break`, `continue`)
- ✅ Functions (`name() { ... }`)
- ✅ Test command (`[ ... ]`)
- ✅ Logical operators (`&&`, `||`)
- ✅ Command substitution (`$(command)`)
- ✅ Heredocs (`<< EOF`)

#### Missing POSIX Features (Post Phase 9)

**Category 1: Critical for Interactive Scripts**

These are commonly used and would significantly improve script compatibility:

- **`read` command** - Read user input into variables
  ```sh
  read -p "Enter name: " name
  echo "Hello, $name"
  ```
  *Priority: HIGH* - Many scripts need user input

- **`. / source` command** - Execute script in current shell context
  ```sh
  . ./config.sh    # Import functions and variables
  source ~/.bashrc
  ```
  *Priority: HIGH* - Essential for script libraries and config files

- **Positional parameters** - Script arguments
  ```sh
  # script.sh
  echo "Script: $0"      # Script name
  echo "First arg: $1"   # First argument
  echo "All args: $@"    # All arguments as array
  echo "Arg count: $#"   # Number of arguments
  shift                  # Shift arguments left
  ```
  *Priority: HIGH* - Almost all scripts use these

- **Glob expansion** - Wildcard pattern matching
  ```sh
  ls *.txt               # Expands to actual files
  rm file[0-9].log       # Bracket expressions
  for f in *.md; do cat "$f"; done
  ```
  *Priority: HIGH* - Very common in shell usage

- **`case` statements** - Pattern matching conditionals
  ```sh
  case $var in
    foo) echo "Found foo" ;;
    bar|baz) echo "Found bar or baz" ;;
    *) echo "Default" ;;
  esac
  ```
  *Priority: MEDIUM-HIGH* - Common alternative to if/elif chains

- **Basic parameter expansion** - Variable manipulation
  ```sh
  ${var:-default}    # Use default if unset
  ${var:=default}    # Assign default if unset
  ${var:?error}      # Error if unset
  ${var:+value}      # Use value if set
  ```
  *Priority: MEDIUM* - Common in robust scripts

**Category 2: Advanced Scripting Features**

Useful for sophisticated scripts but less commonly needed:

- **`eval` command** - Evaluate string as shell command
  ```sh
  cmd="ls -l"
  eval $cmd
  ```
  *Priority: LOW* - Often avoidable, security risk

- **`exec` command** - Replace shell with another command
  ```sh
  exec python script.py   # Shell becomes Python process
  ```
  *Priority: LOW* - Rarely needed in scripts

- **`shift` command** - Shift positional parameters
  ```sh
  while [ $# -gt 0 ]; do
    case $1 in
      --flag) handle_flag ;;
    esac
    shift
  done
  ```
  *Priority: MEDIUM* - Useful for argument parsing

- **`getopts` builtin** - Parse command options
  ```sh
  while getopts "a:b:c" opt; do
    case $opt in
      a) arg_a=$OPTARG ;;
    esac
  done
  ```
  *Priority: MEDIUM* - We have argparse module instead

- **`set` builtin** - Set shell options and parameters
  ```sh
  set -e              # Exit on error
  set -u              # Error on undefined variables
  set -x              # Print commands before executing
  set -- arg1 arg2    # Set positional parameters
  ```
  *Priority: MEDIUM* - Common for script safety

- **`unset` command** - Remove variables/functions
  ```sh
  unset VAR
  unset -f function_name
  ```
  *Priority: LOW* - Rarely needed

- **`export` builtin** - Mark variables for child processes
  ```sh
  export PATH=/usr/bin:$PATH
  ```
  *Priority: MEDIUM* - Needed for environment setup

- **`readonly` builtin** - Immutable variables
  ```sh
  readonly CONFIG_FILE=/etc/config
  ```
  *Priority: LOW* - Nice to have, rarely critical

- **`trap` command** - Signal and error handlers
  ```sh
  trap 'cleanup' EXIT
  trap 'handle_error' ERR
  trap 'echo "Interrupted"' INT
  ```
  *Priority: LOW* - Useful for cleanup, but not essential

- **Advanced parameter expansion** - String manipulation
  ```sh
  ${#var}             # String length
  ${var%suffix}       # Remove shortest suffix
  ${var%%suffix}      # Remove longest suffix
  ${var#prefix}       # Remove shortest prefix
  ${var##prefix}      # Remove longest prefix
  ${var/pattern/str}  # Replace first match (bash extension)
  ${var//pattern/str} # Replace all matches (bash extension)
  ```
  *Priority: LOW* - Can work around with external commands

- **Arithmetic expansion** - Math in shell
  ```sh
  result=$((2 + 3 * 4))
  count=$((count + 1))
  if [ $((x > 5)) -eq 1 ]; then
  ```
  *Priority: MEDIUM* - Common in loops and counters

- **Subshells** - Isolated execution environment
  ```sh
  (cd /tmp && do_something)   # Doesn't change parent's cwd
  output=$(cd /tmp; pwd)      # Already have via command substitution
  ```
  *Priority: LOW* - Command substitution covers most use cases

- **Command grouping** - Group in current shell
  ```sh
  { command1; command2; } > output.txt
  ```
  *Priority: LOW* - Can use functions instead

**Category 3: Job Control**

Background process management (limited utility in browser):

- **Background jobs** - `command &`
- **`fg` / `bg`** - Foreground/background control
- **`jobs`** - List background jobs
- **Job specifications** - `%1`, `%+`, `%-`
- **Signal handling** - SIGTSTP, SIGCONT, SIGCHLD

*Priority: VERY LOW* - Our cron scheduler covers most background execution needs

**Category 4: Advanced I/O**

File descriptor manipulation (rarely needed):

- **File descriptors** - `3>&1`, `2>&1`, `exec 3>file`
- **FD closing** - `<&-`, `>&-`
- **Read from specific FD** - `read <&3`

*Priority: VERY LOW* - Advanced feature, rarely used

**Category 5: Special Variables**

Additional shell variables (beyond `$?` from Phase 6):

- `$$` - Current shell PID (low priority in browser context)
- `$!` - Last background job PID (job control related)
- `$-` - Current shell options (debugging aid)
- `$0` - Script name (HIGH priority, goes with `$1, $2, ...`)

**Category 6: Miscellaneous**

- **`IFS`** - Internal Field Separator for word splitting
  ```sh
  IFS=: read user pass uid gid <<< "$line"
  ```
  *Priority: LOW* - Can parse with other tools

- **Tilde expansion** - `~/file` → `/home/user/file`
  ```sh
  cd ~/Documents
  ```
  *Priority: MEDIUM* - Already partially supported via `cd ~`

- **`CDPATH`** - Search path for cd command
  ```sh
  CDPATH=/home/user:/projects
  cd myproject  # Searches both paths
  ```
  *Priority: VERY LOW* - Rarely used

#### Realistic Compatibility Targets

**Phase 6, 8, & 10: "Core POSIX Scripting" (~80% compliant)**
- Variables, conditionals, loops, functions, exit codes
- `&&`, `||`, command substitution, heredocs
- **Can run:** Simple automation scripts, build scripts, installers
- **Cannot run:** Scripts with user input, argument parsing, pattern matching

**Phase 6, 8, & 10 Extended: "Practical POSIX" (~90% compliant)**
Add to Phase 6, 8, & 10:
- `read` command
- `. / source` command
- Positional parameters (`$0-$9`, `$@`, `$#`)
- Glob expansion (`*.txt`)
- `case` statements
- Basic parameter expansion (`${var:-default}`)
- `export` builtin
- `set -e/-u/-x` options
- Arithmetic expansion (`$((expr))`)
- `shift` command

**Can run:** 90%+ of real-world shell scripts including:
- Configuration scripts
- Installation scripts
- Build automation
- System administration scripts
- Most GitHub repo scripts

**Phase 6, 8, & 10++ Complete: "Full POSIX" (~98% compliant)**
Add everything above plus:
- `eval`, `trap`, `readonly`, `unset`
- Advanced parameter expansion
- File descriptor manipulation
- `getopts` builtin

**Can run:** Virtually all POSIX shell scripts except those requiring:
- Job control (background jobs, fg/bg)
- Platform-specific features
- External commands we don't implement

#### Recommended Approach

**Immediate (Phases 6, 8, & 10):** Focus on core scripting - gets us to Thompson Shell → Bourne Shell → dash level

**Phase 8 Extended (if scope allows):** Add the "Practical POSIX" features above - maximum impact for effort

**Future (Phase 12+):** Add remaining POSIX features based on user demand and real-world script compatibility needs

**Skip indefinitely:** Job control (not useful in browser context), exotic FD manipulation, rarely-used builtins

#### Impact Assessment

With just Phase 6, 8, & 10 (core scripting):
- ✅ Can automate tasks with scripts
- ✅ Can build complex workflows
- ✅ Can write functions and libraries
- ❌ Cannot easily accept user input
- ❌ Cannot parse script arguments properly
- ❌ Cannot match file patterns in scripts
- ❌ Cannot source config files

With "Practical POSIX" (Phase 8 Extended):
- ✅ Can run most GitHub repo install scripts
- ✅ Can write interactive configuration tools
- ✅ Can build reusable script libraries
- ✅ Can match files with wildcards
- ✅ Can handle script arguments properly
- ✅ Can do arithmetic in loops
- Estimated: **90% of real-world scripts would work**

This study provides a roadmap for future shell development beyond the initial POSIX sh target. Features should be prioritized based on actual user needs and script compatibility requirements.

---

### ✅ Phase 6: Parser Refactoring & Exit Codes (COMPLETE)
**Goal:** Refactor shell architecture to support variables, conditionals, and loops

> **📖 Detailed documentation:** [docs/development_notes/phase6-parser-refactor/](../docs/development_notes/phase6-parser-refactor/OVERVIEW.md)

**Why This Phase:**
After completing Phase 5.6 (pipes and redirection), we've reached Thompson Shell (1971) functionality. Before adding shell programming features (variables, conditionals, loops), we need to refactor the parser architecture and add exit code infrastructure. The current string-based parser works well for single-line commands but won't scale to multi-line constructs.

**Completed:**

**Parser Architecture:**
- [x] Extract Lexer class (tokenization with token types)
- [x] Extract Parser class (AST generation)
- [x] Extract Executor class (AST interpretation)
- [x] S-expression parsing for Schist (LPAREN/RPAREN tokens)
- [x] Multi-line input buffering (for if/while/for blocks) - deferred to Phase 8
- [x] Continuation prompt (`>`) for block input - deferred to Phase 8

**Exit Code Infrastructure:**
- [x] Add `lastExitCode` tracking to Shell class
- [x] Update all commands to return exit codes (0 = success)
- [x] Special variable `$?` for last exit code
- [x] Exit code propagation through pipelines

**Test Command (`[` builtin):**
- [x] File tests: `-f` (file), `-d` (directory), `-e` (exists), `-s` (non-empty), `-r` (readable), `-w` (writable)
- [x] String tests: `=`, `!=`, `-z` (empty), `-n` (not empty)
- [x] Numeric tests: `-eq`, `-ne`, `-lt`, `-le`, `-gt`, `-ge`
- [x] Logical operators: `!` (not), `-a` (and), `-o` (or)
- [x] Returns 0 (true) or 1 (false) as exit code
- [x] Alias `[` to `test` command

**Variable Foundation:**
- [x] Variable assignment detection (`NAME=value`)
- [x] Variable expansion in strings (`$VAR`, `${VAR}`)
- [x] Quote handling for expansion (`"$VAR"` vs `'$VAR'`)
- [x] VariableScope class for variable storage (deferred to Phase 8 - for function-local variables)

**Schist Lisp Interpreter:**
- [x] S-expression parser with nested lists
- [x] Evaluator with lexical scoping
- [x] Arithmetic: `+`, `-`, `*`, `/`
- [x] Comparison: `=`, `eq`, `<`, `>`, `<=`, `>=`
- [x] List operations: `list`, `car`, `cdr`, `cons`, `length`, `null?`
- [x] Logic: `not`, `and`, `or`
- [x] Type predicates: `number?`, `symbol?`, `list?`, `function?`
- [x] Special forms: `quote`, `if`, `cond`, `lambda`, `define`, `set!`, `begin`, `let`
- [x] Meta-circular functions: `eval`, `apply`
- [x] I/O primitives: `display`, `newline`
- [x] `schist` command with -e flag and file execution
- [x] 59 unit tests, all passing
- [x] Metacircular evaluator example (examples/metacircular.scm)
- [x] Comprehensive man page (docs/man/shell/schist.1.md)

**Deferred to Later Phases:**
- [ ] `true` - Always returns 0 (not needed yet)
- [ ] `false` - Always returns 1 (not needed yet)
- [ ] `export` - Mark variables for child processes (Phase 8)
- [ ] `sleep` - Wait for N seconds (Phase 8)
- [ ] Command substitution - `$(command)` and backticks (Phase 10)
- [ ] Arithmetic expansion - `$((expr))` (Phase 10)

**Success Criteria:**
```bash
# Exit codes work
ls ; echo $?                    # → 0
ls /nonexistent ; echo $?       # → 1

# Test command works
[ -f /home/test.txt ] ; echo $? # → 0 if exists, 1 if not
[ 5 -lt 10 ] ; echo $?          # → 0 (true)

# Variables work
NAME=Koma
echo "Hello $NAME"              # → Hello Koma
echo $?                         # → 0

# Schist Lisp metacircular evaluation
schist examples/metacircular.scm  # → Shows Lisp interpreting itself
```

**Files Created/Modified:**
- `src/parser/lexer.js` - Token-based lexer
- `src/parser/parser.js` - AST parser
- `src/parser/executor.js` - AST executor
- `src/parser/schist.js` - Schist Lisp interpreter (~500 lines)
- `src/parser/ast-nodes.js` - AST node definitions
- `docs/man/shell/schist.1.md` - Comprehensive Schist documentation
- `examples/metacircular.scm` - Schist interpreting Schist
- `tests/unit/parser/` - 59 unit tests

---

### ✅ Phase 6.5: Interactive Input (COMPLETE)
**Goal:** Enable commands to read interactive user input

**Why This Phase:**
Schist Lisp now has `display` and `newline` for output, but cannot read user input. To implement a Schist REPL and other interactive commands, we need a way for commands to request input from the user. This was originally planned for Phase 8 but is needed now for Schist's interactive mode.

**Completed:**
- [x] `Shell.readLine(prompt)` - Promise-based input API
- [x] Tab-manager input routing for read mode
- [x] `CommandContext.readLine(prompt)` - Context abstraction
- [x] Input mode state: 'normal' vs 'command-read'
- [x] Proper handling of Enter, Backspace, Ctrl+C during input
- [x] Shell instance passed to terminal contexts

**Architecture:**
- **Input Mode State Management:**
  - `shell.inputMode` tracks current mode ('normal' or 'command-read')
  - Tab-manager onData handler routes input based on mode
  - Normal mode: Execute shell commands
  - Read mode: Build input buffer and resolve promise
- **Promise-Based API:**
  - `readLine()` returns Promise that resolves on Enter
  - Resolver stored in `shell.inputResolver`
  - Ctrl+C cancels and resolves with null
- **Context Integration:**
  - Shell instance passed to CommandContext
  - `context.readLine(prompt)` delegates to shell
  - Throws error if called in piped/redirected context

**Implementation:**
```javascript
// Shell class (src/shell.js)
async readLine(prompt = '') {
  if (prompt) {
    this.term.write(prompt);
  }
  return new Promise((resolve) => {
    this.inputMode = 'command-read';
    this.inputBuffer = '';
    this.inputResolver = resolve;
  });
}

// Tab-manager input routing (src/ui/tab-manager.js)
if (tab.shell.inputMode === 'command-read') {
  if (code === 13) { // Enter
    const input = tab.shell.inputBuffer;
    tab.shell.inputResolver(input);
    // ... reset state
  }
  // ... handle backspace, ctrl+c, printable chars
}

// CommandContext API (src/utils/command-context.js)
async readLine(prompt = '') {
  if (!this.shell) {
    throw new Error('readLine not available in piped context');
  }
  return await this.shell.readLine(prompt);
}
```

**Use Cases:**
```javascript
// Schist REPL (future)
schist -i   // Interactive read-eval-print loop

// Interactive scripts
while (true) {
  const name = await context.readLine('Enter name: ');
  if (!name) break;  // Ctrl+C returns null
  context.writeln(`Hello, ${name}!`);
}

// Configuration wizards
const answer = await context.readLine('Enable feature? (y/n): ');
if (answer === 'y') {
  // ...
}
```

**Files Modified:**
- `src/shell.js` - Added readLine() method
- `src/ui/tab-manager.js` - Added input mode routing in onData handler
- `src/utils/command-context.js` - Added readLine() method and shell parameter

**Benefits:**
- ✅ Enables Schist REPL mode
- ✅ Foundation for interactive commands
- ✅ Clean promise-based async API
- ✅ Proper Ctrl+C cancellation handling
- ✅ Works with existing context abstraction
- ✅ Blocked in piped contexts (where it doesn't make sense)

---

### 🔮 Phase 7: Package Management (Provenance)
**Goal:** Fetch npm modules from ESM CDNs

**Planned:**

**Provenance Package Manager:**
- [ ] `provenance install <package>` - Install npm package from CDN
- [ ] `provenance remove <package>` - Remove package
- [ ] `provenance list` - List installed packages
- [ ] `provenance update` - Check for package updates
- [ ] `provenance upgrade [package]` - Apply package updates
- [ ] `provenance trace <package>` - Show package origin and dependencies
- [ ] Aliases: `install`, `uninstall` as shortcuts
- [ ] Import map manipulation (dynamic or page injection)
- [ ] Package cache in VFS (`/usr/lib/node_modules/`)
- [ ] Package metadata storage (version, CDN URL, deps)
- [ ] Offline reuse of cached packages
- [ ] Version pinning
- [ ] Dependency resolution (basic)

**CDN Integration:**
- esm.sh (recommended) - Smart transpilation, auto-deps
- unpkg (fallback) - Official npm CDN
- jspm (future) - Advanced dependency resolution

**Target Packages:**
- Pure ESM libraries (lodash-es, date-fns, nanoid, zod)
- Data transformation (js-yaml, papaparse, marked)
- Math/utilities (big.js, decimal.js)
- Validation (zod, joi)

**Open Questions:**
- How to handle Node-specific packages? (fail gracefully, or provide shims?)
- Shims for incompatible modules? (process, buffer, etc.)
- Allowlist vs full npm support? (start open, warn on incompatibility)
- Update strategy for packages? (manual only, or auto-check?)

---

### 🔮 Phase 8: Shell Scripting & Interactive Programs
**Goal:** Add shell programming constructs and terminal API for full scripting capability

**Planned:**

**Shell Programming (POSIX sh Features):**
- [ ] **Variables:**
  - `NAME=value` - Variable assignment (✅ implemented in Phase 6)
  - `$NAME` and `${NAME}` - Variable expansion (✅ implemented in Phase 6)
  - `export NAME` - Environment variables
  - Special variables: `$#` (arg count), `$@` (all args) - deferred from Phase 6
  - Special variable `$?` (exit code) - ✅ implemented in Phase 6
- [ ] **Exit Codes:**
  - Commands return 0 (success) or non-zero (failure)
  - `$?` captures last command's exit code
  - `exit N` command to exit with code
- [ ] **Test Command (`[` builtin):**
  - File tests: `[ -f file ]`, `[ -d dir ]`, `[ -e path ]`
  - String tests: `[ "$a" = "$b" ]`, `[ -z "$str" ]`, `[ -n "$str" ]`
  - Numeric tests: `[ "$a" -eq "$b" ]`, `[ "$a" -gt "$b" ]`
- [ ] **Conditionals:**
  - `if [ condition ]; then ... fi`
  - `if ... then ... else ... fi`
  - `if ... then ... elif ... else ... fi`
- [ ] **Loops:**
  - `for var in list; do ... done`
  - `while [ condition ]; do ... done`
  - `break` and `continue`
- [ ] **Functions:**
  - `name() { commands; }`
  - Local variables
  - Return values

**Koma Registry (`koma install`):**
- [ ] GitHub-based package registry (koma-registry repo)
- [ ] `koma install <package>` - Install from Koma registry
- [ ] `koma list` - List installed Koma packages
- [ ] `koma remove <package>` - Remove Koma package
- [ ] Package manifest system (metadata, versions, dependencies)
- [ ] Install scripts and tools to `/usr/share/koma/`
- [ ] Registry packages:
  - Games (snake, 2048, colossal-cave-adventure, nethack)
  - Editor extensions (vim-mode, themes)
  - Development tools (git-utils, lint, http-server)
  - Utilities (backup, sync, crypto-tools)

**Terminal API for Scripts:**
- [ ] Expose `term` object to running scripts
- [ ] Direct terminal control:
  - `term.write()` - Raw terminal output with ANSI codes
  - `term.clear()` - Clear screen
  - `term.setCursor(x, y)` - Position cursor
  - `term.hideCursor()` / `term.showCursor()`
- [ ] Input capture:
  - `term.onKey()` - Keyboard event handler
  - `term.onData()` - Raw data handler
  - Arrow keys, special keys, combinations
- [ ] Alternate screen buffer:
  - `term.enterAltScreen()` - Switch to alternate buffer (like vim)
  - `term.exitAltScreen()` - Return to shell
- [ ] Mouse support (optional):
  - `term.enableMouse()` / `term.disableMouse()`
  - `term.onMouse()` - Mouse event handler

**Benefits:**
- Official Koma ecosystem (curated packages)
- Interactive terminal programs (games, TUIs)
- Better script UX (full terminal control)
- Community-shareable tools and games
- Colossal Cave Adventure in your browser!

**Open Questions:**
- Package approval process for registry?
- Sandboxing for terminal API (prevent shell escape)?
- Support for multi-file packages?

---

### 🔮 Phase 9: Python Integration (Pyodide)
**Goal:** Run Python scripts alongside JavaScript

**Planned:**
- [ ] Pyodide integration in Olivine worker (~10MB)
- [ ] `python <script>` command for `.py` files
- [ ] Python stdlib access (standard Python modules)
- [ ] VFS mount into Pyodide filesystem
- [ ] Stdout/stderr capture from Python
- [ ] Process manager integration (ps, kill work with Python)
- [ ] Koma stdlib bridge (fs, http accessible from Python)
- [ ] Package management (pip install via micropip)

**Benefits:**
- Full Python 3.11+ in browser
- NumPy, Pandas, Matplotlib support
- Data science workflows
- Mix Python and JavaScript scripts
- Jupyter-style notebook potential

**Challenges:**
- ~10MB download size (CDN + caching)
- Slower startup than JavaScript
- Memory overhead in worker
- Filesystem bridging complexity

**Open Questions:**
- Cache Pyodide packages in VFS?
- Support for `.ipynb` notebooks?
- Bridge Python ↔ JavaScript function calls?

---

### 🔮 Phase 10: Advanced Shell Features & Security
**Goal:** Shell enhancements and credential management

**Planned:**

**Shell Parser Enhancements:**
- [ ] Heredoc support (`<< EOF`)
  - Multi-line input for commands
  - Quoted vs unquoted delimiters
  - Useful for creating files without external editor
- [ ] Command substitution (`$(cmd)` and `` `cmd` ``)
  - Execute command and substitute output
  - Useful for dynamic command construction
  - Example: `echo "Date is $(date)"`
- [ ] Arithmetic expansion (`$((expr))`)
  - Integer arithmetic in shell
  - Example: `echo $((2 + 3 * 4))`
  - Useful for counters and calculations in loops
- [ ] Escape sequences in strings
- [ ] Logical operators (`&&`, `||`) for exit code chaining

**Security & Secrets:**
- [ ] Web Crypto for encryption
- [ ] Keyring module:
  - `keyring set <key>` - Store secret
  - `keyring get <key>` - Retrieve secret
  - `keyring list` - List keys (not values)
  - `keyring delete <key>`
- [ ] Master password prompt
- [ ] Auto-lock after timeout
- [ ] Privileged operation consent UI

---

### 🔮 Phase 11: PWA & Offline
**Goal:** Install as PWA, work offline

**Planned:**
- [ ] Web app manifest (`manifest.json`)
- [ ] Service worker precaching strategy
- [ ] Install prompt
- [ ] Offline indicator in status bar
- [ ] Cache versioning and updates

---

### 🔮 Phase 12: Advanced Features
**Goal:** Nice-to-haves

**Planned:**
- [ ] Screen buffer restoration (save terminal output on tab close)
- [ ] File System Access API integration (mount real directories)
- [ ] Tab split/pane support (tmux-style)
- [ ] Theme switcher (`theme solarized`, `theme terminal-green`)
- [ ] `ed` line editor (because ed is the standard text editor)
- [ ] Shell scripting (bash-like syntax?)

---

## Current Status

**We are here:** ✅ Phase 6.5 complete (Interactive Input) - ready to start Phase 7 (Package Management)

**What works right now:**
- Beautiful terminal with industrial aesthetic
- Multi-tab shell sessions with persistence
- Command history and tmux-style command mode (Ctrl+K)
- **Full Unix-like shell with pipes and redirection:**
  - Pipeline operator: `cmd1 | cmd2 | cmd3`
  - Output redirection: `cmd > file`, `cmd >> file`
  - Input redirection: `cmd < file`
  - Command separator: `cmd1 ; cmd2 ; cmd3`
  - 48 commands with full argparse support
  - One-liners and complex compositions work seamlessly
- **Quote-aware shell parser** - Handles `"quoted strings"` properly
- **Olivine kernel** (stable, modular, never randomly dies)
  - VFS backed by IndexedDB
  - Full process execution with AsyncFunction
  - Cron scheduler with expression parsing
  - Standard library with dynamic imports
- **Working VFS commands:** `ls`, `cat`, `mkdir`, `touch`, `rm`, `cp`, `mv`, `cd`, `find`, `grep`, `sort`, `uniq`, `tee`, `head`, `tail`, `wc`, `tree`, `stat`
  - All commands support `--help` flag with schema-based help
  - All commands work in pipelines with proper stdin/stdout
  - Context-aware output (colors/formatting adapt to pipes)
- **Process execution commands:**
  - `run <script> [args...]` - Execute JavaScript files
  - `sh <script>` - Execute shell scripts (automation!)
  - `ps` - List processes with color-coded status
  - `kill <pid>` - Terminate processes
- **Network commands:**
  - `wget <url>` - Download files from HTTP/HTTPS URLs
  - Works with public APIs and CORS-enabled resources
- **Cron scheduling:**
  - `cron "<schedule>" <script>` - Schedule periodic jobs
  - `cronlist` - List scheduled jobs
  - `cronrm <id>` - Remove jobs
- **System management:**
  - `koma version` - Show system version and info
  - `koma update` - Check for system updates
  - `koma upgrade` - Apply system updates
  - `koma reset` - Reset system files
  - Version tracking in `/etc/koma-version`
  - Safe system file updates without data loss
- **Man pages system:**
  - `man <command>` - **48 manual pages** (42 commands + 6 stdlib APIs)
  - Section 1: User commands (filesystem, shell, process, network)
  - Section 3: Library APIs (fs, http, notify, path, argparse)
  - Organized in subfolders (filesystem/, shell/, stdlib/)
  - Markdown sources in `docs/man/` (maintainable, git-friendly)
  - Python build script generates bundled JavaScript
  - Ready for GitHub Pages deployment
- **Standard library modules (koma:fs, koma:http, koma:notify, koma:path, koma:argparse):**
  - `fs` - All VFS operations + helpers
  - `http` - Fetch wrappers
  - `notify` - Browser notifications (ready for future use)
  - `path` - Path utilities (join, resolve, dirname, etc.)
  - `argparse` - Argument parsing with auto-generated help
- **Tab completion** (commands + nested paths)
- **CodeMirror editor (`vein` command)**
  - F2/Ctrl+` to toggle between terminal and editor
  - Ctrl+S to save, Esc to close
  - Create new files seamlessly
  - Undo/redo support (Ctrl+Z)
  - Dirty state tracking with custom modals
  - Koma-themed (plain text, no syntax highlighting yet)
- **Activity LED** - Visual feedback for all VFS operations
- **Terminal copy/paste** - Right-click to copy/paste
- Files, scripts, and scheduled jobs survive page reload
- Real-time stdout/stderr streaming from processes

**Next steps:**
1. Parser Refactoring & Exit Codes (Phase 6) - ✅ **COMPLETE**
   - Extract Lexer, Parser, Executor classes
   - Add exit code infrastructure to all commands
   - Implement `test`/`[` command for conditionals
   - Basic variable assignment and expansion
   - Schist Lisp interpreter
2. Package management with Provenance (Phase 7)
   - `provenance install` for npm packages via CDN
   - Import map manipulation
   - Package caching in VFS
   - Origin tracking and dependency tracing
3. Shell Programming Features (Phase 8)
   - Variables, conditionals, loops, functions
   - `koma install` for official packages
   - Terminal API for interactive scripts
   - Games and tools ecosystem

---

## Notes & Decisions Log

### Design Constraints
- **Vanilla only** - No bundlers, no npm scripts, no build step
- **Terminal-first** - Every feature accessible via CLI
- **Offline-first** - Everything works without network after install
- **Keyboard-driven** - Mouse optional (except tab management for now)
- **Composable** - Text protocols over bespoke UI

### Known Limitations
- **Tab keyboard shortcuts** - Solved with Ctrl+K command mode (tmux-style prefix key)
- **File size** - IndexedDB quotas vary by browser (usually ~50MB minimum, can request more)
- **Binary files** - Currently only text files supported (deferred to later)
- **Recursive directory operations** - `cp` only copies files, not directories (deferred)
- **Editor Vim mode** - Deferred due to CDN dependency conflicts with @codemirror/state
- **Syntax highlighting** - Deferred due to same CDN conflicts; editor is plain text only
- **International keyboard layouts** - Ctrl+` doesn't work on ENG INTL (use F2 instead)
- **No process execution yet** - Phase 5 will add JavaScript script execution

### Future Considerations
- **Multi-user?** - Currently single-user by design. Could add user switching later.
- **Sync?** - Could add cloud sync via remoteStorage or similar
- **Mobile** - Works in mobile browsers, but keyboard shortcuts obviously limited
- **Security model** - Need to think through script sandboxing for untrusted code

---

## How to Run (Current State)

```bash
# Clone repo
git clone <url>
cd koma

# Start local server
python -m http.server 8000

# Open browser
# Navigate to http://localhost:8000
```

**Try these commands:**
- `help` - See all commands
- `man ls` - Read manual page for ls
- `cd /usr` - Change directory
- `ls -l` - List files
- `mkdir test` - Create directory
- `touch file.txt` - Create file
- `vein file.txt` - Open file in editor
- `run /home/script.js` - Execute JavaScript
- `cron "*/5 * * * *" /home/task.js` - Schedule periodic task
- `history` - See command history
- Click [+] - New tab
- `exit` - Close tab
- Ctrl+C - Cancel line
- Ctrl+L - Clear screen
- Up/Down - Navigate history
- F2 - Toggle terminal/editor (when file is open)

---

## File Structure (Current)

```
koma/
├── index.html              # Entry point with import maps
├── manifest.json           # (TODO: Phase 9 PWA)
├── build-man-pages.py      # Man pages build script
├── ROADMAP.md             # This file
├── koma-terminal-synthesis.md  # Original design doc
├── LICENSE
├── README.md
├── .gitignore
├── docs/
│   └── man/               # Man page sources (markdown)
│       ├── README.md      # Build system documentation
│       ├── filesystem/    # 17 command man pages (section 1)
│       ├── shell/         # 15 command man pages (section 1)
│       └── stdlib/        # 5 API man pages (section 3)
├── src/
│   ├── terminal.js         # Main entry, tab manager init
│   ├── shell.js            # Shell class (parser, history, state)
│   ├── commands/
│   │   ├── index.js        # Command registry and dispatcher
│   │   ├── filesystem.js   # VFS commands (ls, cat, mkdir, etc.)
│   │   └── shell.js        # Shell commands (run, ps, kill, cron, man, etc.)
│   ├── kernel/
│   │   ├── client.js       # Comlink client for Olivine kernel access
│   │   └── olivine.js      # Olivine kernel (VFS, Process, Scheduler)
│   ├── stdlib/             # Standard library for scripts
│   │   ├── fs.js           # Filesystem module (koma:fs)
│   │   ├── http.js         # HTTP module (koma:http)
│   │   ├── notify.js       # Notifications module (koma:notify)
│   │   ├── path.js         # Path utilities (join, resolve, etc.)
│   │   └── args.js         # Argument parsing (parse, usage, showHelp)
│   ├── utils/
│   │   ├── command-utils.js  # Shared command helpers
│   │   └── man-pages.js      # Auto-generated man pages (DO NOT EDIT)
│   └── ui/
│       ├── tab-manager.js  # Multi-tab orchestration
│       ├── editor.js       # CodeMirror 6 editor integration
│       ├── activity-led.js # Activity LED controller
│       └── themes.js       # (TODO: Phase 10)
└── styles/
    └── koma.css            # Complete theme + layout
```

---

**Last Updated:** 2025-11-11 (Phase 6.5 complete - Interactive Input and Schist Lisp fully implemented! Added `readLine()` API for interactive input, made Schist evaluator fully async with `read()`, `write()`, `print()`, `display()`, `newline()` I/O primitives. Achieved true self-hosting - Schist can interpret itself! Created examples/schist-repl.scm demonstrating Maxwell's Equations of Software. 48 man pages total. Ready to begin Phase 7 - Package Management!)
