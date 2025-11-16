# KOMA - Claude Code Instructions

**Project**: Browser-resident automation workstation
**Stack**: Vanilla JS, ES modules, xterm.js, CodeMirror, IndexedDB
**Philosophy**: Industrial minimalism, retrospec engineering (1984-1987 aesthetic with modern knowledge)

---

## Documentation Navigation

### Quick Start for AI Assistants

**Understanding the project?** → Start with [roadmap/STATUS_MAP.md](roadmap/STATUS_MAP.md)

**Need details on a specific area?** → Browse `roadmap/domains/` files

**Working on a specific domain?** → Open the relevant domain file for full context

**Want the big picture?** → See [ROADMAP.md](ROADMAP.md) for project vision

### Documentation Structure

KOMA uses a **multi-dimensional roadmap** to organize its entropy-first development:

```
roadmap/
├── STATUS_MAP.md          # At-a-glance status (START HERE!)
├── README.md              # Navigation guide
└── domains/               # 13 functional domains
    ├── boot.md           # Boot system (polished)
    ├── kernel.md         # Olivine kernel (production)
    ├── vfs.md            # Virtual filesystem (production)
    ├── shell.md          # Shell parser (working)
    ├── commands.md       # 48 commands (production)
    ├── editor.md         # CodeMirror/vein (production)
    ├── ui.md             # Terminal UI (working)
    ├── processes.md      # Process execution (production)
    ├── stdlib.md         # Standard library (production)
    ├── backup.md         # Backup/restore (polished)
    ├── network.md        # HTTP operations (working)
    ├── testing.md        # Test infrastructure (working)
    └── packages.md       # Package management (prototype)
```

**Design documentation**:
```
design/
├── README.md              # Design navigation
├── BOOT_SYSTEM.md         # Boot architecture (606 lines)
├── MOUNT_SYSTEM_PROPOSAL.md # Mount system design
├── style-guide.md         # Contributor style guide
├── ui-patterns.md         # UI patterns
├── visual-language.md     # Visual design language
└── lore/                  # Origin stories, aesthetics
    ├── README.md
    ├── komatiite-connection.md
    ├── origin-story.md
    ├── retrospec-engineering.md
    └── terminal-aesthetics.md
```

**Technical documentation**:
```
docs/
├── man/                   # 48 man pages (commands + stdlib)
│   ├── filesystem/        # 17 filesystem commands
│   ├── shell/             # 15 shell commands
│   └── stdlib/            # 6 stdlib API docs
├── development_notes/     # Phase-specific notes
├── KERNEL_API.md          # Kernel API reference
├── VFS_ARCHITECTURE.md    # VFS design
├── BOOT_TESTING.md        # Boot system tests
├── TESTING_STRATEGY.md    # Testing approach
└── HOW_WE_ORGANIZED_THIS_PROJECT.md # Wabisabi method
```

---

## Context Management Guidelines

### Tier 0: Always Load (Lightweight)
- `roadmap/STATUS_MAP.md` - Overall project status (~300 lines)
- `roadmap/README.md` - Navigation guide (~300 lines)

**Total**: ~600 lines, ~15k tokens

### Tier 1: Domain-Specific (Load when working on domain)
- `roadmap/domains/<domain>.md` - Specific domain details (~300-600 lines each)

**Per domain**: ~300-600 lines, ~8-15k tokens

### Tier 2: Design Details (Load when needed)
- `design/BOOT_SYSTEM.md` - Boot architecture (606 lines)
- `design/style-guide.md` - Style guide (800+ lines)
- `design/ui-patterns.md` - UI patterns (800+ lines)
- `design/visual-language.md` - Visual language (650+ lines)

**Per file**: ~600-900 lines, ~15-25k tokens

### Tier 3: Reference Only (Search/grep, don't load)
- Man pages (48 files, ~50-200 lines each)
- Development notes
- Test files

---

## Working on KOMA

### Finding What to Work On

1. Check `roadmap/STATUS_MAP.md` "Next Priority Work" sections
2. Pick a domain by priority (Critical > High > Medium)
3. Open `roadmap/domains/<domain>.md` for details
4. Look for 🔧 Working or 🧪 Prototype features

### Adding New Features

1. Identify which domain it belongs to
2. Open `roadmap/domains/<domain>.md`
3. Add under appropriate maturity section (usually 🧪 Prototype)
4. Include: tags, dependencies, related files
5. Update `roadmap/STATUS_MAP.md` if overall status changes

### Current Focus

**Phase**: Between 6.6 (Complete) and 7 (Package Management)

**Next up**: Provenance package manager (Phase 7)
- Install npm packages from CDN
- Cache in VFS
- Import map manipulation

**In progress**:
- Shell POSIX features (conditionals, loops, functions)
- UI theme system
- Test coverage expansion

---

## Project Structure

**Source**:
- `src/kernel/olivine.js` - Kernel (VFS, Process, Scheduler)
- `src/shell.js` - Shell class
- `src/parser/` - Lexer, Parser, Executor, AST nodes
- `src/commands/` - 48 built-in commands
- `src/stdlib/` - 6 standard library modules
- `src/ui/` - Tab manager, editor, activity LED
- `src/boot/` - 6 boot system modules
- `src/utils/` - Shared utilities

**Key Files**:
- `index.html` - Entry point with import maps
- `styles/koma.css` - Complete theme and layout
- `src/terminal.js` - Main initialization
- `build-man-pages.py` - Man pages build script

---

## Design Constraints

- **Vanilla only** - No bundlers, no npm scripts, no build step
- **Terminal-first** - Every feature accessible via CLI
- **Offline-first** - Everything works without network after install
- **Keyboard-driven** - Mouse optional (except tab management)
- **Composable** - Text protocols over bespoke UI

---

## Development Patterns

### Command Pattern

All commands use argparse schemas:

```javascript
export async function commandName(args, context) {
  const schema = {
    description: 'Command description',
    options: [/* ... */],
    examples: [/* ... */]
  };

  const parsed = argparse.parse(args, schema);
  if (argparse.hasHelp(parsed)) {
    argparse.showHelp('commandName', schema, context);
    return 0;
  }

  // Implementation
  return 0; // Exit code
}
```

### Context-Aware Output

Use `context.write()` instead of `term.write()`:

```javascript
context.writeln('Output'); // Works in pipes and terminal
const input = context.getStdin(); // Read from pipe or file
if (context.isPiped) {
  // Adapt output (no colors, one-per-line)
}
```

### Path Resolution

Use stdlib path module:

```javascript
import * as path from '../stdlib/path.js';

const fullPath = path.resolve(cwd, relativePath);
const normalized = path.normalize(userPath);
```

---

## Testing

Run tests:
```bash
npm test                    # All tests
npm test:unit               # Unit tests (future)
npm test:integration        # Integration tests
```

Build man pages:
```bash
python build-man-pages.py   # Regenerate src/utils/man-pages.js
```

---

## Aesthetic & Naming

**Geological Theme**:
- **Komatiite**: Ultra-basic volcanic rock (project name)
- **Olivine**: Primary mineral → phosphor green color
- **Magma**: Backup archive format
- **Slate**: Hardened metamorphic rock (boot system "Slate Hardening")
- **Vein**: Editor command (geological vein of ore)
- **Shale**: Tab manager (soft sedimentary rock)

**Color Palette**:
- Deep Charcoal: `#1a1a1a` (background)
- Phosphor Green: `#00ff88` (olivine, success)
- Lava Orange: `#ff6b35` (accents, activity)

**Font**: IBM Plex Mono 13px

---

## Multi-Dimensional Navigation

Find features by:
- **Domain**: What functional area? (boot, kernel, vfs, shell, etc.)
- **Maturity**: How complete? (polished, production, working, prototype)
- **Priority**: How urgent? (critical, high, medium)

**Example**: "I need critical features that are still in working status"
→ Check `roadmap/STATUS_MAP.md` matrix
→ Find Shell (Critical, Working)
→ Open `roadmap/domains/shell.md`
→ Look for 🔧 Working features

---

## Philosophical Notes

**Entropy-First Development**: Work jumps between domains based on discoveries, not linear phases. Phase numbering shows this reality (5 → 5.5 → 5.6 → 5.7 → 6 → 6.5 → 6.6 → 7).

**Retrospec Engineering**: Creating technology that could have existed in 1984-1987 but didn't, using modern knowledge to perfect historical concepts.

**Wabisabi**: Finding beauty in the imperfect, evolving nature of iterative development. Organization serves discovery, not perfection.

---

## Getting Help

- Read `roadmap/README.md` for navigation guide
- Check `design/README.md` for design patterns
- See `docs/man/README.md` for man pages system
- Grep for keywords if uncertain where code lives

**Remember**: This is a multi-dimensional roadmap for entropy-first development. Embrace the chaos, navigate with intent!

---

**Last Updated**: 2025-11-16
**Roadmap Version**: 1.0 (Multi-dimensional)
**Current Phase**: 7 (Package Management - starting soon!)
