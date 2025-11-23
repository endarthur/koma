# Backup & Restore

**Domain**: `#backup`
**Related Domains**: `#vfs`, `#boot`, `#commands`

## Overview

Comprehensive backup and restore system using .magma archives. Provides full VFS backup/restore with compression, daily automatic snapshots, and emergency recovery capabilities.

## Features by Maturity

### ✅ Polished

### .magma Archive Format
**Tags**: `#backup` `#polished` `#high` `#archive`
**Status**: Production-ready, well-documented
**Phase**: 5.7
**Dependencies**: VFS, pako.js (compression)
**Blocks**: VFS backup/restore operations

**Format**:
- Tar-like structure
- JSON metadata header
- Gzip compression (via pako.js)
- Base64 encoding for browser compatibility

**Metadata**:
```json
{
  "version": "1.0",
  "timestamp": 1699999999999,
  "fileCount": 42,
  "totalSize": 123456,
  "generator": "koma-backup-v0.5.7"
}
```

**File Structure**:
```
[Metadata JSON]\n
---FILE---
path: /home/file1.txt
size: 123
content: [base64 encoded content]
---FILE---
path: /home/file2.txt
size: 456
content: [base64 encoded content]
...
```

**Files**: `src/commands/filesystem.js` (backup/restore implementation)

### backup Command
**Tags**: `#backup` `#polished` `#high` `#command`
**Status**: Complete VFS backup functionality
**Phase**: 5.7
**Dependencies**: VFS, pako.js
**Blocks**: None

**Usage**:
```bash
backup mybackup.magma          # Create backup of entire VFS
backup --help                  # Show help
```

**Features**:
- Backs up entire VFS (all files and directories)
- Gzip compression (typically 80-90% reduction)
- Metadata tracking (file count, size, timestamp)
- Progress feedback during backup
- Activity LED integration (orange pulse during write)

**Files**: `src/commands/filesystem.js`, `docs/man/filesystem/backup.1.md`

### restore Command
**Tags**: `#backup` `#polished` `#high` `#command`
**Status**: Complete VFS restore functionality
**Phase**: 5.7
**Dependencies**: VFS, pako.js
**Blocks**: None

**Usage**:
```bash
restore mybackup.magma         # Restore VFS from backup
restore --help                 # Show help
```

**Features**:
- Restores entire VFS from .magma archive
- Overwrites existing files
- Preserves directory structure
- Validates metadata before restoring
- Progress feedback during restore
- Activity LED integration (green pulse during read, orange during write)

**Warning**: Destructive operation - overwrites VFS!

**Files**: `src/commands/filesystem.js`, `docs/man/filesystem/restore.1.md`

### Daily Automatic Snapshots
**Tags**: `#backup` `#polished` `#high` `#automation`
**Status**: Complete background snapshot system
**Phase**: 6.6 (Boot System)
**Dependencies**: Health Monitor, VFS, backup command
**Blocks**: None

**Features**:
- Full .magma export once per day
- Stored in `/home/.koma-snapshot-YYYY-MM-DD.magma`
- Automatic pruning (keep last 7 days)
- Runs in background via Health Monitor
- No user interaction required

**Scheduling**:
- Checks every 30 seconds if snapshot needed
- Creates snapshot if none exists for current day
- Deletes snapshots older than 7 days

**Benefits**:
- ✅ Automatic data protection
- ✅ No manual intervention needed
- ✅ Rolling 7-day backup window
- ✅ Minimal storage impact (compressed)

**Files**: `src/boot/health-monitor.js` (snapshot scheduling)

### Emergency Recovery
**Tags**: `#backup` `#polished` `#critical` `#recovery`
**Status**: Complete VFS corruption recovery
**Phase**: 6.6 (Boot System)
**Dependencies**: Emergency Mode, backup/restore
**Blocks**: User data recovery when kernel fails

**Features**:
- Direct IndexedDB manipulation (bypasses broken kernel)
- Upload .magma backup to restore VFS
- Works when kernel initialization fails
- Clear recovery instructions in emergency UI
- Diagnostic reports for troubleshooting

**User Flow**:
1. Kernel fails to initialize
2. Emergency mode activates
3. User uploads .magma backup
4. Direct IndexedDB restore
5. Page reload with recovered VFS

**Files**: `src/boot/emergency.js`, `src/boot/health-monitor.js`

### ✅ Production

### Session State Backups
**Tags**: `#backup` `#production` `#high` `#sessions`
**Status**: Complete lightweight session backup
**Phase**: 6.6 (Boot System)
**Dependencies**: Health Monitor, localStorage
**Blocks**: Tab restoration after reload

**Features**:
- Saves every 30 seconds
- Backs up: tabs, history, current input (~10KB)
- Separate IndexedDB (KomaSessionState)
- Does NOT backup full VFS (redundant with IndexedDB)
- Fast and lightweight

**Restoration**:
- On page load, restore tabs and history
- Preserves user workflow
- No manual intervention

**Files**: `src/boot/health-monitor.js`, `src/ui/tab-manager.js`

### 🔧 Working

None - backup system is feature-complete!

### 🧪 Prototype

### Incremental Backups
**Tags**: `#backup` `#prototype` `#medium` `#optimization`
**Status**: Planned for future
**Phase**: Future (Phase 12+)
**Dependencies**: VFS change tracking
**Blocks**: Faster backups for large filesystems

**Planned**:
- Track changed files since last backup
- Only backup modified files
- Differential backup format
- Restore from base + incrementals

### Cloud Backup Integration
**Tags**: `#backup` `#prototype` `#low` `#cloud`
**Status**: Deferred
**Phase**: Future (Phase 12+)
**Dependencies**: Cloud storage APIs
**Blocks**: Automatic cloud backups

**Planned**:
- Export to Google Drive, Dropbox, etc.
- Automatic scheduled cloud backups
- Two-way sync (advanced)

**Challenge**: Requires OAuth and cloud API integration

### Selective Backup/Restore
**Tags**: `#backup` `#prototype` `#low` `#ux`
**Status**: Deferred
**Phase**: Future (Phase 12+)
**Dependencies**: Archive format extensions
**Blocks**: Backup/restore specific directories

**Planned**:
- `backup mybackup.magma /home/project` - Backup specific path
- `restore mybackup.magma /home/project` - Restore to specific path
- Partial VFS restore
- Merge mode (don't overwrite, only add new files)

## Architecture

### Backup Pipeline

```
VFS Files
  ↓
[Collect all files via VFS.ls recursive]
  ↓
[Create metadata JSON]
  ↓
[Serialize files with headers]
  ↓
[Gzip compression via pako]
  ↓
.magma file (download)
```

### Restore Pipeline

```
.magma file (upload)
  ↓
[Gunzip decompression via pako]
  ↓
[Parse metadata JSON]
  ↓
[Parse file entries]
  ↓
[Write files to VFS via writeFile]
  ↓
Restored VFS
```

### Snapshot Scheduling

```
Health Monitor (every 30s)
  ↓
[Check if snapshot exists for today]
  ↓
  No? → [Run backup command]
        ↓
        [Save to /home/.koma-snapshot-YYYY-MM-DD.magma]
        ↓
        [Delete snapshots older than 7 days]
  ↓
  Yes? → Skip
```

## Related Files

**Source**:
- `src/commands/filesystem.js` - backup/restore commands (~400 lines)
- `src/boot/health-monitor.js` - Snapshot scheduling (~420 lines)
- `src/boot/emergency.js` - Emergency recovery (~480 lines)

**Documentation**:
- `docs/man/filesystem/backup.1.md` - backup command man page
- `docs/man/filesystem/restore.1.md` - restore command man page
- `design/BOOT_SYSTEM.md` - Boot system with snapshot details

**Dependencies**:
- pako.js (CDN) - Gzip compression/decompression

**Tests**:
- (Need backup/restore integration tests)

## Next Steps

**Short-term**:
- None - backup system is polished and complete

**Medium-term** (Phase 10):
- Consider incremental backups if VFS grows large

**Long-term** (Phase 12+):
- Cloud backup integration
- Selective backup/restore
- Advanced archive features

## Notes

**Why .magma?**
- Continues geological naming theme (magma → molten rock → preservation)
- Unique file extension (avoids conflicts)
- Memorable and thematic

**Compression Ratios**:
- Typical: 80-90% size reduction
- Text files compress very well (scripts, configs, markdown)
- Already compressed files (images, if supported) won't compress much

**Daily Snapshot Storage**:
- 7 days × ~10KB-1MB per snapshot (depends on VFS size)
- Stored in `/home/` (user visible, can delete manually)
- Auto-cleanup prevents storage bloat

**Emergency Recovery Design**:
- Critical for data preservation
- Works even when kernel is completely broken
- Direct IndexedDB manipulation via emergency mode
- Last resort for VFS corruption

**Session State vs VFS Backups**:
- Session state: Lightweight, frequent (every 30s), tabs/history only
- VFS snapshots: Heavy, infrequent (daily), full filesystem
- Both important for different recovery scenarios

---

**Last Updated**: 2025-11-16
**Maturity**: Polished
**Priority**: High
