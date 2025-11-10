# Koma Development Notes

This directory contains detailed development documentation, research, and planning materials for each phase of the Koma project.

## 📚 Navigation Guide

### Active Development

- **[Phase 6: Parser Refactoring & Exit Codes](./phase6-parser-refactor/OVERVIEW.md)** (Current)
  - Parser architecture redesign
  - Exit code infrastructure
  - Test command implementation
  - Foundation for shell programming

### Future Phases

- **Phase 7: Spinifex Package Manager** (Planned)
- **Phase 8: Shell Programming Features** (Planned)
  - Variables, conditionals, loops, functions
- **Phase 9+**: See [ROADMAP.md](../ROADMAP.md)

### Resources

- **[Main Roadmap](../ROADMAP.md)** - High-level project overview
- **[Development Guide](../DEVELOPMENT.md)** - Coding patterns and conventions
- **[Testing Strategy](./phase6-parser-refactor/testing-strategy.md)** - How to test Koma
- **[Man Pages](../man/)** - Command documentation

## 📂 Directory Structure

```
development_notes/
├── README.md                          # This file
├── phase6-parser-refactor/            # Current phase
│   ├── OVERVIEW.md                    # Phase 6 roadmap
│   ├── parser-architecture.md         # Parser design & implementation
│   ├── code-review.md                 # Architecture refactoring plan
│   ├── testing-strategy.md            # Testing infrastructure
│   └── unix-review.md                 # POSIX compliance analysis
├── phase7-spinifex/                   # (Future)
├── phase8-shell-programming/          # (Future)
└── archive/                           # Older notes and research
```

## 🎯 How to Use This Documentation

### For New Contributors

1. Start with [ROADMAP.md](../ROADMAP.md) for project overview
2. Read [DEVELOPMENT.md](../DEVELOPMENT.md) for coding conventions
3. Review current phase documentation (Phase 6)
4. Check [testing-strategy.md](./phase6-parser-refactor/testing-strategy.md) before writing code

### For Current Development

Each phase directory contains:
- **OVERVIEW.md** - Goals, timeline, deliverables
- **Technical docs** - Detailed designs and architecture
- **Research notes** - Agent findings, POSIX studies
- **Implementation plans** - Week-by-week roadmaps

### For Research

Agent reports and deep technical analysis are preserved here for reference. These documents contain:
- Architecture decisions and rationale
- POSIX shell semantics research
- Performance considerations
- Alternative approaches considered

## 📝 Document Conventions

- **OVERVIEW.md** - High-level phase roadmap (read this first)
- **\*-architecture.md** - Technical designs and specifications
- **\*-review.md** - Analysis and assessment documents
- **\*-strategy.md** - Implementation plans and approaches
- **\*-notes.md** - Research and meeting notes

## 🔗 External References

- [POSIX Shell Specification](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html)
- [dash Source Code](https://git.kernel.org/pub/scm/utils/dash/dash.git)
- [mvdan/sh (Go Implementation)](https://github.com/mvdan/sh)
- [Oil Shell Blog](https://www.oilshell.org/blog/)

## 📅 Phase History

- **Phase 1-4**: Foundation, VFS, Editor (2025-01 to 2025-10)
- **Phase 5**: Process execution, stdlib, man pages (2025-10)
- **Phase 5.5**: System updates (2025-11)
- **Phase 5.6**: Pipes and redirection (2025-11)
- **Phase 6**: Parser refactoring (Current - 2025-11)

---

**Last Updated:** 2025-11-10
