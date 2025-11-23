# Testing

**Domain**: `#testing`
**Related Domains**: `#boot`, `#vfs`, `#commands`, `#shell`

## Overview

Test infrastructure for integration and unit testing. Uses Web Test Runner for browser-based testing with a focus on integration tests for real browser environment validation.

## Features by Maturity

### ✅ Production

### Web Test Runner Setup
**Tags**: `#testing` `#production` `#medium` `#infrastructure`
**Status**: Complete test runner configuration
**Phase**: 6+
**Dependencies**: @web/test-runner (npm)
**Blocks**: Automated testing

**Configuration**:
- Browser-based testing (Chromium)
- ES module support
- Import maps support
- HTML test fixtures
- Watch mode for development

**Files**: `web-test-runner.config.js`, `package.json`

### Boot System Integration Tests
**Tags**: `#testing` `#production` `#high` `#boot`
**Status**: Complete boot system validation
**Phase**: 6.6
**Dependencies**: Boot manager, Web Test Runner
**Blocks**: Boot system reliability

**Tests**:
- Boot manager initialization
- Pre-flight checks
- Kernel initialization timeout handling
- VFS health verification
- Error recovery flows

**Coverage**:
- 5-stage boot process
- Emergency mode activation
- Safe mode activation
- Health monitoring

**Files**: `tests/integration/boot/boot-system.test.js`

### 🔧 Working

### VFS Operations Tests
**Tags**: `#testing` `#working` `#high` `#vfs`
**Status**: Partial coverage
**Phase**: Ongoing
**Dependencies**: VFS, kernel
**Blocks**: VFS reliability

**Current Coverage**:
- Basic file operations (read, write, mkdir, rm)
- Directory navigation
- File stat operations

**Missing Coverage**:
- Error handling (ENOENT, EEXIST, etc.)
- Recursive directory operations
- Edge cases (empty files, large files)
- Concurrent operations

**Files**: `tests/integration/vfs/vfs-operations.test.js`

### Command Integration Tests
**Tags**: `#testing` `#working` `#medium` `#commands`
**Status**: Partial coverage
**Phase**: Ongoing
**Dependencies**: Commands, VFS, shell
**Blocks**: Command reliability

**Current Coverage**:
- kmt (KMT archive) command tests
- Basic command execution
- Pipeline operations
- Schist interactive tests

**Missing Coverage**:
- All 48 commands need individual tests
- Error handling tests
- Edge case tests (invalid arguments, etc.)
- Help flag validation

**Files**:
- `tests/integration/commands/kmt.test.js`
- `tests/integration/commands/koma-commands.test.js`
- `tests/integration/commands/schist-interactive.test.js`

### Shell Pipeline Tests
**Tags**: `#testing` `#working` `#high` `#shell`
**Status**: Basic coverage
**Phase**: 5.6+
**Dependencies**: Shell parser, commands
**Blocks**: Pipeline reliability

**Current Coverage**:
- Basic pipes (`cmd1 | cmd2`)
- Redirection (`>`, `>>`, `<`)
- Command separator (`;`)

**Missing Coverage**:
- Multi-stage pipelines (3+ commands)
- Complex redirections
- Error propagation in pipelines
- Quote handling in pipes

**Files**: `tests/integration/shell/pipes-redirection.test.js`

### 🧪 Prototype

### Unit Tests for Core Modules
**Tags**: `#testing` `#prototype` `#high` `#coverage`
**Status**: Not implemented
**Phase**: Future
**Dependencies**: Test framework for modules
**Blocks**: Module-level testing

**Planned Coverage**:
- Lexer tokenization
- Parser AST generation
- Executor command execution
- VFS methods (unit-level)
- Stdlib modules (fs, http, path, argparse)
- CommandContext abstraction

**Approach**:
- Isolate modules from kernel
- Mock dependencies
- Fast unit tests for TDD workflow

### Automated CI/CD Testing
**Tags**: `#testing` `#prototype` `#medium` `#automation`
**Status**: Not implemented
**Phase**: Future (Phase 8+)
**Dependencies**: GitHub Actions or similar
**Blocks**: Continuous testing

**Planned**:
- Run tests on every commit
- Test on multiple browsers (Chromium, Firefox, WebKit)
- Code coverage reporting
- Automated PR checks
- Performance regression testing

### End-to-End Tests
**Tags**: `#testing` `#prototype` `#medium` `#e2e`
**Status**: Not implemented
**Phase**: Future (Phase 10+)
**Dependencies**: Playwright or Puppeteer
**Blocks**: Full workflow validation

**Planned Scenarios**:
- User creates tab, runs commands, closes tab
- User opens editor, edits file, saves, closes
- User creates backup, breaks VFS, restores from backup
- User schedules cron job, waits for execution
- Complete boot → work → shutdown cycle

### Test Coverage Reporting
**Tags**: `#testing` `#prototype` `#medium` `#metrics`
**Status**: Not implemented
**Phase**: Future
**Dependencies**: Coverage tool (c8, istanbul)
**Blocks**: Coverage visibility

**Planned Metrics**:
- Line coverage
- Branch coverage
- Function coverage
- Per-module coverage reports
- Coverage trends over time

## Test Architecture

### Directory Structure

```
tests/
├── integration/
│   ├── boot/
│   │   └── boot-system.test.js
│   ├── commands/
│   │   ├── kmt.test.js
│   │   ├── koma-commands.test.js
│   │   └── schist-interactive.test.js
│   ├── shell/
│   │   └── pipes-redirection.test.js
│   ├── vfs/
│   │   └── vfs-operations.test.js
│   └── kernel/
│       └── api-validation.test.js
├── unit/ (future)
│   ├── parser/
│   ├── stdlib/
│   └── utils/
├── e2e/ (future)
│   └── workflows/
└── fixtures/
    ├── MIGRATION_EXAMPLE.md
    ├── README.md
    ├── SUMMARY.md
    └── USAGE_GUIDE.md
```

### Test Runner Configuration

```javascript
// web-test-runner.config.js
export default {
  files: 'tests/integration/**/*.test.js',
  nodeResolve: true,
  browsers: ['chromium'],
  testFramework: {
    config: {
      timeout: 10000, // 10 second timeout
    },
  },
};
```

### Integration Test Pattern

```javascript
// Example: tests/integration/vfs/vfs-operations.test.js
import { expect } from '@esm-bundle/chai';

describe('VFS Operations', () => {
  let kernel;

  before(async () => {
    // Initialize kernel
    kernel = await getTestKernel();
  });

  it('should create and read file', async () => {
    await kernel.writeFile('/home/test.txt', 'Hello!');
    const content = await kernel.readFile('/home/test.txt');
    expect(content).to.equal('Hello!');
  });

  after(async () => {
    // Cleanup
    await kernel.cleanup();
  });
});
```

## Related Files

**Configuration**:
- `web-test-runner.config.js` - Test runner config
- `package.json` - Test dependencies and scripts

**Tests**:
- `tests/integration/boot/boot-system.test.js` - Boot tests
- `tests/integration/vfs/vfs-operations.test.js` - VFS tests
- `tests/integration/commands/*.test.js` - Command tests
- `tests/integration/shell/pipes-redirection.test.js` - Shell tests
- `tests/integration/kernel/api-validation.test.js` - Kernel API tests

**Fixtures**:
- `tests/fixtures/*.md` - Test data files

**Documentation**:
- `docs/TESTING_STRATEGY.md` - Testing strategy
- `tests/README.md` - Test suite documentation

## Next Steps

**Immediate** (Phase 7):
- Expand command test coverage (all 48 commands)
- Add error handling tests
- Test edge cases

**Short-term** (Phase 8):
- Implement unit tests for parser, stdlib, utils
- Set up CI/CD with GitHub Actions
- Add coverage reporting

**Medium-term** (Phase 10):
- End-to-end workflow tests
- Performance regression tests
- Multi-browser testing

**Long-term** (Phase 12+):
- Visual regression testing
- Accessibility testing
- Load testing (large filesystems)

## Notes

**Testing Philosophy**:
- Integration tests first (validate real browser behavior)
- Unit tests for complex logic (parser, algorithms)
- E2E tests for critical workflows
- Automated CI/CD for confidence

**Why Web Test Runner?**
- Native ES module support
- Runs in real browsers (not jsdom)
- Import maps support (critical for KOMA)
- Fast and lightweight
- Good developer experience (watch mode)

**Current Test Coverage** (estimate):
- Boot system: ~80%
- VFS: ~40%
- Commands: ~20%
- Shell: ~30%
- UI: ~0%
- Overall: ~30%

**Target Coverage**:
- Critical paths: >90%
- Overall: >70%
- Focus on integration tests for browser-specific behavior

**Test Data Management**:
- Fixtures in `tests/fixtures/`
- Test VFS in separate IndexedDB (not production)
- Cleanup after each test
- Isolated test environments

**Browser Testing Priority**:
1. Chromium (primary development browser)
2. Firefox (web standards validation)
3. WebKit (Safari compatibility)

---

**Last Updated**: 2025-11-16
**Maturity**: Working (50%)
**Priority**: Medium
