# Koma Terminal

A browser-resident Unix terminal emulator built with pure vanilla JavaScript. No servers, no build tools, no npm dependencies in production.

## 🌟 What is Koma?

Koma is a self-contained automation workstation that runs entirely in your browser. It provides:

- **Full Unix-like shell** with pipes, redirects, and 48+ commands
- **Persistent filesystem** (IndexedDB-backed VFS)
- **Process execution** (JavaScript scripts with stdlib)
- **Cron scheduler** for automation
- **CodeMirror editor** (`vein` command)
- **Man pages** for all commands
- **No servers required** after initial load

## 🚀 Quick Start

```bash
# Start local development server
python -m http.server 8000

# Open browser
http://localhost:8000
```

**No build step. No npm install. No bundler.**

*Note: `package.json` exists only for optional testing (Phase 6+). The runtime has zero npm dependencies.*

## 📚 Documentation

- **[ROADMAP.md](docs/ROADMAP.md)** - Project phases and high-level overview
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Coding patterns and conventions
- **[Development Notes](docs/development_notes/)** - Detailed phase documentation
- **[Man Pages](docs/man/)** - Command documentation (48 pages)
- **[Lore](docs/lore/)** - Philosophy and world-building (for fun!)

## 🎯 Current Status

**Phase:** 6.5 Complete → Starting Phase 7
**Level:** Thompson Shell (1971) + Modern Commands + Self-Hosting Lisp Interpreter
**Commands:** 48 with full argparse support
**Features:** Pipes, redirects, variables, exit codes, test command, Schist Lisp (self-hosting!), interactive input

### What Works Now

```bash
# Pipes and redirects
cat file.txt | grep foo | sort > output.txt

# Command chaining
mkdir test ; cd test ; echo "Hello" > file.txt

# Shell scripts
vein script.sh    # Edit with CodeMirror
sh script.sh      # Execute line-by-line

# Process execution
run /home/script.js   # Execute JavaScript

# Cron scheduling
cron "*/5 * * * *" /home/task.js

# Network operations
wget https://api.github.com/users/octocat

# Schist Lisp (self-hosting!)
schist -e "(define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))"
schist -e "(fact 5)"              # → 120
schist -i                         # Interactive REPL
schist examples/schist-repl.scm   # Schist interpreting itself!
```

## 📖 Project Structure

```
koma/
├── index.html              # Entry point
├── src/
│   ├── shell.js            # Shell parser and executor
│   ├── commands/           # Built-in commands
│   ├── kernel/             # Olivine (Web Worker kernel)
│   ├── stdlib/             # Standard library (fs, http, path, args)
│   ├── utils/              # Utilities and helpers
│   └── ui/                 # Terminal, editor, tabs
├── styles/
│   └── koma.css            # Complete theme (industrial minimalism)
├── docs/
│   ├── ROADMAP.md          # High-level overview
│   ├── DEVELOPMENT.md      # Coding patterns
│   ├── development_notes/  # Detailed phase docs
│   ├── man/                # Man page sources (markdown)
│   └── lore/               # Philosophy and stories
└── tests/                  # Test suite (coming in Phase 6)
```

## 🛠️ Technology

**Pure Vanilla Stack:**
- HTML + ES modules + CSS
- xterm.js for terminal emulation
- CodeMirror 6 for text editing
- IndexedDB for virtual filesystem
- Web Worker as kernel (Olivine)
- Comlink for RPC
- No build tools, no npm in production

**Design Philosophy:**
- Offline-first (works without network after load)
- No tracking, no analytics, no cloud
- POSIX sh compliance as target
- Industrial minimalism aesthetic

## 🎨 Aesthetic

- **Color Palette:** Deep charcoal (#1a1a1a), lava orange (#ff6b35), phosphor green (#00ff88)
- **Typography:** IBM Plex Mono 13px
- **Design:** Industrial minimalism
- **Activity LED:** 3px vertical bar (green/orange/red)

## 🧪 Development

**Testing (dev dependencies only):**
```bash
# Recommended: Bun (10-20x faster)
bun install
bun test

# Alternative: Node.js + npm
npm install
npm test

# Watch mode for TDD
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🗺️ Roadmap

**Completed:**
- ✅ Phase 1-4: Foundation, VFS, Editor, Process Execution
- ✅ Phase 5: Stdlib, Man Pages, System Updates
- ✅ Phase 5.6: Pipes and Redirection
- ✅ Phase 5.7: Backup & Restore
- ✅ Phase 6: Parser Refactoring, Exit Codes & Schist Lisp
- ✅ Phase 6.5: Interactive Input (readLine API)

**Next:**
- 🔮 Phase 7: Provenance Package Manager (npm via CDN)
- 🔮 Phase 8: Shell Programming (variables, conditionals, loops, functions)
- 🔮 Phase 9: Python Integration (Pyodide)
- 🔮 Phase 10: Advanced Shell Features (heredocs, `&&`, `||`)

See [ROADMAP.md](docs/ROADMAP.md) for complete timeline.

## 📝 Contributing

Koma follows these principles:

1. **Vanilla JS only** - No build tools, no npm in production
2. **Terminal-first** - Every feature accessible via CLI
3. **Offline-first** - Everything works without network
4. **Composable** - Text protocols over bespoke UI
5. **POSIX-inspired** - Target dash (POSIX sh) compliance

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for coding patterns.

## 🎓 Learning

Koma is a great project for learning:
- Shell programming and POSIX semantics
- Parser and interpreter design (Lisp metacircular evaluation!)
- Web Workers and Comlink RPC
- IndexedDB and virtual filesystems
- Terminal emulation with xterm.js
- Vanilla JavaScript architecture

## 📜 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

- **Unix Philosophy** - Small tools, text streams, composability
- **Thompson Shell (1971)** - Original Unix shell, our starting point
- **dash** - Minimal POSIX shell, our target
- **xterm.js** - Terminal emulation
- **CodeMirror** - Text editing
- **Olivine** - Web Worker kernel name (from olivine mineral)

## 🌐 Links

- **Live Demo:** (coming soon - GitHub Pages)
- **Documentation:** [docs/](docs/)
- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions

---

**Last Updated:** 2025-11-11
**Current Phase:** 6.5 (Interactive Input & Self-Hosting Lisp) - Complete
**Status:** Active Development
