/**
 * Koma Path Module
 * POSIX-style path utilities for VFS operations
 */

/**
 * Join path segments into a single path
 * @param {...string} segments - Path segments to join
 * @returns {string} Joined path
 *
 * @example
 * path.join('/home', 'user', 'file.txt') // '/home/user/file.txt'
 * path.join('/home', '../etc') // '/etc'
 */
function join(...segments) {
  if (segments.length === 0) return '.';

  // Filter out empty segments and join with /
  const joined = segments
    .filter(seg => seg && seg !== '')
    .join('/');

  // Normalize the result
  return normalize(joined);
}

/**
 * Resolve path segments to an absolute path
 * @param {...string} segments - Path segments to resolve
 * @returns {string} Absolute path
 *
 * @example
 * path.resolve('/home', 'user', 'file.txt') // '/home/user/file.txt'
 * path.resolve('user', 'file.txt') // '/user/file.txt' (assumes root CWD)
 */
function resolve(...segments) {
  let resolvedPath = '';
  let isAbsolute = false;

  // Process segments from right to left
  for (let i = segments.length - 1; i >= 0 && !isAbsolute; i--) {
    const segment = segments[i];

    if (!segment || segment === '') continue;

    if (segment.startsWith('/')) {
      // Absolute path found
      resolvedPath = segment + (resolvedPath ? '/' + resolvedPath : '');
      isAbsolute = true;
    } else {
      // Relative segment
      resolvedPath = segment + (resolvedPath ? '/' + resolvedPath : '');
    }
  }

  // If no absolute path found, prepend /
  if (!isAbsolute) {
    resolvedPath = '/' + resolvedPath;
  }

  return normalize(resolvedPath);
}

/**
 * Get the directory name of a path
 * @param {string} path - Path to process
 * @returns {string} Directory name
 *
 * @example
 * path.dirname('/home/user/file.txt') // '/home/user'
 * path.dirname('/home') // '/'
 * path.dirname('/') // '/'
 */
function dirname(path) {
  if (!path || path === '/') return '/';

  // Remove trailing slashes
  path = path.replace(/\/+$/, '');

  const lastSlash = path.lastIndexOf('/');

  if (lastSlash === 0) return '/';
  if (lastSlash === -1) return '.';

  return path.slice(0, lastSlash);
}

/**
 * Get the filename from a path
 * @param {string} path - Path to process
 * @param {string} [ext] - Optional extension to remove
 * @returns {string} Base filename
 *
 * @example
 * path.basename('/home/user/file.txt') // 'file.txt'
 * path.basename('/home/user/file.txt', '.txt') // 'file'
 * path.basename('/home/user/') // 'user'
 */
function basename(path, ext) {
  if (!path) return '';

  // Remove trailing slashes
  path = path.replace(/\/+$/, '');

  if (path === '' || path === '/') return path === '/' ? '/' : '';

  const lastSlash = path.lastIndexOf('/');
  let base = lastSlash === -1 ? path : path.slice(lastSlash + 1);

  // Remove extension if provided and matches
  if (ext && base.endsWith(ext)) {
    base = base.slice(0, -ext.length);
  }

  return base;
}

/**
 * Get the file extension
 * @param {string} path - Path to process
 * @returns {string} Extension including the dot, or empty string
 *
 * @example
 * path.extname('/home/user/file.txt') // '.txt'
 * path.extname('/home/user/file') // ''
 * path.extname('/home/user/.bashrc') // ''
 */
function extname(path) {
  if (!path) return '';

  const base = basename(path);
  const lastDot = base.lastIndexOf('.');

  // No extension if:
  // - No dot found
  // - Dot is first character (hidden file)
  // - Dot is last character
  if (lastDot === -1 || lastDot === 0 || lastDot === base.length - 1) {
    return '';
  }

  return base.slice(lastDot);
}

/**
 * Normalize a path, resolving '..' and '.' segments
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 *
 * @example
 * path.normalize('/home/user/../admin') // '/home/admin'
 * path.normalize('/home/./user') // '/home/user'
 * path.normalize('//home///user//') // '/home/user'
 */
function normalize(path) {
  if (!path || path === '') return '.';

  const isAbsolute = path.startsWith('/');
  const parts = path.split('/').filter(p => p && p !== '.');
  const normalized = [];

  for (const part of parts) {
    if (part === '..') {
      // Go up one directory (but not above root)
      if (normalized.length > 0 && normalized[normalized.length - 1] !== '..') {
        normalized.pop();
      } else if (!isAbsolute) {
        // Only allow .. in relative paths
        normalized.push('..');
      }
      // If absolute path, ignore .. at root level
    } else {
      normalized.push(part);
    }
  }

  const result = normalized.join('/');

  if (isAbsolute) {
    return result === '' ? '/' : '/' + result;
  }

  return result === '' ? '.' : result;
}

/**
 * Get relative path from 'from' to 'to'
 * @param {string} from - Source path
 * @param {string} to - Destination path
 * @returns {string} Relative path
 *
 * @example
 * path.relative('/home/user', '/home/admin') // '../admin'
 * path.relative('/home/user', '/home/user/docs') // 'docs'
 */
function relative(from, to) {
  from = resolve(from);
  to = resolve(to);

  if (from === to) return '';

  // Split and filter empty parts
  const fromParts = from.split('/').filter(p => p);
  const toParts = to.split('/').filter(p => p);

  // Find common prefix length
  let commonLength = 0;
  const minLength = Math.min(fromParts.length, toParts.length);

  for (let i = 0; i < minLength; i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++;
    } else {
      break;
    }
  }

  // Build relative path
  const upCount = fromParts.length - commonLength;
  const relativeParts = [];

  // Add '..' for each level up
  for (let i = 0; i < upCount; i++) {
    relativeParts.push('..');
  }

  // Add remaining 'to' parts
  relativeParts.push(...toParts.slice(commonLength));

  return relativeParts.join('/') || '.';
}

/**
 * Check if path is absolute
 * @param {string} path - Path to check
 * @returns {boolean} True if absolute path
 *
 * @example
 * path.isAbsolute('/home/user') // true
 * path.isAbsolute('user/docs') // false
 */
function isAbsolute(path) {
  return path && path.startsWith('/');
}

/**
 * Path separator (always '/' in POSIX)
 */
const sep = '/';

/**
 * Create path module for scripts
 * @returns {object} Path module API
 */
export function createPathModule() {
  return {
    join,
    resolve,
    dirname,
    basename,
    extname,
    normalize,
    relative,
    isAbsolute,
    sep,
  };
}
