# Virtual Filesystem (VFS)

**Domain**: `#vfs`
**Related Domains**: `#kernel`, `#backup`, `#commands`

## Overview

IndexedDB-backed virtual filesystem with inode-based structure. Provides POSIX-like file operations entirely in the browser with persistent storage.

## Features by Maturity

### ✅ Production

#### IndexedDB-Backed Storage
**Tags**: `#vfs` `#production` `#critical` `#storage`
**Status**: Stable, production-ready
**Phase**: 3
**Dependencies**: IndexedDB API support
**Blocks**: All file operations

**Features**:
- Persistent storage in IndexedDB
- Survives page reload and browser restarts
- Quota management (typically ~50MB minimum, can request more)
- Efficient key-value storage with indexes

**Files**: `src/kernel/olivine.js` (VFS class)

#### Inode-Based Structure
**Tags**: `#vfs` `#production` `#critical` `#architecture`
**Status**: Complete Unix-like filesystem structure
**Phase**: 3
**Dependencies**: None
**Blocks**: File navigation, operations

**Structure**:
```
Inode:
- id (unique identifier)
- name (filename)
- type ('file' or 'directory')
- parent (parent inode id)
- content (file data, only for files)
- size (bytes)
- created (timestamp)
- modified (timestamp)
```

**Directory Tree**:
- `/` - Root directory
- `/home` - User files
- `/tmp` - Temporary storage
- `/usr/bin` - System binaries (scripts)
- `/etc` - System configuration
- `/mnt` - Mount points (File System Access API, future)
- `/proc` - Process metadata (future)

**Files**: `src/kernel/olivine.js` (VFS implementation)

#### File I/O Operations
**Tags**: `#vfs` `#production` `#critical` `#operations`
**Status**: Complete text file operations
**Phase**: 3
**Dependencies**: Inode structure
**Blocks**: All file commands

**Operations**:
- **Read**: `readFile(path)` - Read file contents
- **Write**: `writeFile(path, content)` - Write/overwrite file
- **Append**: `appendFile(path, content)` - Append to file
- **Exists**: `exists(path)` - Check file/directory existence
- **Type checks**: `isFile(path)`, `isDirectory(path)`
- **Stat**: `stat(path)` - Get file metadata
- **List**: `ls(path)` - List directory contents

**Current Limitation**: Text files only (binary support deferred)

**Files**: `src/kernel/olivine.js` (VFS methods), `src/stdlib/fs.js` (stdlib wrapper)

#### Directory Operations
**Tags**: `#vfs` `#production` `#critical` `#operations`
**Status**: Complete directory management
**Phase**: 3
**Dependencies**: Inode structure
**Blocks**: mkdir, cd, tree commands

**Operations**:
- **Create**: `mkdir(path)` - Create directory
- **Remove**: `rm(path)` - Delete file or directory
- **Copy**: `cp(src, dest)` - Copy files
- **Move**: `mv(src, dest)` - Move/rename files and directories
- **Navigate**: Path resolution with `.`, `..`, `~`, absolute/relative paths

**Files**: `src/kernel/olivine.js` (VFS methods)

#### Database Migrations
**Tags**: `#vfs` `#production` `#high` `#maintenance`
**Status**: Version-based schema upgrades
**Phase**: 3, ongoing
**Dependencies**: IndexedDB versioning
**Blocks**: None

**Features**:
- Schema version tracking
- Automatic migration on version change
- Preserves user data during upgrades
- Creates initial filesystem structure on first install

**Files**: `src/kernel/olivine.js` (VFS initialization)

#### System File Updates
**Tags**: `#vfs` `#production` `#high` `#system`
**Status**: Safe system updates without data loss
**Phase**: 5.5
**Dependencies**: Version tracking
**Blocks**: koma upgrade command

**Features**:
- `/etc/koma-version` tracks system version
- `updateSystemFiles()` overwrites `/usr/` and `/etc/`
- Preserves `/home/` user data
- Embedded system files in code
- 48 man pages bundled

**Files**: `src/kernel/olivine.js` (VFS system methods)

### 🔧 Working

#### Binary File Support
**Tags**: `#vfs` `#working` `#medium` `#enhancement`
**Status**: Planned, not yet implemented
**Phase**: Future (Phase 12+)
**Dependencies**: ArrayBuffer storage in IndexedDB
**Blocks**: Image files, executables, compressed archives

**Planned**:
- Store binary data as ArrayBuffer
- Detect file type (text vs binary)
- Binary read/write operations
- File type metadata

### 🧪 Prototype

#### File System Access API Integration
**Tags**: `#vfs` `#prototype` `#medium` `#native-files`
**Status**: Planned for future phases
**Phase**: Phase 12+
**Dependencies**: File System Access API support
**Blocks**: Native file system mounting

**Planned**:
- Mount native directories to `/mnt`
- Read/write real files on disk
- Persistent mount points
- Permission management
- Sandboxing considerations

#### Stream Large Files
**Tags**: `#vfs` `#prototype` `#low` `#performance`
**Status**: Deferred until needed
**Phase**: Future
**Dependencies**: Binary file support
**Blocks**: Large file handling

**Planned**:
- Stream read for files >1MB
- Chunk-based writing
- Progress callbacks
- Memory-efficient operations

## Architecture

### VFS Class Structure

```javascript
class VFS {
  constructor(db) {
    this.db = db;  // IndexedDB database
  }

  // Core operations
  async readFile(path)
  async writeFile(path, content)
  async appendFile(path, content)
  async mkdir(path)
  async rm(path, recursive = false)
  async cp(src, dest)
  async mv(src, dest)
  async stat(path)
  async ls(path, detailed = false)

  // Helper methods
  async exists(path)
  async isFile(path)
  async isDirectory(path)
  async resolvePath(path, cwd = '/home')

  // System methods
  async getSystemVersion()
  async setSystemVersion(version)
  async updateSystemFiles(files)
}
```

### IndexedDB Schema

**Object Store**: `inodes`
- **Key**: `id` (auto-increment)
- **Indexes**:
  - `parent` (for directory listing)
  - `name,parent` (for file lookup)

## Related Files

**Source**:
- `src/kernel/olivine.js` - VFS implementation (~400 lines)
- `src/stdlib/fs.js` - Filesystem module wrapper

**Documentation**:
- `docs/VFS_ARCHITECTURE.md` - Complete VFS design
- `docs/KERNEL_API.md` - VFS API reference

**Tests**:
- `tests/integration/vfs/vfs-operations.test.js` - VFS tests

## Next Steps

**Short-term** (Phase 7):
- None - VFS is stable and feature-complete for current needs

**Medium-term** (Phase 9-10):
- Binary file support
- Larger file streaming

**Long-term** (Phase 12+):
- File System Access API integration
- Native directory mounting
- Advanced permissions system

## Notes

**Storage Quotas**:
- Minimum: ~10MB (varies by browser)
- Typical: ~50MB without prompting
- Can request more via Storage API
- Persistent storage option available

**Performance**:
- IndexedDB is async (all operations return Promises)
- Efficient for < 10,000 files
- May need optimization for larger filesystems
- Consider sharding for massive directories

---

**Last Updated**: 2025-11-16
**Maturity**: Production
**Priority**: Critical
