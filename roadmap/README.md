# KOMA Roadmap Navigation

**Multi-Dimensional Roadmap for Entropy-First Development**

---

## Quick Start

**New to the roadmap?** → Start with [STATUS_MAP.md](STATUS_MAP.md) for the big picture

**Looking for work?** → Check STATUS_MAP.md "Next Priority Work" sections

**Need details on a domain?** → Browse [domains/](#domains) below

**Want the vision?** → See [../ROADMAP.md](../ROADMAP.md) for project philosophy

---

## What is This?

KOMA's development is **entropy-first** - work jumps between functional areas based on discoveries, not linear phases. We had:
- Phase 5 → 5 Maintenance → 5.5 → 5.6 → 5.7
- Phase 6 → 6.5 → 6.6
- Fractal numbering showing the reality of iteration!

This multi-dimensional roadmap organizes features by **three dimensions**:

1. **Domain** (WHAT area?) - boot, kernel, vfs, shell, commands, etc.
2. **Maturity** (HOW complete?) - polished, production, working, prototype
3. **Priority** (HOW urgent?) - critical, high, medium

**Navigation**: Find work by domain AND maturity AND priority - no more hunting through a 1,689-line linear roadmap!

---

## Three-Dimensional Navigation

### By Domain (Functional Area)

**Critical Priority (¹)**:
- [boot](domains/boot.md) - Boot system, diagnostics, recovery, health monitoring
- [kernel](domains/kernel.md) - Olivine worker, kernel API, RPC (Comlink)
- [vfs](domains/vfs.md) - Virtual filesystem, IndexedDB, file operations
- [shell](domains/shell.md) - Parser (lexer, executor), pipes, redirection, scripting
- [commands](domains/commands.md) - Built-in commands (48 total)

**High Priority (²)**:
- [editor](domains/editor.md) - CodeMirror integration (vein command)
- [ui](domains/ui.md) - Terminal (xterm.js), tabs, status bar, activity LED
- [processes](domains/processes.md) - Process execution, scheduler, cron
- [stdlib](domains/stdlib.md) - Standard library modules (fs, http, path, argparse, notify)
- [backup](domains/backup.md) - Backup/restore (.magma archives), snapshots

**Medium Priority (³)**:
- [network](domains/network.md) - wget, HTTP operations, CDN integration
- [testing](domains/testing.md) - Test infrastructure, integration tests
- [packages](domains/packages.md) - Package management (Provenance, Koma registry)

### By Maturity (Completeness)

**✅ Polished** (Production-ready, well-documented):
- [boot](domains/boot.md) - 5-stage boot, emergency mode, safe mode, health monitoring
- [backup](domains/backup.md) - .magma archives, compression, full VFS backup/restore

**✅ Production** (Feature-complete, stable):
- [kernel](domains/kernel.md) - Olivine web worker, never randomly dies
- [vfs](domains/vfs.md) - IndexedDB-backed filesystem
- [commands](domains/commands.md) - 47 commands with argparse
- [editor](domains/editor.md) - CodeMirror with vein command
- [processes](domains/processes.md) - AsyncFunction execution, cron scheduler
- [stdlib](domains/stdlib.md) - 5 modules (fs, http, notify, path, argparse)

**🔧 Working** (Functional but evolving):
- [shell](domains/shell.md) - AST parser complete, POSIX features in progress
- [ui](domains/ui.md) - Terminal stable, theme system incomplete
- [network](domains/network.md) - wget works, needs enhancement
- [testing](domains/testing.md) - Tests exist, coverage incomplete

**🧪 Prototype** (Planned or early development):
- [packages](domains/packages.md) - Provenance package manager (Phase 7, next up!)

### By Priority (Urgency)

**Critical (¹)** - Core system functionality:
- Boot, Kernel, VFS, Shell, Commands
- Status: 4/5 complete, Shell in progress

**High (²)** - Essential features:
- Editor, UI, Processes, Stdlib, Backup
- Status: 4/5 complete, UI in progress

**Medium (³)** - Nice-to-haves:
- Network, Testing, Packages
- Status: 0/3 complete, all in progress or planned

---

## Understanding the Tag System

Each feature in domain files has tags for multi-dimensional filtering:

```markdown
#### Feature Name
**Tags**: `#domain` `#maturity` `#priority` `#feature-type`
**Status**: Description
**Phase**: When it was completed
**Dependencies**: What it needs
**Blocks**: What depends on this
```

**Example**:
```markdown
#### 5-Stage Boot Process
**Tags**: `#boot` `#polished` `#critical` `#core-system`
**Status**: Production-ready with comprehensive error handling
**Phase**: 6.6 (Slate Hardening)
**Dependencies**: Kernel initialization, IndexedDB support
**Blocks**: None
```

**Search across dimensions**:
- Want all critical features? → Grep for `#critical`
- Want to polish working features? → Look for `#working` in domain files
- Working on kernel? → Open `domains/kernel.md` and see all kernel features

---

## How to Use This Roadmap

### Scenario: "I want to work on something"

1. Check [STATUS_MAP.md](STATUS_MAP.md) "Next Priority Work" sections
2. Pick a domain based on priority (Critical > High > Medium)
3. Open the domain file (e.g., `domains/shell.md`)
4. Look for 🔧 Working or 🧪 Prototype features
5. Check Dependencies to see if you can start

### Scenario: "What's the status of X?"

1. Open [STATUS_MAP.md](STATUS_MAP.md)
2. Find X in the maturity matrix
3. Click through to domain file for details
4. See related features, files, and next steps

### Scenario: "What should we prioritize next?"

1. Check STATUS_MAP.md blockers and dependencies
2. Review "Recent Momentum" for context
3. Look at Critical priority domains first
4. Consider Phase progression (currently between 6.6 and 7)

### Scenario: "How do I add a new feature?"

1. Identify which domain it belongs to
2. Open that domain file (e.g., `domains/commands.md`)
3. Add it under the appropriate maturity section (usually 🧪 Prototype)
4. Include tags, dependencies, and related files
5. Update STATUS_MAP.md if it changes overall progress

---

## Domains

### Critical Priority

#### [boot](domains/boot.md)
**Focus**: Production-grade boot process

**Maturity**: Polished (100%)
**Key Features**:
- 5-stage boot process (pre-flight, kernel, UI, environment, monitoring)
- Emergency recovery mode for VFS corruption
- Safe mode for troubleshooting
- Health monitoring (session backups, daily snapshots)
- Comprehensive diagnostics

#### [kernel](domains/kernel.md)
**Focus**: Olivine web worker kernel

**Maturity**: Production (100%)
**Key Features**:
- Web Worker kernel (never randomly dies like Service Workers)
- Comlink RPC bridge to UI
- VFS management
- Process execution environment
- Stable and modular architecture

#### [vfs](domains/vfs.md)
**Focus**: Virtual filesystem

**Maturity**: Production (100%)
**Key Features**:
- IndexedDB-backed storage
- Inode-based structure
- Directory tree navigation
- File I/O operations (read/write text files)
- Database migrations

#### [shell](domains/shell.md)
**Focus**: Shell parser and scripting

**Maturity**: Working (60%)
**Key Features**:
- AST-based parser (Lexer, Parser, Executor)
- Pipes and redirection (|, >, <, ;)
- Quote-aware parsing
- Exit codes ($?)
- Variables (assignment and expansion)
- Logical operators (&&, ||)

**In Progress**:
- POSIX sh scripting (conditionals, loops, functions)
- Advanced parser features (heredocs, command substitution)

#### [commands](domains/commands.md)
**Focus**: Built-in shell commands

**Maturity**: Production (100%)
**Key Features**:
- 48 commands implemented
- Full argparse support with auto-generated help
- Context-aware output (pipes, redirection)
- Filesystem: ls, cat, mkdir, touch, rm, cp, mv, cd, find, grep, etc.
- Shell: echo, help, history, man, run, ps, kill, cron, etc.
- Network: wget

### High Priority

#### [editor](domains/editor.md)
**Focus**: CodeMirror integration

**Maturity**: Production (100%)
**Key Features**:
- CodeMirror 6 integration via CDN
- vein command for file editing
- F2/Ctrl+` toggle between terminal and editor
- Ctrl+S save, Esc close
- Dirty state tracking with custom modals
- Koma-themed (plain text editing)

**Limitations**:
- No vim mode (CDN dependency conflicts)
- No syntax highlighting (same conflicts)

#### [ui](domains/ui.md)
**Focus**: Terminal interface

**Maturity**: Working (80%)
**Key Features**:
- xterm.js terminal emulation
- Multi-tab shell sessions with persistence
- Status bar with cwd display
- Activity LED (3px vertical bar, green/orange)
- Tab completion
- Copy/paste (right-click)

**In Progress**:
- Theme system completion
- Terminal customization options

#### [processes](domains/processes.md)
**Focus**: Process execution

**Maturity**: Production (100%)
**Key Features**:
- AsyncFunction-based execution
- One-shot jobs (run command)
- Process listing (ps) with color-coded status
- Process killing (kill)
- Cron scheduler with full cron expression parser
- Stdout/stderr capture and streaming
- Exit codes and error handling

#### [stdlib](domains/stdlib.md)
**Focus**: Standard library modules

**Maturity**: Production (100%)
**Key Features**:
- fs - All VFS operations + helpers
- http - Fetch wrappers (get, post, put, delete)
- notify - Browser notifications (ready for future)
- path - POSIX path utilities (join, resolve, dirname, etc.)
- argparse - Argument parsing with auto-generated help
- Dynamic imports (maintainable and modular)

#### [backup](domains/backup.md)
**Focus**: Backup and restore

**Maturity**: Polished (100%)
**Key Features**:
- .magma archive format (tar-like)
- Compression (gzip via pako.js)
- Metadata (version, timestamp, file count, size)
- Full VFS backup and restore
- Daily automatic snapshots
- Automatic pruning (keep last 7 days)

### Medium Priority

#### [network](domains/network.md)
**Focus**: Network operations

**Maturity**: Working (50%)
**Key Features**:
- wget command for HTTP/HTTPS downloads
- Works with public APIs and CORS-enabled resources

**In Progress**:
- Enhanced HTTP operations
- API helpers
- CDN integration for packages

#### [testing](domains/testing.md)
**Focus**: Test infrastructure

**Maturity**: Working (50%)
**Key Features**:
- Integration tests using Web Test Runner
- Tests for boot system, commands, VFS operations

**In Progress**:
- Improved test coverage
- Unit tests for core modules
- Automated testing in CI/CD

#### [packages](domains/packages.md)
**Focus**: Package management

**Maturity**: Prototype (0%) - **Next up!**
**Planned Features**:
- Provenance package manager for npm packages via CDN
- Koma registry for curated packages (games, tools)
- Import map manipulation
- Package caching in VFS
- Version tracking and updates

---

## Philosophy: Entropy-First Development

KOMA's development doesn't follow a linear path. Work jumps between domains based on:
- Discoveries during implementation
- User needs and pain points
- Technical dependencies and blockers
- Creative inspiration

**This is normal and good!** The multi-dimensional roadmap embraces this reality:
- Traditional roadmap: "Phase 1 → 2 → 3" (pretends work is linear)
- Multi-dimensional: "Boot is polished, Shell is working, Packages are prototype" (shows actual state)

**Benefits**:
- ✅ Find work by domain (working on shell? → `domains/shell.md`)
- ✅ Find work by maturity (want to polish? → look for 🔧 Working features)
- ✅ Find work by priority (what's critical? → Critical domains)
- ✅ Honest about state (shows what's experimental vs. production)

**Remember**: "Wabisabi" - Finding beauty in the imperfect, evolving nature of software development.

---

## Related Documentation

- [STATUS_MAP.md](STATUS_MAP.md) - At-a-glance status matrix (start here!)
- [../ROADMAP.md](../ROADMAP.md) - Original roadmap with project vision and philosophy
- [../design/](../design/) - Design documentation (visual language, UI patterns, style guide)
- [../docs/](../docs/) - Technical documentation (architecture, API references)

---

**Last Updated**: 2025-11-16
**Roadmap Version**: 1.0 (Multi-dimensional organization)
**Total Domains**: 13
**Overall Completion**: ~60% (polished + production features)
