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
- `find` command - Search filesystem (Phase 9)
- Binary file support (when needed)
- Stream large files (when needed)
- File System Access API integration for `/mnt` (Phase 9)
- Permissions enforcement (Phase 7 or single-user simplification)

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

### 🔮 Phase 6: Package Management (Spinifex)
**Goal:** Fetch npm modules from ESM CDNs

**Planned:**

**Spinifex Package Manager:**
- [ ] `spinifex install <package>` - Install npm package from CDN
- [ ] `spinifex remove <package>` - Remove package
- [ ] `spinifex list` - List installed packages
- [ ] `spinifex update` - Check for package updates
- [ ] `spinifex upgrade [package]` - Apply package updates
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

### 🔮 Phase 7: Koma Registry & Interactive Scripts
**Goal:** Official package registry and terminal API for interactive programs

**Planned:**

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

### 🔮 Phase 8: Python Integration (Pyodide)
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

### 🔮 Phase 9: Security & Secrets
**Goal:** Keyring for credentials

**Planned:**
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

### 🔮 Phase 10: PWA & Offline
**Goal:** Install as PWA, work offline

**Planned:**
- [ ] Web app manifest (`manifest.json`)
- [ ] Service worker precaching strategy
- [ ] Install prompt
- [ ] Offline indicator in status bar
- [ ] Cache versioning and updates

---

### 🔮 Phase 11: Advanced Features
**Goal:** Nice-to-haves

**Planned:**
- [ ] Screen buffer restoration (save terminal output on tab close)
- [ ] File System Access API integration (mount real directories)
- [ ] Tab split/pane support (tmux-style)
- [ ] Theme switcher (`theme solarized`, `theme terminal-green`)
- [ ] `ed` line editor (because ed is the standard text editor)
- [ ] Shell scripting (bash-like syntax?)
- [ ] Persistent shell configuration (`~/.komarc`)

---

## Current Status

**We are here:** ✅ Phase 5.5 complete (System Updates), ready to start Phase 6 (Spinifex Package Manager)

**What works right now:**
- Beautiful terminal with industrial aesthetic
- Multi-tab shell sessions with persistence
- Command history and tmux-style command mode (Ctrl+K)
- **Quote-aware shell parser** - Handles `"quoted strings"` properly
- **Olivine kernel** (stable, modular, never randomly dies)
  - VFS backed by IndexedDB
  - Full process execution with AsyncFunction
  - Cron scheduler with expression parsing
  - Standard library with dynamic imports
- **Working VFS commands:** `ls`, `cat`, `mkdir`, `touch`, `rm`, `cp`, `mv`, `cd`
  - All commands support `--help` flag with schema-based help
  - 16 commands migrated to argparse for consistent UX
- **Process execution commands:**
  - `run <script> [args...]` - Execute JavaScript files
  - `ps` - List processes with color-coded status
  - `kill <pid>` - Terminate processes
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
  - `man <command>` - 37 manual pages (31 commands + 5 stdlib APIs)
  - Section 1: User commands (filesystem, shell)
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
1. Package management with Spinifex (Phase 6)
   - `spinifex install` for npm packages via CDN
   - Import map manipulation
   - Package caching in VFS
2. Koma Registry (Phase 7)
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

**Last Updated:** 2025-11-10 (Phase 5.5 complete - System update commands implemented, ready for Phase 6: Spinifex)
