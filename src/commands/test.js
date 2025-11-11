/**
 * test command - Evaluate conditional expressions
 *
 * Usage:
 *   test EXPRESSION
 *   [ EXPRESSION ]
 *
 * File Tests:
 *   -f FILE    True if file exists and is a regular file
 *   -d FILE    True if file exists and is a directory
 *   -e FILE    True if file exists (any type)
 *   -s FILE    True if file exists and has size > 0
 *   -r FILE    True if file exists and is readable
 *   -w FILE    True if file exists and is writable
 *
 * String Tests:
 *   -z STRING  True if string is empty
 *   -n STRING  True if string is not empty
 *   STR1 = STR2   True if strings are equal
 *   STR1 != STR2  True if strings are not equal
 *
 * Numeric Tests:
 *   N1 -eq N2  True if numbers are equal
 *   N1 -ne N2  True if numbers are not equal
 *   N1 -lt N2  True if N1 < N2
 *   N1 -gt N2  True if N1 > N2
 *   N1 -le N2  True if N1 <= N2
 *   N1 -ge N2  True if N1 >= N2
 *
 * Logical:
 *   ! EXPR     True if expression is false
 *   EXPR -a EXPR  True if both expressions are true (AND)
 *   EXPR -o EXPR  True if either expression is true (OR)
 *
 * Exit Status:
 *   0 - Expression is true
 *   1 - Expression is false
 *   2 - Syntax error
 */

import { kernelClient } from '../kernel/client.js';
import { resolvePath } from '../utils/command-utils.js';

/**
 * Evaluate a test expression
 */
export async function test(args, shell, context) {
  try {
    // Handle [ command - last arg must be ]
    if (context.commandName === '[') {
      if (args.length === 0 || args[args.length - 1] !== ']') {
        context.writeln('test: missing ]');
        shell.lastExitCode = 2;
        return 2;
      }
      // Remove the closing ]
      args = args.slice(0, -1);
    }

    // Empty expression is false
    if (args.length === 0) {
      shell.lastExitCode = 1;
      return 1;
    }

    const result = await evaluateExpression(args, shell);
    const exitCode = result ? 0 : 1;
    shell.lastExitCode = exitCode;
    return exitCode;
  } catch (error) {
    context.writeln(`test: ${error.message}`);
    shell.lastExitCode = 2;
    return 2;
  }
}

/**
 * Evaluate a test expression recursively
 */
async function evaluateExpression(args, shell) {
  if (args.length === 0) {
    return false;
  }

  // Handle negation: ! EXPR
  if (args[0] === '!') {
    const result = await evaluateExpression(args.slice(1), shell);
    return !result;
  }

  // Handle parentheses: ( EXPR )
  if (args[0] === '(' && args[args.length - 1] === ')') {
    return await evaluateExpression(args.slice(1, -1), shell);
  }

  // Handle logical OR: EXPR -o EXPR
  const orIndex = args.indexOf('-o');
  if (orIndex > 0) {
    const left = await evaluateExpression(args.slice(0, orIndex), shell);
    if (left) return true; // Short-circuit
    const right = await evaluateExpression(args.slice(orIndex + 1), shell);
    return right;
  }

  // Handle logical AND: EXPR -a EXPR
  const andIndex = args.indexOf('-a');
  if (andIndex > 0) {
    const left = await evaluateExpression(args.slice(0, andIndex), shell);
    if (!left) return false; // Short-circuit
    const right = await evaluateExpression(args.slice(andIndex + 1), shell);
    return right;
  }

  // Unary operators
  if (args.length === 2) {
    const op = args[0];
    const operand = args[1];

    switch (op) {
      case '-z': // Zero length string
        return operand.length === 0;

      case '-n': // Non-zero length string
        return operand.length > 0;

      case '-f': // Regular file
        return await isRegularFile(operand, shell);

      case '-d': // Directory
        return await isDirectory(operand, shell);

      case '-e': // Exists
        return await fileExists(operand, shell);

      case '-s': // Non-empty file
        return await isNonEmptyFile(operand, shell);

      case '-r': // Readable (always true in our VFS)
        return await fileExists(operand, shell);

      case '-w': // Writable (always true in our VFS)
        return await fileExists(operand, shell);

      default:
        throw new Error(`unknown unary operator: ${op}`);
    }
  }

  // Binary operators
  if (args.length === 3) {
    const left = args[0];
    const op = args[1];
    const right = args[2];

    switch (op) {
      // String comparison
      case '=':
      case '==':
        return left === right;

      case '!=':
        return left !== right;

      // Numeric comparison
      case '-eq':
        return parseInt(left, 10) === parseInt(right, 10);

      case '-ne':
        return parseInt(left, 10) !== parseInt(right, 10);

      case '-lt':
        return parseInt(left, 10) < parseInt(right, 10);

      case '-gt':
        return parseInt(left, 10) > parseInt(right, 10);

      case '-le':
        return parseInt(left, 10) <= parseInt(right, 10);

      case '-ge':
        return parseInt(left, 10) >= parseInt(right, 10);

      default:
        throw new Error(`unknown binary operator: ${op}`);
    }
  }

  // Single argument - non-empty string test
  if (args.length === 1) {
    return args[0].length > 0;
  }

  throw new Error('syntax error: too many arguments');
}

/**
 * Check if path is a regular file
 */
async function isRegularFile(path, shell) {
  try {
    const kernel = await kernelClient.getKernel();
    const fullPath = resolvePath(path, shell.cwd, shell.env.HOME);
    const stat = await kernel.stat(fullPath);
    return stat.type === 'file';
  } catch (error) {
    return false;
  }
}

/**
 * Check if path is a directory
 */
async function isDirectory(path, shell) {
  try {
    const kernel = await kernelClient.getKernel();
    const fullPath = resolvePath(path, shell.cwd, shell.env.HOME);
    const stat = await kernel.stat(fullPath);
    return stat.type === 'directory';
  } catch (error) {
    return false;
  }
}

/**
 * Check if file exists
 */
async function fileExists(path, shell) {
  try {
    const kernel = await kernelClient.getKernel();
    const fullPath = resolvePath(path, shell.cwd, shell.env.HOME);
    await kernel.stat(fullPath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if file exists and has size > 0
 */
async function isNonEmptyFile(path, shell) {
  try {
    const kernel = await kernelClient.getKernel();
    const fullPath = resolvePath(path, shell.cwd, shell.env.HOME);
    const stat = await kernel.stat(fullPath);
    return stat.type === 'file' && stat.size > 0;
  } catch (error) {
    return false;
  }
}
