# kmt(5) - Koma Magnetic Tape archive format

## NAME

kmt - Koma Magnetic Tape archive file format

## SYNOPSIS

`*.kmt` - Archive files with `.kmt` extension

## DESCRIPTION

The KMT (Koma Magnetic Tape) format is a JSON-based archive format used by Koma for backing up and restoring filesystem state. Despite the "magnetic tape" name (a retrospec nod to 1980s backup technology), KMT files are stored as JSON with optional gzip compression.

KMT archives can contain entire directory trees with full metadata preservation, including file contents, directory structure, timestamps, and checksums.

## FILE FORMAT

A KMT file is a JSON object with the following structure:

```json
{
  "format": "kmt",
  "version": "1.0",
  "created": "2025-11-11T10:30:00.000Z",
  "label": "backup-label",
  "compression": "gzip",
  "checksum": {
    "uncompressed": "sha256:abc123...",
    "compressed": "sha256:def456..."
  },
  "stats": {
    "files": 42,
    "dirs": 8,
    "totalSize": 102400,
    "compressedSize": 45678
  },
  "data": "base64-encoded-data..."
}
```

### Top-Level Fields

- **format** (string) - Always `"kmt"` for KMT archives
- **version** (string) - Format version, currently `"1.0"`
- **created** (string) - ISO 8601 timestamp of archive creation
- **label** (string) - User-provided label or auto-generated from path
- **compression** (string) - Either `"gzip"` or `"none"`
- **checksum** (object) - SHA-256 checksums for integrity verification
- **stats** (object) - Archive statistics
- **data** (string) - Base64-encoded archive data (possibly compressed)

### Checksum Object

The `checksum` object contains SHA-256 hashes:

- **uncompressed** (string) - SHA-256 of uncompressed data as `"sha256:hexdigest"`
- **compressed** (string) - SHA-256 of compressed data (only if compression is used)

### Stats Object

The `stats` object contains archive metrics:

- **files** (number) - Total number of files
- **dirs** (number) - Total number of directories
- **totalSize** (number) - Uncompressed size in bytes
- **compressedSize** (number) - Compressed size in bytes (only if compressed)

### Data Format

The `data` field contains a base64-encoded JSON array of entries. When decompressed (if needed) and decoded, it becomes:

```json
[
  {
    "path": "/home/file.txt",
    "type": "file",
    "content": "file contents here",
    "modified": 1699876543210,
    "size": 18
  },
  {
    "path": "/home/projects",
    "type": "directory",
    "modified": 1699876543210
  }
]
```

Each entry has:

- **path** (string) - File path (absolute or relative, see below)
- **type** (string) - Either `"file"` or `"directory"`
- **content** (string) - File contents (only for files)
- **modified** (number) - Unix timestamp in milliseconds
- **size** (number) - File size in bytes (only for files)

### Path Types

**Important**: All paths in a single KMT archive must be either all absolute or all relative - never mixed.

**Absolute paths** start with `/`:
```json
{
  "path": "/home/projects/file.txt",
  "type": "file",
  ...
}
```

**Relative paths** do not start with `/`:
```json
{
  "path": "projects/file.txt",
  "type": "file",
  ...
}
```

The path type is automatically detected by checking if the first entry starts with `/`.

- **`backup(1)`** always creates archives with absolute paths
- **`kmt pack`** creates relative paths by default (use `--absolute` for absolute)
- **`kmt unpack`** automatically detects and handles both types

## COMPRESSION

KMT supports optional gzip compression:

- **Enabled** - When `compression: "gzip"`, the entries JSON is gzipped before base64 encoding
- **Disabled** - When `compression: "none"`, the entries JSON is directly base64 encoded
- **Auto-detection** - The restore process automatically detects and handles both formats

Compression typically achieves 60-80% size reduction for text files, making it ideal for backups with source code, configuration files, and documentation.

## INTEGRITY VERIFICATION

KMT uses SHA-256 checksums for data integrity:

1. **Uncompressed checksum** - Verifies the entries JSON
2. **Compressed checksum** - Verifies the compressed data (if compression used)

During restore, checksums are validated to detect corruption or tampering.

## TYPICAL USE CASES

### Full Filesystem Backup (Absolute Paths)

```bash
backup /home mybackup.kmt "Daily backup"
```

Creates a complete backup of `/home` with all subdirectories using absolute paths (`/home/file.txt`, etc.).

### Project Archive (Relative Paths - Portable)

```bash
kmt pack /home/projects/myapp project-v1.0.kmt
```

Archive a specific project directory using relative paths (`file.txt`, `src/main.js`) for portability.

### Project Archive (Absolute Paths)

```bash
kmt pack /home/projects/myapp project-v1.0.kmt --absolute
```

Archive with absolute paths (`/home/projects/myapp/file.txt`) to preserve exact locations.

### Configuration Snapshot

```bash
backup /home/.komarc config.kmt "Shell config"
```

Save configuration files.

### Restore Operations

```bash
restore mybackup.kmt
```

Restore an entire archive to its original paths.

## RETROSPEC NOTE

The name "Koma Magnetic Tape" is a playful nod to 1980s backup technology:

- **QIC-02** (Quarter-Inch Cartridge) - Common in mid-80s workstations
- **DAT** (Digital Audio Tape) - Used for backups starting 1987
- **Tape drives** - Essential for system backup before widespread network storage

In 1984-1987, a workstation would use tape drives for archival storage. Koma's KMT format imagines what such a format would look like if it had been designed with modern JSON and compression from the start - a "speculative retrospective" take on archive formats.

The `.kmt` extension evokes both "Koma" and "magnetic tape" while being a modern, human-readable JSON format suitable for version control and inspection.

## FILE EXTENSION

By convention, KMT archives use the `.kmt` extension, though any extension (or none) will work as long as the JSON structure is valid.

## COMPATIBILITY

KMT v1.0 is the current and only version. Future versions will maintain backward compatibility with v1.0 archives.

## SEE ALSO

`backup(1)` - Create KMT archives
`restore(1)` - Extract KMT archives
`kmt(1)` - Manipulate KMT archives (pack/unpack/list)

## SPECIFICATION VERSION

KMT Format Specification v1.0
Added in Koma v0.1

---

**Koma Terminal**
Craton Systems, Inc.
Part of the Koma Workstation suite
