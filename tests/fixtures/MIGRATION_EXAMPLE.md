# Migration Example: ls.test.js

This document shows the before/after comparison of migrating `tests/integration/commands/ls.test.js` to use the fixture system.

## Results

- **Lines of code**: 141 → 114 (27 lines removed, -19%)
- **Manual VFS operations**: 6 → 1 (-83%)
- **Setup complexity**: High → Low
- **Test results**: 8/9 passing (unchanged, 1 pre-existing failure)

## Before: Manual Setup (141 lines)

```javascript
import { expect } from 'chai';
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';

describe('ls command', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    // Create isolated test VFS
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Clear VFS state from previous tests (all tests share same kernel singleton)
    try {
      const topLevelDirs = await vfs.readdir('/');
      for (const entry of topLevelDirs) {
        const fullPath = `/${entry.name}`;
        try {
          if (entry.type === 'directory') {
            await vfs.unlinkRecursive(fullPath);
          } else {
            await vfs.unlink(fullPath);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (e) {
      // Ignore if readdir fails
    }

    // Create mock shell
    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;

    // Populate test files
    await populateTestFixtures(vfs, {
      '/home/file1.txt': 'content 1',
      '/home/file2.txt': 'content 2',
      '/home/dir1/file3.txt': 'content 3',
    });
  });

  // ... tests ...

  it('should support -a flag to show hidden files', async () => {
    // Create hidden file
    await vfs.writeFile('/home/.hidden', 'secret');

    shell.cwd = '/home';
    await shell.execute('ls -a');

    const output = term.getOutput();
    expect(output).to.include('.hidden');
  });

  it('should not show hidden files without -a flag', async () => {
    await vfs.writeFile('/home/.hidden', 'secret');

    shell.cwd = '/home';
    await shell.execute('ls');

    const output = term.getOutput();
    expect(output).not.to.include('.hidden');
  });

  it('should combine flags (-la)', async () => {
    await vfs.writeFile('/home/.hidden', 'secret');

    shell.cwd = '/home';
    await shell.execute('ls -la');

    const output = term.getOutput();
    expect(output).to.include('.hidden');
    expect(output).to.match(/\d+\s+\d{4}-\d{2}-\d{2}/);
  });
});
```

## After: Fixture-Based Setup (114 lines)

```javascript
import { expect } from 'chai';
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { createMockShell } from '../../helpers/shell-test-helper.js';
import { restoreFromFixture } from '../../helpers/fixture-helper.js';

describe('ls command', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    // Create isolated test VFS
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Restore from fixture - includes /home, /home/dir1, test files, and .hidden
    await restoreFromFixture(vfs, 'ls-test.kmt');

    // Create mock shell
    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;
  });

  // ... tests ...

  it('should support -a flag to show hidden files', async () => {
    // Hidden file already exists in fixture
    shell.cwd = '/home';
    await shell.execute('ls -a');

    const output = term.getOutput();
    expect(output).to.include('.hidden');
  });

  it('should not show hidden files without -a flag', async () => {
    // Hidden file already exists in fixture
    shell.cwd = '/home';
    await shell.execute('ls');

    const output = term.getOutput();
    expect(output).not.to.include('.hidden');
  });

  it('should combine flags (-la)', async () => {
    // Hidden file already exists in fixture
    shell.cwd = '/home';
    await shell.execute('ls -la');

    const output = term.getOutput();
    expect(output).to.include('.hidden');
    expect(output).to.match(/\d+\s+\d{4}-\d{2}-\d{2}/);
  });
});
```

## Key Improvements

### 1. Eliminated Manual VFS Clearing (18 lines → 1 line)

**Before:**
```javascript
// Clear VFS state from previous tests (all tests share same kernel singleton)
try {
  const topLevelDirs = await vfs.readdir('/');
  for (const entry of topLevelDirs) {
    const fullPath = `/${entry.name}`;
    try {
      if (entry.type === 'directory') {
        await vfs.unlinkRecursive(fullPath);
      } else {
        await vfs.unlink(fullPath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
} catch (e) {
  // Ignore if readdir fails
}
```

**After:**
```javascript
await restoreFromFixture(vfs, 'ls-test.kmt');
```

### 2. Eliminated Manual File Population (6 lines → 0 lines)

**Before:**
```javascript
await populateTestFixtures(vfs, {
  '/home/file1.txt': 'content 1',
  '/home/file2.txt': 'content 2',
  '/home/dir1/file3.txt': 'content 3',
});
```

**After:**
```javascript
// Already included in fixture!
```

### 3. Removed Duplicate File Creation (3 instances)

**Before:** Tests manually created `.hidden` file
```javascript
await vfs.writeFile('/home/.hidden', 'secret');
```

**After:** File already exists in fixture
```javascript
// Hidden file already exists in fixture
```

### 4. Single Source of Truth

All test data is now defined in one place:
- `tests/fixtures/generate-fixtures.py` (source)
- `tests/fixtures/ls-test.kmt` (generated file)

## What the Fixture Contains

From `generate-fixtures.py`:
```python
def generate_ls_test_fixture():
    """Generate fixture for ls command tests"""
    gen = KMTGenerator(label="ls-test")
    gen.add_directory('/home')
    gen.add_directory('/home/dir1')
    gen.add_file('/home/file1.txt', 'content 1')
    gen.add_file('/home/file2.txt', 'content 2')
    gen.add_file('/home/dir1/file3.txt', 'content 3')
    gen.add_file('/home/.hidden', 'hidden content')
    gen.save('ls-test.kmt')
```

## Benefits Realized

1. **Cleaner Code**: 19% reduction in code size
2. **Better Maintainability**: All test data centralized
3. **Faster Execution**: Single fixture load vs multiple VFS operations
4. **Reduced Errors**: No risk of forgetting to clear VFS or create files
5. **Better Documentation**: Fixture clearly shows what the test environment contains

## Migration Checklist

For migrating other test files:

- [x] Identify files needed by tests
- [x] Choose or create appropriate fixture
- [x] Replace VFS clearing code with `restoreFromFixture()`
- [x] Remove manual file population
- [x] Remove duplicate file creation in individual tests
- [x] Update imports (add `restoreFromFixture`, remove `populateTestFixtures`)
- [x] Run tests to verify
- [x] Document any test-specific additions needed

## Next Candidates for Migration

Based on similar patterns:

1. **`pipes-redirection.test.js`** → Use `pipes-test.kmt` (67 lines of setup)
2. **`file-reading.test.js`** → Use `file-reading-test.kmt` (similar structure)
3. **`vfs-operations.test.js`** → Use `vfs-ops-test.kmt` (many ENOENT failures)

Each file will see similar improvements in code clarity and maintainability.
