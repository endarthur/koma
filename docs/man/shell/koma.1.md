# NAME

koma - Koma system management

## SYNOPSIS

```bash
koma version
koma insert <archive> [options]
koma eject <name>
koma update
koma upgrade
koma reset
```

## DESCRIPTION

The `koma` command manages the Koma system itself, including version information, system updates, and file restoration.

System updates preserve all user data in `/home/` while updating system files in `/usr/` and `/etc/`. This includes man pages, system scripts, and configuration files.

## SUBCOMMANDS

### koma version

Display detailed system information including:
- Current Koma version
- Build date
- Number of installed man pages
- Last update timestamp
- Update availability status

**Example:**
```bash
koma version
```

Output:
```
Koma 0.5.0
Build date: 2025-11-10
Man pages: 37
Last update: 2025-11-10T15:30:00.000Z
Status: Up to date
```

### koma insert

Download and unpack KMT archives from the Koma store. The store is a collection of curated archives (examples, templates, utilities) that can be easily installed into your Koma environment.

**Synopsis:**
```bash
koma insert <archive> [options]
```

The `.kmt` extension is automatically appended if not provided, so `koma insert examples` is equivalent to `koma insert examples.kmt`.

**Options:**
- `--download-only` - Download archive to `/media/` without unpacking
- `--to <dir>` - Unpack to custom directory

**How it works:**
1. Downloads archive from `<origin>/store/<archive.kmt>`
2. Verifies KMT format and checksums
3. Unpacks to `/media/<name>/` (or custom location)
4. Makes content immediately available

**Examples:**
```bash
# Download and unpack Schist examples
koma insert examples
# Files available at: /media/examples/

# Download only
koma insert examples --download-only
# Saved to: /media/examples.kmt

# Unpack to custom location
koma insert examples --to /home/examples
```

**Available archives:**
- `examples.kmt` - Schist Lisp examples (4 files, 3.1KB)

Check `/store/README.md` in the repository for the full catalog.

**Notes:**
- Store URL is auto-detected from `window.location.origin`
- Archives use relative paths for portability
- All archives are verified with SHA-256 checksums
- Failed downloads are automatically cleaned up

### koma eject

Remove (eject) a KMT tape from the `/media/` directory. This command is the counterpart to `koma insert` and removes either unpacked directories or downloaded KMT files.

**Synopsis:**
```bash
koma eject <name>
```

**Examples:**
```bash
# Eject unpacked examples
koma eject examples
# Removes: /media/examples/ and all contents

# Eject downloaded KMT file
koma eject examples.kmt
# Removes: /media/examples.kmt
```

**Notes:**
- Automatically detects whether the target is a directory or file
- Recursively removes directories and all their contents
- Operates only on `/media/` directory (safe operation)
- Equivalent to `rm -r /media/<name>`

**Warning:** This permanently deletes the specified tape. To restore it, use `koma insert` to download it again.

### koma update

Check for available system updates without applying them. Shows what version is available and lists the changes that would be applied.

This command is safe to run at any time and makes no modifications to the system.

**Example:**
```bash
koma update
```

If updates are available:
```
New version available: 0.6.0
Current version: 0.5.0

Changes:
- Updated man pages (42 total)
- System file improvements
- New commands added

Run 'koma upgrade' to install updates
```

If no updates:
```
System is up to date (version 0.5.0)
```

### koma upgrade

Apply available system updates. This command:
- Updates all man pages in `/usr/share/man/`
- Updates system files in `/usr/` and `/etc/`
- Updates the version tracking file `/etc/koma-version`
- **Preserves all user data in `/home/`**

The upgrade process is safe and cannot damage user files. If something goes wrong, use `koma reset` to restore system files to their defaults.

**Example:**
```bash
koma upgrade
```

Output:
```
Upgraded from 0.4.0 to 0.5.0
Updated 37 system files
System restart not required
```

**Notes:**
- User data in `/home/` is never modified
- The browser tab does not need to be refreshed
- Changes take effect immediately
- Command history and environment variables are preserved

### koma reset

Reset all system files to their default state. This is useful if:
- System files have been corrupted or modified
- Man pages are missing or broken
- You want to restore default configurations

This command:
- Restores all files in `/usr/share/man/`
- Resets system files in `/usr/` and `/etc/`
- **Preserves all user data in `/home/`**

**Example:**
```bash
koma reset
```

Output:
```
System files reset to defaults
Reset 37 files
All system files restored
```

**Warning:** While this command preserves `/home/`, any modifications you made to system files (like scripts in `/usr/bin/`) will be lost.

## VERSION TRACKING

Koma tracks system version information in `/etc/koma-version`, a JSON file containing:

```json
{
  "version": "0.5.0",
  "buildDate": "2025-11-10",
  "updatedAt": "2025-11-10T15:30:00.000Z",
  "manPagesCount": 37
}
```

This file is automatically managed by `koma upgrade` and `koma reset`. Manual modification is not recommended.

## UPDATE SAFETY

The Koma update system follows these safety principles:

1. **User data is sacred** - `/home/` is never modified during updates
2. **Non-destructive** - Updates can be rolled back with `koma reset`
3. **No downtime** - Updates apply immediately without page refresh
4. **Atomic operations** - Updates either complete fully or not at all
5. **Version tracking** - System always knows what version is installed

## FILES

- `/etc/koma-version` - System version information
- `/usr/share/man/` - Man page documentation
- `/home/` - User data (preserved during updates)

## EXAMPLES

Check if updates are available and apply them:
```bash
koma update
koma upgrade
```

View current system information:
```bash
koma version
```

Restore system files after corruption:
```bash
koma reset
```

## NOTES

- System updates are delivered through the kernel worker
- Updates preserve the IndexedDB-backed virtual filesystem
- Man pages are rebuilt during upgrade from embedded sources
- The update system does not require network access
- Version information is stored in the VFS, not browser storage

## SEE ALSO

help(1), man(1), restart(1), kmt(1), kmt(5)

## HISTORY

The `koma` command was introduced in Koma 0.5.0 (Phase 5.5: System Updates) to provide self-update capabilities for the system.
