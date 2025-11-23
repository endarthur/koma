# Missing Unix System Calls - Gap Analysis

This document identifies standard Unix system calls that Koma doesn't currently implement, with priority ratings for future development.

## Current State
See `KERNEL_API.md` for implemented APIs.

**Related Documentation:**
- `VFS_ARCHITECTURE.md` - Technical deep dive into current VFS implementation
- `SYSCALL_FINDINGS.md` - Investigation findings on how things actually work

---

## HIGH PRIORITY - Critical for Shell Usability

### 1. Working Directory Operations ✅ IMPLEMENTED (Client-Side)

**Status:** Implemented via client-side emulation in `shell.cwd`

**Missing Kernel Syscalls:**
- `chdir(path)` - Change current working directory
- `getcwd()` - Get current working directory
- `realpath(path)` - Resolve absolute path

**How It Actually Works:**
- Each shell maintains `shell.cwd` property (client-side state)
- `cd` command updates `shell.cwd` after validating with `kernel.stat()`
- All relative paths resolved client-side via `resolvePath()` before kernel calls
- Kernel only ever sees absolute paths

**Implementation:** `src/commands/filesystem.js:56-95`, `src/utils/path-utils.js`

**Example:**
```javascript
// User types: cd projects
// Shell does:
const targetPath = resolvePath('projects', shell.cwd, shell.env.HOME);
const stat = await kernel.stat(targetPath);  // Validate
shell.cwd = targetPath;  // Update client state

// Later, user types: cat file.txt
// Shell does:
const absolutePath = resolvePath('file.txt', shell.cwd, shell.env.HOME);
await kernel.readFile(absolutePath);  // Kernel gets absolute path
```

**Trade-offs:**
- ✅ Simple, stateless kernel
- ✅ Each shell has independent working directory
- ✅ No race conditions between shells
- ❌ Spawned scripts don't inherit working directory
- ❌ Cannot change another process's working directory

**Recommendation:** Keep as-is. Current approach works well for single-user shell environment.

---

### 2. Pipes (IPC) ✅ IMPLEMENTED (Buffered)

**Status:** Implemented via buffered sequential execution in Shell.executePipeline()

**Missing Kernel Syscalls:**
- `pipe()` - Create pipe, return read/write file descriptors
- File descriptor-based streaming

**How It Actually Works:**
- Shell executes pipeline stages **sequentially**, not concurrently
- Output from each stage buffered in memory as string
- Buffered output passed as input to next stage
- No streaming, no backpressure, no concurrent execution

**Implementation:** `src/shell.js:332-411`

**Example:**
```javascript
// User types: cat file.txt | grep error | sort
// Shell does:
let stdin = '';

// Stage 1: cat file.txt
await catHandler(['file.txt'], shell, context);
stdin = context.getStdout();  // Buffer full output: "line1\nline2\nerror\n..."

// Stage 2: grep error
await grepHandler(['error'], shell, createPipedContext(shell.term, stdin, shell));
stdin = context.getStdout();  // Buffer filtered output: "error\n..."

// Stage 3: sort
await sortHandler([], shell, createPipedContext(shell.term, stdin, shell));
// Display final output
```

**Trade-offs:**
- ✅ Simple implementation, no process coordination
- ✅ Works for bounded output (files, command results)
- ✅ Familiar pipe syntax works as expected
- ❌ Not true streaming (waits for each stage to complete)
- ❌ Memory inefficient for large outputs
- ❌ Cannot handle infinite streams (`tail -f | grep`)
- ❌ No concurrent execution or backpressure

**True Streaming Pipes Would Require:**
1. File descriptor pairs from `pipe()` syscall
2. Circular buffers for inter-process communication
3. Concurrent process execution
4. Blocking read/write with backpressure handling
5. SIGPIPE signal handling

**Recommendation:** Current approach is pragmatic and works for 90% of use cases. Only implement true streaming pipes if infinite stream processing becomes important.

---

### 3. Symbolic Links

**Missing:**
- `symlink(target, linkpath)` - Create symbolic link
- `readlink(path)` - Read symbolic link target
- `lstat(path)` - Stat the link itself (not the target)

**Why Important:**
- Organize files without duplication
- Create shortcuts/aliases
- Standard Unix feature users expect
- Useful for version management (e.g., `node -> node-v18`)

**Implementation Notes:**
- Would need to extend VFS entry types beyond 'file'/'directory'
- Need link resolution logic
- Watch for circular links

**Example Use:**
```javascript
await kernel.symlink('/usr/bin/python3.11', '/usr/bin/python');
const target = await kernel.readlink('/usr/bin/python');
// Returns: '/usr/bin/python3.11'
```

**Impact:** Common Unix pattern, frequently expected

---

### 4. Partial File I/O (Seeking)

**Missing:**
- `open(path, flags)` - Open file, return file descriptor
- `close(fd)` - Close file descriptor
- `read(fd, buffer, length)` - Read from file descriptor
- `write(fd, buffer)` - Write to file descriptor
- `lseek(fd, offset, whence)` - Seek to position

**Why Important:**
- Current API reads entire files into memory
- Large files (logs, databases) are impractical
- Can't append to files efficiently
- Can't read just the end of a log file

**Implementation Notes:**
- Would need file descriptor abstraction
- Track file position per descriptor
- Support append mode (`O_APPEND`)
- Support read-only/write-only flags

**Example Use:**
```javascript
// Read last 100 lines of log
const fd = await kernel.open('/var/log/system.log', 'r');
const size = (await kernel.stat('/var/log/system.log')).size;
await kernel.lseek(fd, size - 1024, 'SEEK_SET'); // Last 1KB
const tail = await kernel.read(fd, 1024);
await kernel.close(fd);
```

**Impact:** Essential for working with large files

---

## MEDIUM PRIORITY - Nice to Have

### 4. Pipes (IPC)

**Missing:**
- `pipe()` - Create pipe, return read/write file descriptors
- Or simpler: `pipeSpawn()` - Spawn with stdin/stdout piping

**Why Important:**
- Shell pipes are fundamental: `cat file | grep pattern | sort`
- Current implementation can't do true streaming pipes
- Would enable efficient data flow between processes

**Implementation Notes:**
- Could implement as special file descriptors
- Or extend `spawn()` to accept stdin/stdout options
- Memory-based circular buffers

**Example Use:**
```javascript
const [readFd, writeFd] = await kernel.pipe();
await kernel.spawn('grep', ['error'], { stdin: readFd });
await kernel.spawn('cat', ['/var/log/system.log'], { stdout: writeFd });
```

**Impact:** Would make process composition much more powerful

---

### 5. File Watching (inotify-style)

**Missing:**
- `watch(path, callback)` - Watch for file changes
- `unwatch(watchId)` - Stop watching

**Why Important:**
- Live reload during development
- File synchronization tools
- Event-driven programming

**Implementation Notes:**
- Could use IndexedDB's transaction observers
- Notify on write, delete, rename
- Return events: 'create', 'modify', 'delete', 'move'

**Example Use:**
```javascript
const watchId = await kernel.watch('/home/config.json', (event, path) => {
  console.log(`${path} was ${event}`);
});
// Later: await kernel.unwatch(watchId);
```

**Impact:** Enables reactive applications

---

### 6. File Permissions & Ownership

**Missing:**
- `chmod(path, mode)` - Change file permissions
- `chown(path, uid, gid)` - Change owner
- `access(path, mode)` - Check if operation is permitted
- `umask(mask)` - Set default permissions

**Why Important:**
- Security and access control
- Multi-user systems
- Script executability (`chmod +x`)

**Implementation Notes:**
- Would need user/group system
- Could start with simple: owner/world permissions
- Execute bit determines if file is script

**Example Use:**
```javascript
await kernel.chmod('/usr/bin/backup.sh', 0o755); // rwxr-xr-x
const canExecute = await kernel.access('/usr/bin/backup.sh', 'x');
```

**Impact:** Needed for true multi-user system

---

### 7. Hard Links

**Missing:**
- `link(target, linkpath)` - Create hard link
- `unlink()` should only delete when refcount=0

**Why Important:**
- Save space with deduplicated files
- Unix filesystem fundamental
- Different from symlinks (points to inode, not path)

**Implementation Notes:**
- Would need reference counting in VFS
- Track inode-style entries
- When last link removed, delete actual data

**Example Use:**
```javascript
await kernel.link('/home/doc.txt', '/backup/doc.txt');
// Both paths point to same content
// Deleting one doesn't affect the other
```

**Impact:** Nice to have for space efficiency

---

### 8. Directory Functions

**Missing:**
- `mkdirp(path)` - Create directory recursively (like `mkdir -p`)

**Why Important:**
- Current `mkdir()` requires parent to exist
- Very common pattern to need nested directories

**Implementation Notes:**
- Create each level in sequence
- Ignore `EEXIST` errors
- Could be userland helper, but common enough for kernel

**Example Use:**
```javascript
await kernel.mkdirp('/home/projects/myapp/src/components');
// Creates all intermediate directories
```

**Impact:** Convenience feature, reduces boilerplate

---

## LOW PRIORITY - Advanced Features

### 9. File Truncation

**Missing:**
- `truncate(path, length)` - Resize file
- `ftruncate(fd, length)` - Resize via file descriptor

**Why Important:**
- Shrink log files without deleting
- Pre-allocate file space
- Clear file contents (truncate to 0)

**Impact:** Niche use cases

---

### 10. File Metadata

**Missing:**
- `utimes(path, atime, mtime)` - Set access/modification times
- `futimes(fd, atime, mtime)` - Set times via file descriptor

**Why Important:**
- Preserve timestamps when copying
- Touch files (update timestamp)
- Build systems use timestamps

**Impact:** Useful for build tools and backups

---

### 11. Extended Attributes (xattrs)

**Missing:**
- `setxattr(path, name, value)` - Set extended attribute
- `getxattr(path, name)` - Get extended attribute
- `listxattr(path)` - List all attributes

**Why Important:**
- Store metadata without modifying file
- Tag files with custom properties
- Used by backup tools, search tools

**Impact:** Advanced feature, not critical

---

### 12. File Locking

**Missing:**
- `flock(fd, operation)` - Advisory file locking
- `fcntl(fd, cmd, arg)` - File control operations

**Why Important:**
- Coordinate access to shared files
- Prevent concurrent writes
- Database-like applications

**Impact:** Needed for concurrent access patterns

---

### 13. Process Groups & Sessions

**Missing:**
- `setpgid(pid, pgid)` - Set process group
- `getpgid(pid)` - Get process group
- `setsid()` - Create new session

**Why Important:**
- Job control in shells
- Send signals to process groups
- Background jobs

**Impact:** Advanced shell features

---

### 14. Signals (beyond kill)

**Missing:**
- `signal(signum, handler)` - Register signal handler
- `kill(pid, signal)` - Send specific signal (we only have terminate)
- Support for: SIGTERM, SIGHUP, SIGINT, SIGUSR1, SIGUSR2

**Why Important:**
- Graceful shutdown (SIGTERM vs SIGKILL)
- Reload configuration (SIGHUP)
- Custom signaling

**Impact:** Process coordination

---

### 15. Memory Mapping (probably not relevant)

**Missing:**
- `mmap()`, `munmap()`, `mprotect()`

**Why Important:**
- Efficient large file access
- Shared memory IPC

**Impact:** Probably overkill for browser environment

---

### 16. Network Operations (low level)

**Missing:**
- `socket()`, `bind()`, `listen()`, `accept()`, `connect()`
- `send()`, `recv()`, `sendto()`, `recvfrom()`

**Why Important:**
- Low-level network programming
- But browser has `fetch()` and WebSocket already

**Impact:** Browser APIs already cover most use cases

---

## Recommended Implementation Order

Based on impact, feasibility, and actual need:

### Already Implemented (Via Alternative Approaches)
1. ✅ **Working Directory** - Implemented client-side via `shell.cwd`
2. ✅ **Pipes** - Implemented via buffered sequential execution

### High Priority (Implement Next)
3. 🎯 **File Watching (watch/unwatch)** - Easy to implement, high value for dev tools
4. **Symbolic Links (symlink/readlink)** - Common Unix pattern, frequently expected

### Medium Priority (Wait for Use Case)
5. **mkdirp** - Convenience feature, can be userland helper
6. **Partial File I/O (open/close/read/write/lseek)** - Needed for large files (requires file chunking)
7. **Permissions (chmod/umask)** - Security foundation (requires mode tracking)

### Low Priority (Only If Needed)
8. **Hard Links** - Requires inode architecture refactor
9. **File Locking** - Only needed for concurrent access patterns
10. **Extended Signals** - Process coordination (complex, rare use case)
11. **True Streaming Pipes** - Only if infinite streams become important

---

## Browser-Specific Considerations

Some Unix syscalls don't make sense in a browser environment:

- **Memory management** (mmap, brk) - JavaScript handles this
- **Process forking** (fork) - Can't fork processes in browser
- **Device files** (/dev/*) - No direct hardware access
- **Mount operations** - Single VFS in IndexedDB
- **User management** (setuid, setgid) - Single-user browser context
- **TTY operations** (ioctl) - Terminal is DOM-based

---

## Testing Strategy

For each new syscall:

1. Add to `docs/KERNEL_API.md`
2. Implement in `src/kernel/olivine.js`
3. Expose in KomaKernel class
4. Add validation to `tests/integration/kernel/api-validation.test.js`
5. Add functional tests to `tests/integration/kernel/`
6. Update version history

---

*Created: 2025-11-11*
*Last Updated: 2025-11-11 (Updated with investigation findings)*
*See also: `KERNEL_API.md`, `VFS_ARCHITECTURE.md`, `SYSCALL_FINDINGS.md`*
