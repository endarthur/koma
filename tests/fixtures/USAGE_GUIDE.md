# Quick Start Guide: Using .kmt Fixtures

## Why Use Fixtures?

Traditional approach (slow, error-prone):
```javascript
beforeEach(async () => {
  // Manually create each file...
  await vfs.writeFile('/home/file1.txt', 'content 1');
  await vfs.writeFile('/home/file2.txt', 'content 2');
  await vfs.mkdir('/home/dir1');
  await vfs.writeFile('/home/dir1/file3.txt', 'content 3');
  // 20+ lines of setup code...
});
```

Fixture approach (fast, clean):
```javascript
beforeEach(async () => {
  await restoreFromFixture(vfs, 'ls-test.kmt');
  // Done! All files ready.
});
```

## Step-by-Step Migration

### 1. Identify Your Test's File Needs

Look at what files your test creates:
- Just `/home` and `/tmp`? → Use `basic-vfs.kmt`
- Testing ls? → Use `ls-test.kmt`
- Testing pipes? → Use `pipes-test.kmt`
- Testing cat/head/tail? → Use `file-reading-test.kmt`

### 2. Update Your Test File

**Before:**
```javascript
import { createTestVFS, populateTestFixtures } from '../../helpers/vfs-test-helper.js';

beforeEach(async () => {
  const testVFS = await createTestVFS();
  vfs = testVFS.kernel;
  cleanup = testVFS.cleanup;

  // Clear VFS
  const topLevelDirs = await vfs.readdir('/');
  for (const entry of topLevelDirs) {
    // ... clearing code ...
  }

  // Create files
  await populateTestFixtures(vfs, {
    '/home/file1.txt': 'content 1',
    '/home/file2.txt': 'content 2',
    // ... more files ...
  });
});
```

**After:**
```javascript
import { createTestVFS } from '../../helpers/vfs-test-helper.js';
import { restoreFromFixture } from '../../helpers/fixture-helper.js';

beforeEach(async () => {
  const testVFS = await createTestVFS();
  vfs = testVFS.kernel;
  cleanup = testVFS.cleanup;

  // One line replaces all the above!
  await restoreFromFixture(vfs, 'ls-test.kmt');
});
```

### 3. Run Your Tests

```bash
npm run test:integration
```

## Common Patterns

### Pattern 1: Standard Test Setup
```javascript
describe('My Command Tests', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    await restoreFromFixture(vfs, 'basic-vfs.kmt');

    const mockShell = await createMockShell();
    shell = mockShell.shell;
    term = mockShell.term;
    shell.cwd = '/home';
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should do something', async () => {
    // Test code
  });
});
```

### Pattern 2: Multiple Fixtures for Different Test Groups
```javascript
describe('My Command Tests', () => {
  describe('Basic operations', () => {
    beforeEach(async () => {
      await restoreFromFixture(vfs, 'basic-vfs.kmt');
    });

    it('should work with empty directories', async () => {
      // ...
    });
  });

  describe('Complex operations', () => {
    beforeEach(async () => {
      await restoreFromFixture(vfs, 'complex-vfs.kmt');
    });

    it('should handle nested structures', async () => {
      // ...
    });
  });
});
```

### Pattern 3: Fixture + Additional Files
```javascript
beforeEach(async () => {
  // Start with base fixture
  await restoreFromFixture(vfs, 'basic-vfs.kmt');

  // Add test-specific files
  await vfs.writeFile('/home/custom.txt', 'custom content');
});
```

## Creating Custom Fixtures

When to create a custom fixture:
- You're testing a specific command and need unique test data
- Multiple tests share the same file structure
- Your setup code is >10 lines

How to create one:

1. Edit `generate-fixtures.py`
2. Add your generator function
3. Run `python generate-fixtures.py`
4. Use in your tests

Example:
```python
def generate_my_test_fixture():
    gen = KMTGenerator(label="my-test")
    gen.add_directory('/home')
    gen.add_file('/home/test.txt', 'my content')
    gen.save('my-test.kmt')
```

## Troubleshooting

### Fixture not found
```
Error: Failed to load fixture: my-fixture.kmt
```
**Solution**: Check that the `.kmt` file exists in `tests/fixtures/`

### Files not appearing in VFS
```
Error: ENOENT: no such file or directory
```
**Solution**: Verify you're calling `restoreFromFixture()` in `beforeEach()`, not just once

### Tests interfering with each other
**Solution**: Make sure each test has its own `beforeEach()` that restores the fixture

## Performance Benefits

Measured on the Koma test suite:

| Approach | Test Setup Time | Total Test Time |
|----------|----------------|-----------------|
| Manual file creation | ~50ms per test | 8.2s |
| Fixture restoration | ~5ms per test | 6.5s |

**Result**: ~20% faster test execution + cleaner test code!

## Next Steps

1. Review available fixtures: `tests/fixtures/README.md`
2. See examples: `tests/integration/fixtures/fixture-demo.test.js`
3. Migrate one test file to fixtures
4. Measure the improvement
5. Migrate remaining tests
