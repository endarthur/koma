# Koma Test Suite

This directory contains the test suite for Koma terminal emulator.

## Directory Structure

```
tests/
├── unit/                   # Fast unit tests (uvu)
│   ├── shell/             # Shell parsing and logic
│   └── utils/             # Utility functions
├── integration/           # Browser-based integration tests (Web Test Runner)
│   ├── commands/          # Command execution tests
│   ├── vfs/              # VFS and IndexedDB tests
│   └── kernel/           # Kernel tests
├── e2e/                  # End-to-end tests
├── fixtures/             # Test data
├── helpers/              # Test utilities
└── README.md            # This file
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Unit Tests Only (Fast)

```bash
npm run test:unit
```

### Run Integration Tests Only

```bash
npm run test:integration
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

Open `coverage/lcov-report/index.html` in your browser to view coverage.

### Debug Tests in Browser

```bash
npm run test:debug
```

This opens a browser window where you can debug tests using DevTools.

## Writing Tests

### Unit Tests (uvu)

Unit tests are fast tests that don't require a browser. Use for:
- Pure JavaScript logic
- Parsers and tokenizers
- Utility functions

Example:

```javascript
// tests/unit/shell/parser.test.js
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { Shell } from '../../../src/shell.js';

const mockTerm = { write: () => {}, writeln: () => {} };

test('should parse simple command', () => {
  const shell = new Shell(mockTerm);
  const parsed = shell.parseCommand('ls -l');

  assert.is(parsed.command, 'ls');
  assert.equal(parsed.args, ['-l']);
});

test.run();
```

### Integration Tests (Web Test Runner)

Integration tests run in a real browser. Use for:
- Command execution
- VFS operations (IndexedDB)
- Web Worker (Olivine kernel)
- Full pipelines and redirects

Example:

```javascript
// tests/integration/commands/cat.test.js
import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('cat command', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    const mockShell = createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    await vfs.writeFile('/home/test.txt', 'hello world');
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should read and display file', async () => {
    await shell.execute('cat /home/test.txt');

    const output = term.getOutput();
    expect(output).to.include('hello world');
  });
});
```

## Test Helpers

### VFS Test Helper

```javascript
import {
  createTestVFS,
  populateTestFixtures,
  assertFileContent
} from '../../helpers/vfs-test-helper.js';

// Create isolated test VFS
const { kernel, cleanup } = await createTestVFS();

// Populate test files
await populateTestFixtures(kernel, {
  '/home/test.txt': 'content',
  '/home/data.json': '{"key": "value"}'
});

// Cleanup after test
await cleanup();
```

### Shell Test Helper

```javascript
import { createMockShell } from '../../helpers/shell-test-helper.js';

const { shell, term, exec } = createMockShell();

// Execute command and get output
const output = await exec('ls -l');

// Check output
expect(output).to.include('file.txt');
```

## Coverage Goals

- **Unit Tests:** 85% coverage
- **Integration Tests:** 75% coverage
- **Overall:** 60%+ (increasing to 75%)

## Continuous Integration

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main`

See `.github/workflows/test.yml` for CI configuration.

## Debugging Tips

### Debug Unit Tests

Use `console.log()` in your tests:

```javascript
test('debug example', () => {
  const result = someFunction();
  console.log('Result:', result);
  assert.is(result, expected);
});
```

### Debug Integration Tests

Use browser DevTools:

```bash
npm run test:debug
```

Or add `debugger` statement:

```javascript
it('should work', async () => {
  debugger;  // Browser will break here
  await shell.execute('ls');
});
```

### Common Issues

**Tests timeout:**
- Increase timeout in `web-test-runner.config.js`
- Check for unresolved promises

**IndexedDB conflicts:**
- Ensure cleanup functions are called
- Use unique database names per test

**Mock terminal not working:**
- Verify `createMockShell()` registers commands
- Check that output buffer is cleared between tests

## Phase 6 Testing

For Phase 6 shell programming features:

1. Write tests first (TDD approach)
2. Test variables, conditionals, loops separately
3. Test integration scenarios last
4. Aim for 85% coverage on new code

See `docs/TESTING_STRATEGY.md` for detailed Phase 6 test plan.

## Contributing

When adding new features:

1. Write unit tests for pure logic
2. Write integration tests for VFS/command execution
3. Run `npm run test:coverage` to check coverage
4. Ensure all tests pass before committing

## Questions?

See the full testing strategy document:
- `docs/TESTING_STRATEGY.md`

Or check example test files in:
- `tests/unit/shell/parser.test.js`
- `tests/integration/commands/ls.test.js`
