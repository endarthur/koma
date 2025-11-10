# NAME

path - POSIX path manipulation utilities for Koma scripts

## SYNOPSIS

```javascript
// Available in scripts as 'path' module
const fullPath = path.join('/home', 'user', 'file.txt');
const dir = path.dirname('/home/user/file.txt');
const file = path.basename('/home/user/file.txt');
const ext = path.extname('file.txt');
```

## DESCRIPTION

The `path` module provides utilities for working with file paths in a POSIX-style virtual filesystem. All functions work synchronously and use forward slashes (/) as the path separator.

## CONSTANTS

### path.sep

Path separator character. Always `'/'` in Koma's POSIX filesystem.

**Example:**
```javascript
console.log(path.sep); // '/'
```

## FUNCTIONS

### path.join(...segments)

Join path segments into a single normalized path.

**Parameters:**
- `...segments` (string) - Path segments to join

**Returns:** string - Joined and normalized path

**Example:**
```javascript
path.join('/home', 'user', 'file.txt');  // '/home/user/file.txt'
path.join('/home', '../etc');            // '/etc'
path.join('foo', 'bar', 'baz');          // 'foo/bar/baz'
path.join('/home/', '/', 'user');        // '/home/user'
```

### path.resolve(...segments)

Resolve path segments to an absolute path. Processes segments from right to left until an absolute path is constructed.

**Parameters:**
- `...segments` (string) - Path segments to resolve

**Returns:** string - Absolute path

**Example:**
```javascript
path.resolve('/home', 'user', 'file.txt');  // '/home/user/file.txt'
path.resolve('user', 'file.txt');           // '/user/file.txt'
path.resolve('/foo', '/bar', 'baz');        // '/bar/baz'
```

### path.dirname(path)

Get the directory portion of a path.

**Parameters:**
- `path` (string) - Path to process

**Returns:** string - Directory name

**Example:**
```javascript
path.dirname('/home/user/file.txt');  // '/home/user'
path.dirname('/home/user/');          // '/home'
path.dirname('/home');                // '/'
path.dirname('/');                    // '/'
path.dirname('file.txt');             // '.'
```

### path.basename(path, ext)

Get the filename portion of a path. Optionally removes a file extension.

**Parameters:**
- `path` (string) - Path to process
- `ext` (string, optional) - Extension to remove (including dot)

**Returns:** string - Base filename

**Example:**
```javascript
path.basename('/home/user/file.txt');        // 'file.txt'
path.basename('/home/user/file.txt', '.txt'); // 'file'
path.basename('/home/user/');                // 'user'
path.basename('file.txt');                   // 'file.txt'
```

### path.extname(path)

Get the file extension from a path, including the leading dot.

**Parameters:**
- `path` (string) - Path to process

**Returns:** string - File extension (including dot), or empty string if no extension

**Example:**
```javascript
path.extname('/home/user/file.txt');    // '.txt'
path.extname('/home/user/file.tar.gz'); // '.gz'
path.extname('/home/user/file');        // ''
path.extname('/home/user/.bashrc');     // ''
path.extname('file.');                  // ''
```

### path.normalize(path)

Normalize a path by resolving `.` and `..` segments and removing duplicate slashes.

**Parameters:**
- `path` (string) - Path to normalize

**Returns:** string - Normalized path

**Example:**
```javascript
path.normalize('/home/user/../admin');   // '/home/admin'
path.normalize('/home/./user');          // '/home/user'
path.normalize('//home///user//');       // '/home/user'
path.normalize('/home/user/..');         // '/home'
path.normalize('foo/../bar');            // 'bar'
```

### path.relative(from, to)

Get the relative path from one location to another.

**Parameters:**
- `from` (string) - Source path
- `to` (string) - Destination path

**Returns:** string - Relative path

**Example:**
```javascript
path.relative('/home/user', '/home/admin');      // '../admin'
path.relative('/home/user', '/home/user/docs');  // 'docs'
path.relative('/home/user', '/home/user');       // ''
path.relative('/home/user', '/etc');             // '../../etc'
```

### path.isAbsolute(path)

Check if a path is absolute (starts with /).

**Parameters:**
- `path` (string) - Path to check

**Returns:** boolean - True if absolute path

**Example:**
```javascript
path.isAbsolute('/home/user');  // true
path.isAbsolute('user/docs');   // false
path.isAbsolute('../foo');      // false
path.isAbsolute('/');           // true
```

## COMPLETE EXAMPLES

### Build output path from components

```javascript
const projectDir = '/home/projects/myapp';
const buildDir = 'dist';
const filename = 'bundle.js';

const outputPath = path.join(projectDir, buildDir, filename);
console.log(outputPath); // '/home/projects/myapp/dist/bundle.js'
```

### Parse file path information

```javascript
const filePath = '/home/user/documents/report.pdf';

const dir = path.dirname(filePath);      // '/home/user/documents'
const file = path.basename(filePath);    // 'report.pdf'
const name = path.basename(filePath, path.extname(filePath)); // 'report'
const ext = path.extname(filePath);      // '.pdf'

console.log(`Directory: ${dir}`);
console.log(`Filename: ${file}`);
console.log(`Name: ${name}`);
console.log(`Extension: ${ext}`);
```

### Resolve relative imports

```javascript
// Resolve a relative import from current file
const currentFile = '/home/projects/src/components/button.js';
const importPath = '../utils/helpers.js';

const currentDir = path.dirname(currentFile);
const resolvedPath = path.resolve(currentDir, importPath);

console.log(resolvedPath); // '/home/projects/src/utils/helpers.js'
```

### File operations with path utilities

```javascript
// Build paths for file operations
const baseDir = env.HOME;
const configFile = path.join(baseDir, 'config', 'app.json');

// Check if config exists
if (await fs.exists(configFile)) {
  const content = await fs.readFile(configFile);
  console.log('Config loaded from:', configFile);
} else {
  // Create config directory if needed
  const configDir = path.dirname(configFile);
  await fs.mkdir(configDir);

  // Create default config
  await fs.writeFile(configFile, '{}');
  console.log('Created config at:', configFile);
}
```

### Calculate relative paths for links

```javascript
// Generate relative path for file references
const pageFile = '/home/projects/docs/pages/about.html';
const cssFile = '/home/projects/docs/styles/main.css';

const relativePath = path.relative(
  path.dirname(pageFile),
  cssFile
);

console.log(`<link href="${relativePath}">`);
// <link href="../styles/main.css">
```

## NOTES

- All paths use forward slash (/) as separator (POSIX style)
- Absolute paths start with /
- `.` represents current directory
- `..` represents parent directory
- Multiple consecutive slashes are treated as a single slash
- Trailing slashes are generally ignored
- Empty path returns `'.'` (current directory)

## SEE ALSO

fs(3), cd(1), pwd(1), ls(1)
