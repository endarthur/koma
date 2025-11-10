# NAME

fs - filesystem API for Koma scripts

## SYNOPSIS

```javascript
// Available in scripts as 'fs' module
const content = await fs.readFile('/home/file.txt');
await fs.writeFile('/home/output.txt', 'Hello, World!');
const files = await fs.readdir('/home');
```

## DESCRIPTION

The `fs` module provides access to the virtual filesystem (VFS) from JavaScript scripts executed with the `run` command. All operations are asynchronous and return Promises.

## FUNCTIONS

### fs.readFile(path)

Read file contents as a string.

**Parameters:**
- `path` (string) - File path to read

**Returns:** Promise\<string\> - File contents

**Throws:** Error with 'ENOENT' if file doesn't exist

**Example:**
```javascript
const content = await fs.readFile('/home/config.json');
const config = JSON.parse(content);
console.log('Config loaded:', config);
```

### fs.writeFile(path, content)

Write content to a file. Creates the file if it doesn't exist, overwrites if it does.

**Parameters:**
- `path` (string) - File path to write
- `content` (string) - Content to write

**Returns:** Promise\<void\>

**Example:**
```javascript
await fs.writeFile('/home/log.txt', 'Application started\n');
console.log('Log file created');
```

### fs.appendFile(path, content)

Append content to a file. Creates the file if it doesn't exist.

**Parameters:**
- `path` (string) - File path to append to
- `content` (string) - Content to append

**Returns:** Promise\<void\>

**Example:**
```javascript
await fs.appendFile('/home/log.txt', 'New log entry\n');
```

### fs.readdir(path)

Read directory contents.

**Parameters:**
- `path` (string) - Directory path to read

**Returns:** Promise\<Array\<Object\>\> - Array of directory entries with properties:
- `name` (string) - Entry name
- `type` (string) - 'file' or 'directory'
- `size` (number) - Size in bytes (files only)
- `modified` (Date) - Last modified timestamp

**Example:**
```javascript
const entries = await fs.readdir('/home');
for (const entry of entries) {
  console.log(`${entry.type}: ${entry.name}`);
}
```

### fs.mkdir(path)

Create a directory.

**Parameters:**
- `path` (string) - Directory path to create

**Returns:** Promise\<void\>

**Throws:** Error if parent directory doesn't exist

**Example:**
```javascript
await fs.mkdir('/home/projects');
console.log('Directory created');
```

### fs.unlink(path)

Delete a file or empty directory.

**Parameters:**
- `path` (string) - Path to delete

**Returns:** Promise\<void\>

**Throws:** Error if directory is not empty

**Example:**
```javascript
await fs.unlink('/home/temp.txt');
console.log('File deleted');
```

### fs.rename(oldPath, newPath)

Rename or move a file or directory.

**Parameters:**
- `oldPath` (string) - Current path
- `newPath` (string) - New path

**Returns:** Promise\<void\>

**Example:**
```javascript
await fs.rename('/home/old.txt', '/home/new.txt');
console.log('File renamed');
```

### fs.stat(path)

Get file or directory metadata.

**Parameters:**
- `path` (string) - Path to stat

**Returns:** Promise\<Object\> - Metadata object with properties:
- `type` (string) - 'file' or 'directory'
- `size` (number) - Size in bytes
- `inode` (number) - Inode number
- `created` (Date) - Creation timestamp
- `modified` (Date) - Last modified timestamp
- `accessed` (Date) - Last accessed timestamp

**Example:**
```javascript
const stat = await fs.stat('/home/file.txt');
console.log(`Size: ${stat.size} bytes`);
console.log(`Modified: ${stat.modified}`);
```

### fs.exists(path)

Check if a path exists.

**Parameters:**
- `path` (string) - Path to check

**Returns:** Promise\<boolean\> - True if exists, false otherwise

**Example:**
```javascript
if (await fs.exists('/home/config.json')) {
  console.log('Config file exists');
} else {
  console.log('Config file not found');
}
```

### fs.isFile(path)

Check if a path is a file.

**Parameters:**
- `path` (string) - Path to check

**Returns:** Promise\<boolean\> - True if path exists and is a file

**Example:**
```javascript
if (await fs.isFile('/home/script.js')) {
  console.log('It is a file');
}
```

### fs.isDirectory(path)

Check if a path is a directory.

**Parameters:**
- `path` (string) - Path to check

**Returns:** Promise\<boolean\> - True if path exists and is a directory

**Example:**
```javascript
if (await fs.isDirectory('/home')) {
  console.log('It is a directory');
}
```

## COMPLETE EXAMPLE

```javascript
// Create a backup script
const source = '/home/data.txt';
const backup = '/home/data.backup.txt';

// Check if source exists
if (await fs.exists(source)) {
  // Read source content
  const content = await fs.readFile(source);

  // Write backup
  await fs.writeFile(backup, content);

  // Verify backup
  const stat = await fs.stat(backup);
  console.log(`Backup created: ${stat.size} bytes`);
} else {
  console.error('Source file not found');
}
```

## SEE ALSO

run(1), path(3), cat(1), ls(1), mkdir(1)
