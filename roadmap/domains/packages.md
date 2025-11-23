# Package Management

**Domain**: `#packages`
**Related Domains**: `#network`, `#vfs`, `#kernel`

## Overview

Package management system for KOMA with two complementary approaches: Provenance for npm packages via CDN, and Koma Registry for curated packages (games, tools, utilities).

## Features by Maturity

### 🧪 Prototype

### Provenance Package Manager
**Tags**: `#packages` `#prototype` `#medium` `#npm`
**Status**: Planned for Phase 7 (NEXT UP!)
**Phase**: 7
**Dependencies**: CDN integration, VFS, import map manipulation
**Blocks**: NPM package usage in scripts

**Planned Commands**:
- `provenance install <package>` - Install npm package from CDN
- `provenance remove <package>` - Remove package
- `provenance list` - List installed packages
- `provenance update` - Check for package updates
- `provenance upgrade [package]` - Apply package updates
- `provenance trace <package>` - Show package origin and dependencies
- Aliases: `install`, `uninstall` as shortcuts

**Planned Features**:
- Fetch npm packages from ESM CDNs (esm.sh, unpkg, jspm)
- Cache in VFS (`/usr/lib/node_modules/`)
- Package metadata storage (version, CDN URL, dependencies)
- Import map manipulation (dynamic or page injection)
- Version pinning
- Dependency resolution (basic)
- Offline reuse of cached packages

**CDN Strategy**:
1. **esm.sh** (recommended) - Smart transpilation, auto-deps
2. **unpkg** (fallback) - Official npm CDN
3. **jspm** (future) - Advanced dependency resolution

**Target Packages**:
- Pure ESM libraries (lodash-es, date-fns, nanoid, zod)
- Data transformation (js-yaml, papaparse, marked)
- Math/utilities (big.js, decimal.js)
- Validation (zod, joi)

**Open Questions**:
- How to handle Node-specific packages? (fail gracefully, or provide shims?)
- Shims for incompatible modules? (process, buffer, etc.)
- Allowlist vs full npm support? (start open, warn on incompatibility)
- Update strategy for packages? (manual only, or auto-check?)

**Files**: Future `src/packages/provenance.js`, `src/commands/packages.js`

### Koma Registry
**Tags**: `#packages` `#prototype` `#medium` `#registry`
**Status**: Planned for Phase 8
**Phase**: 8
**Dependencies**: GitHub-based registry, VFS
**Blocks**: Curated KOMA package ecosystem

**Planned Commands**:
- `koma install <package>` - Install from Koma registry
- `koma list` - List installed Koma packages
- `koma remove <package>` - Remove Koma package
- `koma search <query>` - Search registry
- `koma info <package>` - Show package info

**Planned Features**:
- GitHub-based package registry (koma-registry repo)
- Package manifest system (metadata, versions, dependencies)
- Install scripts and tools to `/usr/share/koma/`
- Category-based browsing
- User reviews and ratings (future)

**Registry Packages** (curated, official):
- **Games**:
  - snake - Classic snake game
  - 2048 - 2048 puzzle game
  - colossal-cave-adventure - Text adventure
  - nethack - Roguelike dungeon crawler
- **Editor Extensions**:
  - vim-mode - Vim keybindings for vein
  - themes - Additional color themes
  - syntax-highlight - Syntax highlighting bundles
- **Development Tools**:
  - git-utils - Git helpers for VFS
  - lint - JavaScript linter
  - http-server - Simple HTTP server script
  - prettier - Code formatter
- **Utilities**:
  - backup-scheduler - Enhanced backup automation
  - sync-tools - Cloud sync utilities
  - crypto-tools - Encryption/decryption helpers
  - passgen - Password generator

**Open Questions**:
- Package approval process for registry?
- Sandboxing for registry packages?
- Support for multi-file packages?
- Package signing for security?

### Import Map Manipulation
**Tags**: `#packages` `#prototype` `#critical` `#infrastructure`
**Status**: Planned for Phase 7
**Phase**: 7
**Dependencies**: DOM access from kernel (or page injection)
**Blocks**: Dynamic package loading

**Approaches**:

**Option 1: Page Reload with Updated Import Map**
- Modify import map in index.html
- Reload page to apply changes
- Simple, reliable
- Requires page reload (disruptive)

**Option 2: Dynamic Import Map Injection**
- Inject new `<script type="importmap">` tags
- No page reload required
- More complex
- May have browser support issues

**Option 3: Module Namespace Injection**
- Load modules via dynamic `import()`
- Register in global namespace
- No import map changes
- Requires module wrapper

**Likely Choice**: Start with Option 1 (page reload), explore Option 2/3 later

### Package Metadata Storage
**Tags**: `#packages` `#prototype` `#high` `#data`
**Status**: Planned for Phase 7
**Phase**: 7
**Dependencies**: VFS
**Blocks**: Package management operations

**Planned Storage**:
- `/etc/koma-packages.json` - Installed package registry
- `/usr/lib/node_modules/<package>/package.json` - npm package metadata
- `/usr/share/koma/<package>/manifest.json` - Koma package metadata

**Metadata Fields**:
```json
{
  "name": "package-name",
  "version": "1.0.0",
  "description": "Package description",
  "cdn": "https://esm.sh/package-name@1.0.0",
  "dependencies": {},
  "installedAt": 1699999999999,
  "source": "provenance" | "koma-registry"
}
```

### Dependency Resolution
**Tags**: `#packages` `#prototype` `#medium` `#complexity`
**Status**: Planned for Phase 7
**Phase**: 7
**Dependencies**: Package metadata
**Blocks**: Transitive dependency installation

**Planned Strategy**:
- **Basic** (Phase 7): Flat dependency installation (no deep resolution)
- **Intermediate** (Phase 8): Recursive dependency fetching
- **Advanced** (Phase 10+): Conflict resolution, peer dependencies

**Challenges**:
- CDNs handle some dependency resolution (esm.sh)
- Version conflicts (multiple packages requiring different versions)
- Circular dependencies
- Storage limitations (IndexedDB quotas)

### Package Versioning
**Tags**: `#packages` `#prototype` `#high` `#versioning`
**Status**: Planned for Phase 7
**Phase**: 7
**Dependencies**: Package metadata
**Blocks**: Package updates

**Planned Features**:
- Semantic versioning support (^1.0.0, ~1.0.0, exact)
- `provenance install package@version` - Install specific version
- `provenance update` - Check for newer versions
- `provenance upgrade` - Install newer versions
- Lock file? (or just metadata.json)

### Offline Package Cache
**Tags**: `#packages` `#prototype` `#high` `#offline`
**Status**: Planned for Phase 7
**Phase**: 7
**Dependencies**: VFS, package download
**Blocks**: Offline package usage

**Planned**:
- Cache downloaded packages in VFS
- Serve from cache when offline
- Cache invalidation strategies
- Storage quota management
- Fallback to CDN if cache miss

## Architecture

### Provenance Package Flow

```
User: provenance install lodash-es
  ↓
[Fetch metadata from esm.sh]
  ↓
[Download package code]
  ↓
[Cache in /usr/lib/node_modules/lodash-es/]
  ↓
[Update import map or inject module]
  ↓
[Save metadata to /etc/koma-packages.json]
  ↓
Package available for import
```

### Koma Registry Package Flow

```
User: koma install snake
  ↓
[Fetch package from koma-registry repo]
  ↓
[Download package files (script, assets)]
  ↓
[Install to /usr/share/koma/snake/]
  ↓
[Run install script if present]
  ↓
[Update metadata]
  ↓
snake command available
```

### Import Map Structure

```html
<script type="importmap">
{
  "imports": {
    "lodash-es": "https://esm.sh/lodash-es@4.17.21",
    "date-fns": "/usr/lib/node_modules/date-fns/index.js"
  }
}
</script>
```

## Related Files

**Future Source**:
- `src/packages/provenance.js` - Provenance package manager (~500 lines)
- `src/packages/koma-registry.js` - Koma registry client (~300 lines)
- `src/commands/packages.js` - Package commands (~400 lines)

**Future Documentation**:
- `docs/PACKAGE_MANAGEMENT.md` - Package management guide
- `docs/man/packages/provenance.1.md` - provenance command man page
- `docs/man/packages/koma-install.1.md` - koma install command man page

**Future Tests**:
- `tests/integration/packages/provenance.test.js`
- `tests/integration/packages/koma-registry.test.js`

## Next Steps

**Immediate** (Phase 7 - NEXT UP!):
1. Design package metadata schema
2. Implement basic CDN fetching (esm.sh)
3. Implement VFS caching
4. Create provenance command with install/list/remove
5. Implement import map manipulation (page reload approach)
6. Test with simple packages (lodash-es, date-fns)

**Short-term** (Phase 7 Extended):
- Add version pinning
- Implement dependency resolution (basic)
- Add provenance update/upgrade
- Add provenance trace for debugging

**Medium-term** (Phase 8):
- Create koma-registry GitHub repo
- Implement koma install/list/remove
- Curate initial package set (games, tools)
- Set up package approval process

**Long-term** (Phase 10+):
- Advanced dependency resolution
- Package signing and verification
- Community package submissions
- Package sandboxing

## Notes

**Why Two Package Managers?**
- **Provenance**: Access to entire npm ecosystem (data libraries, utilities)
- **Koma Registry**: Curated, vetted, KOMA-specific packages (games, tools, extensions)
- Different use cases, complementary approaches

**Package Naming**:
- **Provenance**: From "provenance" (origin, source) - emphasizes CDN origin tracking
- **Koma Registry**: Official KOMA packages, curated and maintained

**CDN vs VFS**:
- **CDN**: Fetch from network, fast but requires connection
- **VFS Cache**: Store in IndexedDB, offline-capable but uses storage quota
- **Strategy**: Cache in VFS, serve from cache, fallback to CDN

**Node.js Compatibility**:
- Only pure ESM packages will work reliably
- Node-specific APIs (fs, process, etc.) won't work without shims
- Focus on browser-compatible packages
- Provide polyfills for common Node APIs (future)

**Security Considerations**:
- CDN packages are untrusted (user must trust npm ecosystem)
- Koma Registry packages are vetted (manual review)
- Consider sandboxing (future)
- Package signatures for integrity (future)

**Storage Quotas**:
- Typical: ~50MB without prompting
- Can request more via Storage API
- Need quota management (warn user, auto-cleanup)
- Prioritize small, essential packages

---

**Last Updated**: 2025-11-16
**Maturity**: Prototype (0%) - **NEXT FOCUS!**
**Priority**: Medium
