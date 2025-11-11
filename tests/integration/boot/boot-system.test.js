/**
 * Boot System Integration Tests
 * Tests production-grade boot components in real browser
 */

import { expect } from 'chai';

describe('Boot System', () => {

  describe('Safe Mode Detection', () => {
    afterEach(() => {
      // Clean up safe mode state after each test
      localStorage.removeItem('koma-safe-mode');
      const url = new URL(window.location.href);
      url.searchParams.delete('safemode');
      url.searchParams.delete('safe');
      history.replaceState({}, '', url.toString());
    });

    // Run this test FIRST before safe mode gets activated
    it('should return config object with correct structure', async () => {
      const { getSafeModeConfig } = await import('../../../src/boot/safe-mode.js');

      const config = getSafeModeConfig();

      // Config should have all required fields (boolean values)
      expect(config).to.have.property('safeMode');
      expect(config).to.have.property('skipKomarc');
      expect(config).to.have.property('skipHealth');
      expect(config).to.have.property('singleTab');
      expect(config.safeMode).to.be.a('boolean');
      expect(config.skipKomarc).to.be.a('boolean');
      expect(config.skipHealth).to.be.a('boolean');
      expect(config.singleTab).to.be.a('boolean');
    });

    it('should detect safe mode from URL parameter', async () => {
      const { initSafeMode, getSafeModeConfig } = await import('../../../src/boot/safe-mode.js');

      // Simulate URL parameter
      const originalSearch = window.location.search;
      history.replaceState({}, '', '?safemode');

      const isActive = initSafeMode();
      const config = getSafeModeConfig();

      expect(isActive).to.be.true;
      expect(config.safeMode).to.be.true;
      expect(config.skipKomarc).to.be.true;
      expect(config.skipHealth).to.be.true;
      expect(config.singleTab).to.be.true;

      // Restore URL
      history.replaceState({}, '', originalSearch);
    });

    it('should detect safe mode from localStorage', async () => {
      const { initSafeMode, getSafeModeConfig, disableSafeMode } = await import('../../../src/boot/safe-mode.js');

      // Set localStorage flag
      localStorage.setItem('koma-safe-mode', 'true');

      const isActive = initSafeMode();
      const config = getSafeModeConfig();

      expect(isActive).to.be.true;
      expect(config.safeMode).to.be.true;

      // Cleanup
      disableSafeMode();
    });
  });

  describe('Boot Diagnostics', () => {
    it('should create boot diagnostic instance', async () => {
      const { BootDiagnostics } = await import('../../../src/boot/diagnostics.js');

      const diagnostics = new BootDiagnostics();

      expect(diagnostics).to.exist;
      expect(diagnostics.stages).to.be.an('array');
      expect(diagnostics.errors).to.be.an('array');
      expect(diagnostics.warnings).to.be.an('array');
      expect(diagnostics.bootId).to.be.a('string');
      expect(diagnostics.bootId).to.match(/^boot-/);
    });

    it('should record boot stage with timing', async () => {
      const { BootDiagnostics } = await import('../../../src/boot/diagnostics.js');

      const diagnostics = new BootDiagnostics();
      const stage = diagnostics.recordStage('test-stage', 123.45, 'success', null, { foo: 'bar' });

      expect(stage.name).to.equal('test-stage');
      expect(stage.duration).to.equal(123.45);
      expect(stage.status).to.equal('success');
      expect(stage.details.foo).to.equal('bar');
      expect(stage.timestamp).to.be.a('number');

      expect(diagnostics.stages).to.have.lengthOf(1);
      expect(diagnostics.stages[0]).to.equal(stage);
    });

    it('should record fatal error with context', async () => {
      const { BootDiagnostics } = await import('../../../src/boot/diagnostics.js');

      const diagnostics = new BootDiagnostics();
      const testError = new Error('Test fatal error');
      const errorRecord = diagnostics.recordFatalError(testError, { stage: 'kernel' });

      expect(errorRecord.type).to.equal('fatal');
      expect(errorRecord.message).to.equal('Test fatal error');
      expect(errorRecord.stack).to.exist;
      expect(errorRecord.context.stage).to.equal('kernel');

      expect(diagnostics.errors).to.have.lengthOf(1);
    });

    it('should record warning', async () => {
      const { BootDiagnostics } = await import('../../../src/boot/diagnostics.js');

      const diagnostics = new BootDiagnostics();
      const warning = diagnostics.recordWarning('Test warning', { severity: 'low' });

      expect(warning.message).to.equal('Test warning');
      expect(warning.details.severity).to.equal('low');

      expect(diagnostics.warnings).to.have.lengthOf(1);
    });

    it('should generate comprehensive report', async () => {
      const { BootDiagnostics } = await import('../../../src/boot/diagnostics.js');

      const diagnostics = new BootDiagnostics();
      diagnostics.recordStage('preflight', 10, 'success');
      diagnostics.recordStage('kernel', 500, 'success');
      diagnostics.recordWarning('Low storage');

      const report = await diagnostics.generateReport();

      expect(report.bootId).to.equal(diagnostics.bootId);
      expect(report.komaVersion).to.be.a('string');
      expect(report.summary).to.exist;
      expect(report.summary.stagesCompleted).to.equal(2);
      expect(report.summary.warnings).to.equal(1);
      expect(report.stages).to.have.lengthOf(2);
      expect(report.environment).to.exist;
      expect(report.environment.browser).to.exist;
      expect(report.features).to.exist;
    });

    it('should generate text report', async () => {
      const { BootDiagnostics } = await import('../../../src/boot/diagnostics.js');

      const diagnostics = new BootDiagnostics();
      diagnostics.recordStage('test', 100, 'success');

      const text = await diagnostics.generateTextReport();

      expect(text).to.be.a('string');
      expect(text).to.include('KOMA BOOT DIAGNOSTIC REPORT');
      expect(text).to.include('Boot ID:');
      expect(text).to.include('SUMMARY');
      expect(text).to.include('BOOT STAGES');
      expect(text).to.include('test');
    });

    it('should detect browser features', async () => {
      const { BootDiagnostics } = await import('../../../src/boot/diagnostics.js');

      const diagnostics = new BootDiagnostics();
      const report = await diagnostics.generateReport();

      expect(report.features.indexedDB).to.be.true; // Should be true in browser
      expect(report.features.webWorkers).to.be.true;
      expect(report.features.localStorage).to.be.true;
    });
  });

  describe('Pre-flight Checks', () => {
    it('should run all preflight checks successfully', async () => {
      const { runPreflightChecks } = await import('../../../src/boot/preflight.js');

      const result = await runPreflightChecks();

      expect(result).to.exist;
      expect(result.success).to.be.true;
      expect(result.results.indexedDB).to.exist;
      expect(result.results.indexedDB.status).to.equal('pass');
      expect(result.results.webWorkers).to.exist;
      expect(result.results.webWorkers.status).to.equal('pass');
      expect(result.results.esModules).to.exist;
      expect(result.results.esModules.status).to.equal('pass');
    });

    it('should check storage quota', async () => {
      const { runPreflightChecks } = await import('../../../src/boot/preflight.js');

      const result = await runPreflightChecks();

      expect(result.results.storage).to.exist;
      expect(result.results.storage.status).to.be.oneOf(['pass', 'warn']);

      if (result.results.storage.available !== undefined) {
        expect(result.results.storage.available).to.be.a('number');
        expect(result.results.storage.quota).to.be.a('number');
      }
    });

    it('should generate preflight report', async () => {
      const { runPreflightChecks, generatePreflightReport } = await import('../../../src/boot/preflight.js');

      const result = await runPreflightChecks();
      const report = generatePreflightReport(result);

      expect(report).to.be.a('string');
      expect(report).to.include('Koma Preflight Check Report');
      expect(report).to.include('indexedDB');
      expect(report).to.include('webWorkers');
      expect(report).to.include('storage');
    });
  });

  describe('Health Monitor Session State', () => {
    let kernel, cleanup;

    beforeEach(async () => {
      // Import helper to create test VFS
      const { createTestVFS } = await import('../../helpers/vfs-test-helper.js');
      const testVFS = await createTestVFS();
      kernel = testVFS.kernel;
      cleanup = testVFS.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should create session state backup structure', async () => {
      const { HealthMonitor } = await import('../../../src/boot/health-monitor.js');

      // Create mock shale with tabs
      const mockShale = {
        activeTabId: 'tab1',
        tabs: new Map([
          ['tab1', {
            name: '1:main',
            shell: {
              cwd: '/home',
              history: ['ls', 'pwd', 'echo test']
            },
            currentLine: 'cat file.txt',
            cursorPos: 13
          }],
          ['tab2', {
            name: '2:dev',
            shell: {
              cwd: '/home/project',
              history: ['cd project', 'ls']
            },
            currentLine: '',
            cursorPos: 0
          }]
        ])
      };

      const monitor = new HealthMonitor(kernel, mockShale);
      const tabsState = monitor.getTabsState();

      expect(tabsState).to.be.an('array');
      expect(tabsState).to.have.lengthOf(2);

      const tab1 = tabsState[0];
      expect(tab1.id).to.equal('tab1');
      expect(tab1.name).to.equal('1:main');
      expect(tab1.cwd).to.equal('/home');
      expect(tab1.currentInput).to.equal('cat file.txt');
      expect(tab1.cursorPos).to.equal(13);
      expect(tab1.history).to.deep.equal(['ls', 'pwd', 'echo test']);
    });

    it('should limit history in session backup', async () => {
      const { HealthMonitor } = await import('../../../src/boot/health-monitor.js');

      // Create mock with lots of history
      const largeHistory = Array.from({ length: 200 }, (_, i) => `command${i}`);
      const mockShale = {
        activeTabId: 'tab1',
        tabs: new Map([
          ['tab1', {
            name: '1:main',
            shell: {
              cwd: '/home',
              history: largeHistory
            },
            currentLine: '',
            cursorPos: 0
          }]
        ])
      };

      const monitor = new HealthMonitor(kernel, mockShale);
      const tabsState = monitor.getTabsState();

      // Should only keep last 100 commands
      expect(tabsState[0].history).to.have.lengthOf(100);
      expect(tabsState[0].history[0]).to.equal('command100'); // First of last 100
      expect(tabsState[0].history[99]).to.equal('command199'); // Last command
    });

    it('should store and retrieve session state', async () => {
      const { HealthMonitor } = await import('../../../src/boot/health-monitor.js');

      const mockShale = {
        activeTabId: 'test-tab',
        tabs: new Map([
          ['test-tab', {
            name: 'test',
            shell: { cwd: '/tmp', history: ['test'] },
            currentLine: 'test input',
            cursorPos: 10
          }]
        ])
      };

      const monitor = new HealthMonitor(kernel, mockShale);
      await monitor.saveSessionState();

      // Retrieve it
      const loaded = await HealthMonitor.loadSessionState();

      expect(loaded).to.exist;
      expect(loaded.activeTabId).to.equal('test-tab');
      expect(loaded.tabs).to.be.an('array');
      expect(loaded.tabs[0].currentInput).to.equal('test input');
      expect(loaded.version).to.equal('1.0');
    });
  });
});
