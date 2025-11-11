# NAME

magma - raw VFS dump and inject operations

## SYNOPSIS

```bash
magma dump [filename] [--download]
magma inject <filename> --yes
magma list
magma --help
```

## DESCRIPTION

The `magma` command provides low-level VFS backup and restore functionality using raw JSON dumps. Named after the molten rock from which olivine crystals form, magma dumps are unprocessed, uncompressed filesystem exports designed for disaster recovery.

Magma dumps (`.magma` files) are:
- **Faster** to create than `.kmt` archives (no compression)
- **Larger** in size (uncompressed JSON)
- **Simpler** in format (direct IndexedDB export)
- **Emergency-focused** (work even when other systems are broken)

## SUBCOMMANDS

### magma dump

Export the entire VFS as a raw `.magma` file.

**Synopsis:**
```bash
magma dump [filename] [--download|-d]
```

**Arguments:**
- `filename` - Optional name for the backup file. If omitted, generates timestamp-based name.
- `--download`, `-d` - Force download to user's computer (default for non-absolute paths)

**Behavior:**
- If `filename` starts with `/`, saves to VFS at that path
- Otherwise, downloads to user's computer
- Automatically appends `.magma` extension if not present

**Examples:**
```bash
# Download with generated name
magma dump
# → magma-dump-2025-11-11T16-00-00-000Z.magma

# Download with custom name
magma dump pre-experiment
# → pre-experiment.magma

# Save to VFS
magma dump /home/backup-1
# → /home/backup-1.magma

# Force download (even with path-like name)
magma dump backup --download
```

---

### magma inject

Restore VFS from a `.magma` file.

**Synopsis:**
```bash
magma inject <filename> --yes
```

**Arguments:**
- `filename` - Path to `.magma` file in VFS (required)
- `--yes`, `-y`, `--now` - Confirmation flag (required)

**Warning:** This is a **destructive operation**. The entire VFS will be cleared and replaced with the backup contents. The `--yes` flag is required to prevent accidental data loss.

**Examples:**
```bash
# First, check what backups exist
magma list

# Inject with confirmation
magma inject backup.magma --yes

# Inject from specific path
magma inject /home/.koma-backup-1731350400000.magma --yes
```

**What happens:**
1. Reads the `.magma` file from VFS
2. Validates JSON format
3. **Clears entire VFS** (all files deleted)
4. Restores all entries from backup
5. Rebuilds directory structure

**Note:** After injection, you may need to refresh the page or run `restart` to see changes in the terminal.

---

### magma list

Show all `.magma` files in `/home`.

**Synopsis:**
```bash
magma list
```

**Output:**
- Lists all `.magma` files found in `/home`
- Shows file size and modification date
- Sorted by newest first

**Example:**
```bash
$ magma list
Magma backups in /home:

  pre-experiment.magma
    234.5 KB, modified 11/11/2025, 4:00:00 PM

  .koma-backup-1731350400000.magma
    198.2 KB, modified 11/11/2025, 2:30:00 PM

To restore: magma inject <filename> --yes
```

## FILE FORMAT

Magma files are raw JSON dumps with this structure:

```json
{
  "version": "1.0",
  "timestamp": "2025-11-11T16:00:00.000Z",
  "entries": [
    {
      "path": "/home/file.txt",
      "name": "file.txt",
      "type": "file",
      "parent": "/home",
      "content": "file contents here",
      "size": 123,
      "created": 1731350400000,
      "modified": 1731350400000
    },
    {
      "path": "/home/dir",
      "name": "dir",
      "type": "directory",
      "parent": "/home",
      "created": 1731350400000,
      "modified": 1731350400000,
      "size": 0
    }
  ]
}
```

**Fields:**
- `version` - Format version (currently "1.0")
- `timestamp` - ISO 8601 timestamp of when backup was created
- `entries` - Array of all VFS entries (files and directories)

**Entry fields:**
- `path` - Full path (e.g., "/home/file.txt")
- `name` - Entry name (e.g., "file.txt")
- `type` - Either "file" or "directory"
- `parent` - Parent directory path
- `content` - File contents (only for type="file")
- `size` - Size in bytes
- `created` - Creation timestamp (milliseconds since epoch)
- `modified` - Modification timestamp (milliseconds since epoch)

## COMPARISON: MAGMA VS KMT

| Feature | .magma | .kmt |
|---------|--------|------|
| **Purpose** | Emergency recovery | Archival/distribution |
| **Format** | Raw JSON | Refined JSON |
| **Compression** | None | Gzip |
| **Checksums** | No | Dual SHA-256 |
| **Size** | Large | Small (70-85% reduction) |
| **Speed** | Fast | Slower |
| **Use case** | Disaster recovery | Backups, sharing |

**Geological metaphor:**
- `.magma` - Molten rock (olivine crystallizes from magma)
- `.kmt` - Solid komatiite rock formation

## RECOVERY INTEGRATION

The magma command integrates with the **six-finger salute** recovery system:

```
Ctrl+K E  → Export .magma to downloads
Ctrl+K S  → Save .magma to /home
```

See `man recovery` for the full recovery sequence.

## COMMON WORKFLOWS

### Pre-update backup

```bash
# Before major system update
magma dump pre-update-$(date +%Y%m%d)
koma upgrade
# If something breaks:
magma inject pre-update-20251111.magma --yes
```

---

### Experiment safely

```bash
# Save state before experiment
magma dump /home/safe-state

# Try risky operations...
schist eval '(some-experimental-code)'

# Restore if needed
magma inject /home/safe-state.magma --yes
```

---

### Regular backups

```bash
# Weekly backup routine
magma dump weekly-$(date +%Y-%U) --download

# Keep backups organized
mkdir /home/backups
magma dump /home/backups/$(date +%Y-%m-%d)
```

---

### Disaster recovery

```bash
# System is broken, create emergency backup
Ctrl+K E  # Downloads magma-dump-[timestamp].magma

# Fix the issue or restart
# Then restore from backup via upload + inject
magma inject emergency-backup.magma --yes
```

## EXIT STATUS

- **0** - Success
- **1** - Error (file not found, invalid format, etc.)

## FILES

- `/home/*.magma` - User magma backups
- `/home/.koma-backup-*.magma` - Auto-generated backups from recovery system

## SECURITY

**Warning:** Magma files contain **all VFS data** including:
- All files in `/home` (your personal data)
- Saved scripts and configurations
- Command history (in shell state)
- Any sensitive information in the VFS

Do not share magma files unless you want to share everything in your VFS.

## LIMITATIONS

1. **No compression** - Files are large (100KB-10MB typical)
2. **No checksums** - Cannot verify integrity
3. **VFS only** - Does not backup:
   - Terminal state (current command line, cursor position)
   - Tab layout and active tab
   - Background processes
   - Browser IndexedDB metadata

4. **Requires VFS access** - Cannot inject from external file (must be in VFS first)

## TROUBLESHOOTING

### "Failed to read file"

The `.magma` file doesn't exist in the VFS. Either:
- Upload it first (via `vein` or file upload mechanism)
- Check the filename with `magma list`
- Verify the full path is correct

### "Invalid magma format"

The file is corrupted or not a valid `.magma` file. Try:
- Re-download from backup source
- Check file size (should be >10KB typically)
- Verify it's valid JSON (`cat filename.magma | head`)

### "After inject, files not showing"

The inject worked, but you need to refresh state:
- Run `restart` command
- Or reload the browser tab (Ctrl+K R-E-I-S-U-B)

## SEE ALSO

recovery(7), backup(1), restore(1), kmt(1), kmt(5), koma(1)

## HISTORY

The `magma` command was introduced in Koma 0.6.0 as part of the Shale hardening initiative. It provides command-line access to the raw VFS dump/inject functionality used by the recovery system's six-finger salute (Ctrl+K R-E-I-S-U-B).

The name "magma" reflects the geological theme: molten rock from which olivine crystals form, representing the raw, unprocessed state of the VFS before refinement into komatiite archives.
