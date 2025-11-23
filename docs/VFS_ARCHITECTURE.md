# Koma VFS Architecture

This document provides a comprehensive technical analysis of Koma's Virtual File System (VFS), its storage implementation, architectural decisions, deficiencies, and future evolution paths.

## Table of Contents
- [Current Architecture](#current-architecture)
- [Storage Layer](#storage-layer)
- [Client-Side Emulation](#client-side-emulation)
- [Known Deficiencies](#known-deficiencies)
- [Mount System Design](#mount-system-design)
- [Future Architecture Proposals](#future-architecture-proposals)
- [Migration Considerations](#migration-considerations)

---

## Current Architecture

### Overview

Koma's VFS is a **flat, single-layer filesystem** backed by IndexedDB, running in a Web Worker for performance isolation. The architecture consists of:

```
┌─────────────────────────────────────────────────┐
│ Main Thread (Browser)                           │
│                                                  │
│  ┌──────────┐         ┌──────────────┐         │
│  │  Shell   │────────▶│ Kernel Client│         │
│  │ (shell.js)         │ (client.js)  │         │
│  └──────────┘         └──────┬───────┘         │
│       │                      │                  │
│       │ shell.cwd           │ Comlink RPC      │
│       │ (client state)       │                  │
└───────┼──────────────────────┼──────────────────┘
        │                      │
        │                      ▼
┌───────┼──────────────────────────────────────────┐
│ Web Worker Thread                                │
│       │                                          │
│       │          ┌──────────────┐               │
│       └─────────▶│ KomaKernel   │               │
│                  │ (olivine.js) │               │
│                  └──────┬───────┘               │
│                         │                        │
│                  ┌──────▼────────┐              │
│                  │  VFS Class    │              │
│                  │               │              │
│                  └──────┬────────┘              │
│                         │                        │
│                  ┌──────▼────────┐              │
│                  │  IndexedDB    │              │
│                  │  Store: 'filesystem'         │
│                  │  Key: path                   │
│                  │  Value: {                    │
│                  │    path,                     │
│                  │    name,                     │
│                  │    type,                     │
│                  │    parent,                   │
│                  │    content,  ← Full file!    │
│                  │    size,                     │
│                  │    modified,                 │
│                  │    created                   │
│                  │  }                           │
│                  └───────────────┘              │
└──────────────────────────────────────────────────┘
```

### Key Characteristics

1. **Flat Storage Model**
   - Every file and directory is a separate IndexedDB entry
   - Key = absolute path (e.g., `/home/file.txt`)
   - No hierarchical storage structure in IndexedDB

2. **Full-File Storage**
   - Entire file contents stored in the `content` field as a string
   - No chunking, no partial reads
   - Every read/write operation loads/saves the complete file

3. **Path-Based Indexing**
   - Primary key: `path` (absolute)
   - Secondary index: `parent` (for `readdir` operations)
   - No inode concept, no reference counting

4. **Entry Types**
   - `type: 'file'` - Regular file with content
   - `type: 'directory'` - Directory (content is empty string)
   - **No other types**: No symlinks, no device files, no sockets

---

## Storage Layer

### IndexedDB Schema

**Database:** `KomaVFS`
**Version:** 2
**Store:** `filesystem`
**Key Path:** `path`

**Entry Structure:**
```javascript
{
  path: string,          // "/home/user/document.txt"
  name: string,          // "document.txt"
  type: 'file' | 'directory',
  parent: string,        // "/home/user"
  content: string,       // Full file content (empty for directories)
  size: number,          // Bytes (content.length)
  modified: number,      // Unix timestamp (ms)
  created: number        // Unix timestamp (ms)
}
```

**Indexes:**
- Primary: `path` (unique)
- Secondary: `parent` (non-unique, for listing directory contents)

### Storage Operations

#### Write Operation Flow
```javascript
await kernel.writeFile('/home/test.txt', 'content');

// In VFS:
1. Normalize path
2. Check parent exists
3. Load existing entry (if any)
4. Create new entry with FULL content
5. IndexedDB: store.put(entry)  ← Entire file written
6. Return
```

**Performance:** O(1) for lookup, but I/O cost proportional to file size.

#### Read Operation Flow
```javascript
const content = await kernel.readFile('/home/test.txt');

// In VFS:
1. Normalize path
2. IndexedDB: store.get(path)  ← Load entire entry
3. Validate type === 'file'
4. Return entry.content  ← Full file content
```

**Performance:** O(1) lookup, but must load entire file into memory.

#### Directory Listing Flow
```javascript
const entries = await kernel.readdir('/home');

// In VFS:
1. Normalize path
2. IndexedDB: index('parent').getAll(path)  ← Index scan
3. Extract names
4. Return array of names
```

**Performance:** O(n) where n = number of entries in directory.

### Storage Limitations

| Operation | Current Implementation | Limitation |
|-----------|----------------------|------------|
| **Partial Read** | Not supported | Must read entire file |
| **Append** | Read full file, concatenate, write back | Inefficient for logs |
| **Seek** | Not supported | No file descriptor concept |
| **Large Files** | Store as single string | Memory constrained (typically 100MB+ causes issues) |
| **Concurrent Access** | No locking | Race conditions possible |

---

## Client-Side Emulation

Several Unix concepts are **emulated client-side** rather than implemented in the kernel:

### 1. Current Working Directory

**Not in kernel!** Maintained as `shell.cwd` property in each shell session.

**Implementation:** `src/commands/filesystem.js:56-95`
```javascript
shell.registerCommand('cd', async (args, shell) => {
  const targetPath = resolvePath(inputPath, shell.cwd, shell.env.HOME);
  const stat = await kernel.stat(targetPath);  // Validate exists

  shell.cwd = targetPath;  // ← CLIENT STATE, no syscall
});
```

**Implications:**
- Each shell has independent working directory
- Kernel always receives absolute paths
- `resolvePath()` runs client-side before every kernel call
- No `getcwd()` or `chdir()` syscalls needed

**Trade-offs:**
- ✅ Simple implementation
- ✅ Stateless kernel
- ❌ Can't change directory of another process
- ❌ Spawned scripts don't inherit working directory

### 2. Pipes

**Not true pipes!** Implemented as **buffered sequential execution**.

**Implementation:** `src/shell.js:332-411`
```javascript
async executePipeline(pipeline) {
  let stdin = '';  // ← String buffer

  for (let i = 0; i < pipeline.stages.length; i++) {
    await handler(stage.args, this, context);  // Wait for completion

    if (!isLastStage) {
      stdin = context.getStdout();  // ← Buffer entire output
    }
  }
}
```

**How `cat file.txt | grep pattern` works:**
1. Execute `cat file.txt`, wait for completion
2. Buffer **all output** to string
3. Execute `grep pattern` with buffered string as input
4. Return result

**Implications:**
- Not true streaming pipes
- Commands execute sequentially, not concurrently
- Entire output held in memory
- Cannot do: `tail -f log | grep ERROR` (streaming use case)

**Trade-offs:**
- ✅ Simple to implement
- ✅ Works for most common cases
- ❌ Memory inefficient for large outputs
- ❌ No backpressure
- ❌ No concurrent execution

### 3. File Descriptors

**Not implemented!** All operations are full-file.

**Current API:**
```javascript
await kernel.readFile(path);   // Read entire file
await kernel.writeFile(path, content);  // Write entire file
```

**Missing:**
```javascript
const fd = await kernel.open(path, 'r');   // ❌ Not available
const buffer = await kernel.read(fd, 1024); // ❌ Not available
await kernel.lseek(fd, -100, 'SEEK_END');   // ❌ Not available
await kernel.close(fd);                     // ❌ Not available
```

**Implications:**
- Cannot read last 100 lines of log file efficiently
- Cannot append without rewriting entire file
- Cannot stream large files
- Every read loads entire file into memory

---

## Known Deficiencies

### 1. Large File Handling

**Problem:** All file content stored as single string in IndexedDB.

**Impact:**
- Files > 100MB cause performance issues
- Files > 1GB may crash browser tab
- Log files cannot be efficiently tailed
- Video/audio files impractical

**Example Failure Case:**
```javascript
// Create 500MB log file
for (let i = 0; i < 1000000; i++) {
  await kernel.writeFile('/var/log/app.log', existingContent + newLine);
  // ↑ Reads 500MB, appends 1 line, writes 500MB back. Every. Time.
}
```

**Root Cause:** No file chunking, no file descriptor abstraction.

### 2. No Symbolic Links

**Problem:** Only two entry types: `'file'` and `'directory'`.

**Impact:**
- Cannot create shortcuts
- Cannot create version aliases (`node` → `node-v18`)
- Cannot organize without duplication

**Missing:**
```javascript
await kernel.symlink('/usr/bin/python3.11', '/usr/bin/python');  // ❌
const target = await kernel.readlink('/usr/bin/python');          // ❌
```

**What Would Be Required:**
1. Add `type: 'symlink'` to entry schema
2. Add `target: string` field to store link destination
3. Implement link resolution in all VFS methods
4. Handle circular link detection
5. Add `lstat()` to inspect link without following

### 3. No Hard Links

**Problem:** No inode/refcount system.

**Impact:**
- Cannot deduplicate identical files
- Deleting one "copy" doesn't preserve others
- No true Unix hard link semantics

**Missing:**
```javascript
await kernel.link('/home/doc.txt', '/backup/doc.txt');  // ❌
// Both paths point to same inode, deleting one keeps other
```

**What Would Be Required:**
1. Separate inode layer from directory entries
2. Add reference counting
3. Change `unlink()` to decrement refcount, only delete at 0
4. Track which paths point to which inodes

**Architecture Change:**
```
Current: path → {content, metadata}
Needed:  path → directory_entry → inode → {content, metadata, refcount}
```

### 4. No File Permissions

**Problem:** No security model, no execute bit, no ownership.

**Impact:**
- Cannot mark scripts as executable
- Cannot restrict access (multi-user scenario)
- No `chmod +x` equivalent

**Missing:**
```javascript
await kernel.chmod('/usr/bin/script.sh', 0o755);  // ❌
const canExecute = await kernel.access(path, 'x'); // ❌
```

**What Would Be Required:**
1. Add `mode: number` field (Unix permissions: 0o755)
2. Add `uid: number`, `gid: number` fields
3. Implement user/group system
4. Check permissions in all operations
5. Add `chmod()`, `chown()`, `access()` syscalls

### 5. No File Watching

**Problem:** No way to detect file changes.

**Impact:**
- Cannot implement live reload
- Cannot build file synchronization tools
- No reactive file-based applications

**Missing:**
```javascript
const watchId = await kernel.watch('/home/config.json', (event, path) => {
  console.log(`${path} was ${event}`);  // 'create' | 'modify' | 'delete'
});
await kernel.unwatch(watchId);  // ❌
```

**What Would Be Required:**
1. Maintain `Map<watchId, {path, callback}>` of active watchers
2. Intercept all VFS mutation methods
3. Notify matching watchers after operations
4. Support glob patterns for directory watching
5. Handle debouncing for rapid changes

**Implementation Complexity:** 🟢 **Low** - Straightforward to add as it's just method interception.

### 6. Concurrent Access Issues

**Problem:** No file locking, no transaction coordination.

**Impact:**
- Race conditions if two processes write same file
- No atomic read-modify-write
- Corrupted files possible under concurrent access

**Missing:**
```javascript
const lock = await kernel.flock('/var/run/app.lock', 'LOCK_EX');  // ❌
try {
  // Critical section
} finally {
  await kernel.flock(lock, 'LOCK_UN');  // ❌
}
```

**IndexedDB Transaction Scope:**
- IndexedDB has transactions, but they're per-operation
- VFS doesn't expose multi-operation transactions
- No way to do atomic read-modify-write from userland

---

## Mount System Design

### Current State: No Mount System

The VFS is a **single, flat namespace**. There is no concept of mounting or multiple filesystems.

**All paths exist in one global tree:**
```
/
├── home/
├── usr/
├── var/
├── tmp/
└── media/
```

### Why a Mount System?

**Use Cases:**
1. **Virtual Filesystems**
   - Mount `/proc` for process information
   - Mount `/dev` for device files
   - Mount `/sys` for system information

2. **Remote Filesystems**
   - Mount cloud storage at `/mnt/gdrive`
   - Mount WebDAV at `/mnt/remote`
   - Mount IPFS at `/mnt/ipfs`

3. **Overlay Filesystems**
   - Union mounts for read-only base + read-write overlay
   - Useful for system updates without overwriting original

4. **Special Purpose**
   - Mount memory filesystem (tmpfs) at `/tmp` for performance
   - Mount KMT archives at `/media/examples` without extraction

### Proposed Mount Architecture

```javascript
class VFS {
  constructor() {
    this.mounts = new Map();  // path → MountPoint
    this.rootFS = new IndexedDBFS();  // Default backing store
  }

  mount(path, filesystem, options = {}) {
    // Register a filesystem at path
    this.mounts.set(path, {
      path,
      fs: filesystem,
      options  // readonly, etc.
    });
  }

  async resolvePath(path) {
    // Find longest matching mount point
    for (const [mountPath, mount] of this.mounts) {
      if (path.startsWith(mountPath)) {
        const relativePath = path.slice(mountPath.length);
        return { fs: mount.fs, path: relativePath, mount };
      }
    }
    // Fall back to root filesystem
    return { fs: this.rootFS, path, mount: null };
  }

  async readFile(path) {
    const { fs, path: relPath } = await this.resolvePath(path);
    return fs.readFile(relPath);
  }

  // Similar for all other operations...
}
```

### Filesystem Interface

All mounted filesystems would implement a common interface:

```javascript
class FilesystemInterface {
  async readFile(path) {}
  async writeFile(path, content) {}
  async readdir(path) {}
  async mkdir(path) {}
  async unlink(path) {}
  async stat(path) {}
  async exists(path) {}
  async rename(oldPath, newPath) {}
  // ... etc
}
```

**Example Implementations:**
- `IndexedDBFS` - Current VFS backed by IndexedDB
- `MemoryFS` - Fast in-memory filesystem (for `/tmp`)
- `ProcFS` - Virtual `/proc` filesystem
- `HttpFS` - Read-only HTTP-backed filesystem
- `KMT_ArchiveFS` - Mount KMT archives directly

### Mount Command

```bash
# Mount KMT archive without extraction
koma mount /media/examples.kmt /media/examples

# Mount memory filesystem for temp files
koma mount -t memfs /tmp

# Mount remote WebDAV
koma mount -t webdav https://example.com/dav /mnt/remote

# List mounts
koma mount

# Unmount
koma umount /media/examples
```

### Implementation Complexity

**Difficulty:** 🟡 **Medium**

**Required Changes:**
1. Refactor VFS to separate interface from implementation
2. Extract current IndexedDB logic into `IndexedDBFS` class
3. Add mount table and path resolution
4. Implement `mount()` and `umount()` syscalls
5. Handle cross-filesystem operations (e.g., move from one mount to another)
6. Decide on mount persistence (store in VFS or kernel config?)

**Benefits:**
- Extensibility: Easy to add new filesystem types
- Performance: Can optimize specific paths (memfs for `/tmp`)
- Features: Enable virtual filesystems, remote access
- Clean architecture: Separation of concerns

---

## Future Architecture Proposals

### Proposal 1: Layered VFS with Inode System

**Goal:** Support hard links, permissions, and better file organization.

**Architecture:**
```
Path Layer:     /home/user/file.txt  →  Directory Entry
                                              ↓
Inode Layer:    Directory Entry      →  Inode #12345
                                              ↓
Storage Layer:  Inode #12345         →  {content, metadata, refcount}
```

**Changes:**
1. Split IndexedDB stores:
   - `directory_entries`: {path, inode_id, name, parent}
   - `inodes`: {inode_id, content, size, mode, uid, gid, refcount, timestamps}

2. New syscalls:
   - `link(target, linkpath)` - Create hard link
   - `chmod(path, mode)` - Set permissions
   - `chown(path, uid, gid)` - Change ownership
   - `stat()` returns inode metadata including links count

**Benefits:**
- ✅ Hard links with proper semantics
- ✅ Permission system
- ✅ Better deduplication
- ✅ More Unix-like behavior

**Drawbacks:**
- ❌ Increased complexity
- ❌ Migration required for existing VFS
- ❌ Two IndexedDB lookups per operation

**Implementation Effort:** 🔴 **High** (2-3 weeks)

---

### Proposal 2: Chunked File Storage

**Goal:** Support large files and partial I/O.

**Architecture:**
```
File Entry:      /var/log/app.log  →  {inode, size, chunk_size}
                                            ↓
Chunk Store:     {inode, chunk: 0}  →  {data: first 64KB}
                 {inode, chunk: 1}  →  {data: next 64KB}
                 {inode, chunk: 2}  →  {data: next 64KB}
                 ...
```

**Changes:**
1. Add chunk storage:
   - `file_chunks`: {key: `${inode}_${chunkIndex}`, data: string | ArrayBuffer}

2. Implement file descriptors:
   ```javascript
   class FileDescriptor {
     constructor(inode, flags, position = 0) {
       this.inode = inode;
       this.flags = flags;  // O_RDONLY, O_WRONLY, O_APPEND
       this.position = position;
       this.loadedChunks = new Map();  // Cache
     }
   }
   ```

3. New syscalls:
   ```javascript
   async open(path, flags)           // Returns fd
   async read(fd, length)            // Read from fd.position
   async write(fd, data)             // Write at fd.position
   async lseek(fd, offset, whence)   // Change position
   async close(fd)                   // Release fd
   ```

**Example Usage:**
```javascript
// Efficiently read last 1000 bytes of log
const fd = await kernel.open('/var/log/app.log', 'r');
const stat = await kernel.fstat(fd);
await kernel.lseek(fd, stat.size - 1000, 'SEEK_SET');
const tail = await kernel.read(fd, 1000);
await kernel.close(fd);
```

**Benefits:**
- ✅ Support files > 1GB
- ✅ Partial reads/writes
- ✅ Efficient append operations
- ✅ Streaming capable

**Drawbacks:**
- ❌ More complex implementation
- ❌ File descriptor table management
- ❌ Chunk size tuning required
- ❌ Garbage collection for chunks

**Implementation Effort:** 🟡 **Medium-High** (1-2 weeks)

---

### Proposal 3: Hybrid Approach

**Goal:** Keep simple files simple, chunk only large files.

**Strategy:**
- Files < 64KB: Store as single `content` field (current approach)
- Files ≥ 64KB: Automatically chunk and use fd-based access

**Detection:**
```javascript
async writeFile(path, content) {
  if (content.length < 64 * 1024) {
    // Small file: use simple storage
    return this._writeSimple(path, content);
  } else {
    // Large file: use chunked storage
    return this._writeChunked(path, content);
  }
}
```

**Benefits:**
- ✅ Backward compatible for small files
- ✅ Automatic optimization
- ✅ Best of both worlds

**Drawbacks:**
- ❌ Two code paths to maintain
- ❌ Complexity in handling mode transitions (small → large)

**Implementation Effort:** 🟡 **Medium** (1 week)

---

## Migration Considerations

### Database Version Bumps

**Current Version:** 2
**Last Bump Reason:** Phase 5 changes

**For Major Architecture Changes:**
1. Bump `DB_VERSION` to trigger `onupgradeneeded`
2. Implement migration logic in upgrade handler
3. Provide fallback/export before migration
4. Test migration with real user data

**Example Migration: Simple → Inode-based**
```javascript
request.onupgradeneeded = async (event) => {
  const db = event.target.result;
  const transaction = event.target.transaction;

  if (event.oldVersion < 3) {
    // Migrate to inode-based storage
    const oldStore = transaction.objectStore('filesystem');
    const newInodeStore = db.createObjectStore('inodes', { keyPath: 'inode_id' });
    const newDirStore = db.createObjectStore('directory_entries', { keyPath: 'path' });

    const entries = await oldStore.getAll();
    let inodeCounter = 1;

    for (const entry of entries) {
      // Create inode
      const inodeId = inodeCounter++;
      await newInodeStore.add({
        inode_id: inodeId,
        content: entry.content,
        size: entry.size,
        mode: 0o644,  // Default permissions
        refcount: 1,
        created: entry.created,
        modified: entry.modified
      });

      // Create directory entry
      await newDirStore.add({
        path: entry.path,
        name: entry.name,
        inode_id: inodeId,
        parent: entry.parent
      });
    }
  }
};
```

### Backward Compatibility

**Strategy Options:**

1. **Clean Break (Version Bump)**
   - Bump kernel version: v0.5.0 → v1.0.0
   - Export/import required for migration
   - Clear upgrade path documented

2. **Dual Support Period**
   - Support both old and new formats for 1-2 versions
   - Auto-migrate on write
   - Read supports both formats

3. **Feature Flags**
   - Enable new features via config
   - `kernel.config.use_chunked_storage = true`
   - Gradual rollout

**Recommendation:** Clean break with export tool for existing users.

---

## Comparison: Existing Libraries

Brief evaluation of existing IndexedDB filesystem libraries:

| Library | Status | Pros | Cons | Fit for Koma? |
|---------|--------|------|------|---------------|
| **BrowserFS** | Maintenance mode | Full Node.js fs API, multiple backends | Large bundle, outdated deps | 🔴 No - too heavy |
| **Filer** | Active | POSIX-like, well-tested | Designed for single-user, opinionated | 🟡 Maybe - would need wrapper |
| **LightningFS** | Active | Small, fast, used by isomorphic-git | Limited API, optimized for git | 🔴 No - too specialized |
| **Roll Our Own** | Current | Tailored to needs, no bloat | Must build features ourselves | ✅ Current approach |

**Verdict:** Continue with custom implementation. We've already invested in a working VFS, and our needs (Web Worker, Comlink, kernel abstraction) are unique enough that adapting a library would be significant work anyway.

---

## Action Items

### Short Term (Current Phase)
1. ✅ Document current VFS architecture (this document)
2. ✅ Document missing syscalls (MISSING_SYSCALLS.md)
3. ✅ Document kernel API (KERNEL_API.md)
4. ⏳ Add file watching (low complexity, high value)
5. ⏳ Add validation tests for VFS edge cases

### Medium Term (Next Phase)
1. Implement file watching system
2. Add mount system foundation
3. Create MemoryFS implementation for `/tmp`
4. Prototype ProcFS for process info

### Long Term (Future Phases)
1. Evaluate need for chunked file storage based on real usage
2. Consider inode system if hard links become necessary
3. Add permissions system if multi-user scenarios emerge
4. Implement file locking for concurrent access

---

*Document Version: 1.0*
*Created: 2025-11-11*
*Last Updated: 2025-11-11*
*See also: `KERNEL_API.md`, `MISSING_SYSCALLS.md`*
