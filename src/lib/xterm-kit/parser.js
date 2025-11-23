/**
 * xterm-kit: Command Parser
 * Simple command-line tokenization and parsing
 *
 * Extracted from koma's shell.js - quote-aware tokenization
 * without full AST/pipeline/redirect support (that's shell-specific)
 */

/**
 * Tokenize command line with quote awareness
 * Handles single quotes, double quotes, and basic operators
 *
 * @param {string} line - Command line to tokenize
 * @returns {string[]} Array of tokens
 *
 * @example
 * tokenize('ls -la "My Files"')
 * // Returns: ['ls', '-la', 'My Files']
 *
 * tokenize("echo 'hello world'")
 * // Returns: ['echo', 'hello world']
 */
export function tokenize(line) {
  const trimmed = line.trim();
  const tokens = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = null;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const nextChar = trimmed[i + 1];

    if ((char === '"' || char === "'") && !inQuotes) {
      // Start of quoted string
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      // End of quoted string
      inQuotes = false;
      quoteChar = null;
    } else if (!inQuotes && (char === '|' || char === '<' || char === '>')) {
      // Operator outside quotes
      if (current) {
        tokens.push(current);
        current = '';
      }
      // Handle >> as single token
      if (char === '>' && nextChar === '>') {
        tokens.push('>>');
        i++; // Skip next char
      } else {
        tokens.push(char);
      }
    } else if (char === ' ' && !inQuotes) {
      // Space outside quotes - end of token
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      // Regular character
      current += char;
    }
  }

  // Add last token
  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse command line into command and arguments (simple mode)
 * Does NOT handle pipes/redirects - use for basic command parsing only
 *
 * @param {string} line - Command line to parse
 * @returns {object} { command, args, raw }
 *
 * @example
 * parseCommand('ls -la /tmp')
 * // Returns: { command: 'ls', args: ['-la', '/tmp'], raw: 'ls -la /tmp' }
 *
 * parseCommand('echo "hello world"')
 * // Returns: { command: 'echo', args: ['hello world'], raw: 'echo "hello world"' }
 */
export function parseCommand(line) {
  const tokens = tokenize(line);

  // Filter out operators (shouldn't be present in simple mode, but just in case)
  const parts = tokens.filter(t => !['|', '<', '>', '>>'].includes(t));

  return {
    command: parts[0] || '',
    args: parts.slice(1),
    raw: line.trim(),
  };
}

/**
 * Split command line by semicolons (respecting quotes)
 * Useful for executing multiple commands in sequence
 *
 * @param {string} line - Command line to split
 * @returns {string[]} Array of command segments
 *
 * @example
 * splitBySemicolon('ls; pwd; echo "hello; world"')
 * // Returns: ['ls', 'pwd', 'echo "hello; world"']
 */
export function splitBySemicolon(line) {
  const segments = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = null;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = null;
      current += char;
    } else if (char === ';' && !inQuotes) {
      // Semicolon outside quotes - split here
      if (current.trim()) {
        segments.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  // Add last segment
  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

/**
 * Check if a string contains shell operators (pipes, redirects)
 * Useful for determining if command needs special handling
 *
 * @param {string} line - Command line to check
 * @returns {boolean} True if line contains operators
 *
 * @example
 * hasOperators('ls -la') // false
 * hasOperators('cat file.txt | grep foo') // true
 * hasOperators('echo "test" > output.txt') // true
 */
export function hasOperators(line) {
  const tokens = tokenize(line);
  return tokens.some(t => ['|', '<', '>', '>>'].includes(t));
}

/**
 * Extract command name from a command line
 * Handles aliases and complex command lines
 *
 * @param {string} line - Command line
 * @returns {string} Command name (first token)
 *
 * @example
 * extractCommand('ls -la /tmp') // 'ls'
 * extractCommand('git commit -m "message"') // 'git'
 */
export function extractCommand(line) {
  const tokens = tokenize(line);
  return tokens[0] || '';
}
