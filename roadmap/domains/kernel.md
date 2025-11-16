# Kernel

**Domain**: `#kernel`
**Related Domains**: `#vfs`, `#processes`, `#boot`

## Overview

Olivine - the web worker kernel that provides OS-layer functionality. Replaces the original Service Worker architecture with a persistent, stable kernel that never randomly dies.

## Features by Maturity

### ✅ Production

#### Olivine Web Worker Kernel
**Tags**: `#kernel` `#production` `#critical` `#core-system`
**Status**: Stable, production-ready architecture
**Phase**: 3-4 (Service Worker → Olivine migration)
**Dependencies**: Web Workers API support
**Blocks**: All VFS operations, process execution, system functionality

**Key Features**:
- Web Worker-based kernel (persists with page lifecycle)
- Never randomly terminates (unlike Service Workers that die after ~30s idle)
- Clean separation: VFS, Process, Scheduler layers
- Modular architecture ready for extensions

**Why Olivine?**
- Service Workers are ephemeral (browser terminates after idle)
- Eliminated random hangs and timeouts
- `restart` command works without page reload
- Named after olivine mineral (komatiite's primary component)

**Files**: `src/kernel/olivine.js` (~800 lines)

#### Comlink RPC Bridge
**Tags**: `#kernel` `#production` `#high` `#rpc`
**Status**: Stable bidirectional communication
**Phase**: 3
**Dependencies**: Comlink library (CDN)
**Blocks**: UI ↔ kernel communication

**Features**:
- Bidirectional RPC between UI and Olivine worker
- Exposes kernel APIs to shell
- Auto-reload on first install
- Handles async operations seamlessly
- Type-safe function calls across worker boundary

**Files**: `src/kernel/client.js` (~200 lines)

#### Kernel API
**Tags**: `#kernel` `#production` `#critical` `#api`
**Status**: Complete API surface for shell operations
**Phase**: 3-6
**Dependencies**: VFS, Process Manager
**Blocks**: All shell commands

**Exposed Methods**:
- **VFS operations**: read, write, mkdir, rm, cp, mv, ls, stat, find
- **Process management**: run, ps, kill, getExitCode
- **Scheduler**: cron, cronlist, cronrm
- **System**: getSystemInfo, checkSystemUpdate, upgradeSystem, resetSystem
- **Health**: getVFSHealth, performHealthCheck

**Files**: `src/kernel/olivine.js` (exports via Comlink)

#### Standard Library Initialization
**Tags**: `#kernel` `#production` `#high` `#stdlib`
**Status**: Dynamic module loading for scripts
**Phase**: 5
**Dependencies**: ES module support
**Blocks**: Script execution with stdlib access

**Features**:
- Dynamic imports of stdlib modules
- Modules available to scripts: fs, http, notify, path, argparse, console, env
- Modular and maintainable architecture
- No bundling required

**Files**: `src/kernel/olivine.js` (stdlib initialization)

### 🔧 Working

None - kernel is feature-complete and stable!

### 🧪 Prototype

#### Kernel Modules System
**Tags**: `#kernel` `#prototype` `#medium` `#extensibility`
**Status**: Planned for Phase 7+
**Phase**: Future
**Dependencies**: Package management
**Blocks**: Third-party kernel extensions

**Planned**:
- Plugin system for kernel extensions
- Register custom syscalls
- Add new stdlib modules at runtime
- Sandboxing for untrusted modules

## Architecture

### Kernel Layers

```
┌─────────────────────────────────────┐
│         UI (Terminal/Editor)        │
└──────────────┬──────────────────────┘
               │ Comlink RPC
┌──────────────▼──────────────────────┐
│       Olivine Kernel (Worker)       │
│  ┌───────────────────────────────┐  │
│  │     VFS Layer (IndexedDB)     │  │
│  ├───────────────────────────────┤  │
│  │   Process Manager (Async)     │  │
│  ├───────────────────────────────┤  │
│  │   Scheduler (Cron)            │  │
│  ├───────────────────────────────┤  │
│  │   Stdlib (Dynamic Imports)    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Kernel Lifecycle

1. **Initialization** (Boot Stage 2):
   - Create Olivine worker
   - Initialize VFS
   - Set up Comlink proxy
   - Verify health with read/write test

2. **Runtime**:
   - Handle RPC calls from UI
   - Execute processes in worker context
   - Manage cron scheduler
   - Persist state to IndexedDB

3. **Shutdown**:
   - Clean up active processes
   - Flush pending VFS operations
   - Terminate worker gracefully

## Related Files

**Source**:
- `src/kernel/olivine.js` - Main kernel implementation (~800 lines)
- `src/kernel/client.js` - Comlink RPC client (~200 lines)

**Documentation**:
- `docs/KERNEL_API.md` - Complete API reference
- `design/BOOT_SYSTEM.md` - Kernel initialization process

**Tests**:
- `tests/integration/kernel/api-validation.test.js` - Kernel API tests

## Next Steps

**Short-term** (Phase 7):
- Enhance kernel API for package management
- Add module registration system

**Long-term** (Phase 10+):
- Plugin architecture for extensibility
- Custom syscall registration
- Enhanced security/sandboxing

## Notes

**Service Worker → Olivine Migration**:
- Original architecture used Service Workers (Phase 3)
- Migrated to Web Workers in Phase 4 for stability
- Service Workers are ephemeral (browser kills them)
- Web Workers persist with page lifecycle
- Massive improvement in reliability

**Naming**: Olivine is the primary mineral in komatiite ultramafic rocks, continuing the geological theme.

---

**Last Updated**: 2025-11-16
**Maturity**: Production
**Priority**: Critical
