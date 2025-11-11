# Koma VFS Test Fixtures

Pre-generated `.kmt` (Koma Tape) backup files for use in integration tests. These fixtures provide clean, reproducible VFS states without needing to create files during test execution.

## Available Fixtures

### `empty-vfs.kmt`
Completely empty VFS with no directories or files.
- **Use case**: Testing VFS initialization, edge cases with empty filesystem

### `minimal-vfs.kmt`
Minimal VFS with just `/home` directory.
- **Use case**: Basic tests that only need a home directory

### `basic-vfs.kmt`
Standard VFS structure with `/home` and `/tmp` directories.
- **Use case**: Most basic tests requiring standard directory structure

### `ls-test.kmt`
Fixture optimized for `ls` command tests.
- Directories: `/home`, `/home/dir1`
- Files:
  - `/home/file1.txt` - "content 1"
  - `/home/file2.txt` - "content 2"
  - `/home/dir1/file3.txt` - "content 3"
  - `/home/.hidden` - "hidden content"

### `pipes-test.kmt`
Fixture for pipes and redirection tests.
- Files:
  - `/home/test.txt` - Multi-line with fruits
  - `/home/numbers.txt` - Numbers 1-5
  - `/home/mixed.txt` - Mixed text content
  - `/home/data.csv` - Sample CSV data
  - `/home/empty.txt` - Empty file

### `file-reading-test.kmt`
Fixture for `cat`, `head`, `tail` tests.
- Files:
  - `/home/simple.txt` - Single line
  - `/home/multiline.txt` - 5 lines
  - `/home/long.txt` - 100 lines
  - `/home/empty.txt` - Empty file

### `vfs-ops-test.kmt`
Fixture for VFS operations (mkdir, rm, mv, cp).
- Directories: `/home`, `/tmp`, `/home/testdir`
- Files:
  - `/home/test.txt` - "test content"
  - `/home/file1.txt` - "content 1"
  - `/home/file2.txt` - "content 2"

### `complex-vfs.kmt`
Comprehensive VFS with realistic directory structure.
- Complete Unix-like directory hierarchy
- Multiple file types and content
- Hidden files, special characters, binary content
- **Use case**: Integration tests requiring realistic filesystem

## Usage

### In Test Files

```javascript
import { restoreFromFixture } from '../../helpers/fixture-helper.js';

describe('My Command Tests', () => {
  let vfs, cleanup, shell, term;

  beforeEach(async () => {
    const testVFS = await createTestVFS();
    vfs = testVFS.kernel;
    cleanup = testVFS.cleanup;

    // Restore from fixture instead of manually creating files
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
    // Your test code - VFS is already populated!
  });
});
```

### Advanced Usage

```javascript
// Exclude specific paths from being cleared
await restoreFromFixture(vfs, 'basic-vfs.kmt', ['/mnt/backups', '/custom/path']);

// Get list of available fixtures
import { getAvailableFixtures } from '../../helpers/fixture-helper.js';
const fixtures = getAvailableFixtures();
```

## Regenerating Fixtures

If you need to update or add new fixtures:

```bash
cd tests/fixtures
python generate-fixtures.py
```

### Adding New Fixtures

Edit `generate-fixtures.py` and add a new generator function:

```python
def generate_my_custom_fixture():
    """Generate custom fixture for my tests"""
    gen = KMTGenerator(label="my-custom-test")
    gen.add_directory('/home')
    gen.add_file('/home/test.txt', 'test content')
    gen.save('my-custom.kmt')
```

Then add it to the `main()` function:

```python
def main():
    # ... existing fixtures ...
    generate_my_custom_fixture()
    print()
```

## Benefits

### Performance
- **Faster tests**: No need to create files during test execution
- **Reduced I/O**: Single fixture load vs. multiple file operations
- **Parallel execution**: Fixtures can be loaded independently

### Reliability
- **Consistent state**: Every test starts with exact same VFS state
- **No pollution**: Clear separation between test states
- **Reproducible**: Same fixture produces same results

### Maintainability
- **Centralized**: All test data in one location
- **Versioned**: Fixtures are committed to git
- **Documented**: Clear specification of what each fixture contains

## Format Specification

`.kmt` files are JSON with this structure:

```json
{
  "format": "kmt",
  "version": "1.0",
  "created": "2024-01-01T00:00:00Z",
  "label": "fixture-name",
  "compression": "none",
  "checksum": {
    "uncompressed": "checksum-string"
  },
  "stats": {
    "files": 10,
    "directories": 5,
    "size": 1234
  },
  "data": "base64-encoded-entries"
}
```

The `data` field contains base64-encoded JSON array of VFS entries:

```json
[
  {
    "path": "/home",
    "type": "directory",
    "created": "2024-01-01T00:00:00Z",
    "modified": "2024-01-01T00:00:00Z"
  },
  {
    "path": "/home/file.txt",
    "type": "file",
    "size": 12,
    "created": "2024-01-01T00:00:00Z",
    "modified": "2024-01-01T00:00:00Z",
    "content": "file content"
  }
]
```
