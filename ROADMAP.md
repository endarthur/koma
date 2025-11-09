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

### ⏸️ Phase 3: Service Worker Kernel (NEXT)
**Goal:** Build the OS layer with persistent storage

**Planned:**
- [ ] Service worker registration and lifecycle
- [ ] Virtual filesystem (VFS) structure:
  - `/home` - User files
  - `/tmp` - Temporary storage
  - `/usr/bin` - System binaries (scripts)
  - `/mnt` - File System Access API mounts
  - `/proc` - Process metadata
- [ ] IndexedDB schema for VFS:
  - Inode-based structure
  - File metadata (permissions, timestamps, size)
  - Directory tree navigation
- [ ] Comlink setup:
  - UI ↔ Service Worker RPC bridge
  - Expose kernel APIs to shell
- [ ] Real filesystem commands:
  - `ls` - Read actual VFS directories
  - `cat` - Read file contents
  - `mkdir` - Create directories
  - `touch` - Create empty files
  - `rm` - Delete files/directories
  - `cp` / `mv` - Copy/move files
  - `find` - Search filesystem
- [ ] File I/O operations:
  - Read/write text files
  - Binary file support
  - Stream large files

**Architecture Notes:**
- Service worker stays alive as "kernel"
- All filesystem state in IndexedDB
- UI shells connect via Comlink channels
- Multiple tabs share same VFS state

**Open Questions:**
- File size limits? (IndexedDB quota)
- Eviction policy for `/tmp`?
- Permissions model (single-user, so maybe simplified)

---

### 🔮 Phase 4: Editor Integration
**Goal:** Add CodeMirror as `vein` command

**Planned:**
- [ ] CodeMirror 6 integration via import map
- [ ] Editor view layer (overlays terminal)
- [ ] `vein <file>` command to open files
- [ ] Cmd/Ctrl + ` to toggle terminal ↔ editor
- [ ] File save/load from VFS
- [ ] Vim mode enabled by default
- [ ] Syntax highlighting (JavaScript, JSON, Markdown, etc.)
- [ ] Theme matching Koma aesthetic
- [ ] Multi-file editing (keep map of open files)

**Design Decisions:**
- **Not a modal** - Full-screen overlay that toggles with terminal
- **Vim mode** - Matches terminal aesthetic, `vein` pun works
- **CodeMirror not Monaco** - Lighter (150KB vs 3MB), easier to theme

**Open Questions:**
- Save on Cmd+S or auto-save?
- Close editor with `:wq` or Esc?
- Show multiple files as tabs within editor?

---

### 🔮 Phase 5: Process & Execution
**Goal:** Run JavaScript as processes

**Planned:**
- [ ] JavaScript execution environment
- [ ] Standard library (`fs`, `http`, `notify`, etc.):
  - `fs` - Filesystem operations (wraps VFS)
  - `http` - Fetch wrapper
  - `notify` - Browser notifications
  - `storage` - localStorage/sessionStorage helpers
  - `events` - EventEmitter
- [ ] Process manager:
  - One-shot jobs (`run script.js`)
  - Background processes/daemons
  - stdout/stderr streaming to terminal
  - Process listing (`ps`)
  - Process killing (`kill <pid>`)
- [ ] Cron scheduler:
  - Schedule periodic tasks
  - `crontab -e` to edit schedules
  - Job history and logs
- [ ] Environment variables per process
- [ ] Exit codes and error handling

**Architecture Notes:**
- Scripts run in service worker context
- Stdout/stderr via Comlink → xterm
- Process metadata in `/proc`

---

### 🔮 Phase 6: Package Management (Spinifex)
**Goal:** Fetch npm modules from ESM CDNs

**Planned:**
- [ ] Import map manipulation
- [ ] Package cache in VFS (`/usr/lib/node_modules`)
- [ ] `install <package>` command
- [ ] Offline reuse of cached packages
- [ ] Version pinning
- [ ] Dependency resolution

**CDN Options:**
- esm.sh (recommended)
- unpkg
- jspm

**Open Questions:**
- How to handle Node-specific packages?
- Shims for incompatible modules?
- Allowlist vs full npm support?

---

### 🔮 Phase 7: Security & Secrets
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

### 🔮 Phase 8: PWA & Offline
**Goal:** Install as PWA, work offline

**Planned:**
- [ ] Web app manifest (`manifest.json`)
- [ ] Service worker precaching strategy
- [ ] Install prompt
- [ ] Offline indicator in status bar
- [ ] Cache versioning and updates

---

### 🔮 Phase 9: Advanced Features
**Goal:** Nice-to-haves

**Planned:**
- [ ] Screen buffer restoration (save terminal output on tab close)
- [ ] File System Access API integration (mount real directories)
- [ ] Tab split/pane support (tmux-style)
- [ ] Theme switcher (`theme solarized`, `theme terminal-green`)
- [ ] `ed` line editor (because ed is the standard text editor)
- [ ] Shell scripting (bash-like syntax?)
- [ ] Autocomplete for commands/paths
- [ ] Man pages (`man ls`)
- [ ] Persistent shell configuration (`~/.komarc`)

---

## Current Status

**We are here:** ✅ Phase 2 complete, ready to start Phase 3

**What works right now:**
- Beautiful terminal with industrial aesthetic
- Multi-tab shell sessions with persistence
- Command history and basic built-ins
- Mock filesystem navigation

**Next steps:**
1. Set up service worker and register it
2. Build IndexedDB VFS schema
3. Implement Comlink bridge
4. Wire up real `ls`, `cat`, `mkdir`, etc.

---

## Notes & Decisions Log

### Design Constraints
- **Vanilla only** - No bundlers, no npm scripts, no build step
- **Terminal-first** - Every feature accessible via CLI
- **Offline-first** - Everything works without network after install
- **Keyboard-driven** - Mouse optional (except tab management for now)
- **Composable** - Text protocols over bespoke UI

### Known Limitations
- **Tab keyboard shortcuts** - All common key combos conflict with browser. Using click-only UI.
- **File size** - IndexedDB quotas vary by browser (usually ~50MB minimum, can request more)
- **Service worker lifespan** - Browser can terminate workers; need robust state restoration

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
- `cd /usr` - Change directory
- `ls -l` - List files
- `history` - See command history
- Click [+] - New tab
- `exit` - Close tab
- Ctrl+C - Cancel line
- Ctrl+L - Clear screen
- Up/Down - Navigate history

---

## File Structure (Current)

```
koma/
├── index.html              # Entry point with import maps
├── manifest.json           # (TODO: Phase 8)
├── sw.js                   # (TODO: Phase 3)
├── ROADMAP.md             # This file
├── koma-terminal-synthesis.md  # Original design doc
├── LICENSE
├── README.md
├── .gitignore
├── src/
│   ├── terminal.js         # Main entry, tab manager init
│   ├── shell.js            # Shell class (parser, history, state)
│   ├── commands.js         # Built-in commands
│   ├── kernel/             # (TODO: Phase 3)
│   │   ├── fs.js           # VFS implementation
│   │   ├── process.js      # Process manager
│   │   └── cron.js         # Scheduler
│   ├── stdlib/             # (TODO: Phase 5)
│   │   ├── fs.js           # User-facing fs module
│   │   ├── http.js         # Fetch wrapper
│   │   └── notify.js       # Notifications
│   └── ui/
│       ├── tab-manager.js  # Multi-tab orchestration
│       ├── editor.js       # (TODO: Phase 4)
│       └── themes.js       # (TODO: Phase 9)
└── styles/
    └── koma.css            # Complete theme + layout
```

---

**Last Updated:** 2025-11-09 (End of Phase 2)
