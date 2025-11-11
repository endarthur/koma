# kmt(1) - Koma Magnetic Tape archive tool

## NAME

kmt - manipulate KMT archives (pack, unpack, list, info)

## SYNOPSIS

```bash
kmt <command> [options]

kmt pack <source> <output.kmt> [options]
kmt unpack <input.kmt> [dest-dir] [options]
kmt list <input.kmt> [options]
kmt info <input.kmt>
```

## DESCRIPTION

`kmt` is the Koma Magnetic Tape archive tool for creating, extracting, and inspecting KMT archives. KMT is a JSON-based archive format with optional gzip compression, checksums for integrity verification, and full metadata preservation.

Unlike `backup(1)` and `restore(1)` which work with the entire VFS, `kmt` provides fine-grained control over specific files and directories, similar to Unix `tar(1)`.

## COMMANDS

### pack

Create a KMT archive from a directory or file.

```bash
kmt pack <source> <output.kmt> [options]
```

**Options:**
- `-c, --compress` - Force gzip compression
- `-C, --no-compress` - Disable compression
- `-a, --absolute` - Use absolute paths instead of relative
- `-l, --label TEXT` - Set archive label (default: source basename)

By default:
- Compression is automatic (files larger than 1KB are compressed)
- **Paths are relative** to the source directory for portability

Use `--absolute` to store absolute paths like `backup(1)` does.

**Examples:**
```bash
kmt pack /home/projects myproject.kmt
kmt pack /home/docs docs.kmt --label "Documentation backup"
kmt pack /home --no-compress home.kmt
```

### unpack

Extract a KMT archive to a destination directory.

```bash
kmt unpack <input.kmt> [dest-dir] [options]
```

**Options:**
- `-v, --verbose` - Show files as they're extracted
- `-f, --force` - Overwrite existing files without warning

If no destination is specified:
- **Absolute path archives**: extract to `/` (original locations)
- **Relative path archives**: extract to `/home`

The tool automatically detects whether the archive uses absolute or relative paths.

**Examples:**
```bash
kmt unpack backup.kmt /home
kmt unpack examples.kmt --verbose
kmt unpack archive.kmt /tmp --force
```

### list

List the contents of a KMT archive without extracting.

```bash
kmt list <input.kmt> [options]
```

**Options:**
- `-l, --long` - Show detailed information (file sizes, types)

**Examples:**
```bash
kmt list backup.kmt
kmt list archive.kmt --long
```

### info

Display archive metadata and statistics.

```bash
kmt info <input.kmt>
```

Shows format version, label, creation time, compression status, file/directory counts, sizes, and checksums.

**Examples:**
```bash
kmt info backup.kmt
```

## OPTIONS

Global options (work with all commands):

- `-h, --help` - Show help message

Command-specific options are documented under each command above.

## FILE FORMAT

KMT archives are JSON files containing:
- Metadata (format, version, label, timestamp)
- Compression info (gzip or none)
- SHA-256 checksums for integrity verification
- Statistics (file/directory counts, sizes)
- Base64-encoded archive data
- File paths (either all absolute or all relative)

**Important**: A single KMT archive must use either all absolute paths or all relative paths - never mixed. The format is detected automatically by checking if the first entry's path starts with `/`.

See `kmt(5)` for the complete format specification.

## COMPRESSION

KMT uses gzip compression via the browser's CompressionStream API:

- **Auto mode** (default): Compresses if archive > 1KB
- **Forced** (`--compress`): Always compress
- **Disabled** (`--no-compress`): Never compress

Typical compression ratios:
- Source code: 60-80% reduction
- Text files: 50-70% reduction
- Already compressed files: minimal benefit

## INTEGRITY VERIFICATION

All operations verify SHA-256 checksums:

1. **pack** - Generates checksums for uncompressed and compressed data
2. **unpack** - Verifies both checksums before extraction
3. **list/info** - Decompresses and verifies data integrity

If checksums don't match, the operation fails with an error.

## EXIT STATUS

- **0** - Success
- **1** - Error (invalid arguments, corrupted archive, I/O error)

## EXAMPLES

### Creating Archives

Pack a project directory (relative paths - portable):
```bash
kmt pack /home/myproject myproject.kmt
# Creates archive with relative paths: file1.txt, src/main.js, etc.
```

Pack with absolute paths (like backup):
```bash
kmt pack /home/scripts scripts.kmt --absolute
# Creates archive with absolute paths: /home/scripts/file1.sh, etc.
```

Pack with custom label:
```bash
kmt pack /home/scripts scripts.kmt --label "Utility Scripts v2.0"
```

Pack without compression:
```bash
kmt pack /home/data data.kmt --no-compress
```

### Extracting Archives

Extract relative-path archive to /home:
```bash
kmt unpack myproject.kmt /home
# Files appear in /home/file1.txt, /home/src/main.js, etc.
```

Extract relative-path archive to specific location:
```bash
kmt unpack examples.kmt /tmp/test
# Files appear in /tmp/test/file1.txt, etc.
```

Extract absolute-path archive to original locations:
```bash
kmt unpack backup.kmt
# Files go to their original absolute paths
```

Extract with verbose output:
```bash
kmt unpack archive.kmt /tmp --verbose
```

Extract and overwrite existing files:
```bash
kmt unpack fresh.kmt /home --force
```

### Inspecting Archives

List contents:
```bash
kmt list backup.kmt
```

List with sizes:
```bash
kmt list backup.kmt --long
```

Show archive info:
```bash
kmt info backup.kmt
```

### Workflow Example

Create an archive of your projects:
```bash
kmt pack /home/projects projects-2024.kmt --label "Projects snapshot 2024"
```

Inspect what's in it:
```bash
kmt list projects-2024.kmt --long
```

Extract to a different location:
```bash
mkdir /home/restore-test
kmt unpack projects-2024.kmt /home/restore-test --verbose
```

## TYPICAL USE CASES

### Project Distribution

Package examples or templates for distribution:
```bash
kmt pack examples/ examples.kmt --label "Schist Examples v1.0"
```

Users can then extract:
```bash
kmt unpack examples.kmt /home/examples
```

### Selective Backups

Unlike `backup(1)` which archives the entire VFS, `kmt` lets you backup specific directories:
```bash
kmt pack /home/projects/myapp myapp-v1.0.kmt
kmt pack /home/.komarc config.kmt
```

### Archive Distribution

Share configuration or data bundles:
```bash
kmt pack /home/templates templates.kmt
# Share templates.kmt via wget or hosting
```

## RETROSPEC NOTE

The `kmt` command is inspired by classic Unix archival tools:

- **tar(1)** - Tape Archive (Unix v7, 1979)
- **cpio(1)** - Copy Input/Output (PWB/UNIX, 1977)
- **ar(1)** - Archive (Unix v1, 1971)

In 1984-1987, tape backup was essential for workstation data management. The `tar` command became ubiquitous for creating portable archives. Koma's `kmt` command reimagines this for a browser-based environment, using JSON and modern compression while maintaining the familiar command-line interface.

The name evokes both "Koma Magnetic Tape" and the `.kmt` extension, creating a playful retrospec connection to 1980s backup culture.

## FILES

KMT archives are typically stored in:
- `/home/*.kmt` - User archives
- `/mnt/backups/*.kmt` - System backups (created by `backup(1)`)

## DIFFERENCES FROM BACKUP/RESTORE

| Feature | kmt | backup/restore |
|---------|-----|----------------|
| Scope | Specific paths | Entire VFS |
| Path type | Relative (default) or absolute | Always absolute |
| Destination | Anywhere | Downloads only |
| List contents | Yes (`kmt list`) | No |
| Selective extract | Yes (set dest-dir) | No (restores to original paths) |
| UI integration | CLI only | Browser file picker |

Use `kmt` for general archiving and distribution (relative paths), `backup/restore` for full system snapshots (absolute paths).

## SEE ALSO

`backup(1)` - Create full VFS backup
`restore(1)` - Restore full VFS backup
`kmt(5)` - KMT archive format specification
`man-pages(7)` - Koma manual page sections

## STANDARDS

KMT format v1.0

## HISTORY

Added in Koma v0.1 to provide granular archive manipulation beyond whole-VFS backup/restore.

---

**Koma Terminal**
Craton Systems, Inc.
Part of the Koma Workstation suite
