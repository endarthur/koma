# Processes

**Domain**: `#processes`
**Related Domains**: `#kernel`, `#stdlib`, `#commands`

## Overview

Process execution and scheduling system. Runs JavaScript scripts as processes using AsyncFunction with stdout/stderr capture, and provides cron-based scheduling for periodic jobs.

## Features by Maturity

### ✅ Production

#### AsyncFunction-Based Execution
**Tags**: `#processes` `#production` `#high` `#execution`
**Status**: Stable, production-ready
**Phase**: 5
**Dependencies**: Olivine kernel (Worker context)
**Blocks**: Script execution, automation

**Features**:
- Execute JavaScript files as async processes
- AsyncFunction wrapper for script code
- Isolated execution context
- Access to stdlib modules (fs, http, notify, path, argparse)
- Environment variables passed to processes
- Console output capture

**Architecture**:
```javascript
const fn = new AsyncFunction('args', 'env', 'console', 'fs', 'http', 'notify', 'path', 'argparse', scriptCode);
await fn(args, env, capturedConsole, fs, http, notify, path, argparse);
```

**Files**: `src/kernel/olivine.js` (Process class, ~100 lines)

#### Process Manager
**Tags**: `#processes` `#production` `#high` `#management`
**Status**: Complete process lifecycle management
**Phase**: 5
**Dependencies**: AsyncFunction execution
**Blocks**: run, ps, kill commands

**Features**:
- Process state tracking (running, completed, failed, killed)
- Process listing with metadata (pid, script, status, start time, exit code)
- Process termination (cooperative, no force-kill yet)
- Stdout/stderr capture and streaming
- Exit code tracking
- Process cleanup after 60 seconds of completion

**Files**: `src/kernel/olivine.js` (ProcessManager class, ~150 lines)

#### Stdout/Stderr Streaming
**Tags**: `#processes` `#production` `#high` `#output`
**Status**: Real-time output streaming to terminal
**Phase**: 5
**Dependencies**: Process Manager
**Blocks**: Interactive script feedback

**Features**:
- Console output captured via custom console object
- Stdout/stderr polled and streamed every 100ms
- Real-time feedback in terminal
- Buffers cleared after reading
- Proper line breaking and formatting

**Architecture**:
```javascript
// Custom console for output capture
const capturedConsole = {
  log: (...args) => { stdout.push(args.join(' ')); },
  error: (...args) => { stderr.push(args.join(' ')); }
};
```

**Files**: `src/kernel/olivine.js` (Process class)

#### Cron Scheduler
**Tags**: `#processes` `#production` `#high` `#scheduling`
**Status**: Complete with full cron expression parsing
**Phase**: 5
**Dependencies**: Process Manager
**Blocks**: Periodic automation

**Features**:
- Full 5-field cron expression parser
- Schedule periodic tasks: `cron "<schedule>" <script>`
- List jobs: `cronlist`
- Remove jobs: `cronrm <id>`
- Automatic job execution and rescheduling
- Next run time calculation
- Job persistence (survives restart)

**Cron Expression Format**:
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-6, Sunday = 0)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Examples**:
```bash
cron "0 * * * *" cleanup.js      # Every hour
cron "*/15 * * * *" sync.js      # Every 15 minutes
cron "0 0 * * 0" backup.js       # Weekly on Sunday midnight
```

**Files**: `src/kernel/olivine.js` (Scheduler class, ~200 lines)

#### Process Commands
**Tags**: `#processes` `#production` `#high` `#commands`
**Status**: Complete command suite
**Phase**: 5
**Dependencies**: Process Manager, Scheduler
**Blocks**: None

**Commands**:
- `run <script> [args...]` - Execute JavaScript file
- `ps` - List processes with color-coded status
- `kill <pid>` - Terminate process
- `cron "<schedule>" <script>` - Schedule job
- `cronlist` - List scheduled jobs
- `cronrm <id>` - Remove job

**Features**:
- Full argparse support with help
- Color-coded status (green = running, blue = completed, red = failed, gray = killed)
- Comprehensive error handling
- Exit code reporting

**Files**: `src/commands/shell.js` (process commands)

#### Exit Code Infrastructure
**Tags**: `#processes` `#production` `#critical` `#error-handling`
**Status**: Complete exit code tracking
**Phase**: 5, 6 (enhanced)
**Dependencies**: Process Manager
**Blocks**: Conditional execution (&&, ||)

**Features**:
- Processes return exit codes (0 = success, non-zero = failure)
- Exit codes stored in Process state
- Accessible via `getExitCode(pid)` kernel method
- Used by shell for `$?` variable
- Supports conditional operators (&&, ||)

**Files**: `src/kernel/olivine.js` (Process, ProcessManager)

### 🔧 Working

None - process execution is feature-complete!

### 🧪 Prototype

#### Background Daemon Processes
**Tags**: `#processes` `#prototype` `#low` `#daemons`
**Status**: Not needed yet
**Phase**: Future (Phase 12+)
**Dependencies**: Process Manager extensions
**Blocks**: Long-running background services

**Planned**:
- Processes that run indefinitely (not cleaned up)
- Daemon management (start, stop, restart)
- Daemon listing (separate from regular processes)
- Auto-start on boot

#### Process Metadata in /proc
**Tags**: `#processes` `#prototype` `#low` `#filesystem`
**Status**: Not needed yet
**Phase**: Future (Phase 12+)
**Dependencies**: VFS /proc directory support
**Blocks**: Unix-like process inspection

**Planned**:
- `/proc/<pid>/` directories for each process
- `/proc/<pid>/cmdline` - Command line
- `/proc/<pid>/status` - Process status
- `/proc/<pid>/stdout` - Real-time stdout
- `/proc/<pid>/stderr` - Real-time stderr

#### Interactive Crontab Editor
**Tags**: `#processes` `#prototype` `#low` `#ux`
**Status**: Not needed yet
**Phase**: Future (Phase 12+)
**Dependencies**: Editor integration
**Blocks**: Traditional crontab editing UX

**Planned**:
- `crontab -e` command to edit cron jobs
- Opens editor with current cron jobs
- Save and apply changes
- Validates cron expressions

## Architecture

### Process Lifecycle

```
┌─────────────┐
│   Created   │ (run command)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Running   │ (executing AsyncFunction)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Completed  │ (exit code 0)
│   Failed    │ (exit code non-zero)
│   Killed    │ (via kill command)
└──────┬──────┘
       │
       ↓ (after 60s)
┌─────────────┐
│  Cleaned Up │ (removed from manager)
└─────────────┘
```

### Process Manager Structure

```javascript
class ProcessManager {
  constructor() {
    this.processes = new Map();  // pid → Process
    this.nextPid = 1;
  }

  async run(script, args, cwd, env) {
    // Create Process
    // Execute AsyncFunction
    // Track state
    // Return pid
  }

  list() {
    // Return array of process info
  }

  kill(pid) {
    // Mark process as killed
    // (Cooperative termination only)
  }

  getProcess(pid) {
    // Get Process object
  }

  cleanup() {
    // Remove completed processes after 60s
  }
}
```

### Scheduler Structure

```javascript
class Scheduler {
  constructor(processManager, vfs) {
    this.processManager = processManager;
    this.vfs = vfs;
    this.jobs = [];
    this.nextJobId = 1;
    this.interval = null;
  }

  schedule(cronExpr, script) {
    // Parse cron expression
    // Calculate next run time
    // Add to jobs list
    // Return job id
  }

  remove(jobId) {
    // Remove job from list
  }

  tick() {
    // Check for jobs to run
    // Execute due jobs
    // Reschedule for next run
  }
}
```

## Related Files

**Source**:
- `src/kernel/olivine.js` - Process, ProcessManager, Scheduler classes (~500 lines)
- `src/commands/shell.js` - Process commands (run, ps, kill, cron, etc.)
- `src/stdlib/` - Modules available to processes

**Documentation**:
- `docs/man/shell/run.1.md` - run command man page
- `docs/man/shell/ps.1.md` - ps command man page
- `docs/man/shell/kill.1.md` - kill command man page
- `docs/man/shell/cron.1.md` - cron command man page
- `docs/man/shell/cronlist.1.md` - cronlist command man page
- `docs/man/shell/cronrm.1.md` - cronrm command man page

**Tests**:
- (Need process execution tests)

## Next Steps

**Short-term**:
- None - process execution is stable

**Medium-term** (Phase 10):
- Consider daemon processes if use cases emerge

**Long-term** (Phase 12+):
- /proc filesystem integration
- Crontab editor
- Advanced process management

## Notes

**Script Execution Context**:
Scripts have access to:
- `args` - Array of command-line arguments
- `env` - Environment variables object
- `console` - Captured console object (log, error, warn, info)
- `fs` - Filesystem module
- `http` - HTTP module
- `notify` - Notifications module (disabled in worker, ready for future)
- `path` - Path utilities module
- `argparse` - Argument parsing module

**Example Script**:
```javascript
// hello.js
console.log('Hello from script!');
console.log('Args:', args);
console.log('CWD:', env.CWD);

// Use stdlib
const files = await fs.ls('/home');
console.log('Files:', files);

// Exit with code
return 0;  // Success
```

**Cron Expression Parsing**:
- Supports ranges: `1-5`
- Supports steps: `*/15`
- Supports lists: `1,15,30`
- Supports combinations: `1-5,10,*/15`

**Process Cleanup**:
- Completed processes removed after 60 seconds
- Prevents process list bloat
- Users can still see recent processes
- Long enough to check `ps` output

---

**Last Updated**: 2025-11-16
**Maturity**: Production
**Priority**: High
