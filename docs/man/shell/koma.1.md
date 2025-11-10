# NAME

koma - Koma system management

## SYNOPSIS

```bash
koma version
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

help(1), man(1), restart(1)

## HISTORY

The `koma` command was introduced in Koma 0.5.0 (Phase 5.5: System Updates) to provide self-update capabilities for the system.
