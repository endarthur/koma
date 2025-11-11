# restore(1) - Koma Manual

## NAME
restore - restore VFS from Koma Magnetic Tape backup

## SYNOPSIS
**restore** *file* [**--apply** | **--now**]

## DESCRIPTION
Restores the Virtual File System (VFS) from a **.kmt** (Koma Magnetic Tape) backup file. The restore process has two modes:

1. **Verify and stage** (default): Verifies backup integrity and saves it to `/mnt/backups/`
2. **Apply**: Restores VFS from a staged backup

The restore process includes:
- Dual checksum verification (compressed and uncompressed)
- Metadata display
- VFS clearing (except `/mnt/backups/`)
- Complete restoration of all files and directories

## OPTIONS
**file**
: Backup file to restore. Can be:
  - Just the filename (looks in `/mnt/backups/`)
  - Full path (e.g., `/mnt/backups/backup.kmt`)

**--apply**
: Apply a previously staged backup. Reads from `/mnt/backups/`.

**--now**
: Verify and apply immediately, skipping the staging step.

## WORKFLOW

### Three-Step Restore (Safest)
```bash
# Step 1: Upload and verify
restore backup.kmt
# Shows: verification, metadata, staging location

# Step 2: Apply
restore backup.kmt --apply
# Clears VFS and restores backup
```

### One-Step Restore (Fastest)
```bash
restore backup.kmt --now
# Verifies and applies immediately
```

## VERIFICATION
The restore command performs comprehensive verification:

1. **Format check**: Ensures file is a valid .kmt backup
2. **Compressed hash**: Verifies file wasn't corrupted during transfer
3. **Decompression**: Extracts the backup data
4. **Uncompressed hash**: Verifies data integrity after decompression

If any verification fails, the restore is aborted with an error message.

## METADATA DISPLAY
Upon successful verification, restore shows:

```
✓ Backup verified

  Format: kmt v1.0
  Created: 2025-11-10T18:30:00Z
  Label: project-v1
  Files: 254
  Directories: 12
  Size: 412.8 KB (compressed)
  Compression: 84.2%
  Checksum: ✓ Valid
```

## APPLY PROCESS
When applying a backup (**--apply** or **--now**):

1. **Clear VFS**: All existing files are deleted (except `/mnt/backups/`)
2. **Restore directories**: Creates directory structure
3. **Restore files**: Writes all files with original content and metadata
4. **Completion**: Displays success message

**Warning**: This operation is destructive! All current VFS data (except backups) is lost.

## FILE INPUT
When running `restore` without **--apply**, a file picker dialog opens to select the .kmt file from your computer.

## EXAMPLES
Verify and stage a backup:
```bash
restore backup.kmt
```

Apply a staged backup:
```bash
restore backup.kmt --apply
```

Verify and apply immediately:
```bash
restore backup.kmt --now
```

Restore from a specific path:
```bash
restore /mnt/backups/backup-20251110-project-v1.kmt --apply
```

## TESTING USE CASE
The backup/restore system is ideal for testing:

```bash
# Create a clean state snapshot
backup clean-state

# Run tests that modify VFS
sh run-tests.sh

# Restore clean state
restore clean-state.kmt --now

# Run more tests
sh more-tests.sh
```

## FILES
**/mnt/backups/**
: Directory where staged backups are saved. This directory is preserved during restore operations.

## SAFETY
- **Staged backups** are safer: allows review before applying
- **Immediate restore** (**--now**) is faster but riskier
- **Checksums** protect against corrupted backups
- **/mnt/backups/** directory is never deleted

## ERROR MESSAGES
**error: invalid backup format**
: File is not a valid .kmt backup

**error: backup file is corrupted (compressed hash mismatch)**
: File was corrupted during download/storage

**error: backup data is corrupted (uncompressed hash mismatch)**
: Data is corrupted after decompression

**error: missing backup file**
: No filename provided

## COMPRESSION SUPPORT
Restore automatically detects and handles:
- Gzip-compressed backups (default from `backup` command)
- Uncompressed backups (created with `backup --no-compress`)

No flags needed - the .kmt format specifies the compression method.

## BINARY FILES
Restore correctly handles all file types:
- Text files (UTF-8)
- Binary files (images, PDFs, etc.)
- Files with special characters
- Empty files

## TAPE METAPHOR
Like traditional Unix tape restore:
- Reads sequentially (entire archive decompressed as one unit)
- Verifies checksums (tape data integrity)
- Restores complete snapshots
- Preserves timestamps and metadata

## PERFORMANCE
Typical restore times on modern hardware:
- Small VFS (< 1 MB): < 1 second
- Medium VFS (1-10 MB): 1-3 seconds
- Large VFS (10-100 MB): 3-10 seconds

Verification adds minimal overhead (< 100ms for most backups).

## SEE ALSO
**backup**(1), **tar**(1), **cpio**(1), **restore**(8)

## NOTES
- The file picker dialog is a browser limitation - cannot read files directly from command line
- **--apply** mode reads from VFS, so no file picker is needed
- Timestamps are preserved from the original files
- The `/mnt/backups/` directory is automatically created if needed

## EXAMPLES OF USE
**Test isolation:**
```bash
# Each test gets clean state
restore fixtures.kmt --now
run_test_1
restore fixtures.kmt --now
run_test_2
```

**Disaster recovery:**
```bash
# Upload backup
restore system-backup.kmt

# Review metadata
# Confirm it's the right backup

# Apply
restore system-backup.kmt --apply
```

**Version rollback:**
```bash
# Backup current state
backup current-state

# Try experimental changes
make_changes

# If it breaks, restore previous state
restore current-state.kmt --now
```

## HISTORY
The backup/restore system was added in Koma v0.5.6 to provide:
1. VFS snapshot capability for testing
2. User data backup/recovery functionality
3. A retro-aesthetic tape restore experience

## AUTHOR
Koma Terminal Project
