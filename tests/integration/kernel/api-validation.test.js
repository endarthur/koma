/**
 * Kernel API Validation Tests
 *
 * These tests verify that all documented kernel APIs are present and callable.
 * This prevents issues like the missing exists() method from happening again.
 */

import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';

describe('Kernel API Validation', () => {
  let kernel, cleanup;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    kernel = testVFS.kernel;
    cleanup = testVFS.cleanup;
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('File System API', () => {
    it('should have all file system methods', () => {
      const requiredMethods = [
        'readFile',
        'writeFile',
        'readdir',
        'mkdir',
        'unlink',
        'unlinkRecursive',
        'stat',
        'exists',
        'rename',
        'copyFile',
        'move'
      ];

      requiredMethods.forEach(method => {
        expect(kernel).to.have.property(method);
        expect(kernel[method]).to.be.a('function', `${method} should be a function`);
      });
    });

    it('should have working exists() method', async () => {
      // This test specifically verifies the recently added exists() method
      await kernel.writeFile('/home/test.txt', 'content');

      const exists = await kernel.exists('/home/test.txt');
      expect(exists).to.be.true;

      const notExists = await kernel.exists('/home/nonexistent.txt');
      expect(notExists).to.be.false;
    });
  });

  describe('Process Management API', () => {
    it('should have all process methods', () => {
      const requiredMethods = [
        'spawn',
        'kill',
        'ps',
        'wait',
        'getOutput',
        'setStdlib'
      ];

      requiredMethods.forEach(method => {
        expect(kernel).to.have.property(method);
        expect(kernel[method]).to.be.a('function', `${method} should be a function`);
      });
    });
  });

  describe('Scheduler API', () => {
    it('should have all scheduler methods', () => {
      const requiredMethods = [
        'crontab',
        'cronlist',
        'cronrm'
      ];

      requiredMethods.forEach(method => {
        expect(kernel).to.have.property(method);
        expect(kernel[method]).to.be.a('function', `${method} should be a function`);
      });
    });
  });

  describe('System Information API', () => {
    it('should have all system info methods', () => {
      const requiredMethods = [
        'ping',
        'getVersion',
        'getSystemInfo'
      ];

      requiredMethods.forEach(method => {
        expect(kernel).to.have.property(method);
        expect(kernel[method]).to.be.a('function', `${method} should be a function`);
      });
    });

    it('should have working ping() method', async () => {
      const response = await kernel.ping();
      expect(response).to.equal('pong');
    });
  });

  describe('System Update API', () => {
    it('should have all update methods', () => {
      const requiredMethods = [
        'checkSystemUpdate',
        'upgradeSystem',
        'resetSystem'
      ];

      requiredMethods.forEach(method => {
        expect(kernel).to.have.property(method);
        expect(kernel[method]).to.be.a('function', `${method} should be a function`);
      });
    });
  });

  describe('Backup/Restore API', () => {
    it('should have all backup methods', () => {
      const requiredMethods = [
        'exportVFS',
        'importVFS'
      ];

      requiredMethods.forEach(method => {
        expect(kernel).to.have.property(method);
        expect(kernel[method]).to.be.a('function', `${method} should be a function`);
      });
    });
  });

  describe('Complete API Surface', () => {
    it('should have all documented kernel methods', () => {
      const allRequiredMethods = [
        // File System
        'readFile', 'writeFile', 'readdir', 'mkdir', 'unlink',
        'stat', 'exists', 'rename', 'copyFile', 'move', 'unlinkRecursive',

        // Process Management
        'spawn', 'kill', 'ps', 'wait', 'getOutput', 'setStdlib',

        // Scheduler
        'crontab', 'cronlist', 'cronrm',

        // System Info
        'ping', 'getVersion', 'getSystemInfo',

        // System Updates
        'checkSystemUpdate', 'upgradeSystem', 'resetSystem',

        // Backup/Restore
        'exportVFS', 'importVFS'
      ];

      const missingMethods = [];
      allRequiredMethods.forEach(method => {
        if (typeof kernel[method] !== 'function') {
          missingMethods.push(method);
        }
      });

      expect(missingMethods).to.be.empty,
        `Missing kernel methods: ${missingMethods.join(', ')}. ` +
        `See docs/KERNEL_API.md for the complete API specification.`;
    });
  });

  describe('API Signature Validation', () => {
    it('should accept correct parameters for file operations', async () => {
      // Test that methods accept the documented parameters without throwing
      await kernel.writeFile('/home/test.txt', 'content');
      const content = await kernel.readFile('/home/test.txt');
      expect(content).to.equal('content');

      const stat = await kernel.stat('/home/test.txt');
      expect(stat).to.have.property('type');
      expect(stat).to.have.property('size');

      const exists = await kernel.exists('/home/test.txt');
      expect(exists).to.be.a('boolean');
    });
  });
});
