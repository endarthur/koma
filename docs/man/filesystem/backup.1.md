# backup(1) - Koma Manual

## NAME
backup - create VFS backup in Koma Magnetic Tape format

## SYNOPSIS
**backup** [*label*] [**--no-compress**]

## DESCRIPTION
Creates a compressed backup of the entire Virtual File System (VFS) and downloads it as a **.kmt** (Koma Magnetic Tape) file. The backup includes all files, directories, and metadata, excluding the `/mnt/backups/` directory.

Backups use **gzip compression** by default (typically achieving 70-85% size reduction) and include **dual SHA-256 checksums** for integrity verification.

## OPTIONS
**label**
: Optional label for the backup. Used in the filename. Default: "backup"

**--no-compress**
: Disable gzip compression. Creates larger but faster backups.

## FILE FORMAT
The .kmt format is a JSON file containing:

- **format**: "kmt" (Koma Magnetic Tape)
- **version**: Format version (currently "1.0")
- **created**: ISO 8601 timestamp
- **label**: User-provided label
- **compression**: "gzip" or "none"
- **checksum**: Dual hashes (uncompressed and compressed data)
- **stats**: File/directory counts and sizes
- **data**: Base64-encoded (and optionally compressed) VFS entries

## EXAMPLES
Create a compressed backup:
```bash
backup
```

Create a labeled backup:
```bash
backup project-v1
```

Create an uncompressed backup:
```bash
backup debug --no-compress
```

## OUTPUT
The backup file is downloaded to your browser's Downloads folder with the format:
```
backup-YYYYMMDD-HHMMSS-label.kmt
```

The command displays:
- Number of files and directories
- Compressed and uncompressed sizes
- Compression ratio
- Checksum (first 16 characters)

## TAPE METAPHOR
The .kmt format follows the aesthetic of Unix magnetic tape archives:
- Sequential access (entire archive compressed as one unit)
- Write-once semantics
- Integrity verification through checksums
- Suitable for long-term storage

## FILES
**/mnt/backups/**
: Directory excluded from backups (to avoid backup loops)

## SEE ALSO
**restore**(1), **tar**(1), **cpio**(1)

## NOTES
- Binary files are handled correctly
- Timestamps are preserved
- The compression uses the browser's native CompressionStream API
- No external libraries required

## COMPRESSION DETAILS
Backup compresses the entire VFS entries array as a single unit using gzip. This approach:
- Achieves better compression than per-file compression
- Matches authentic tape semantics
- Simplifies the implementation
- Allows faster decompression

Typical compression ratios:
- Text files: 80-90% reduction
- Mixed content: 70-85% reduction
- Binary files: 50-70% reduction

## EXAMPLES OF USE
**Daily backup:**
```bash
backup daily-$(date +%Y%m%d)
```

**Pre-deployment snapshot:**
```bash
backup pre-deploy
# Make changes
# If something breaks: restore pre-deploy.kmt --now
```

**Testing setup:**
```bash
backup clean-state
# Run tests
restore clean-state.kmt --now
# Run more tests with clean state
```

## HISTORY
The backup/restore system was added in Koma v0.5.6 to provide:
1. VFS snapshot capability for testing
2. User data backup functionality
3. A retro-aesthetic tape backup experience

## AUTHOR
Koma Terminal Project
