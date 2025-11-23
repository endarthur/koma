# KOMA Security Model

**Last Updated**: 2025-11-22
**Status**: Living document

## Overview

KOMA is a **browser-resident development workstation** designed for local development, automation, and experimentation. Its security model reflects this purpose: it prioritizes functionality and user control over sandboxing restrictions.

**Important**: KOMA is NOT designed for executing untrusted code. It is a personal development environment where the user has full control and responsibility.

---

## Script Execution Model

### AsyncFunction-Based Execution

**Design Decision**: KOMA uses `AsyncFunction` to execute user scripts directly in the browser context.

```javascript
// From src/kernel/olivine.js Process.run()
const fn = new AsyncFunction('args', 'env', 'vfs', 'fs', 'http', 'notify', 'path', 'argparse', scriptContent);
const result = await fn(this.args, this.env, this.vfs, fs, http, notify, path, argparse);
```

**Why AsyncFunction?**
- Enables full JavaScript capabilities for automation scripts
- Provides direct access to stdlib modules (fs, http, path, etc.)
- Allows async/await patterns for cleaner script code
- Simpler than Worker-based sandboxing for single-user dev environment

**Security Implications**:
- ✅ **No network isolation** - Scripts can make HTTP requests via `http` module
- ✅ **No filesystem sandboxing** - Scripts have full VFS access via `vfs` and `fs` modules
- ✅ **No CPU/memory limits** - Scripts can consume resources (mitigated by process limits)
- ✅ **Browser context access** - Scripts run in same context as KOMA itself

This is **intentional** for a development workstation where the user writes and controls all scripts.

---

## Protections & Mitigations

### 1. Process Management Limits

**Protection**: Prevent unbounded resource consumption

```javascript
// From src/kernel/olivine.js
class ProcessManager {
  static MAX_PROCESSES = 100; // Maximum concurrent processes
  static MAX_RUNTIME_MS = 60 * 60 * 1000; // 1 hour max runtime
}
```

**Mitigations**:
- Maximum 100 concurrent processes
- Processes running longer than 1 hour are force-killed
- Automatic cleanup of completed processes after 60 seconds
- Periodic stuck process cleanup on every `spawn()` call

**Impact**: Prevents accidental infinite loops or fork bombs from consuming all browser resources.

### 2. VFS Transaction Safety

**Protection**: Prevent VFS corruption from failed imports

```javascript
// From src/kernel/olivine.js VFS.importVFS()
transaction.onerror = () => {
  // Transaction will auto-rollback on error, preserving VFS
  reject(new Error(`VFS import failed: ${transaction.error?.message}`));
};

transaction.onabort = () => {
  reject(new Error('VFS import aborted - no changes made'));
};
```

**Mitigations**:
- Atomic VFS imports using IndexedDB transactions
- Full rollback on any error during import
- No partial VFS corruption if backup import fails

**Impact**: Protects against data loss during emergency VFS restoration.

### 3. XSS Prevention in Emergency Mode

**Protection**: Escape user-provided content in HTML

```javascript
// From src/boot/emergency.js
escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// All dynamic content is escaped:
status.innerHTML = `<div>Selected: ${this.escapeHTML(file.name)}</div>`;
```

**Mitigations**:
- All file names and error messages are HTML-escaped
- Prevents XSS attacks via malicious .magma backup filenames
- Emergency mode UI remains secure even with user-provided data

**Impact**: Protects emergency recovery interface from malicious backup files.

---

## Threat Model

### What KOMA Protects Against

✅ **Accidental resource exhaustion**
- Process count limits prevent fork bombs
- Runtime limits prevent infinite loops
- Automatic stuck process cleanup

✅ **VFS corruption from failed operations**
- Atomic transactions with rollback
- Emergency recovery mode with .magma backups
- Safe mode boot option

✅ **XSS in system UI**
- HTML escaping in emergency mode
- Content Security Policy (future enhancement)

### What KOMA Does NOT Protect Against

❌ **Malicious scripts written by the user**
- KOMA assumes the user writes all scripts
- No sandboxing of script capabilities
- Full access to VFS, network, browser storage

❌ **Supply chain attacks via CDN dependencies**
- External libraries loaded from CDN (CodeMirror, xterm.js)
- No integrity checks (SRI) currently
- Trusts esm.sh and cdn.jsdelivr.net

❌ **Browser storage limits**
- VFS can grow until browser quota is exhausted
- No automatic size monitoring or cleanup
- User must manage storage manually

❌ **Cross-tab interference**
- Multiple KOMA tabs share same VFS (IndexedDB)
- No locking mechanism for concurrent writes
- User must avoid running conflicting operations

---

## Security Best Practices for Users

### DO

✅ **Review scripts before running them**
- Especially scripts downloaded from external sources
- Check what VFS paths they access
- Verify what network requests they make

✅ **Keep backups**
- Use `magma dump` regularly
- Store .magma files outside the browser
- Use the six-finger salute (Ctrl+K E) for quick backups

✅ **Monitor process list**
- Run `ps` to see running processes
- Kill stuck processes with `kill <pid>`
- Check for unexpected processes

✅ **Use Safe Mode when troubleshooting**
- Hold Shift during boot to enter Safe Mode
- Disables automatic backups and health checks
- Useful for diagnosing boot issues

### DON'T

❌ **Run untrusted scripts**
- KOMA has no script sandboxing
- Malicious scripts have full VFS access
- They can exfiltrate data via `http` module

❌ **Import untrusted .magma backups**
- Backups can contain malicious scripts
- They replace your entire VFS
- Always verify backup source

❌ **Share your VFS with others**
- VFS may contain sensitive data
- Exported backups are unencrypted
- Keep .magma files private

❌ **Assume browser storage is permanent**
- Browser can clear IndexedDB under storage pressure
- Private/incognito mode loses data on close
- Always maintain external backups

---

## Future Security Enhancements

### Planned (Phase 10+)

- **Content Security Policy (CSP)**: Restrict inline scripts and external resources
- **Subresource Integrity (SRI)**: Verify CDN dependencies haven't been tampered with
- **VFS encryption**: Optional encryption for sensitive data at rest
- **Script capabilities manifest**: Declare required permissions (fs, network) before execution
- **Read-only VFS mounts**: Mount external directories as read-only for safety

### Under Consideration

- **Worker-based script sandboxing**: Isolate scripts in Web Workers (breaks direct VFS access)
- **Resource quotas per process**: CPU time limits, memory limits
- **VFS access control**: Per-directory permissions for scripts
- **Network request filtering**: Whitelist/blacklist for script network access

---

## Responsible Disclosure

**Security issues should be reported to**:
- GitHub Issues: https://github.com/anthropics/koma/issues (for non-critical issues)
- Email: [security contact to be determined] (for critical vulnerabilities)

**When reporting**:
- Describe the threat model (what attacker capabilities are assumed)
- Provide reproduction steps
- Suggest mitigations if possible
- Remember KOMA is a single-user dev environment, not a multi-user system

---

## Security Philosophy

KOMA's security model reflects its purpose as a **personal development workstation**:

1. **User is trusted** - All scripts are written and controlled by the user
2. **Functionality over isolation** - Direct script access to VFS and network enables powerful automation
3. **Fail-safe defaults** - Process limits, VFS rollback, emergency recovery
4. **Defense in depth** - Multiple layers (HTML escaping, transaction safety, process limits)
5. **Transparency** - Clear documentation of capabilities and limitations

**Bottom line**: KOMA gives you a powerful development environment with full JavaScript capabilities. With great power comes great responsibility. Review your scripts, keep backups, and don't run untrusted code.

---

**See Also**:
- [KERNEL_API.md](KERNEL_API.md) - Kernel API reference
- [VFS_ARCHITECTURE.md](VFS_ARCHITECTURE.md) - VFS design and limitations
- [BOOT_TESTING.md](BOOT_TESTING.md) - Boot system safety features
