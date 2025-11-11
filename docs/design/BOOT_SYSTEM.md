# Koma Boot System Design
**Shale Hardening Phase 2: Production-Grade Boot Process**

## Motivation

Current boot process has several critical gaps:
- No explicit initialization order (race conditions)
- No failure handling (user sees broken shell)
- No health checks (fails silently on unsupported browsers)
- No feedback during boot (appears instant but might be loading)
- No degradation strategy (all-or-nothing)

The boot system should be **rock-solid**, work even when things break, and provide clear feedback.

## Architecture

### Boot Stages

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 0: Pre-flight (synchronous, <100ms)                  │
├─────────────────────────────────────────────────────────────┤
│ • Check IndexedDB availability                              │
│ • Check Web Worker support                                  │
│ • Check ES Module support                                   │
│ • Check minimum memory/storage                              │
│ • If any fail → Show error page with instructions          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: Kernel Initialization (async, ~200-500ms)         │
├─────────────────────────────────────────────────────────────┤
│ • Create Olivine worker                                     │
│ • Initialize IndexedDB VFS                                  │
│ • Load stdlib modules                                       │
│ • Verify VFS read/write                                     │
│ • If fail → Enter EMERGENCY MODE                            │
│ • If success → Set kernel.ready = true                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: UI Initialization (async, ~100ms)                 │
├─────────────────────────────────────────────────────────────┤
│ • Create Editor                                             │
│ • Create Shale (tab manager)                                │
│ • Set up event handlers                                     │
│ • If fail → Degrade to read-only mode                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: Environment Setup (async, ~50-200ms)              │
├─────────────────────────────────────────────────────────────┤
│ • Detect crash recovery state                               │
│ • Restore or create tabs                                    │
│ • Load .komarc (with timeout)                               │
│ • Show welcome message                                      │
│ • READY!                                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 4: Background Monitoring (continuous)                │
├─────────────────────────────────────────────────────────────┤
│ • VFS health checks (every 30s)                             │
│ • Auto-save state (every 60s)                               │
│ • Check for updates (on idle)                               │
│ • Memory pressure monitoring                                │
└─────────────────────────────────────────────────────────────┘
```

### Emergency Mode

When kernel initialization fails (Stage 1), enter **Emergency Mode**:

```
┌──────────────────────────────────────────────────────┐
│ ⚠️  Koma Emergency Mode                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  The Olivine kernel failed to initialize.           │
│  You can restore your VFS from a backup.            │
│                                                      │
│  Error: IndexedDB unavailable (Private browsing)    │
│  Diagnostic ID: boot-1234567890                     │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ Restore from .magma backup                 │    │
│  │                                            │    │
│  │ [Upload .magma file] [Inject & Restart]   │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  [View Diagnostics]  [Try Again]  [Help]            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Emergency mode provides:
- Minimal VFS injection capability (magma inject)
- Clear error explanation
- Diagnostic report generation
- Recovery instructions link
- "Try again" reload option

### File Structure

```
src/
├── boot/
│   ├── boot-manager.js      # Main orchestrator
│   ├── preflight.js         # Pre-boot checks (Stage 0)
│   ├── diagnostics.js       # Boot logging and reports
│   ├── emergency.js         # Emergency mode UI/logic
│   ├── health-monitor.js    # Background health checks (Stage 4)
│   └── safe-mode.js         # Safe boot option (skip .komarc, etc)
├── terminal.js              # Modified to use boot manager
└── kernel/
    ├── client.js            # Enhanced with health checks
    └── olivine.js           # Add self-diagnostics
```

## Implementation Details

### 1. Pre-flight Checks (preflight.js)

```javascript
export async function runPreflightChecks() {
  const results = {
    indexedDB: checkIndexedDB(),
    webWorkers: checkWebWorkers(),
    esModules: checkESModules(),
    storage: await checkStorageQuota(),
    timestamp: Date.now()
  };

  const failed = Object.entries(results)
    .filter(([key, value]) => value.status === 'fail');

  return {
    success: failed.length === 0,
    results,
    failed
  };
}

function checkIndexedDB() {
  if (!window.indexedDB) {
    return {
      status: 'fail',
      message: 'IndexedDB not available',
      help: 'Disable private/incognito mode or use supported browser'
    };
  }
  return { status: 'pass' };
}

function checkWebWorkers() {
  if (!window.Worker) {
    return {
      status: 'fail',
      message: 'Web Workers not supported',
      help: 'Update to modern browser (Chrome 4+, Firefox 3.5+)'
    };
  }
  return { status: 'pass' };
}

async function checkStorageQuota() {
  if (!navigator.storage?.estimate) {
    return { status: 'warn', message: 'Storage quota check unavailable' };
  }

  const estimate = await navigator.storage.estimate();
  const available = estimate.quota - estimate.usage;
  const minRequired = 10 * 1024 * 1024; // 10MB

  if (available < minRequired) {
    return {
      status: 'warn',
      message: `Low storage: ${(available / 1024 / 1024).toFixed(1)}MB available`,
      help: 'Free up browser storage or clear cache'
    };
  }

  return { status: 'pass', available, quota: estimate.quota };
}
```

### 2. Boot Manager (boot-manager.js)

```javascript
export class BootManager {
  constructor() {
    this.stage = 0;
    this.diagnostics = new BootDiagnostics();
    this.status = 'initializing';
  }

  async boot() {
    try {
      // Stage 0: Pre-flight
      this.updateStatus('Pre-flight checks...');
      const preflight = await this.runPreflight();
      if (!preflight.success) {
        return this.handlePreflightFailure(preflight);
      }

      // Stage 1: Kernel
      this.updateStatus('Starting Olivine kernel...');
      const kernel = await this.initializeKernel();
      if (!kernel.success) {
        return this.enterEmergencyMode(kernel.error);
      }

      // Stage 2: UI
      this.updateStatus('Initializing interface...');
      const ui = await this.initializeUI(kernel);

      // Stage 3: Environment
      this.updateStatus('Loading environment...');
      await this.setupEnvironment(ui);

      // Stage 4: Background monitoring
      this.startHealthMonitoring(kernel);

      this.status = 'ready';
      this.updateStatus('Ready');

      return { success: true, kernel, ui };

    } catch (error) {
      console.error('[Boot] Unhandled boot failure:', error);
      this.diagnostics.recordFatalError(error);
      return this.enterEmergencyMode(error);
    }
  }

  async initializeKernel() {
    const startTime = performance.now();

    try {
      // Create kernel with timeout
      const kernel = await this.createKernelWithTimeout(5000);

      // Verify VFS health
      await this.verifyVFSHealth(kernel);

      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('kernel', duration, 'success');

      return { success: true, kernel };

    } catch (error) {
      const duration = performance.now() - startTime;
      this.diagnostics.recordStage('kernel', duration, 'failed', error);
      return { success: false, error };
    }
  }

  async verifyVFSHealth(kernel) {
    // Try to read a system file
    await kernel.stat('/');

    // Try to write to /tmp
    const testPath = `/tmp/.boot-test-${Date.now()}`;
    await kernel.writeFile(testPath, 'boot test');
    await kernel.readFile(testPath);
    await kernel.unlink(testPath);
  }

  enterEmergencyMode(error) {
    console.error('[Boot] Entering emergency mode:', error);

    // Generate diagnostic report
    const report = this.diagnostics.generateReport();

    // Show emergency UI
    const emergency = new EmergencyMode(error, report);
    emergency.show();

    this.status = 'emergency';
    return { success: false, mode: 'emergency', error, report };
  }
}
```

### 3. Emergency Mode (emergency.js)

```javascript
export class EmergencyMode {
  constructor(error, diagnostics) {
    this.error = error;
    this.diagnostics = diagnostics;
  }

  show() {
    // Hide normal UI, show emergency panel
    const container = document.getElementById('koma-workstation');
    container.innerHTML = this.renderEmergencyUI();

    this.attachEventHandlers();
  }

  renderEmergencyUI() {
    const diagId = `boot-${Date.now()}`;

    return `
      <div class="emergency-mode">
        <div class="emergency-header">
          <h1>⚠️ Koma Emergency Mode</h1>
        </div>

        <div class="emergency-content">
          <div class="error-message">
            <p>The Olivine kernel failed to initialize.</p>
            <p>You can restore your VFS from a backup.</p>
          </div>

          <div class="error-details">
            <strong>Error:</strong> ${this.error.message}
            <br>
            <strong>Diagnostic ID:</strong> <code>${diagId}</code>
          </div>

          <div class="restore-panel">
            <h2>Restore from .magma backup</h2>
            <input type="file" id="magma-file" accept=".magma">
            <button id="inject-btn" disabled>Inject & Restart</button>
          </div>

          <div class="actions">
            <button id="diagnostics-btn">View Diagnostics</button>
            <button id="retry-btn">Try Again</button>
            <button id="help-btn">Help</button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventHandlers() {
    // File upload
    document.getElementById('magma-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById('inject-btn').disabled = false;
        this.selectedFile = file;
      }
    });

    // Inject button
    document.getElementById('inject-btn').addEventListener('click', () => {
      this.performEmergencyRestore();
    });

    // Other buttons...
  }

  async performEmergencyRestore() {
    try {
      // Read .magma file
      const text = await this.selectedFile.text();
      const data = JSON.parse(text);

      // Directly manipulate IndexedDB (bypass kernel)
      await this.directVFSInject(data);

      // Reload page
      window.location.reload();

    } catch (error) {
      alert(`Failed to restore: ${error.message}`);
    }
  }

  async directVFSInject(magmaData) {
    // Open IndexedDB directly
    const db = await openIndexedDB();

    // Clear existing data
    await clearVFS(db);

    // Inject new data
    for (const entry of magmaData.entries) {
      await db.put(entry);
    }
  }
}
```

### 4. Boot Diagnostics (diagnostics.js)

```javascript
export class BootDiagnostics {
  constructor() {
    this.stages = [];
    this.errors = [];
    this.startTime = performance.now();
  }

  recordStage(name, duration, status, error = null) {
    this.stages.push({
      name,
      duration: Math.round(duration),
      status,
      error: error ? error.message : null,
      timestamp: Date.now()
    });
  }

  recordFatalError(error) {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
  }

  generateReport() {
    const totalTime = performance.now() - this.startTime;

    return {
      version: KOMA_VERSION,
      timestamp: new Date().toISOString(),
      totalBootTime: Math.round(totalTime),
      stages: this.stages,
      errors: this.errors,
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled
      },
      storage: this.getStorageInfo()
    };
  }

  async getStorageInfo() {
    if (!navigator.storage?.estimate) return null;

    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota,
      usage: estimate.usage,
      available: estimate.quota - estimate.usage
    };
  }

  // Download diagnostic report
  download() {
    const report = this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koma-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

### 5. Health Monitor (health-monitor.js)

```javascript
export class HealthMonitor {
  constructor(kernel) {
    this.kernel = kernel;
    this.checks = [];
    this.running = false;
  }

  start() {
    this.running = true;

    // VFS health check every 30s
    this.vfsCheckInterval = setInterval(() => {
      this.checkVFSHealth();
    }, 30000);

    // Auto-save state every 60s
    this.autoSaveInterval = setInterval(() => {
      this.autoSaveState();
    }, 60000);

    // Memory pressure monitoring
    if (performance.memory) {
      this.memoryCheckInterval = setInterval(() => {
        this.checkMemory();
      }, 10000);
    }
  }

  async checkVFSHealth() {
    try {
      // Verify we can still read/write
      const testPath = `/tmp/.health-${Date.now()}`;
      await this.kernel.writeFile(testPath, 'health check');
      await this.kernel.readFile(testPath);
      await this.kernel.unlink(testPath);

      this.recordCheck('vfs', 'pass');
    } catch (error) {
      this.recordCheck('vfs', 'fail', error);
      this.handleVFSFailure(error);
    }
  }

  async autoSaveState() {
    try {
      // Create automatic .magma backup
      const backup = await this.kernel.exportVFS();
      const path = `/home/.koma-autosave-${Date.now()}.magma`;
      await this.kernel.writeFile(path, backup);

      // Keep only last 3 autosaves
      await this.pruneOldAutosaves();

      this.recordCheck('autosave', 'pass');
    } catch (error) {
      this.recordCheck('autosave', 'fail', error);
    }
  }

  checkMemory() {
    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usage = usedJSHeapSize / jsHeapSizeLimit;

    if (usage > 0.9) {
      console.warn('[Health] High memory usage:', usage.toFixed(2));
      this.recordCheck('memory', 'warn', {
        message: `High memory usage: ${(usage * 100).toFixed(0)}%`
      });
    }
  }

  handleVFSFailure(error) {
    console.error('[Health] VFS health check failed:', error);

    // Notify user
    if (window.confirm('VFS health check failed. Restart Koma?')) {
      window.location.reload();
    }
  }

  stop() {
    this.running = false;
    clearInterval(this.vfsCheckInterval);
    clearInterval(this.autoSaveInterval);
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }
}
```

## Safe Mode

Hold **Shift** during page load to enter **Safe Mode**:
- Skip .komarc execution
- Minimal tab state restoration
- Disable background monitoring
- Good for debugging boot issues

## Boot Feedback UI

During boot, show status in status bar:
```
[Stage 0] Pre-flight checks... ✓
[Stage 1] Starting kernel... ⏳
[Stage 1] Kernel ready ✓
[Stage 2] Initializing UI... ✓
[Stage 3] Loading environment... ✓
Ready!
```

## Testing Strategy

1. **Preflight tests** - Mock browser capabilities
2. **Kernel failure tests** - Simulate IndexedDB errors
3. **Emergency mode tests** - Verify magma inject works
4. **Health monitor tests** - Verify checks run
5. **Safe mode tests** - Verify .komarc skip works

## Migration Path

1. Implement boot manager alongside existing code
2. Add feature flag: `ENABLE_BOOT_MANAGER`
3. Test with flag enabled
4. Default flag to enabled
5. Remove old initialization code

## Future Enhancements

- Boot configuration (skip health checks, adjust timeouts)
- Recovery mode from keyboard shortcut (Ctrl+K B-O-O-T)
- Boot performance profiling
- Lazy stdlib loading (load on demand vs upfront)
- Progressive Web App manifest for offline capability

## Success Metrics

- Boot time: < 1 second for cold start
- Emergency recovery: 100% success rate for magma inject
- Health detection: Catch VFS corruption before user action
- Zero catastrophic failures (always provide recovery path)
