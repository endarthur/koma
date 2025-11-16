# Network

**Domain**: `#network`
**Related Domains**: `#commands`, `#stdlib`, `#packages`

## Overview

Network operations for HTTP requests, file downloads, and future CDN integration for package management.

## Features by Maturity

### ✅ Production

#### wget Command
**Tags**: `#network` `#production` `#medium` `#download`
**Status**: Basic HTTP download functionality
**Phase**: 5.6
**Dependencies**: Fetch API, VFS
**Blocks**: None

**Usage**:
```bash
wget https://example.com/file.txt              # Download to file.txt
wget https://example.com/file.txt -O output.txt # Download to output.txt
wget https://api.github.com/users/octocat -q    # Quiet mode (no progress)
wget --help                                     # Show help
```

**Features**:
- HTTP/HTTPS downloads
- Saves to VFS
- Automatic filename detection from URL
- Works with public APIs and CORS-enabled resources
- Quiet mode option
- Custom output filename

**Limitations**:
- CORS restrictions (browser fetch limitations)
- No progress bar (quiet or verbose only)
- No resume support
- No authentication (yet)

**Files**: `src/commands/shell.js`, `docs/man/shell/wget.1.md`

#### http Stdlib Module
**Tags**: `#network` `#production` `#high` `#stdlib`
**Status**: Complete fetch wrappers for scripts
**Phase**: 5
**Dependencies**: Fetch API
**Blocks**: HTTP operations in scripts

**Functions**:
- `get(url, options)` - GET request
- `post(url, body, options)` - POST request
- `put(url, body, options)` - PUT request
- `delete(url, options)` - DELETE request
- `json(url, options)` - GET and parse JSON
- `text(url, options)` - GET as text

**Features**:
- Async/await based
- Auto-JSON parsing for `json()`
- Error handling
- CORS-aware

**Files**: `src/stdlib/http.js`

### 🔧 Working

#### Enhanced HTTP Operations
**Tags**: `#network` `#working` `#medium` `#enhancement`
**Status**: Planned enhancements to wget and http module
**Phase**: 7-8
**Dependencies**: None
**Blocks**: Advanced network operations

**Planned for wget**:
- Progress bar for large downloads
- Resume support (`Range` header)
- Basic authentication (--user, --password)
- Headers customization (--header)
- POST data support (--post-data)
- Redirect following (--follow-redirects)

**Planned for http module**:
- Request timeout support
- Retry logic with exponential backoff
- Response streaming for large files
- Custom headers support
- Better error handling

#### API Helpers
**Tags**: `#network` `#working` `#medium` `#convenience`
**Status**: Planned for future
**Phase**: 8+
**Dependencies**: http module
**Blocks**: Simplified API interactions

**Planned**:
- `api.get(endpoint)` - Simplified API calls
- `api.post(endpoint, data)` - POST with auto JSON
- Rate limiting support
- API key management (via keyring, Phase 10)
- Response caching

### 🧪 Prototype

#### CDN Integration for Packages
**Tags**: `#network` `#prototype` `#medium` `#packages`
**Status**: Planned for Phase 7 (Package Management)
**Phase**: 7
**Dependencies**: Import map manipulation
**Blocks**: Provenance package manager

**Planned CDNs**:
- **esm.sh** (recommended) - Smart transpilation, auto-deps
- **unpkg** (fallback) - Official npm CDN
- **jspm** (future) - Advanced dependency resolution

**Features**:
- Fetch package metadata from CDN
- Download and cache in VFS (`/usr/lib/node_modules/`)
- Version pinning
- Dependency resolution
- Package integrity verification

**Files**: Future `src/packages/provenance.js`

#### Offline Package Cache
**Tags**: `#network` `#prototype` `#medium` `#offline`
**Status**: Planned for Phase 7
**Phase**: 7
**Dependencies**: VFS, CDN integration
**Blocks**: Offline package reuse

**Planned**:
- Cache downloaded packages in VFS
- Reuse cached packages offline
- Cache invalidation strategies
- Storage quota management

#### WebSocket Support
**Tags**: `#network` `#prototype` `#low` `#realtime`
**Status**: Deferred
**Phase**: Future (Phase 12+)
**Dependencies**: WebSocket API
**Blocks**: Real-time communication

**Planned**:
- WebSocket connections from scripts
- `ws.connect(url)` stdlib function
- Message send/receive
- Auto-reconnect logic

**Use Cases**:
- Real-time APIs
- Live data feeds
- Chat integrations

## Architecture

### wget Implementation

```javascript
async function wget(args, context) {
  // Parse arguments
  const url = args[0];
  const outputFile = getOption(parsed, '-O') || filenameFromUrl(url);
  const quiet = hasFlag(parsed, '-q');

  // Fetch
  const response = await fetch(url);
  const content = await response.text();

  // Save to VFS
  const kernel = await getKernel();
  await kernel.writeFile(cwd + '/' + outputFile, content);

  return 0;
}
```

### http Module Structure

```javascript
// src/stdlib/http.js
export async function get(url, options = {}) {
  const response = await fetch(url, { method: 'GET', ...options });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

export async function json(url, options = {}) {
  const response = await get(url, options);
  return await response.json();
}

export async function text(url, options = {}) {
  const response = await get(url, options);
  return await response.text();
}
```

### CDN Package Fetching (Future)

```javascript
// Future: src/packages/provenance.js
async function fetchPackage(packageName, version = 'latest') {
  const cdnUrl = `https://esm.sh/${packageName}@${version}`;
  const metadata = await fetch(`${cdnUrl}/?meta`).then(r => r.json());

  // Cache in VFS
  await kernel.writeFile(
    `/usr/lib/node_modules/${packageName}/package.json`,
    JSON.stringify(metadata)
  );

  return metadata;
}
```

## Related Files

**Source**:
- `src/commands/shell.js` - wget command
- `src/stdlib/http.js` - HTTP module (~80 lines)

**Documentation**:
- `docs/man/shell/wget.1.md` - wget command man page
- `docs/man/stdlib/http.3.md` - http module man page

**Tests**:
- `tests/integration/commands/koma-commands.test.js` - wget tests

**Future**:
- `src/packages/provenance.js` - Package manager (Phase 7)

## Next Steps

**Short-term** (Phase 7):
- Implement CDN integration for Provenance
- Package metadata fetching
- Package caching in VFS

**Medium-term** (Phase 8):
- Enhanced wget features (progress, resume, auth)
- API helper utilities
- Response streaming

**Long-term** (Phase 12+):
- WebSocket support
- Advanced caching strategies
- Network performance optimizations

## Notes

**CORS Limitations**:
- Browser fetch is subject to CORS
- Can only access CORS-enabled resources
- Public APIs usually have CORS enabled
- Workaround: Use CORS proxy for non-CORS resources (not ideal)

**wget vs fetch vs http.get**:
- **wget**: Command-line tool, saves to VFS
- **fetch**: Browser API, used internally
- **http.get**: Stdlib function for scripts, returns response

**Package CDN Strategy** (Phase 7):
1. Try esm.sh first (best transpilation)
2. Fall back to unpkg if esm.sh fails
3. Consider jspm for advanced dependency resolution
4. Cache everything in VFS for offline use

**Security Considerations**:
- Validate package integrity (checksums, signatures)
- Sandbox package execution
- User consent for network operations
- Rate limiting to prevent abuse

---

**Last Updated**: 2025-11-16
**Maturity**: Working (50%)
**Priority**: Medium
