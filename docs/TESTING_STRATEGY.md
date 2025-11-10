# Koma Testing Strategy

**Version:** 1.1
**Date:** 2025-11-10
**Status:** Active

## Executive Summary

This document outlines a comprehensive testing strategy for Koma, a browser-resident Unix terminal emulator built with pure vanilla JavaScript and ES modules. The strategy respects Koma's core constraints (no npm, no build tools, static hosting) while providing robust test coverage for upcoming shell programming features in Phase 6.

**Recommended Approach:** **Web Test Runner + uvu** - Browser-native ES module testing with minimal dependencies.

**Package Manager:** **Bun recommended** (10-20x faster than npm), but npm works fine too. Both are supported.

**Quick Start:** See [TESTING.md](../TESTING.md) for a 10-minute quick start guide.

---

## Table of Contents

1. [Testing Framework Selection](#testing-framework-selection)
2. [Test Organization](#test-organization)
3. [Testing Infrastructure](#testing-infrastructure)
4. [VFS and IndexedDB Testing](#vfs-and-indexeddb-testing)
5. [Shell Feature Testing](#shell-feature-testing)
6. [Test Coverage Priorities](#test-coverage-priorities)
7. [Continuous Integration](#continuous-integration)
8. [Example Test Files](#example-test-files)
9. [Test Running Instructions](#test-running-instructions)
10. [Phase 6 Test Plan](#phase-6-test-plan)

---

## Testing Framework Selection

### Research Summary

After evaluating multiple testing approaches for vanilla JavaScript ES modules, three primary options emerged:

#### Option 1: Web Test Runner (RECOMMENDED)
**Pros:**
- Native ES module support in real browsers
- No build step required
- Works with Playwright/Puppeteer for headless testing
- Fast parallel test execution
- Active maintenance and modern web standards
- Watch mode for development
- Mock ES modules using Import Maps

**Cons:**
- Requires npm for the test runner itself (but not for code)
- Slightly heavier than pure browser testing

**Verdict:** Best balance of features and constraints. The test runner uses npm, but the tested code remains pure vanilla JS.

#### Option 2: uvu (Lightweight Alternative)
**Pros:**
- Extremely fast (72ms vs Jest's 962ms)
- Native ES module support
- Works in browsers and Node.js
- Tiny footprint (~5KB)
- Familiar API

**Cons:**
- Primarily designed for Node.js
- Browser testing requires additional setup
- Less mature ecosystem than Web Test Runner

**Verdict:** Excellent for unit tests that don't require browser APIs.

#### Option 3: Deno Test Runner (Future Option)
**Pros:**
- Built-in test runner with zero config
- Native ES modules
- Can target browser-compatible code
- Modern TypeScript support

**Cons:**
- Requires Deno runtime installation
- Not true browser testing
- Less familiar to web developers

**Verdict:** Worth considering for future, but Web Test Runner is more appropriate now.

#### Option 4: Browser-Native Testing (Minimal)
**Pros:**
- Zero dependencies
- Pure browser environment
- Complete control

**Cons:**
- Manual test harness required
- No parallel execution
- No CLI integration
- Limited reporting

**Verdict:** Too primitive for a project of Koma's complexity.

### Final Recommendation

**Primary:** Web Test Runner with Playwright for browser testing
**Secondary:** uvu for pure JavaScript unit tests (utils, parsers, etc.)
**Assertion Library:** Chai (ES module compatible) or Web Test Runner's built-in assertions

This hybrid approach gives us:
- Real browser testing for IndexedDB, Web Workers, and UI
- Fast unit testing for pure JavaScript logic
- CI/CD compatibility
- No build step for Koma code itself

---

## Test Organization

### Directory Structure

```
koma/
├── tests/                          # All tests here
│   ├── unit/                       # Unit tests (uvu)
│   │   ├── shell/
│   │   │   ├── parser.test.js      # Shell parsing tests
│   │   │   ├── tokenizer.test.js   # Tokenization tests
│   │   │   ├── pipeline.test.js    # Pipeline parsing tests
│   │   │   └── variables.test.js   # Variable expansion (Phase 6)
│   │   ├── utils/
│   │   │   ├── path.test.js        # Path utilities
│   │   │   ├── args.test.js        # Argument parsing
│   │   │   └── command-utils.test.js
│   │   └── stdlib/
│   │       ├── fs.test.js          # Filesystem module tests
│   │       ├── http.test.js        # HTTP module tests
│   │       └── path.test.js        # Path module tests
│   ├── integration/                # Integration tests (Web Test Runner)
│   │   ├── commands/
│   │   │   ├── ls.test.js          # ls command tests
│   │   │   ├── cat.test.js         # cat command tests
│   │   │   ├── grep.test.js        # grep command tests
│   │   │   ├── pipes.test.js       # Pipeline integration
│   │   │   └── redirects.test.js   # Redirection tests
│   │   ├── vfs/
│   │   │   ├── basic-ops.test.js   # CRUD operations
│   │   │   ├── directories.test.js # Directory operations
│   │   │   └── persistence.test.js # IndexedDB persistence
│   │   ├── kernel/
│   │   │   ├── olivine.test.js     # Kernel initialization
│   │   │   ├── process.test.js     # Process execution
│   │   │   └── scheduler.test.js   # Cron scheduler
│   │   └── shell/
│   │       ├── execution.test.js   # Command execution
│   │       ├── variables.test.js   # Variable substitution (Phase 6)
│   │       ├── conditionals.test.js # If/then/else (Phase 6)
│   │       └── loops.test.js       # For/while loops (Phase 6)
│   ├── e2e/                        # End-to-end tests
│   │   ├── user-workflows.test.js  # Complete user scenarios
│   │   └── phase6-features.test.js # Phase 6 shell programming
│   ├── fixtures/                   # Test data and fixtures
│   │   ├── vfs-snapshots/          # Pre-populated VFS states
│   │   ├── sample-files/           # Test files
│   │   └── scripts/                # Test scripts
│   ├── helpers/                    # Test utilities
│   │   ├── vfs-test-helper.js      # VFS test utilities
│   │   ├── shell-test-helper.js    # Shell test utilities
│   │   └── mock-terminal.js        # Terminal mock
│   └── setup/                      # Test setup
│       ├── browser-test-setup.js   # Web Test Runner setup
│       └── teardown.js             # Cleanup utilities
├── web-test-runner.config.js       # Web Test Runner config
├── package.json                    # Test dependencies only
└── .github/
    └── workflows/
        └── test.yml                # CI/CD GitHub Actions
```

### Test Organization Principles

1. **By Test Type:** Unit → Integration → E2E (increasing complexity)
2. **By Feature Area:** Commands, VFS, Shell, Kernel
3. **By Phase:** Current features + Phase 6 tests in separate files
4. **Fixtures Separate:** Test data isolated from test logic

---

## Testing Infrastructure

### Web Test Runner Setup

#### Installation

```bash
# Recommended: Bun (10-20x faster)
bun install

# Alternative: Node.js + npm
npm install

# This installs:
# - @web/test-runner (browser testing)
# - @web/test-runner-playwright (headless browser)
# - chai (assertions)
# - uvu (unit tests)
# - playwright (browser automation)
```

#### Configuration (`web-test-runner.config.js`)

```javascript
// @ts-check
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  // Test files to run
  files: 'tests/**/*.test.js',

  // Browsers to test (Chromium for now, can add Firefox/WebKit)
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],

  // Node resolve for bare imports
  nodeResolve: true,

  // Coverage reporting
  coverage: true,
  coverageConfig: {
    threshold: {
      statements: 60,  // Start low, increase over time
      branches: 50,
      functions: 60,
      lines: 60,
    },
    include: ['src/**/*.js'],
    exclude: [
      'src/utils/man-pages.js',  // Auto-generated
      'node_modules/**',
    ],
  },

  // Test timeout
  testFramework: {
    config: {
      timeout: 5000,  // 5 seconds
    },
  },

  // Serve static files
  rootDir: '.',

  // Watch mode for development
  watch: false,

  // Concurrency
  concurrentBrowsers: 2,
  concurrency: 4,
};
```

### uvu Setup for Unit Tests

#### Test Runner Script (`tests/run-unit-tests.js`)

```javascript
#!/usr/bin/env node
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function runUnitTests() {
  console.log('Running unit tests with uvu...\n');

  try {
    const { stdout, stderr } = await execAsync('npx uvu tests/unit');
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('Unit tests failed:', error.message);
    process.exit(1);
  }
}

runUnitTests();
```

### Package Scripts

Run with either `bun` or `npm`:

```json
{
  "name": "koma-tests",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "uvu tests/unit",
    "test:integration": "web-test-runner",
    "test:watch": "web-test-runner --watch",
    "test:coverage": "web-test-runner --coverage",
    "test:debug": "web-test-runner --manual",
    "test:ci": "npm run test:unit && web-test-runner --coverage"
  },
  "devDependencies": {
    "@web/test-runner": "^0.18.0",
    "@web/test-runner-playwright": "^0.11.0",
    "chai": "^5.0.0",
    "uvu": "^0.5.6",
    "playwright": "^1.40.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.0.0"
  }
}
```

**Usage:**
```bash
bun test          # or: npm test
bun run test:unit # or: npm run test:unit
```

---

## VFS and IndexedDB Testing

### Challenge: Isolated Test Databases

IndexedDB is per-origin, so tests could pollute each other. Solutions:

#### Approach 1: Random Database Names (Recommended)

```javascript
// tests/helpers/vfs-test-helper.js
import { kernelClient } from '../../src/kernel/client.js';

/**
 * Create a test VFS instance with isolated database
 */
export async function createTestVFS() {
  const testDbName = `KomaVFS_Test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Initialize kernel with test database
  const kernel = await kernelClient.getKernel();

  // Override database name (requires kernel modification)
  await kernel.initTestDatabase(testDbName);

  return {
    kernel,
    dbName: testDbName,
    cleanup: async () => {
      // Delete test database
      await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(testDbName);
        req.onsuccess = resolve;
        req.onerror = reject;
      });
    }
  };
}

/**
 * Populate VFS with test fixtures
 */
export async function populateTestFixtures(kernel, fixtures) {
  for (const [path, content] of Object.entries(fixtures)) {
    await kernel.writeFile(path, content);
  }
}
```

#### Approach 2: Clear Database Before/After Tests

```javascript
// tests/setup/browser-test-setup.js
export async function beforeEach() {
  // Clear IndexedDB before each test
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    if (db.name.startsWith('KomaVFS')) {
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(db.name);
        req.onsuccess = resolve;
        req.onerror = resolve;
      });
    }
  }
}
```

### Testing VFS Operations

#### Basic CRUD Tests

```javascript
// tests/integration/vfs/basic-ops.test.js
import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';

describe('VFS Basic Operations', () => {
  let vfs, cleanup;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should create and read a file', async () => {
    await vfs.writeFile('/home/test.txt', 'hello world');
    const content = await vfs.readFile('/home/test.txt');
    expect(content).to.equal('hello world');
  });

  it('should create directories', async () => {
    await vfs.mkdir('/home/projects');
    const stat = await vfs.stat('/home/projects');
    expect(stat.type).to.equal('directory');
  });

  it('should list directory contents', async () => {
    await vfs.writeFile('/home/file1.txt', 'content1');
    await vfs.writeFile('/home/file2.txt', 'content2');

    const files = await vfs.readdir('/home');
    const names = files.map(f => f.name);

    expect(names).to.include('file1.txt');
    expect(names).to.include('file2.txt');
  });

  it('should delete files', async () => {
    await vfs.writeFile('/home/temp.txt', 'temporary');
    await vfs.unlink('/home/temp.txt');

    try {
      await vfs.readFile('/home/temp.txt');
      expect.fail('File should not exist');
    } catch (error) {
      expect(error.code).to.equal('ENOENT');
    }
  });
});
```

### Testing Persistence

```javascript
// tests/integration/vfs/persistence.test.js
import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';

describe('VFS Persistence', () => {
  it('should persist files across kernel restarts', async () => {
    let testVFS = await createTestVFS();
    const dbName = testVFS.dbName;

    // Write file
    await testVFS.kernel.writeFile('/home/persistent.txt', 'data');

    // Cleanup (but don't delete database)
    // In real scenario, kernel would restart

    // Create new VFS instance with same database
    testVFS = await createTestVFS(); // Simulate restart

    // Read file
    const content = await testVFS.kernel.readFile('/home/persistent.txt');
    expect(content).to.equal('data');

    await testVFS.cleanup();
  });
});
```

---

## Shell Feature Testing

### Command Parsing Tests (Unit)

```javascript
// tests/unit/shell/parser.test.js
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { Shell } from '../../../src/shell.js';

// Mock terminal
const mockTerm = {
  write: () => {},
  writeln: () => {},
};

test('should parse simple command', () => {
  const shell = new Shell(mockTerm);
  const parsed = shell.parseCommand('ls -l /home');

  assert.equal(parsed.command, 'ls');
  assert.equal(parsed.args, ['-l', '/home']);
});

test('should handle quoted arguments', () => {
  const shell = new Shell(mockTerm);
  const parsed = shell.parseCommand('echo "hello world"');

  assert.equal(parsed.command, 'echo');
  assert.equal(parsed.args, ['hello world']);
});

test('should tokenize pipeline', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('cat file.txt | grep foo | sort');

  assert.equal(tokens, ['cat', 'file.txt', '|', 'grep', 'foo', '|', 'sort']);
});

test('should parse output redirection', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('ls > files.txt');

  assert.equal(pipeline.stages.length, 1);
  assert.equal(pipeline.outputFile, 'files.txt');
  assert.equal(pipeline.outputMode, 'write');
});

test('should parse append redirection', () => {
  const shell = new Shell(mockTerm);
  const pipeline = shell.parsePipeline('echo text >> log.txt');

  assert.equal(pipeline.outputFile, 'log.txt');
  assert.equal(pipeline.outputMode, 'append');
});

test('should split by semicolons', () => {
  const shell = new Shell(mockTerm);
  const segments = shell.splitBySemicolon('cd /home ; ls ; pwd');

  assert.equal(segments, ['cd /home', 'ls', 'pwd']);
});

test('should respect quotes in semicolon split', () => {
  const shell = new Shell(mockTerm);
  const segments = shell.splitBySemicolon('echo "foo ; bar" ; ls');

  assert.equal(segments, ['echo "foo ; bar"', 'ls']);
});

test.run();
```

### Pipeline Execution Tests (Integration)

```javascript
// tests/integration/commands/pipes.test.js
import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { Shell } from '../../../src/shell.js';
import { registerAllCommands } from '../../../src/commands/index.js';

describe('Pipeline Execution', () => {
  let vfs, cleanup, shell, output;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Create mock terminal that captures output
    output = [];
    const mockTerm = {
      write: (text) => output.push(text),
      writeln: (text) => output.push(text + '\n'),
    };

    shell = new Shell(mockTerm);
    registerAllCommands(shell);

    // Populate test files
    await vfs.writeFile('/home/test.txt', 'apple\nbanana\ncherry\napple');
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should execute simple pipeline', async () => {
    await shell.execute('cat /home/test.txt | grep apple');

    const result = output.join('');
    expect(result).to.include('apple');
    expect(result).not.to.include('banana');
  });

  it('should execute multi-stage pipeline', async () => {
    await shell.execute('cat /home/test.txt | grep apple | wc -l');

    const result = output.join('');
    expect(result).to.include('2'); // Two lines with 'apple'
  });

  it('should redirect output to file', async () => {
    await shell.execute('echo "test output" > /home/out.txt');

    const content = await vfs.readFile('/home/out.txt');
    expect(content).to.equal('test output');
  });

  it('should append to file', async () => {
    await vfs.writeFile('/home/log.txt', 'line 1\n');
    await shell.execute('echo "line 2" >> /home/log.txt');

    const content = await vfs.readFile('/home/log.txt');
    expect(content).to.include('line 1');
    expect(content).to.include('line 2');
  });
});
```

### Command Context Tests (Unit)

```javascript
// tests/unit/utils/command-context.test.js
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import {
  CommandContext,
  createTerminalContext,
  createPipedContext
} from '../../../src/utils/command-context.js';

const mockTerm = {
  writes: [],
  write: function(text) { this.writes.push(text); },
  writeln: function(text) { this.writes.push(text + '\n'); },
};

test('terminal context writes directly', () => {
  const ctx = createTerminalContext(mockTerm);
  ctx.writeln('hello');

  assert.is(mockTerm.writes.length, 1);
  assert.is(ctx.getStdout(), '');
});

test('piped context buffers output', () => {
  const ctx = createPipedContext(mockTerm, '');
  ctx.writeln('hello');
  ctx.writeln('world');

  assert.is(ctx.getStdout(), 'hello\nworld');
});

test('piped context provides stdin', () => {
  const ctx = createPipedContext(mockTerm, 'input\ndata');

  assert.is(ctx.hasStdin(), true);
  assert.equal(ctx.getStdinLines(), ['input', 'data']);
});

test.run();
```

---

## Test Coverage Priorities

### MUST Test (Critical Paths) - Target: 80% Coverage

**Shell Core:**
- ✅ Command parsing (tokenization, quote handling)
- ✅ Pipeline parsing (pipes, redirects)
- ✅ Command execution (simple and pipeline)
- ✅ Semicolon separator
- 🔜 Variable expansion (Phase 6)
- 🔜 Exit code handling (Phase 6)
- 🔜 Test command logic (Phase 6)

**VFS Operations:**
- ✅ File CRUD (create, read, update, delete)
- ✅ Directory operations (mkdir, readdir, stat)
- ✅ Path resolution (absolute, relative, .., ~)
- ✅ Error handling (ENOENT, EISDIR, etc.)
- ✅ Persistence (IndexedDB)

**Command Execution:**
- ✅ ls, cat, grep, find, sort (core commands)
- ✅ Pipes and redirects
- ✅ Context-aware output
- 🔜 Exit codes (Phase 6)

### SHOULD Test (Important Features) - Target: 60% Coverage

**Argument Parsing:**
- ✅ Flag parsing (-v, --verbose)
- ✅ Option parsing (-o file, --output=file)
- ✅ Combined flags (-abc)
- ✅ Positional arguments
- ✅ Error handling

**Process Management:**
- Script execution (run command)
- stdout/stderr capture
- Process killing
- Exit codes

**Scheduler:**
- Cron expression parsing
- Job scheduling
- Job execution
- Job removal

**Stdlib Modules:**
- fs module functions
- http module functions
- path module functions
- args module functions

### COULD Test (Nice-to-Have) - Target: 40% Coverage

**UI Components:**
- Terminal initialization
- Tab management
- Editor integration
- Activity LED

**Man Pages:**
- Man page rendering
- Help text generation

**Advanced Shell Features:**
- Command substitution (Phase 6+)
- Heredocs (Phase 9)
- Complex variable expansion (Phase 7+)

### Coverage Thresholds

**Initial (v1.0):**
- Statements: 60%
- Branches: 50%
- Functions: 60%
- Lines: 60%

**Target (v2.0 - After Phase 6):**
- Statements: 75%
- Branches: 65%
- Functions: 75%
- Lines: 75%

**Aspirational (v3.0):**
- Statements: 85%
- Branches: 75%
- Functions: 85%
- Lines: 85%

---

## Continuous Integration

### GitHub Actions Workflow (`.github/workflows/test.yml`)

**With Bun (Recommended - Faster):**

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps chromium

      - name: Run all tests
        run: bun run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

**Or with Node.js + npm:**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run all tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Branch Protection Rules

Configure in GitHub repository settings:

- **Require status checks to pass before merging**
  - unit-tests
  - integration-tests
  - lint

- **Require branches to be up to date before merging**

- **Require pull request reviews** (optional)

---

## Example Test Files

### Example 1: Shell Tokenizer (Unit Test)

```javascript
// tests/unit/shell/tokenizer.test.js
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { Shell } from '../../../src/shell.js';

const mockTerm = { write: () => {}, writeln: () => {} };

test('tokenize: basic command', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('ls -l /home');
  assert.equal(tokens, ['ls', '-l', '/home']);
});

test('tokenize: double quotes', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('echo "hello world"');
  assert.equal(tokens, ['echo', 'hello world']);
});

test('tokenize: single quotes', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize("echo 'hello world'");
  assert.equal(tokens, ['echo', 'hello world']);
});

test('tokenize: pipes', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('cat file | grep foo');
  assert.equal(tokens, ['cat', 'file', '|', 'grep', 'foo']);
});

test('tokenize: redirect', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('ls > output.txt');
  assert.equal(tokens, ['ls', '>', 'output.txt']);
});

test('tokenize: append redirect', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('echo text >> log.txt');
  assert.equal(tokens, ['echo', 'text', '>>', 'log.txt']);
});

test('tokenize: mixed quotes and operators', () => {
  const shell = new Shell(mockTerm);
  const tokens = shell.tokenize('grep "foo | bar" file.txt | sort');
  assert.equal(tokens, ['grep', 'foo | bar', 'file.txt', '|', 'sort']);
});

test.run();
```

### Example 2: VFS Integration Test

```javascript
// tests/integration/vfs/directories.test.js
import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';

describe('VFS Directory Operations', () => {
  let vfs, cleanup;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should create nested directories', async () => {
    await vfs.mkdir('/home/projects');
    await vfs.mkdir('/home/projects/koma');

    const stat = await vfs.stat('/home/projects/koma');
    expect(stat.type).to.equal('directory');
  });

  it('should list directory contents', async () => {
    await vfs.mkdir('/home/dir1');
    await vfs.mkdir('/home/dir2');
    await vfs.writeFile('/home/file1.txt', 'content');

    const entries = await vfs.readdir('/home');
    const names = entries.map(e => e.name);

    expect(names).to.include('dir1');
    expect(names).to.include('dir2');
    expect(names).to.include('file1.txt');
  });

  it('should distinguish files from directories', async () => {
    await vfs.mkdir('/home/mydir');
    await vfs.writeFile('/home/myfile.txt', 'content');

    const entries = await vfs.readdir('/home');

    const dir = entries.find(e => e.name === 'mydir');
    const file = entries.find(e => e.name === 'myfile.txt');

    expect(dir.type).to.equal('directory');
    expect(file.type).to.equal('file');
  });

  it('should handle stat on files and directories', async () => {
    await vfs.mkdir('/home/testdir');
    await vfs.writeFile('/home/testfile.txt', 'hello');

    const dirStat = await vfs.stat('/home/testdir');
    const fileStat = await vfs.stat('/home/testfile.txt');

    expect(dirStat.type).to.equal('directory');
    expect(fileStat.type).to.equal('file');
    expect(fileStat.size).to.equal(5); // 'hello'.length
  });

  it('should throw ENOENT for non-existent paths', async () => {
    try {
      await vfs.stat('/home/nonexistent');
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error.code).to.equal('ENOENT');
    }
  });
});
```

### Example 3: Command Execution Test

```javascript
// tests/integration/commands/grep.test.js
import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('grep command', () => {
  let vfs, cleanup, shell, output;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const testShell = createMockShell();
    shell = testShell.shell;
    output = testShell.output;

    // Create test file
    await vfs.writeFile('/home/test.txt',
      'apple\nbanana\napple pie\ncherry\napple sauce'
    );
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should find matching lines', async () => {
    await shell.execute('grep apple /home/test.txt');

    const result = output.join('\n');
    expect(result).to.include('apple');
    expect(result).to.include('apple pie');
    expect(result).to.include('apple sauce');
    expect(result).not.to.include('banana');
  });

  it('should support -i flag for case-insensitive', async () => {
    await vfs.writeFile('/home/mixed.txt', 'Apple\napple\nAPPLE\nbanana');
    await shell.execute('grep -i apple /home/mixed.txt');

    const result = output.join('\n');
    expect(result).to.include('Apple');
    expect(result).to.include('apple');
    expect(result).to.include('APPLE');
  });

  it('should support -n flag for line numbers', async () => {
    await shell.execute('grep -n apple /home/test.txt');

    const result = output.join('\n');
    expect(result).to.match(/1:apple/);
    expect(result).to.match(/3:apple pie/);
  });

  it('should work with piped input', async () => {
    await shell.execute('cat /home/test.txt | grep apple');

    const result = output.join('\n');
    expect(result).to.include('apple');
  });
});
```

### Example 4: Phase 6 Variable Expansion Test (Future)

```javascript
// tests/integration/shell/variables.test.js
import { expect } from 'chai';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Variable Expansion (Phase 6)', () => {
  let shell, output;

  beforeEach(() => {
    const testShell = createMockShell();
    shell = testShell.shell;
    output = testShell.output;
  });

  it('should set and expand variables', async () => {
    await shell.execute('NAME=Alice');
    await shell.execute('echo Hello $NAME');

    expect(output).to.include('Hello Alice');
  });

  it('should expand variables in braces', async () => {
    await shell.execute('FILE=test');
    await shell.execute('echo ${FILE}.txt');

    expect(output).to.include('test.txt');
  });

  it('should handle undefined variables', async () => {
    await shell.execute('echo $UNDEFINED');

    // Should output empty string or error, depending on implementation
    expect(output.join('')).to.equal('');
  });

  it('should expand variables in commands', async () => {
    await shell.execute('DIR=/home');
    await shell.execute('cd $DIR');

    expect(shell.cwd).to.equal('/home');
  });

  it('should support exit code variable', async () => {
    await shell.execute('ls /nonexistent');
    await shell.execute('echo $?');

    // Non-zero exit code
    expect(output).to.include('1');
  });
});
```

---

## Test Running Instructions

### Local Development

#### Install Test Dependencies

```bash
# Recommended: Bun (10-20x faster)
bun install

# Alternative: npm
npm install
```

#### Run All Tests

```bash
# Run unit and integration tests
bun test       # or: npm test
```

#### Run Specific Test Types

```bash
# Unit tests only (fast)
bun run test:unit       # or: npm run test:unit

# Integration tests only (slower, requires browser)
bun run test:integration   # or: npm run test:integration

# Watch mode for development
bun run test:watch      # or: npm run test:watch
```

#### Run Specific Test Files

```bash
# Unit test
npx uvu tests/unit/shell/parser.test.js

# Integration test (Web Test Runner)
npx web-test-runner tests/integration/vfs/basic-ops.test.js
```

#### Generate Coverage Report

```bash
bun run test:coverage    # or: npm run test:coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

#### Debug Tests in Browser

```bash
# Manual mode - keeps browser open
npm run test:debug
```

### CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`

View test results in GitHub Actions tab.

---

## Phase 6 Test Plan

### Overview

Phase 6 adds shell programming features: variables, conditionals, loops, functions, exit codes, and the test command. Testing strategy:

### 1. Variables and Expansion

**Test Files:**
- `tests/unit/shell/variables.test.js` - Variable parser
- `tests/integration/shell/variables.test.js` - Variable execution

**Test Cases:**
- Variable assignment (`NAME=value`)
- Variable expansion (`$NAME`, `${NAME}`)
- Undefined variables
- Environment variables (`export`)
- Special variables (`$?`, `$#`, `$@`, `$0`)
- Variable expansion in strings
- Escaping dollar signs

### 2. Exit Codes

**Test Files:**
- `tests/unit/shell/exit-codes.test.js` - Exit code tracking
- `tests/integration/shell/exit-codes.test.js` - Command exit codes

**Test Cases:**
- Command success (exit 0)
- Command failure (exit non-zero)
- `$?` variable updates
- Exit code propagation in pipelines
- `exit N` command

### 3. Test Command (`[` builtin)

**Test Files:**
- `tests/unit/shell/test-command.test.js` - Test expression parsing
- `tests/integration/shell/test-command.test.js` - Test execution

**Test Cases:**
- File tests (`-f`, `-d`, `-e`)
- String tests (`=`, `!=`, `-z`, `-n`)
- Numeric tests (`-eq`, `-ne`, `-gt`, `-lt`, `-ge`, `-le`)
- Logical operators (`!`, `-a`, `-o`)
- Exit codes (0 for true, 1 for false)

### 4. Conditionals

**Test Files:**
- `tests/unit/shell/conditionals.test.js` - If/then/else parsing
- `tests/integration/shell/conditionals.test.js` - Conditional execution

**Test Cases:**
- Simple if/then/fi
- If/then/else/fi
- If/elif/else/fi
- Nested conditionals
- Test command in conditions
- Variable expansion in conditions

### 5. Loops

**Test Files:**
- `tests/unit/shell/loops.test.js` - Loop parsing
- `tests/integration/shell/loops.test.js` - Loop execution

**Test Cases:**
- For loop with list (`for x in 1 2 3`)
- For loop with glob (future)
- While loop with condition
- Until loop (if implemented)
- Break statement
- Continue statement
- Nested loops

### 6. Functions

**Test Files:**
- `tests/unit/shell/functions.test.js` - Function parsing
- `tests/integration/shell/functions.test.js` - Function execution

**Test Cases:**
- Function definition (`name() { ... }`)
- Function calls
- Local variables
- Return values
- Arguments (`$1`, `$2`, `$@`)
- Nested function calls
- Recursion

### Testing Order (Recommended)

**Week 1: Variables and Exit Codes**
1. Write variable parser tests
2. Implement variable parsing
3. Write variable expansion tests
4. Implement variable expansion
5. Write exit code tests
6. Implement exit code tracking

**Week 2: Test Command**
1. Write test command parser tests
2. Implement test command parser
3. Write test execution tests
4. Implement test command logic

**Week 3: Conditionals**
1. Write conditional parser tests
2. Implement conditional parsing
3. Write conditional execution tests
4. Implement conditional execution

**Week 4: Loops**
1. Write loop parser tests
2. Implement loop parsing
3. Write loop execution tests
4. Implement loop execution
5. Implement break/continue

**Week 5: Functions**
1. Write function parser tests
2. Implement function parsing
3. Write function execution tests
4. Implement function execution

**Week 6: Integration and Polish**
1. Write complex integration tests
2. Fix bugs and edge cases
3. Performance optimization
4. Documentation updates

### Phase 6 Coverage Goals

- **Unit Tests:** 85% coverage on new parser code
- **Integration Tests:** 75% coverage on new execution code
- **E2E Tests:** 10 real-world shell script scenarios

### Example Phase 6 Test Suite

```javascript
// tests/integration/shell/phase6-complete.test.js
import { expect } from 'chai';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('Phase 6: Shell Programming (Integration)', () => {
  let shell, output;

  beforeEach(() => {
    const testShell = createMockShell();
    shell = testShell.shell;
    output = testShell.output;
  });

  it('should execute a script with variables and conditionals', async () => {
    const script = `
      NAME=World
      if [ -n "$NAME" ]; then
        echo "Hello, $NAME!"
      else
        echo "No name provided"
      fi
    `;

    await shell.execute(script);
    expect(output).to.include('Hello, World!');
  });

  it('should execute a for loop', async () => {
    const script = `
      for i in 1 2 3; do
        echo "Number: $i"
      done
    `;

    await shell.execute(script);
    expect(output).to.include('Number: 1');
    expect(output).to.include('Number: 2');
    expect(output).to.include('Number: 3');
  });

  it('should define and call functions', async () => {
    const script = `
      greet() {
        echo "Hello, $1!"
      }

      greet Alice
      greet Bob
    `;

    await shell.execute(script);
    expect(output).to.include('Hello, Alice!');
    expect(output).to.include('Hello, Bob!');
  });

  it('should use exit codes in conditionals', async () => {
    const script = `
      ls /nonexistent 2>/dev/null
      if [ $? -ne 0 ]; then
        echo "File not found"
      fi
    `;

    await shell.execute(script);
    expect(output).to.include('File not found');
  });

  it('should execute complex script', async () => {
    const script = `
      count=0
      for file in /home/*.txt; do
        if [ -f "$file" ]; then
          count=$((count + 1))
        fi
      done
      echo "Found $count text files"
    `;

    await shell.execute(script);
    expect(output).to.match(/Found \d+ text files/);
  });
});
```

---

## Test Helpers

### Shell Test Helper

```javascript
// tests/helpers/shell-test-helper.js
import { Shell } from '../../src/shell.js';
import { registerAllCommands } from '../../src/commands/index.js';

/**
 * Create a mock shell for testing
 */
export function createMockShell() {
  const output = [];

  const mockTerm = {
    write: (text) => output.push(text),
    writeln: (text) => output.push(text + '\n'),
  };

  const shell = new Shell(mockTerm);
  registerAllCommands(shell);

  return {
    shell,
    output,
    getOutput: () => output.join(''),
    clearOutput: () => output.splice(0, output.length),
  };
}
```

### Mock Terminal

```javascript
// tests/helpers/mock-terminal.js

/**
 * Create a mock xterm.js terminal for testing
 */
export function createMockTerminal() {
  const buffer = [];

  return {
    buffer,

    write(text) {
      buffer.push(text);
    },

    writeln(text) {
      buffer.push(text + '\n');
    },

    clear() {
      buffer.length = 0;
    },

    getOutput() {
      return buffer.join('');
    },

    getLines() {
      return buffer.join('').split('\n');
    },

    reset() {
      buffer.length = 0;
    },
  };
}
```

---

## Inspiration from Shell Test Suites

### Lessons from bash/dash Testing

After researching how POSIX shells test themselves:

**ShellSpec Approach:**
- BDD-style tests for shell scripts
- Tests written in shell syntax
- Mocking and stubbing support
- Code coverage for shell scripts

**dash Testing:**
- Focus on POSIX compliance
- Tests run against dash to verify no Bashisms
- Simple test runner (`shelltest`)
- File-based test cases

**Koma Adaptation:**
- Use JavaScript testing frameworks (more natural for JS codebase)
- Test shell behavior from JavaScript
- Create shell script fixtures for integration tests
- Verify POSIX-like behavior against known inputs/outputs

### Shell Script Test Fixtures

```javascript
// tests/fixtures/scripts/conditionals.sh
#!/bin/sh
# Test conditional execution

if [ -f /home/test.txt ]; then
  echo "File exists"
else
  echo "File not found"
fi
```

```javascript
// tests/integration/shell/script-fixtures.test.js
import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';
import fs from 'fs';

describe('Shell Script Fixtures', () => {
  it('should execute conditional script', async () => {
    const script = fs.readFileSync('tests/fixtures/scripts/conditionals.sh', 'utf-8');

    const { shell, output } = createMockShell();
    await shell.execute(script);

    expect(output).to.include('File exists');
  });
});
```

---

## Summary and Recommendations

### Recommended Implementation Order

1. **Week 1: Setup Infrastructure**
   - Install Web Test Runner and uvu
   - Configure test runners
   - Create test helpers
   - Write first example tests

2. **Week 2: Core Unit Tests**
   - Shell parser tests
   - Tokenizer tests
   - Argument parser tests
   - Path utilities tests

3. **Week 3: VFS Integration Tests**
   - Basic CRUD operations
   - Directory operations
   - Persistence tests
   - Error handling tests

4. **Week 4: Command Tests**
   - Test 5 most critical commands (ls, cat, grep, cd, echo)
   - Pipeline tests
   - Redirect tests

5. **Week 5: CI/CD Setup**
   - GitHub Actions workflow
   - Coverage reporting
   - Branch protection

6. **Week 6+: Phase 6 Tests**
   - Follow Phase 6 test plan
   - Write tests before implementing features (TDD)

### Key Success Metrics

- ✅ Tests run in under 30 seconds
- ✅ Tests don't pollute user VFS
- ✅ Tests work in CI/CD
- ✅ 60%+ code coverage by end of Phase 6
- ✅ All critical paths tested
- ✅ Tests pass on every commit

### Next Steps

1. **Create `package.json`** with test dependencies
2. **Install Web Test Runner** and uvu
3. **Write first test** (shell tokenizer unit test)
4. **Configure GitHub Actions** workflow
5. **Start testing before Phase 6** to establish patterns

---

## Additional Resources

### Documentation Links

- [Web Test Runner Docs](https://modern-web.dev/docs/test-runner/overview/)
- [uvu Documentation](https://github.com/lukeed/uvu)
- [Chai Assertion Library](https://www.chaijs.com/)
- [Playwright for Testing](https://playwright.dev/)
- [ShellSpec (Shell BDD Framework)](https://shellspec.info/)

### Example Projects Using Similar Stack

- Open Web Components projects
- Vanilla JS libraries with ES modules
- Web Test Runner example repositories

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Author:** Claude (Anthropic)
**Status:** Ready for Review and Implementation
