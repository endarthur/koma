# Koma Kernel API Reference

This document defines the complete kernel API (system calls) available in the Koma system. All commands, scripts, and applications interact with the system through these APIs.

## Table of Contents
- [File System Operations](#file-system-operations)
- [Process Management](#process-management)
- [Scheduler (Cron)](#scheduler-cron)
- [System Information](#system-information)
- [System Updates](#system-updates)
- [Backup and Restore](#backup-and-restore)
- [Utility Methods](#utility-methods)
- [Error Codes](#error-codes)

---

## File System Operations

All file system paths are absolute and use Unix-style forward slashes (`/`).

### `readFile(path)`
Read the entire contents of a file.

**Parameters:**
- `path` (string): Absolute path to the file

**Returns:** Promise<string> - File contents

**Throws:**
- `ENOENT` - File not found
- `EISDIR` - Path is a directory

**Example:**
```javascript
const content = await kernel.readFile('/home/document.txt');
```

---

### `writeFile(path, content)`
Write content to a file, creating it if it doesn't exist, or overwriting if it does.

**Parameters:**
- `path` (string): Absolute path to the file
- `content` (string): Content to write

**Returns:** Promise<void>

**Throws:**
- `ENOTDIR` - Parent path is not a directory
- `ENOENT` - Parent directory doesn't exist

**Example:**
```javascript
await kernel.writeFile('/home/document.txt', 'Hello, World!');
```

---

### `readdir(path)`
List all entries in a directory.

**Parameters:**
- `path` (string): Absolute path to the directory

**Returns:** Promise<Array<string>> - Array of entry names (not full paths)

**Throws:**
- `ENOENT` - Directory not found
- `ENOTDIR` - Path is not a directory

**Example:**
```javascript
const entries = await kernel.readdir('/home');
// Returns: ['file1.txt', 'subdir', 'file2.txt']
```

---

### `mkdir(path)`
Create a directory. Parent directory must exist.

**Parameters:**
- `path` (string): Absolute path for the new directory

**Returns:** Promise<void>

**Throws:**
- `EEXIST` - Directory already exists
- `ENOENT` - Parent directory doesn't exist
- `ENOTDIR` - Parent path is not a directory

**Example:**
```javascript
await kernel.mkdir('/home/projects');
```

**Note:** To create nested directories, create each level separately:
```javascript
await kernel.mkdir('/home/projects');
await kernel.mkdir('/home/projects/myapp');
```

---

### `unlink(path)`
Delete a file or empty directory.

**Parameters:**
- `path` (string): Absolute path to the file or directory

**Returns:** Promise<void>

**Throws:**
- `ENOENT` - File/directory not found
- `ENOTEMPTY` - Directory is not empty (use `unlinkRecursive` instead)

**Example:**
```javascript
await kernel.unlink('/home/old-file.txt');
```

---

### `unlinkRecursive(path)`
Recursively delete a directory and all its contents.

**Parameters:**
- `path` (string): Absolute path to the directory

**Returns:** Promise<void>

**Throws:**
- `ENOENT` - Directory not found

**Example:**
```javascript
await kernel.unlinkRecursive('/home/old-project');
```

**Warning:** This permanently deletes all files and subdirectories. Use with caution.

---

### `stat(path)`
Get information about a file or directory.

**Parameters:**
- `path` (string): Absolute path

**Returns:** Promise<Object>
```javascript
{
  type: 'file' | 'directory',
  size: number,        // File size in bytes (0 for directories)
  created: number,     // Creation timestamp (ms)
  modified: number     // Last modified timestamp (ms)
}
```

**Throws:**
- `ENOENT` - Path not found

**Example:**
```javascript
const info = await kernel.stat('/home/document.txt');
console.log(`File size: ${info.size} bytes`);
console.log(`Type: ${info.type}`);
```

---

### `exists(path)` ✨ NEW
Check if a file or directory exists.

**Parameters:**
- `path` (string): Absolute path

**Returns:** Promise<boolean> - `true` if exists, `false` otherwise

**Example:**
```javascript
if (await kernel.exists('/home/config.json')) {
  const config = await kernel.readFile('/home/config.json');
}
```

**Note:** This is a convenience method that internally uses `stat()` and catches `ENOENT` errors.

---

### `rename(oldPath, newPath)`
Rename or move a file/directory.

**Parameters:**
- `oldPath` (string): Current absolute path
- `newPath` (string): New absolute path

**Returns:** Promise<void>

**Throws:**
- `ENOENT` - Source path not found
- `EEXIST` - Destination path already exists

**Example:**
```javascript
await kernel.rename('/home/old-name.txt', '/home/new-name.txt');
await kernel.rename('/home/project', '/archives/project'); // Move
```

---

### `copyFile(srcPath, destPath)`
Copy a file.

**Parameters:**
- `srcPath` (string): Source file path
- `destPath` (string): Destination file path

**Returns:** Promise<void>

**Throws:**
- `ENOENT` - Source file not found
- `EISDIR` - Source is a directory (not a file)
- `EEXIST` - Destination already exists

**Example:**
```javascript
await kernel.copyFile('/home/template.txt', '/home/document.txt');
```

---

### `move(srcPath, destPath)`
Move a file or directory (rename + copy for cross-directory moves).

**Parameters:**
- `srcPath` (string): Source path
- `destPath` (string): Destination path

**Returns:** Promise<void>

**Throws:**
- `ENOENT` - Source not found
- `EEXIST` - Destination already exists

**Example:**
```javascript
await kernel.move('/home/temp/file.txt', '/archives/file.txt');
```

---

## Process Management

### `spawn(scriptPath, args = [], env = {})`
Spawn a new background process running a shell script.

**Parameters:**
- `scriptPath` (string): Path to shell script
- `args` (array): Command-line arguments
- `env` (object): Environment variables

**Returns:** Promise<number> - Process ID (PID)

**Throws:**
- `ENOENT` - Script file not found

**Example:**
```javascript
const pid = await kernel.spawn('/usr/bin/backup.sh', ['--full'], {
  BACKUP_DIR: '/archives'
});
console.log(`Spawned process ${pid}`);
```

---

### `kill(pid)`
Terminate a running process.

**Parameters:**
- `pid` (number): Process ID

**Returns:** Promise<boolean> - `true` if killed, `false` if not found

**Example:**
```javascript
await kernel.kill(12345);
```

---

### `ps()`
List all running processes.

**Returns:** Promise<Array<Object>>
```javascript
[
  {
    pid: number,
    script: string,
    args: array,
    status: 'running' | 'completed' | 'failed',
    startTime: number,
    endTime: number | null,
    exitCode: number | null
  }
]
```

**Example:**
```javascript
const processes = await kernel.ps();
processes.forEach(p => {
  console.log(`PID ${p.pid}: ${p.script} - ${p.status}`);
});
```

---

### `wait(pid)`
Wait for a process to complete.

**Parameters:**
- `pid` (number): Process ID

**Returns:** Promise<number> - Exit code

**Example:**
```javascript
const exitCode = await kernel.wait(12345);
if (exitCode === 0) {
  console.log('Process completed successfully');
}
```

---

### `getOutput(pid)`
Get the captured stdout/stderr of a process.

**Parameters:**
- `pid` (number): Process ID

**Returns:** Promise<string> - Combined output

**Example:**
```javascript
const output = await kernel.getOutput(12345);
console.log('Process output:', output);
```

---

### `setStdlib(stdlibModules)`
Set stdlib modules available to spawned processes.

**Parameters:**
- `stdlibModules` (object): Stdlib module exports

**Returns:** void

**Note:** This is typically called by the boot system, not by user code.

---

## Scheduler (Cron)

### `crontab(schedule, scriptPath)`
Schedule a script to run periodically.

**Parameters:**
- `schedule` (string): Cron expression (e.g., `'*/5 * * * *'` for every 5 minutes)
- `scriptPath` (string): Path to script to execute

**Returns:** Promise<string> - Job ID

**Throws:**
- `ENOENT` - Script file not found

**Example:**
```javascript
const jobId = await kernel.crontab('0 2 * * *', '/usr/bin/backup.sh');
console.log(`Scheduled backup job: ${jobId}`);
```

**Cron Expression Format:**
```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, 0=Sunday)
│ │ │ │ │
* * * * *
```

---

### `cronlist()`
List all scheduled cron jobs.

**Returns:** Promise<Array<Object>>
```javascript
[
  {
    id: string,
    schedule: string,
    script: string,
    lastRun: number | null,
    nextRun: number,
    enabled: boolean
  }
]
```

**Example:**
```javascript
const jobs = await kernel.cronlist();
jobs.forEach(job => {
  console.log(`${job.id}: ${job.schedule} → ${job.script}`);
});
```

---

### `cronrm(jobId)`
Remove a scheduled cron job.

**Parameters:**
- `jobId` (string): Job ID returned from `crontab()`

**Returns:** Promise<boolean> - `true` if removed, `false` if not found

**Example:**
```javascript
await kernel.cronrm('cron_abc123');
```

---

## System Information

### `ping()`
Health check to verify kernel is responsive.

**Returns:** Promise<string> - Always returns `'pong'`

**Example:**
```javascript
const response = await kernel.ping();
console.log(response); // 'pong'
```

---

### `getVersion()`
Get kernel version.

**Returns:** Promise<string> - Version string (e.g., `'1.0.0'`)

**Example:**
```javascript
const version = await kernel.getVersion();
console.log(`Kernel version: ${version}`);
```

---

### `getSystemInfo()`
Get comprehensive system information.

**Returns:** Promise<Object>
```javascript
{
  currentVersion: string,      // Current kernel version
  buildDate: string,           // Build timestamp
  storedVersion: string | null, // Version stored in VFS
  lastUpdate: number | null,   // Last update timestamp
  manPagesCount: number,       // Number of man pages installed
  hasUpdate: boolean           // Whether update is available
}
```

**Example:**
```javascript
const info = await kernel.getSystemInfo();
console.log(`System: Koma ${info.currentVersion}`);
console.log(`Man pages: ${info.manPagesCount}`);
if (info.hasUpdate) {
  console.log('Update available!');
}
```

---

## System Updates

### `checkSystemUpdate()`
Check if a system update is available.

**Returns:** Promise<Object>
```javascript
{
  currentVersion: string,
  availableVersion: string,
  hasUpdate: boolean,
  changes: Array<string>  // List of changes in update
}
```

**Example:**
```javascript
const update = await kernel.checkSystemUpdate();
if (update.hasUpdate) {
  console.log(`Update available: ${update.availableVersion}`);
  update.changes.forEach(change => console.log(`  - ${change}`));
}
```

---

### `upgradeSystem()`
Apply system updates (man pages, system files).

**Returns:** Promise<Object>
```javascript
{
  success: boolean,
  previousVersion: string,
  newVersion: string,
  filesUpdated: number
}
```

**Example:**
```javascript
const result = await kernel.upgradeSystem();
if (result.success) {
  console.log(`Upgraded from ${result.previousVersion} to ${result.newVersion}`);
  console.log(`Updated ${result.filesUpdated} files`);
}
```

---

### `resetSystem()`
Reset system files to default state.

**Returns:** Promise<Object>
```javascript
{
  success: boolean,
  message: string,
  filesReset: number
}
```

**Example:**
```javascript
const result = await kernel.resetSystem();
console.log(result.message);
```

**Warning:** This overwrites system files with defaults.

---

## Backup and Restore

### `exportVFS()`
Export entire VFS as JSON.

**Returns:** Promise<string> - JSON string representing all files

**Example:**
```javascript
const backup = await kernel.exportVFS();
await kernel.writeFile('/archives/backup.json', backup);
```

---

### `importVFS(jsonData)`
Restore VFS from JSON backup.

**Parameters:**
- `jsonData` (string): JSON string from `exportVFS()`

**Returns:** Promise<void>

**Example:**
```javascript
const backup = await kernel.readFile('/archives/backup.json');
await kernel.importVFS(backup);
```

**Warning:** This replaces all files in the VFS.

---

## Utility Methods

### Accessing the Kernel

The kernel is accessed through the kernel client:

```javascript
import { kernelClient } from './src/kernel/client.js';

const kernel = await kernelClient.getKernel();
```

In commands, the kernel is provided via utilities:

```javascript
import { getKernel } from '../utils/command-utils.js';

const kernel = await getKernel();
```

---

## Error Codes

Standard POSIX-style error codes are used:

| Code | Name | Description |
|------|------|-------------|
| `ENOENT` | No such file or directory | Path doesn't exist |
| `EEXIST` | File exists | File/directory already exists |
| `ENOTDIR` | Not a directory | Expected directory, found file |
| `EISDIR` | Is a directory | Expected file, found directory |
| `ENOTEMPTY` | Directory not empty | Cannot delete non-empty directory (use `unlinkRecursive`) |

**Error Object Structure:**
```javascript
{
  code: 'ENOENT',
  message: 'ENOENT: no such file or directory: /home/missing.txt',
  path: '/home/missing.txt'
}
```

**Handling Errors:**
```javascript
try {
  await kernel.readFile('/home/config.json');
} catch (error) {
  if (error.code === 'ENOENT') {
    // File doesn't exist, create default
    await kernel.writeFile('/home/config.json', '{}');
  } else {
    throw error;
  }
}
```

---

## API Stability

**Stable APIs** (will not break):
- All file system operations
- Process management basics (`spawn`, `kill`, `ps`)
- System information methods

**Experimental APIs** (may change):
- Scheduler/cron (may add more features)
- System update mechanisms (may change format)

**Recently Added:**
- `exists()` - Added in response to test failures, now part of stable API

---

## Testing the API

To verify API availability in tests:

```javascript
const kernel = await kernelClient.getKernel();

// Test that all core APIs are present
const requiredMethods = [
  'readFile', 'writeFile', 'readdir', 'mkdir', 'unlink',
  'stat', 'exists', 'rename', 'copyFile', 'move', 'unlinkRecursive',
  'spawn', 'kill', 'ps', 'wait', 'getOutput',
  'exportVFS', 'importVFS'
];

requiredMethods.forEach(method => {
  if (typeof kernel[method] !== 'function') {
    throw new Error(`Missing kernel API: ${method}`);
  }
});
```

---

## Contributing

When adding new kernel APIs:

1. **Update this document** with the new method signature
2. **Add comprehensive tests** in `tests/integration/kernel/`
3. **Follow the error code conventions** for consistency
4. **Ensure Comlink compatibility** (all parameters must be serializable)
5. **Mark as experimental** until widely tested

---

## Version History

- **v1.0.0**: Initial kernel API
- **v1.1.0**: Added `exists()` method to file system API
- **v1.1.0**: Fixed `showSuccess()` helper function signature

---

*Last updated: 2025-11-11*
