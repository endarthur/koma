# Syscall Investigation Findings

This document summarizes the investigation into how Koma implements (or doesn't implement) standard Unix system calls, conducted on 2025-11-11.

## Summary

We investigated how Koma handles fundamental Unix operations without implementing all traditional syscalls. Key findings:

1. **Working Directory** - Emulated client-side, not in kernel
2. **Pipes** - Implemented via buffered sequential execution
3. **File Descriptors** - Not implemented, all operations are full-file
4. **Symbolic Links** - Not implemented
5. **Hard Links** - Not implemented

---

## Question 1: How do cd/pwd work without getcwd/chdir?

### Answer: Client-Side Emulation

**Working directory is maintained entirely in `shell.cwd`** - a property on each shell instance. The kernel has no concept of "current directory."

### Implementation Details

**Location:** `src/commands/filesystem.js:56-95`

```javascript
shell.registerCommand('cd', async (args, shell) => {
  // Resolve path relative to shell.cwd (client-side)
  const targetPath = resolvePath(inputPath, shell.cwd, shell.env.HOME);

  // Validate path exists (only kernel call)
  const stat = await kernel.stat(targetPath);
  if (stat.type !== 'directory') {
    showError(shell.term, 'cd', `not a directory: ${inputPath}`);
    return;
  }

  // Update CLIENT-SIDE state - no kernel syscall
  shell.cwd = targetPath;
});
```

**pwd command:**
```javascript
shell.registerCommand('pwd', (args, shell) => {
  shell.term.writeln(shell.cwd);  // Just print client state
});
```

### How Relative Paths Work

Every command that accepts a path argument calls `resolvePath()` **before** making a kernel call:

```javascript
// In src/utils/path-utils.js
export function resolvePath(inputPath, cwd, home) {
  if (inputPath.startsWith('/')) {
    return inputPath;  // Already absolute
  }
  if (inputPath.startsWith('~')) {
    return home + inputPath.slice(1);  // Expand home
  }
  // Resolve relative to cwd
  return normalizePath(cwd + '/' + inputPath);
}

// Then commands do:
const absolutePath = resolvePath(userInput, shell.cwd, shell.env.HOME);
await kernel.readFile(absolutePath);  // ← Kernel always gets absolute path
```

### Implications

**Pros:**
- ✅ Simple implementation
- ✅ Stateless kernel (easier to reason about)
- ✅ Each shell has independent working directory
- ✅ No race conditions with multiple shells

**Cons:**
- ❌ Cannot change another process's working directory
- ❌ Spawned background scripts don't inherit working directory
- ❌ Cannot implement `fchdir()` (change dir via file descriptor)

### Would It Be Hard to Add Kernel-Side CWD?

**Difficulty:** 🟢 **Easy** - But questionable value.

**What Would Change:**
1. Add `cwd` field to process context
2. Add `chdir(path)` and `getcwd()` syscalls
3. Track per-process working directory in ProcessManager
4. Modify all VFS operations to resolve paths in kernel

**Why We Don't:**
- Current approach works fine
- Adding kernel state increases complexity
- Multiple shells would still need separate cwd tracking
- No compelling use case for kernel-managed cwd

---

## Question 2: Does IndexedDB support file descriptors?

### Answer: No - Full File Storage Only

IndexedDB stores **entire files as single entries**. There is no native support for partial reads, seeking, or file descriptors.

### Current Storage Structure

**Location:** `src/kernel/olivine.js:320-378`

```javascript
const entry = {
  path: '/home/document.txt',
  name: 'document.txt',
  type: 'file',
  parent: '/home',
  content: '...entire file content as a string...',  // ← Full file!
  size: content.length,
  modified: Date.now(),
  created: Date.now()
};

await store.put(entry);  // Write entire entry at once
```

### What File Descriptors Would Require

**Option 1: File Chunking**

Split large files into chunks:

```javascript
// File metadata
{
  path: '/var/log/app.log',
  type: 'file',
  size: 10485760,  // 10MB
  chunk_size: 65536,  // 64KB chunks
  num_chunks: 160
}

// Chunk storage (separate store)
{
  key: '/var/log/app.log:0',  // chunk 0
  data: '...first 64KB...'
}
{
  key: '/var/log/app.log:1',  // chunk 1
  data: '...next 64KB...'
}
// ... 158 more chunks
```

**Option 2: Hybrid Approach**

- Files < 64KB: Store as single `content` field (current)
- Files ≥ 64KB: Automatically chunk

**File Descriptor Implementation:**

```javascript
class FileDescriptor {
  constructor(inode, mode, position = 0) {
    this.inode = inode;
    this.mode = mode;  // 'r', 'w', 'a'
    this.position = position;
    this.chunkCache = new Map();  // LRU cache of loaded chunks
  }

  async read(length) {
    const startChunk = Math.floor(this.position / CHUNK_SIZE);
    const endChunk = Math.floor((this.position + length) / CHUNK_SIZE);

    // Load necessary chunks
    const chunks = [];
    for (let i = startChunk; i <= endChunk; i++) {
      chunks.push(await this.loadChunk(i));
    }

    // Extract requested bytes
    const offset = this.position % CHUNK_SIZE;
    const data = extractBytes(chunks, offset, length);

    this.position += data.length;
    return data;
  }

  async write(data) {
    // Similar chunked write logic
  }

  async seek(offset, whence) {
    switch (whence) {
      case 'SEEK_SET': this.position = offset; break;
      case 'SEEK_CUR': this.position += offset; break;
      case 'SEEK_END': this.position = this.size + offset; break;
    }
  }
}
```

### Implementation Complexity

**Difficulty:** 🟡 **Medium** (1-2 weeks of work)

**Required Changes:**
1. Add chunk storage to IndexedDB schema
2. Implement FileDescriptor class
3. Add file descriptor table to kernel
4. Implement syscalls: `open()`, `close()`, `read()`, `write()`, `lseek()`
5. Add chunk garbage collection
6. Handle edge cases (writes across chunk boundaries, etc.)

### When Would This Be Worth It?

**Compelling Use Cases:**
- Log files > 100MB that need efficient tailing
- Large data files that need streaming processing
- Append-heavy workloads (e.g., database logs)
- Video/audio file storage

**Not Needed For:**
- Source code files (typically < 1MB)
- Configuration files (< 10KB)
- Small text documents
- Current usage patterns

**Recommendation:** Wait until real use case emerges. Current full-file approach works fine for typical shell usage.

---

## Question 3: Would symlinks/hard links be hard to implement?

### Answer: Symlinks = Medium, Hard Links = Hard

### Symbolic Links

**Difficulty:** 🟡 **Medium** (Weekend project, ~3-5 days)

**What's Required:**

1. **Add new entry type:**
```javascript
{
  path: '/usr/bin/python',
  name: 'python',
  type: 'symlink',  // ← New type
  target: '/usr/bin/python3.11',  // ← New field
  parent: '/usr/bin',
  created: Date.now(),
  modified: Date.now()
}
```

2. **Add link resolution to all VFS methods:**
```javascript
async _resolveSymlinks(path, maxDepth = 40) {
  let currentPath = path;
  let depth = 0;

  while (depth < maxDepth) {
    const entry = await this.getRawEntry(currentPath);

    if (!entry) {
      throw createVFSError('ENOENT', 'no such file or directory', path);
    }

    if (entry.type !== 'symlink') {
      return currentPath;  // Found real file/directory
    }

    // Follow link
    currentPath = entry.target;
    depth++;
  }

  throw createVFSError('ELOOP', 'too many levels of symbolic links', path);
}

async readFile(path) {
  const resolvedPath = await this._resolveSymlinks(path);
  // ... rest of readFile logic
}
```

3. **Add new syscalls:**
```javascript
async symlink(target, linkpath) {
  // Create symlink entry
  const entry = {
    path: linkpath,
    name: basename(linkpath),
    type: 'symlink',
    target: target,
    parent: dirname(linkpath),
    created: Date.now(),
    modified: Date.now()
  };
  await this.db.put(entry);
}

async readlink(path) {
  const entry = await this.getRawEntry(path);
  if (entry.type !== 'symlink') {
    throw createVFSError('EINVAL', 'not a symbolic link', path);
  }
  return entry.target;
}

async lstat(path) {
  // Like stat(), but don't follow symlinks
  return this.getRawEntry(path);
}
```

**Challenges:**
- Circular link detection (A → B → C → A)
- Relative vs absolute link targets
- Dangling links (link target doesn't exist)
- Performance impact (every operation needs link resolution)

**Benefits:**
- ✅ Create shortcuts/aliases
- ✅ Version management (`node` → `node-v18`)
- ✅ Organize without duplication
- ✅ Standard Unix feature users expect

### Hard Links

**Difficulty:** 🔴 **Hard** (Requires architectural changes, 2-3 weeks)

**Why Hard:**
Hard links require **inode-based architecture** with reference counting. This is a fundamental change to how the VFS works.

**Current Architecture:**
```
path → {content, metadata}
```

**Required Architecture:**
```
path → directory_entry → inode → {content, metadata, refcount}
```

**Implementation Steps:**

1. **Split IndexedDB stores:**
```javascript
// Old: Single store
'filesystem' → {path, content, metadata}

// New: Two stores
'directory_entries' → {path, inode_id, name, parent}
'inodes' → {inode_id, content, size, refcount, timestamps}
```

2. **Add reference counting:**
```javascript
async link(targetPath, linkPath) {
  // Get target's inode
  const targetEntry = await this.getDirEntry(targetPath);
  const inode = await this.getInode(targetEntry.inode_id);

  // Create new directory entry pointing to same inode
  await this.createDirEntry({
    path: linkPath,
    inode_id: targetEntry.inode_id,
    name: basename(linkPath),
    parent: dirname(linkPath)
  });

  // Increment refcount
  inode.refcount++;
  await this.updateInode(inode);
}

async unlink(path) {
  const dirEntry = await this.getDirEntry(path);
  const inode = await this.getInode(dirEntry.inode_id);

  // Delete directory entry
  await this.deleteDirEntry(path);

  // Decrement refcount
  inode.refcount--;

  // Only delete inode when refcount reaches 0
  if (inode.refcount === 0) {
    await this.deleteInode(inode.inode_id);
  } else {
    await this.updateInode(inode);
  }
}
```

3. **Migration required:**
All existing VFS data needs to be migrated to new structure.

**Challenges:**
- Major architecture refactor
- Every VFS operation needs two IndexedDB lookups
- Complex migration from current structure
- Testing burden (ensure no data loss)

**Benefits:**
- ✅ Proper Unix hard link semantics
- ✅ Automatic deduplication
- ✅ Foundation for permissions (mode, uid, gid in inode)
- ✅ Enables efficient snapshots

**Recommendation:** Only implement if compelling use case emerges. Symlinks provide 80% of the value with 20% of the complexity.

---

## Question 4: Don't we already have pipes?

### Answer: Yes, But Not True Unix Pipes

We have **buffered sequential execution** that looks like pipes but doesn't stream.

### Current Implementation

**Location:** `src/shell.js:332-411`

```javascript
async executePipeline(pipeline) {
  let stdin = '';  // ← String buffer, not a stream

  // Handle input redirection
  if (pipeline.inputFile) {
    stdin = await kernel.readFile(pipeline.inputFile);
  }

  // Execute each stage sequentially
  for (let i = 0; i < pipeline.stages.length; i++) {
    const stage = pipeline.stages[i];
    const isLastStage = i === pipeline.stages.length - 1;

    // Create context for this stage
    let context;
    if (!isLastStage) {
      context = createPipedContext(this.term, stdin, this);
    }

    // Execute command and WAIT for completion
    const handler = this.commands.get(stage.command);
    await handler(stage.args, this, context);

    // Get FULL output and pass to next stage
    if (!isLastStage) {
      stdin = context.getStdout();  // ← Buffer entire output
    }
  }
}
```

### How `cat file.txt | grep pattern | sort` Works

```
Step 1: Execute cat file.txt
        ↓
        Wait for completion
        ↓
        Buffer FULL output: "line1\nline2\nline3\n..."

Step 2: Execute grep pattern with input = buffered output
        ↓
        Wait for completion
        ↓
        Buffer FULL output: "line2\nline3\n..."

Step 3: Execute sort with input = buffered output
        ↓
        Wait for completion
        ↓
        Display final output
```

### What True Unix Pipes Do

```
cat, grep, and sort all running CONCURRENTLY
   ↓
cat writes chunk → pipe buffer → grep reads chunk → pipe buffer → sort reads chunk
                   ↑                                  ↑
                   Blocks when full                   Blocks when empty
                   (backpressure)                     (waiting for data)
```

**Key Differences:**

| Feature | Koma "Pipes" | True Unix Pipes |
|---------|-------------|-----------------|
| **Execution** | Sequential | Concurrent |
| **Streaming** | No (buffer all) | Yes (chunk by chunk) |
| **Memory** | Entire output in RAM | Bounded pipe buffer (4-64KB) |
| **Backpressure** | No | Yes (writer blocks when full) |
| **Use Cases** | Works for bounded output | Works for infinite streams |

### Implications

**Works Fine For:**
```bash
cat file.txt | grep error      # File is bounded
ls | wc -l                      # Directory listing is bounded
echo "test" | tr a-z A-Z       # Small input
```

**Doesn't Work For:**
```bash
tail -f log.txt | grep error   # Infinite stream - would hang
yes | head -10                 # Infinite input - would hang
```

### Why We Don't Have True Pipes

**Requirements for true pipes:**
1. File descriptor pairs from `pipe()` syscall
2. Circular buffer for inter-process communication
3. Concurrent process execution (not just background)
4. Blocking read/write with backpressure
5. Signal handling when pipe breaks (SIGPIPE)

**Complexity:** 🟡 **Medium-High** - Would require significant refactoring of process execution model.

**Current Approach:**
- ✅ Simple to implement
- ✅ Works for 90% of use cases
- ✅ No process coordination complexity
- ❌ Not suitable for streaming/infinite data
- ❌ Memory inefficient for large outputs

**Recommendation:** Current approach is pragmatic. Only implement true pipes if streaming use cases become important.

---

## Question 5: Wouldn't file watching be easy?

### Answer: Yes! This Is Actually Straightforward

**Difficulty:** 🟢 **Easy** (1-2 days of work)

### Why It's Easy

Since **all file operations go through the kernel VFS**, we can intercept every mutation and notify watchers.

### Implementation Approach

```javascript
class VFS {
  constructor() {
    this.watchers = new Map();  // watchId → {path, callback, glob}
    this.watchIdCounter = 0;
  }

  // Public API
  watch(path, callback, options = {}) {
    const watchId = `watch_${this.watchIdCounter++}`;

    this.watchers.set(watchId, {
      path,
      callback,
      glob: options.glob || false,  // Support glob patterns
      recursive: options.recursive || false
    });

    return watchId;
  }

  unwatch(watchId) {
    return this.watchers.delete(watchId);
  }

  // Internal notification
  async _notifyWatchers(path, event) {
    for (const [watchId, watcher] of this.watchers) {
      if (this._pathMatches(path, watcher.path, watcher)) {
        // Call watcher callback (wrapped in try/catch to prevent errors)
        try {
          await watcher.callback(event, path);
        } catch (error) {
          console.error(`[VFS] Watcher ${watchId} error:`, error);
        }
      }
    }
  }

  _pathMatches(filePath, watchPath, watcher) {
    if (watcher.glob) {
      // Use glob matching library
      return minimatch(filePath, watchPath);
    }

    if (watcher.recursive) {
      // Match path and all descendants
      return filePath === watchPath || filePath.startsWith(watchPath + '/');
    }

    // Exact match
    return filePath === watchPath;
  }

  // Intercept mutations
  async writeFile(path, content) {
    const isNew = !(await this.exists(path));

    // ... actual write logic ...

    // Notify watchers
    await this._notifyWatchers(path, isNew ? 'create' : 'modify');
  }

  async unlink(path) {
    // ... actual delete logic ...

    await this._notifyWatchers(path, 'delete');
  }

  async rename(oldPath, newPath) {
    // ... actual rename logic ...

    await this._notifyWatchers(oldPath, 'delete');
    await this._notifyWatchers(newPath, 'create');
  }

  async mkdir(path) {
    // ... actual mkdir logic ...

    await this._notifyWatchers(path, 'create');
  }
}
```

### Usage Examples

```javascript
// Watch a specific file
const watchId = await kernel.watch('/home/config.json', (event, path) => {
  console.log(`${path} was ${event}`);
  if (event === 'modify') {
    // Reload config
  }
});

// Watch a directory with glob
await kernel.watch('/home/*.txt', (event, path) => {
  console.log(`Text file ${event}: ${path}`);
}, { glob: true });

// Watch recursively
await kernel.watch('/home/projects', (event, path) => {
  console.log(`Project file ${event}: ${path}`);
}, { recursive: true });

// Stop watching
await kernel.unwatch(watchId);
```

### Use Cases Enabled

1. **Live Reload**
   ```javascript
   await kernel.watch('/home/app.js', () => {
     console.log('App changed, reloading...');
     window.location.reload();
   });
   ```

2. **Auto-Save Sync**
   ```javascript
   await kernel.watch('/home/documents', async (event, path) => {
     if (event === 'modify') {
       await syncToCloud(path);
     }
   }, { recursive: true });
   ```

3. **Build System**
   ```javascript
   await kernel.watch('/home/src', async () => {
     await shell.execute('make build');
   }, { recursive: true });
   ```

4. **File Explorer UI**
   ```javascript
   await kernel.watch('/home', (event, path) => {
     updateFileListView();
   }, { recursive: true });
   ```

### Challenges

**1. Cross-Tab Synchronization**
- IndexedDB changes in one tab don't notify other tabs
- Would need BroadcastChannel or SharedWorker to sync watchers across tabs

**2. Performance**
- Many rapid file changes could trigger watcher storm
- Need debouncing/throttling mechanism

**3. Watcher Cleanup**
- Must clean up watchers when shell/process terminates
- Memory leak if watchers accumulate

### Implementation Checklist

- [ ] Add `watchers` Map to VFS class
- [ ] Implement `watch()` and `unwatch()` syscalls
- [ ] Add `_notifyWatchers()` helper
- [ ] Intercept all mutation methods: `writeFile`, `unlink`, `rename`, `mkdir`
- [ ] Add glob pattern matching (use `minimatch` library)
- [ ] Add recursive watch support
- [ ] Implement debouncing for rapid changes
- [ ] Expose in KomaKernel class
- [ ] Add to KERNEL_API.md
- [ ] Write tests

**Estimated Time:** 1-2 days

**Recommendation:** Implement this soon! It's low-hanging fruit with high value for developer experience.

---

## Summary Table

| Syscall/Feature | Current State | Difficulty | Priority | Recommendation |
|----------------|---------------|------------|----------|----------------|
| **getcwd/chdir** | Client-side (`shell.cwd`) | 🟢 Easy | 🔵 Low | Keep as-is |
| **File Descriptors** | Not implemented | 🟡 Medium | 🟡 Medium | Wait for use case |
| **Pipes** | Buffered sequential | 🟡 Medium | 🔵 Low | Keep as-is |
| **Symlinks** | Not implemented | 🟡 Medium | 🟢 High | Consider implementing |
| **Hard Links** | Not implemented | 🔴 Hard | 🔵 Low | Don't implement yet |
| **File Watching** | Not implemented | 🟢 Easy | 🟢 High | **Implement next!** |

---

## Recommendations

### Immediate Next Steps
1. ✅ Complete documentation (this document)
2. 🎯 **Implement file watching** - Easy win, high value
3. Add validation tests for edge cases

### Future Considerations
1. **Symlinks** - If user demand emerges
2. **Mount System** - Enables extensibility (KMT archives, virtual filesystems)
3. **File Descriptors** - Only if large file use cases appear
4. **Hard Links** - Only if inode refactor is needed for other reasons

### Don't Implement
- Kernel-managed working directory (client-side works fine)
- True streaming pipes (current approach is pragmatic)
- Hard links (too much complexity for questionable value)

---

*Investigation Date: 2025-11-11*
*Investigators: Development Team*
*See also: `VFS_ARCHITECTURE.md`, `KERNEL_API.md`, `MISSING_SYSCALLS.md`*
