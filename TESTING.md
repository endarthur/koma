# Testing Koma

## Philosophy

Koma has **zero runtime dependencies**. You can open `index.html` directly in a browser with no build step, no npm, no bundler.

**However**, testing infrastructure uses npm packages. This is the retrospec approach:

```
1987: No package managers, manual testing
2025: Modern test infrastructure, but runtime stays pure
```

## Why npm for Testing?

Testing requires tooling:
- **Playwright** - Browser automation for integration tests
- **uvu** - Fast unit test runner
- **chai** - Assertions
- **web-test-runner** - Run tests in real browsers

These are **development dependencies only**. They never touch the runtime code.

## Runtime vs Development

```
┌────────────────────────────────────┐
│  RUNTIME (index.html)              │
│  ✓ Pure HTML/CSS/JS                │
│  ✓ Import maps (CDN dependencies)  │
│  ✓ No npm needed                   │
│  ✓ No build step                   │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  TESTING (optional)                │
│  ✓ npm/bun for test deps           │
│  ✓ Playwright for browser tests    │
│  ✓ Only for contributors           │
│  ✓ Never affects production        │
└────────────────────────────────────┘
```

## Package Manager Choice

### Recommended: Bun

[Bun](https://bun.sh) is **10-20x faster** than npm and drop-in compatible:

```bash
# Install Bun (one-time)
curl -fsSL https://bun.sh/install | bash   # macOS/Linux
powershell -c "irm bun.sh/install.ps1|iex"  # Windows

# Install dependencies
bun install

# Run tests
bun test
```

### Alternative: Node.js + npm

If you already have Node.js:

```bash
npm install
npm test
```

Both work identically. Bun is just faster.

## Quick Start (10 Minutes)

### 1. Install Dependencies (2 minutes)

```bash
# Recommended: Bun
bun install

# Or: Node.js + npm
npm install
```

This installs Web Test Runner, uvu, Chai, and Playwright.

### 2. Run Your First Test (1 minute)

```bash
# With Bun
bun run test:unit

# Or with npm
npm run test:unit
```

You should see output like:
```
  parser  (45 tests)
  ✓ tokenize: basic command
  ✓ tokenize: quoted strings
  ✓ parsePipeline: two-stage pipeline
  ...

  Total:    45
  Passed:   45
  Duration: 18ms
```

### 3. Run Integration Tests (2 minutes)

```bash
bun run test:integration    # or: npm run test:integration
```

This opens a headless Chromium browser and runs tests against real browser APIs.

### 4. Watch Mode for TDD (ongoing)

```bash
bun run test:watch    # or: npm run test:watch
```

Tests automatically re-run when you change code. Perfect for test-driven development!

### 5. Common Commands

| Command | Purpose |
|---------|---------|
| `bun test` or `npm test` | Run all tests (unit + integration) |
| `bun run test:unit` | Run unit tests only (fast) |
| `bun run test:integration` | Run integration tests (browser) |
| `bun run test:watch` | Watch mode for development |
| `bun run test:coverage` | Generate coverage report |
| `bun run test:debug` | Debug tests in browser |

## Test Structure

```
tests/
├── unit/               # Unit tests (fast, isolated)
│   ├── shell.test.js
│   ├── parser.test.js
│   └── commands/
└── integration/        # Integration tests (browser-based)
    ├── terminal.test.js
    ├── filesystem.test.js
    └── processes.test.js
```

## Running Tests

```bash
# All tests
npm test                    # or: bun test

# Unit tests only (fast)
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (re-run on change)
npm run test:watch

# Coverage report
npm run test:coverage

# Debug mode (manual browser control)
npm run test:debug
```

## Writing Tests

### Unit Tests (uvu)

```javascript
// tests/unit/example.test.js
import { test } from 'uvu';
import * as assert from 'uvu/assert';

test('example test', () => {
  assert.is(1 + 1, 2);
});

test.run();
```

### Integration Tests (web-test-runner + Playwright)

```javascript
// tests/integration/terminal.test.js
import { expect } from '@esm-bundle/chai';

describe('Terminal', () => {
  it('should execute ls command', async () => {
    const output = await executeCommand('ls');
    expect(output).to.include('/home');
  });
});
```

## Test Helpers

Koma provides helpers to make testing easier:

### VFS Helper

```javascript
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';

const { kernel, cleanup } = await createTestVFS();

await populateTestFixtures(kernel, {
  '/home/test.txt': 'content',
  '/home/data.json': '{"key": "value"}'
});

// ... your tests ...

await cleanup();  // Clean up test database
```

### Shell Helper

```javascript
import { createMockShell } from '../../helpers/shell-test-helper.js';

const { shell, term, exec } = createMockShell();

// Execute and get output
const output = await exec('ls -l');

// Check output
expect(output).to.include('file.txt');
```

## Test-Driven Development (TDD)

1. **Write test first** (it will fail - "Red")
2. **Write minimal code** to make it pass ("Green")
3. **Refactor** if needed
4. **Repeat**

Example workflow:

```javascript
// Step 1: Write failing test
test('should parse variable assignment', () => {
  const shell = new Shell(mockTerm);
  const result = shell.parseVariableAssignment('NAME=Alice');

  assert.equal(result, { name: 'NAME', value: 'Alice' });
});
// ❌ Test fails: parseVariableAssignment doesn't exist

// Step 2: Implement minimal code
Shell.prototype.parseVariableAssignment = function(line) {
  const [name, value] = line.split('=');
  return { name, value };
};
// ✅ Test passes!

// Step 3: Add edge cases and refactor
```

## Debugging Tests

### Unit Tests

Add `console.log()` to see values:

```javascript
test('debug example', () => {
  const result = myFunction();
  console.log('Result:', result);  // Shows in terminal
  assert.is(result, expected);
});
```

### Integration Tests

Run with manual mode to keep browser open:

```bash
bun run test:debug    # or: npm run test:debug
```

Or add `debugger` statement:

```javascript
it('test something', async () => {
  debugger;  // Browser DevTools will pause here
  await shell.execute('ls');
});
```

## Coverage Reports

Generate HTML coverage report:

```bash
bun run test:coverage    # or: npm run test:coverage
```

Open in browser:

```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

## CI/CD

Tests run automatically on GitHub when you push or open PRs.

Example workflow with Bun:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:ci
```

Or with Node:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:ci
```

## Why Not Jest/Vitest/etc?

**Speed and simplicity:**
- **uvu** - Minimal, fast, no configuration
- **web-test-runner** - Real browsers, no JSDOM fake environment
- **chai** - Industry standard assertions

These tools are:
- Lightweight (small `node_modules`)
- Fast (sub-second test runs)
- Real browsers (not simulation)

## Performance Comparison

```
npm install         → 30-60 seconds
bun install         → 2-3 seconds

npm test            → 5-10 seconds
bun test            → 2-4 seconds
```

Bun is significantly faster for development iteration.

## No Tests? No Problem!

You can develop and contribute to Koma **without running tests**:

1. Open `index.html` in a browser
2. Test manually in the terminal
3. Submit pull requests (CI will run tests)

Tests are helpful but not mandatory for contributors.

## The Retrospec Rationale

**1987 workstation approach:**
- Manual testing
- QA checklist
- Real hardware validation

**2025 improvement:**
- Automated tests
- Faster iteration
- More confidence in changes

**But still:**
- No build step for users
- No npm in production
- Pure web stack

Tests are modern tooling that improves development **without compromising the runtime**.

## Next Steps

1. **Install dependencies**: `bun install` (or `npm install`)
2. **Run existing tests**: `bun test` to see everything works
3. **Read the strategy**: See [docs/TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md) for full technical details
4. **Look at examples**: Check `tests/unit/` and `tests/integration/` for patterns
5. **Write your first test**: Follow the TDD workflow above
6. **Check coverage**: `bun run test:coverage` to see what needs testing

## Common Issues

### "Cannot find module"

Use relative imports with `.js` extension:

```javascript
// ✗ Wrong
import { Shell } from '../../src/shell';

// ✓ Correct
import { Shell } from '../../src/shell.js';
```

### "Browser not found"

Install Playwright browsers:

```bash
npx playwright install chromium
```

### "Test timeout"

Increase timeout in test or config:

```javascript
it('slow test', async () => {
  // ...
}).timeout(10000);  // 10 seconds
```

## Resources

- [Full Testing Strategy](./docs/TESTING_STRATEGY.md) - Comprehensive technical docs
- [Web Test Runner](https://modern-web.dev/docs/test-runner/) - Browser testing
- [uvu Documentation](https://github.com/lukeed/uvu) - Unit test runner
- [Chai Assertions](https://www.chaijs.com/) - Assertion library
- [Bun](https://bun.sh) - Fast JavaScript runtime & package manager

---

**Questions?** See [DEVELOPMENT.md](./DEVELOPMENT.md) or open an issue.
