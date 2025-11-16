# Mount System Architecture Proposal

**Status:** Approved for Implementation
**Created:** 2025-11-11
**Target Version:** 0.6.0

## Summary

Refactor the VFS to use a mount-based architecture where all filesystems (including the root) are mounted at specific paths. This enables:

- Clean separation between kernel and storage
- Pluggable filesystem implementations
- Device files (`/dev`)
- Future: PeerFS, ProcFS, FUSE-like userspace filesystems

## Current State

```
olivine.js (~3000 lines)
└── VFS class (filesystem logic tightly coupled to kernel)
```

All file operations go through a monolithic VFS class that only supports IndexedDB storage.

## Proposed Architecture

```
olivine.js (~1500 lines)
├── MountManager (path resolution)
└── KomaKernel (orchestration)

filesystems/
├── interface.js (base class)
├── indexeddb-fs.js (extracted VFS → IndexedDB impl)
├── device-fs.js (/dev/null, /dev/random, etc.)
└── memory-fs.js (future: tmpfs)
```

### Boot Sequence

```javascript
// Kernel initialization
await kernel.mount(new IndexedDBFilesystem(), '/');
await kernel.mount(new DeviceFilesystem(), '/dev');
await kernel.mount(new MemoryFilesystem(), '/tmp');
```

## Implementation Plan

### Phase 1: Foundation (This PR)

**Tasks:**
1. ✅ Create `FilesystemInterface` base class
2. ⏳ Extract VFS → `IndexedDBFilesystem`
3. ⏳ Create `MountManager`
4. ⏳ Create `DeviceFilesystem` with basic devices
5. ⏳ Update `KomaKernel` to delegate to mounts
6. ⏳ Add `mount()`/`umount()` commands
7. ⏳ Comprehensive tests

**Basic Devices (Phase 1):**
- `/dev/null` - Discard writes, return EOF on reads
- `/dev/zero` - Infinite null bytes
- `/dev/random` - Cryptographically random data
- `/dev/clipboard` - Browser clipboard access

**Estimated Effort:** 1-2 days

### Phase 2: Advanced Devices

**Additional Devices:**
- `/dev/screen` - Display control (brightness, contrast, filters, screensaver)
  - Write: `echo "brightness:0.5" > /dev/screen`, `echo "screensaver:start" > /dev/screen`
  - Read: `cat /dev/screen` returns current display state
- `/dev/leds` - Status LED control
  - Write: `echo "S:on" > /dev/leds`, `echo "D:blink" > /dev/leds`, `echo "U:red" > /dev/leds`
  - Read: `cat /dev/leds` returns current LED states
  - Controls: S (System), D (Disk), N (Network), U (User-programmable)
- `/dev/gamepad0`, `/dev/gamepad1` - Gamepad API
- `/dev/localstorage` - JSON access to localStorage
- `/dev/keyboard`, `/dev/mouse` - Input devices

**Estimated Effort:** 1-2 days

### Phase 3: Specialized Filesystems

- `MemoryFilesystem` for `/tmp` (fast, cleared on refresh)
- `ProcFilesystem` for `/proc` (virtual process info)
- `HttpFilesystem` for read-only HTTP mounts

**Estimated Effort:** 2-3 days

### Phase 4: Distributed & FUSE

- `PeerFilesystem` - WebRTC-based file sharing
- `FUSEFilesystem` - User-space filesystem scripts

**Estimated Effort:** 1 week

## File Structure

### `src/filesystems/interface.js`

```javascript
export class FilesystemInterface {
  async readFile(path) {}
  async writeFile(path, content) {}
  async readdir(path) {}
  async stat(path) {}
  async exists(path) {}  // Default impl
  async mkdir(path) {}
  async unlink(path) {}
  async unlinkRecursive(path) {}  // Default impl
  async rename(oldPath, newPath) {}
  async copyFile(srcPath, destPath) {}  // Default impl
  async move(srcPath, destPath) {}  // Default impl

  get capabilities() {
    return {
      readable: true,
      writable: false,
      seekable: false,
      watchable: false
    };
  }

  get name() {
    return this.constructor.name;
  }
}
```

### `src/filesystems/indexeddb-fs.js`

Extract current VFS class, make it extend `FilesystemInterface`.

```javascript
import { FilesystemInterface, createVFSError } from './interface.js';

export class IndexedDBFilesystem extends FilesystemInterface {
  constructor(options = {}) {
    super();
    this.dbName = options.database || 'KomaVFS';
    this.db = null;
    this.ready = this.initialize();
  }

  // All current VFS methods moved here
  async readFile(path) { ... }
  async writeFile(path, content) { ... }
  // etc.

  get capabilities() {
    return {
      readable: true,
      writable: true,
      seekable: false,
      watchable: true
    };
  }
}
```

### `src/filesystems/device-fs.js`

```javascript
import { FilesystemInterface, createVFSError } from './interface.js';

export class DeviceFilesystem extends FilesystemInterface {
  constructor(options = {}) {
    super();
    this.devices = this.createDevices();
  }

  createDevices() {
    return {
      'null': new NullDevice(),
      'zero': new ZeroDevice(),
      'random': new RandomDevice(),
      'clipboard': new ClipboardDevice(),
    };
  }

  async readFile(path) {
    const deviceName = path.slice(1);  // Remove leading /
    const device = this.devices[deviceName];

    if (!device) {
      throw createVFSError('ENOENT', 'no such device', path);
    }

    return device.read();
  }

  async writeFile(path, content) {
    const deviceName = path.slice(1);
    const device = this.devices[deviceName];

    if (!device) {
      throw createVFSError('ENOENT', 'no such device', path);
    }

    return device.write(content);
  }

  async readdir(path) {
    if (path !== '/') {
      throw createVFSError('ENOTDIR', 'not a directory', path);
    }
    return Object.keys(this.devices);
  }

  async stat(path) {
    if (path === '/') {
      return { type: 'directory', size: 0, modified: Date.now(), created: Date.now() };
    }

    const deviceName = path.slice(1);
    if (!(deviceName in this.devices)) {
      throw createVFSError('ENOENT', 'no such device', path);
    }

    return { type: 'file', size: 0, modified: Date.now(), created: Date.now() };
  }

  get capabilities() {
    return {
      readable: true,
      writable: true,
      seekable: false,
      watchable: false
    };
  }
}

// Device implementations
class NullDevice {
  async read() { return ''; }
  async write(content) { /* discard */ }
}

class ZeroDevice {
  async read(length = 1024) { return '\0'.repeat(length); }
  async write(content) { throw createVFSError('EROFS', 'read-only device', '/dev/zero'); }
}

class RandomDevice {
  async read(length = 1024) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  }
  async write(content) { throw createVFSError('EROFS', 'read-only device', '/dev/random'); }
}

class ClipboardDevice {
  async read() {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not available');
    }
    return await navigator.clipboard.readText();
  }

  async write(content) {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not available');
    }
    await navigator.clipboard.writeText(content);
  }
}
```

### `src/kernel/mount-manager.js`

```javascript
export class MountManager {
  constructor() {
    this.mounts = new Map();  // mountPath → { fs, options, mounted }
  }

  async mount(filesystem, path, options = {}) {
    path = this.normalizePath(path);

    if (this.mounts.has(path)) {
      throw new Error(`Path ${path} is already mounted`);
    }

    if (!this.isValidFilesystem(filesystem)) {
      throw new Error('Filesystem must implement FilesystemInterface');
    }

    this.mounts.set(path, {
      fs: filesystem,
      options,
      mounted: Date.now()
    });

    console.log(`[MountManager] Mounted ${filesystem.name} at ${path}`);
  }

  async unmount(path) {
    path = this.normalizePath(path);

    if (path === '/') {
      throw new Error('Cannot unmount root filesystem');
    }

    return this.mounts.delete(path);
  }

  resolve(path) {
    // Sort mounts by path length (longest match first)
    const sortedMounts = Array.from(this.mounts.entries())
      .sort(([a], [b]) => b.length - a.length);

    // Find best match
    for (const [mountPath, mount] of sortedMounts) {
      if (path === mountPath) {
        return { mount: mount.fs, relativePath: '/', mountPath };
      }

      if (path.startsWith(mountPath + '/')) {
        const relativePath = path.slice(mountPath.length);
        return { mount: mount.fs, relativePath, mountPath };
      }
    }

    throw new Error(`No filesystem mounted at ${path}`);
  }

  list() {
    return Array.from(this.mounts.entries()).map(([path, mount]) => ({
      path,
      type: mount.fs.name,
      writable: mount.fs.capabilities.writable,
      options: mount.options,
      mounted: mount.mounted
    }));
  }

  isValidFilesystem(fs) {
    const required = ['readFile', 'writeFile', 'stat', 'readdir', 'mkdir', 'unlink'];
    return required.every(method => typeof fs[method] === 'function');
  }

  normalizePath(path) {
    if (!path.startsWith('/')) path = '/' + path;
    if (path.endsWith('/') && path !== '/') path = path.slice(0, -1);
    return path;
  }
}
```

### Updated `src/kernel/olivine.js`

```javascript
import { MountManager } from './mount-manager.js';
import { IndexedDBFilesystem } from '../filesystems/indexeddb-fs.js';
import { DeviceFilesystem } from '../filesystems/device-fs.js';

class KomaKernel {
  constructor() {
    this.mountManager = new MountManager();
    this.processManager = new ProcessManager(this);
    this.scheduler = new Scheduler(this);
    this.ready = this.initialize();
  }

  async initialize() {
    console.log('[Kernel] Initializing...');

    // Mount root filesystem
    const rootFS = new IndexedDBFilesystem({ database: 'KomaVFS' });
    await rootFS.ready;
    await this.mountManager.mount(rootFS, '/');

    // Ensure essential directories
    await this.ensureDirectory('/dev');
    await this.ensureDirectory('/tmp');

    // Mount /dev
    const devFS = new DeviceFilesystem();
    await this.mountManager.mount(devFS, '/dev');

    console.log('[Kernel] Ready');
  }

  // All VFS methods delegate to mount manager
  async readFile(path) {
    await this.ready;
    const { mount, relativePath } = this.mountManager.resolve(path);
    return mount.readFile(relativePath);
  }

  async writeFile(path, content) {
    await this.ready;
    const { mount, relativePath } = this.mountManager.resolve(path);

    if (!mount.capabilities.writable) {
      throw createVFSError('EROFS', 'read-only filesystem', path);
    }

    return mount.writeFile(relativePath, content);
  }

  // ... all other VFS methods follow same pattern

  // New syscalls
  async mount(type, path, options) {
    await this.ready;

    let filesystem;
    switch (type) {
      case 'indexeddb':
        filesystem = new IndexedDBFilesystem(options);
        await filesystem.ready;
        break;
      case 'devfs':
        filesystem = new DeviceFilesystem(options);
        break;
      default:
        throw new Error(`Unknown filesystem type: ${type}`);
    }

    await this.mountManager.mount(filesystem, path, options);
  }

  async unmount(path) {
    await this.ready;
    return this.mountManager.unmount(path);
  }

  async listMounts() {
    await this.ready;
    return this.mountManager.list();
  }
}
```

## Testing Strategy

### Unit Tests

- `tests/unit/filesystems/interface.test.js` - Interface contract
- `tests/unit/filesystems/device-fs.test.js` - Device filesystem
- `tests/unit/kernel/mount-manager.test.js` - Mount resolution

### Integration Tests

- `tests/integration/kernel/mount-system.test.js` - Full mount/unmount cycle
- `tests/integration/filesystems/indexeddb-fs.test.js` - Extracted VFS still works
- `tests/integration/commands/mount.test.js` - Mount command

### Backwards Compatibility Tests

Run ALL existing VFS tests to ensure extraction didn't break anything.

## Migration Strategy

1. **Create new files** without modifying existing code
2. **Add mount manager** alongside existing VFS
3. **Test mount system** independently
4. **Gradually migrate** kernel methods to use mount manager
5. **Keep old VFS** until all tests pass
6. **Remove old VFS** code once migration complete

## Benefits

### Immediate

- ✅ `/dev` devices (null, random, clipboard)
- ✅ Cleaner architecture (separation of concerns)
- ✅ Easier to test (filesystems isolated)

### Near-term

- Mount memory filesystem at `/tmp`
- Mount process info at `/proc`
- Mount KMT archives without extraction

### Long-term

- Distributed filesystems (PeerFS)
- FUSE-like user-space filesystems
- Cloud storage mounts

## Risks & Mitigation

**Risk:** Breaking existing VFS functionality
**Mitigation:** Comprehensive backwards compatibility tests, incremental migration

**Risk:** Performance regression from mount resolution
**Mitigation:** Benchmark before/after, optimize hot paths

**Risk:** Complexity increase
**Mitigation:** Clear interfaces, good documentation, isolated components

## Success Criteria

- ✅ All existing VFS tests pass
- ✅ New mount tests pass
- ✅ Can mount `/dev` and use devices
- ✅ mount/unmount commands work
- ✅ No performance regression

## References

- `docs/VFS_ARCHITECTURE.md` - Current VFS analysis
- `docs/SYSCALL_FINDINGS.md` - Investigation findings
- `docs/KERNEL_API.md` - Kernel API documentation

---

*Ready for implementation: 2025-11-11*
