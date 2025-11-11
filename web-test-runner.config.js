// @ts-check
/**
 * Web Test Runner Configuration
 * For browser-based integration tests with native ES modules
 */

import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  // Test files to run
  files: 'tests/integration/**/*.test.js',

  // Browsers to test
  browsers: [
    playwrightLauncher({
      product: 'chromium',
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    }),
  ],

  // Node resolve for bare imports (e.g., 'chai')
  nodeResolve: true,

  // Coverage reporting
  coverage: true,
  coverageConfig: {
    threshold: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
    include: ['src/**/*.js'],
    exclude: [
      'src/utils/man-pages.js',  // Auto-generated, skip coverage
      'node_modules/**',
      'tests/**',
    ],
    report: true,
    reportDir: 'coverage',
  },

  // Test framework configuration
  testFramework: {
    config: {
      timeout: 10000,  // 10 seconds per test
      ui: 'bdd',       // describe/it syntax
    },
  },

  // Static file serving
  rootDir: '.',

  // Watch mode for development
  watch: false,

  // Concurrency settings
  // Run tests serially to avoid VFS state interference
  concurrentBrowsers: 1,
  concurrency: 1,

  // Test runner plugins (can add more)
  plugins: [],

  // Debugging options
  manual: false,  // Set to true to keep browser open for debugging

  // Logging
  filterBrowserLogs: ({ type }) => {
    // Filter out console logs during tests
    return type !== 'log';
  },
};
