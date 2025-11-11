# man-pages(7) - Koma manual page sections

## NAME

man-pages - conventions for Koma manual pages

## DESCRIPTION

The Koma manual is organized into numbered sections, following the traditional Unix convention. Each section contains documentation for a specific category of functionality.

When you run `man command`, the man system searches through sections in order and displays the first match. To view a specific section, use `man section command` (e.g., `man 5 kmt`).

## SECTIONS

Koma uses the following manual sections:

### Section 1: User Commands

Executable programs and shell commands that users interact with directly.

Examples: `ls(1)`, `grep(1)`, `cat(1)`, `backup(1)`, `schist(1)`

These are the most commonly used man pages - they document the built-in commands available at the shell prompt.

### Section 3: Library Functions

Standard library modules available to scripts and programs. These are imported modules that provide reusable functionality.

Examples: `fs(3)`, `http(3)`, `path(3)`, `notify(3)`, `argparse(3)`

Scripts can import these with `import { functionName } from 'stdlib/modulename.js'`.

### Section 5: File Formats

Configuration files, archive formats, and other file specifications.

Examples: `komarc(5)`, `kmt(5)`

These document the structure and syntax of file formats used by the system.

### Section 7: Miscellaneous

System overviews, conventions, protocols, and other documentation that doesn't fit in other sections.

Examples: `man-pages(7)` (this page)

This section is for meta-documentation about the system itself.

## SECTION NUMBERING HISTORY

The section numbering scheme originates from the original Unix Programmer's Manual (1971). Koma follows this time-honored convention:

- **Section 1** - Commands (since Unix v1, 1971)
- **Section 2** - System calls (not used in Koma - no kernel API)
- **Section 3** - Library functions (since Unix v3, 1973)
- **Section 4** - Special files (not used in Koma - virtual filesystem)
- **Section 5** - File formats (since Unix v7, 1979)
- **Section 6** - Games (reserved for future use)
- **Section 7** - Miscellaneous (since Unix v7, 1979)
- **Section 8** - System administration (not used - all users are admin)

## FILENAME CONVENTION

Man page source files use the naming convention:

```
name.section.md
```

Examples:
- `ls.1.md` - ls command (section 1)
- `kmt.5.md` - KMT format (section 5)
- `fs.3.md` - fs library (section 3)
- `man-pages.7.md` - this page (section 7)

## ORGANIZATION

Man pages are organized by category in the source tree:

```
docs/man/
├── filesystem/     # Section 1 commands (file operations)
├── shell/          # Section 1 commands (shell features)
└── stdlib/         # Section 3 library modules
```

The section number is encoded in the filename, not the directory structure.

## STANDARD SECTIONS

Each man page should contain these sections (as applicable):

- **NAME** - Command/function name and brief description
- **SYNOPSIS** - Command syntax or function signature
- **DESCRIPTION** - Detailed description
- **OPTIONS** - Command-line flags and options (section 1 only)
- **EXAMPLES** - Usage examples with code blocks
- **FILES** - Related files (if any)
- **SEE ALSO** - Related commands or functions
- **NOTES** - Additional information
- **HISTORY** - When the feature was added

## CROSS-REFERENCES

When referencing other man pages, use the format `name(section)`:

```
See also: ls(1), grep(1), kmt(5)
```

This indicates which section the referenced page is in.

## BUILDING MAN PAGES

Man pages are written in Markdown and compiled into JavaScript:

1. Edit `.md` files in `docs/man/`
2. Run `python build-man-pages.py`
3. Generated `src/utils/man-pages.js` is updated
4. New pages are immediately available via `man` command

Never edit `man-pages.js` directly - it's auto-generated.

## RETROSPEC NOTE

The Unix manual has been organized into sections since 1971. The first edition of the Unix Programmer's Manual had sections for:

1. Commands
2. System calls
3. Subroutines

By Unix v7 (1979), the modern section numbering was established. Koma follows this 45+ year tradition, adapting it for a browser-based virtual environment while maintaining the familiar organization that Unix users expect.

The section numbers themselves are part of computing history - seeing `ls(1)` or `printf(3)` immediately tells experienced users what category of documentation they're looking at.

## SEE ALSO

`man(1)` - Manual page viewer
`koma(1)` - Koma system overview
`help(1)` - Quick command reference

## STANDARDS

Based on Unix manual page conventions established in Unix v7 (1979) and codified in BSD and System V documentation practices.

---

**Koma Terminal**
Craton Systems, Inc.
Part of the Koma Workstation suite
