# Standard Library

**Domain**: `#stdlib`
**Related Domains**: `#processes`, `#kernel`, `#commands`

## Overview

Standard library modules available to scripts and commands. Dynamically imported ES modules providing filesystem, HTTP, path utilities, argument parsing, and notifications.

## Features by Maturity

### ✅ Production

#### fs - Filesystem Module
**Tags**: `#stdlib` `#production` `#critical` `#filesystem`
**Status**: Complete VFS wrapper with helpers
**Phase**: 5
**Dependencies**: VFS (kernel)
**Blocks**: Script file operations

**Functions**:
- **Core VFS operations**:
  - `readFile(path)` - Read file contents
  - `writeFile(path, content)` - Write/overwrite file
  - `appendFile(path, content)` - Append to file
  - `mkdir(path)` - Create directory
  - `rm(path, recursive)` - Remove file/directory
  - `cp(src, dest)` - Copy file
  - `mv(src, dest)` - Move/rename file
  - `stat(path)` - Get file metadata
  - `ls(path, detailed)` - List directory
- **Helper functions**:
  - `exists(path)` - Check if path exists
  - `isFile(path)` - Check if path is file
  - `isDirectory(path)` - Check if path is directory

**Usage**:
```javascript
// In scripts
const content = await fs.readFile('/home/file.txt');
await fs.writeFile('/home/output.txt', 'Hello!');
const files = await fs.ls('/home');
if (await fs.exists('/home/config.json')) {
  // ...
}
```

**Files**: `src/stdlib/fs.js` (~100 lines)

#### http - HTTP Module
**Tags**: `#stdlib` `#production` `#high` `#network`
**Status**: Complete fetch wrappers
**Phase**: 5
**Dependencies**: Fetch API
**Blocks**: Script HTTP operations

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
- CORS-aware (browser fetch limitations apply)

**Usage**:
```javascript
// In scripts
const data = await http.json('https://api.example.com/data');
await http.post('https://api.example.com/submit', { key: 'value' });
const html = await http.text('https://example.com');
```

**Files**: `src/stdlib/http.js` (~80 lines)

#### path - Path Utilities
**Tags**: `#stdlib` `#production` `#high` `#utilities`
**Status**: Complete POSIX path utilities
**Phase**: 5 Maintenance
**Dependencies**: None
**Blocks**: Path manipulation in scripts/commands

**Functions**:
- `join(...parts)` - Join path segments
- `resolve(...paths)` - Resolve to absolute path
- `dirname(path)` - Get directory name
- `basename(path, ext)` - Get base filename
- `extname(path)` - Get file extension
- `normalize(path)` - Normalize path (remove .., ., etc.)
- `relative(from, to)` - Get relative path
- `isAbsolute(path)` - Check if path is absolute

**Usage**:
```javascript
// In scripts
const fullPath = path.join('/home', 'user', 'file.txt');
// → '/home/user/file.txt'

const dir = path.dirname('/home/user/file.txt');
// → '/home/user'

const normalized = path.normalize('/home/user/../file.txt');
// → '/home/file.txt'
```

**Impact**:
- Replaced 26-line `normalizePath` in commands
- ~100+ lines of duplicated code eliminated
- Consistent path handling across codebase

**Files**: `src/stdlib/path.js` (~250 lines)

#### argparse - Argument Parsing
**Tags**: `#stdlib` `#production` `#high` `#cli`
**Status**: Complete with schema-based parsing and help generation
**Phase**: 5 Maintenance
**Dependencies**: None
**Blocks**: Command argument handling

**Functions**:
- `parse(args, schema)` - Parse arguments with schema
- `hasHelp(parsed)` - Check if --help flag present
- `showHelp(name, schema, context)` - Display formatted help
- `hasFlag(parsed, flag)` - Check if flag present
- `getOption(parsed, name, defaultValue)` - Get option value

**Schema Format**:
```javascript
const schema = {
  description: 'Command description',
  options: [
    { flag: '-f', name: '--flag', description: 'Flag description' },
    { flag: '-o', name: '--option', arg: 'VALUE', description: 'Option description' }
  ],
  examples: [
    { command: 'cmd -f file.txt', description: 'Example usage' }
  ],
  notes: ['Additional notes'],
  seeAlso: ['related-command']
};

const parsed = argparse.parse(args, schema);
```

**Features**:
- Auto-generated help text
- Combined flags support (`-la` = `-l` + `-a`)
- Option parsing (`--option=value` or `--option value`)
- Positional arguments
- Flags without values
- Help sections (description, options, examples, notes, see also)

**Impact**:
- All 48 commands migrated to argparse
- Consistent help format
- ~200 lines of argument parsing removed

**Files**: `src/stdlib/args.js` (~300 lines)

#### notify - Notifications Module
**Tags**: `#stdlib` `#production` `#medium` `#ui`
**Status**: API ready, disabled in worker context
**Phase**: 5
**Dependencies**: Notifications API
**Blocks**: Browser notifications from scripts

**Functions**:
- `send(title, options)` - Send browser notification
- `requestPermission()` - Request notification permission

**Current Limitation**: Notifications API not available in Worker context. Ready for future when called from UI context.

**Usage (future)**:
```javascript
// When available
await notify.send('Task Complete', {
  body: 'Your backup has finished.',
  icon: '/icon.png'
});
```

**Files**: `src/stdlib/notify.js` (~50 lines)

#### Dynamic Import System
**Tags**: `#stdlib` `#production` `#high` `#architecture`
**Status**: Modular stdlib loading
**Phase**: 5
**Dependencies**: ES module support
**Blocks**: None

**Features**:
- Stdlib modules loaded via dynamic `import()`
- No bundling required
- Maintainable and modular architecture
- Easy to add new modules

**Loading**:
```javascript
// In kernel/olivine.js
const [fs, http, notify, path, argparse] = await Promise.all([
  import('../stdlib/fs.js'),
  import('../stdlib/http.js'),
  import('../stdlib/notify.js'),
  import('../stdlib/path.js'),
  import('../stdlib/args.js')
]);
```

**Files**: `src/kernel/olivine.js` (stdlib initialization)

### 🔧 Working

None - stdlib is feature-complete for current needs!

### 🧪 Prototype

#### crypto - Cryptography Module
**Tags**: `#stdlib` `#prototype` `#medium` `#security`
**Status**: Planned for Phase 10
**Phase**: 10 (Security features)
**Dependencies**: Web Crypto API
**Blocks**: Encryption, hashing, secure secrets

**Planned Functions**:
- `hash(algorithm, data)` - Hash data (SHA-256, etc.)
- `encrypt(key, data)` - Encrypt data
- `decrypt(key, data)` - Decrypt data
- `generateKey()` - Generate encryption key
- `randomBytes(length)` - Secure random bytes

#### dom - DOM Manipulation Module
**Tags**: `#stdlib` `#prototype` `#low` `#ui`
**Status**: Deferred until needed
**Phase**: Future
**Dependencies**: UI thread access (not Worker)
**Blocks**: Scripts manipulating UI

**Note**: Currently scripts run in Worker context, no DOM access. Would need bridge to UI thread.

#### sql - SQLite Module
**Tags**: `#stdlib` `#prototype` `#low` `#database`
**Status**: Deferred until needed
**Phase**: Future (Phase 12+)
**Dependencies**: sql.js or similar
**Blocks**: Database operations in scripts

**Planned**:
- SQLite database support
- SQL query execution
- Database stored in VFS
- Transactions and migrations

## Module Architecture

### Stdlib Initialization (Kernel)

```javascript
// In kernel/olivine.js
class Olivine {
  async init() {
    // Load stdlib modules
    const stdlib = await this.loadStdlib();
    this.stdlib = stdlib;
  }

  async loadStdlib() {
    const [fs, http, notify, path, argparse] = await Promise.all([
      import('../stdlib/fs.js'),
      import('../stdlib/http.js'),
      import('../stdlib/notify.js'),
      import('../stdlib/path.js'),
      import('../stdlib/args.js')
    ]);

    return { fs, http, notify, path, argparse };
  }
}
```

### Stdlib Access (Scripts)

```javascript
// In Process.run()
const fn = new AsyncFunction(
  'args', 'env', 'console', 'fs', 'http', 'notify', 'path', 'argparse',
  scriptCode
);

await fn(
  args,
  env,
  capturedConsole,
  this.kernel.stdlib.fs,
  this.kernel.stdlib.http,
  this.kernel.stdlib.notify,
  this.kernel.stdlib.path,
  this.kernel.stdlib.argparse
);
```

### Stdlib Access (Commands)

```javascript
// Commands can import directly
import * as path from '../stdlib/path.js';
import * as argparse from '../stdlib/args.js';

// Use in command implementation
const resolved = path.resolve(cwd, relativePath);
const parsed = argparse.parse(args, schema);
```

## Related Files

**Source**:
- `src/stdlib/fs.js` - Filesystem module (~100 lines)
- `src/stdlib/http.js` - HTTP module (~80 lines)
- `src/stdlib/notify.js` - Notifications module (~50 lines)
- `src/stdlib/path.js` - Path utilities (~250 lines)
- `src/stdlib/args.js` - Argument parsing (~300 lines)
- `src/kernel/olivine.js` - Stdlib initialization

**Documentation**:
- `docs/man/stdlib/fs.3.md` - fs module man page
- `docs/man/stdlib/http.3.md` - http module man page
- `docs/man/stdlib/notify.3.md` - notify module man page
- `docs/man/stdlib/path.3.md` - path module man page
- `docs/man/stdlib/argparse.3.md` - argparse module man page

**Tests**:
- (Need stdlib unit tests)

## Next Steps

**Short-term**:
- None - stdlib is stable for current needs

**Medium-term** (Phase 10):
- Add crypto module for encryption/hashing
- Consider dom module if UI manipulation needed

**Long-term** (Phase 12+):
- Add sql module for database support
- Additional utilities as needs emerge

## Notes

**Man Page Section**: Section 3 (library APIs) instead of Section 1 (commands)

**Module Pattern**: All stdlib modules export functions directly (not default export)

**Error Handling**: Modules throw errors that propagate to script execution, handled by Process manager

**Worker Context**: Modules run in Worker context (no DOM access, limited APIs)

**Naming Convention**: Short, lowercase names (fs, http, path) following Node.js conventions

---

**Last Updated**: 2025-11-16
**Maturity**: Production
**Priority**: High
