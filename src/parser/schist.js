/**
 * Schist - A minimal Lisp/Scheme interpreter
 *
 * Named after the metamorphic rock, representing code transformation
 * through evaluation (like Lisp macros transform code).
 *
 * Features:
 * - S-expression parsing
 * - Basic arithmetic (+, -, *, /)
 * - List operations (list, car, cdr, cons)
 * - Comparison (eq, =)
 * - I/O (print)
 * - Conditionals (if)
 * - Lambda functions (lambda)
 *
 * Examples:
 *   (+ 1 2 3)              → 6
 *   (list 1 2 3)           → (1 2 3)
 *   (car (list 1 2 3))     → 1
 *   (if (= 1 1) 'yes 'no)  → yes
 */

import { SExpressionNode } from './ast-nodes.js';

/**
 * Parse a string into an S-expression AST
 * @param {string} input - Schist code
 * @returns {SExpressionNode|string|number} Parsed s-expression
 */
export function parseSchist(input) {
  const tokens = tokenize(input);
  const { expr, index } = parseExpression(tokens, 0);

  // Ensure all tokens were consumed
  if (index < tokens.length) {
    const remaining = tokens[index];
    if (remaining === ')') {
      throw new Error('Unexpected closing parenthesis');
    }
    throw new Error(`Unexpected token: ${remaining}`);
  }

  return expr;
}

/**
 * Tokenize Schist input
 * @param {string} input - Raw Schist code
 * @returns {string[]} Array of tokens
 */
function tokenize(input) {
  // Replace parentheses with spaces around them for splitting
  const spaced = input
    .replace(/\(/g, ' ( ')
    .replace(/\)/g, ' ) ')
    .trim();

  // Split by whitespace and filter empty
  return spaced.split(/\s+/).filter(t => t.length > 0);
}

/**
 * Parse a single expression from tokens
 * @param {string[]} tokens - Token array
 * @param {number} index - Current position
 * @returns {{expr: any, index: number}} Parsed expression and new index
 */
function parseExpression(tokens, index) {
  if (index >= tokens.length) {
    throw new Error('Unexpected end of input');
  }

  const token = tokens[index];

  // Start of list
  if (token === '(') {
    const elements = [];
    index++; // Skip opening paren

    // Parse elements until closing paren
    while (index < tokens.length && tokens[index] !== ')') {
      const { expr, index: newIndex } = parseExpression(tokens, index);
      elements.push(expr);
      index = newIndex;
    }

    if (index >= tokens.length || tokens[index] !== ')') {
      throw new Error('Unmatched opening parenthesis');
    }

    index++; // Skip closing paren
    return { expr: new SExpressionNode(elements), index };
  }

  // Unexpected closing paren
  if (token === ')') {
    throw new Error('Unexpected closing parenthesis');
  }

  // Atom (number, symbol, or quoted symbol)
  return { expr: parseAtom(token), index: index + 1 };
}

/**
 * Parse an atomic value (number or symbol)
 * @param {string} token - Token to parse
 * @returns {number|string} Parsed atom
 */
function parseAtom(token) {
  // Quoted symbol
  if (token.startsWith("'")) {
    return token.substring(1); // Remove quote, return as symbol
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(token)) {
    return parseFloat(token);
  }

  // Symbol
  return token;
}

/**
 * Thunk wrapper for tail calls (enables tail call optimization via trampolining)
 * @param {Function} fn - Function to defer
 * @returns {Object} Thunk object
 */
function thunk(fn) {
  return { type: 'thunk', fn };
}

/**
 * Evaluate a Schist expression with tail call optimization (trampoline)
 * @param {SExpressionNode|string|number} expr - Expression to evaluate
 * @param {Object} env - Environment (variable bindings)
 * @param {Object} [context] - Command context for interactive I/O
 * @returns {Promise<any>} Evaluated result
 */
export async function evaluateSchist(expr, env = {}, context = null) {
  let result = await evaluate(expr, env, context);

  // Trampoline loop: keep unwrapping thunks until we get a real value
  while (result && result.type === 'thunk') {
    result = await result.fn();
  }

  return result;
}

/**
 * Internal evaluation function (returns thunks for tail calls)
 * @param {SExpressionNode|string|number} expr - Expression to evaluate
 * @param {Object} env - Environment (variable bindings)
 * @param {Object} [context] - Command context for interactive I/O
 * @returns {Promise<any>} Evaluated result or thunk
 */
async function evaluate(expr, env = {}, context = null) {
  // Self-evaluating: numbers
  if (typeof expr === 'number') {
    return expr;
  }

  // Symbols: look up in environment
  if (typeof expr === 'string') {
    if (expr in env) {
      return env[expr];
    }
    // Return symbol as-is if not bound (for quoted symbols)
    return expr;
  }

  // S-expression: function application
  if (expr instanceof SExpressionNode) {
    const elements = expr.elements;

    if (elements.length === 0) {
      return [];
    }

    const operator = elements[0];

    // Special forms (don't evaluate all arguments)
    if (operator === 'quote') {
      if (elements.length !== 2) {
        throw new Error('quote requires exactly 1 argument');
      }
      return elements[1];
    }

    if (operator === 'if') {
      if (elements.length !== 4) {
        throw new Error('if requires 3 arguments: (if condition then else)');
      }
      // Evaluate condition (not in tail position) - need actual value
      const condition = await evaluateSchist(elements[1], env, context);
      // Both branches are in tail position - return thunks
      if (isTruthy(condition)) {
        return thunk(() => evaluate(elements[2], env, context));
      } else {
        return thunk(() => evaluate(elements[3], env, context));
      }
    }

    if (operator === 'lambda') {
      if (elements.length !== 3) {
        throw new Error('lambda requires 2 arguments: (lambda (params) body)');
      }
      const params = elements[1];
      const body = elements[2];

      if (!(params instanceof SExpressionNode)) {
        throw new Error('lambda parameters must be a list');
      }

      // Return a closure (function + environment)
      return {
        type: 'lambda',
        params: params.elements,
        body: body,
        env: env
      };
    }

    if (operator === 'define') {
      if (elements.length !== 3) {
        throw new Error('define requires 2 arguments: (define name value)');
      }
      const name = elements[1];
      if (typeof name !== 'string') {
        throw new Error('define name must be a symbol');
      }
      // Value evaluation is not in tail position (we do work after)
      const value = await evaluateSchist(elements[2], env, context);
      env[name] = value;
      return value;
    }

    if (operator === 'set!') {
      if (elements.length !== 3) {
        throw new Error('set! requires 2 arguments: (set! name value)');
      }
      const name = elements[1];
      if (typeof name !== 'string') {
        throw new Error('set! name must be a symbol');
      }
      if (!(name in env)) {
        throw new Error(`set!: undefined variable ${name}`);
      }
      // Value evaluation is not in tail position (we do work after)
      const value = await evaluateSchist(elements[2], env, context);
      env[name] = value;
      return value;
    }

    if (operator === 'begin') {
      if (elements.length < 2) {
        throw new Error('begin requires at least 1 expression');
      }
      // Evaluate all expressions except the last (not in tail position)
      for (let i = 1; i < elements.length - 1; i++) {
        await evaluateSchist(elements[i], env, context);
      }
      // Last expression is in tail position - return thunk
      return thunk(() => evaluate(elements[elements.length - 1], env, context));
    }

    if (operator === 'cond') {
      if (elements.length < 2) {
        throw new Error('cond requires at least 1 clause');
      }
      for (let i = 1; i < elements.length; i++) {
        const clause = elements[i];
        if (!(clause instanceof SExpressionNode) || clause.elements.length < 2) {
          throw new Error('cond clause must be a list with at least 2 elements');
        }
        const test = clause.elements[0];

        // Check for else clause
        if (test === 'else') {
          // Evaluate all expressions except last (not in tail position)
          for (let j = 1; j < clause.elements.length - 1; j++) {
            await evaluateSchist(clause.elements[j], env, context);
          }
          // Last expression is in tail position - return thunk
          return thunk(() => evaluate(clause.elements[clause.elements.length - 1], env, context));
        }

        // Evaluate test (not in tail position) - need actual value
        if (isTruthy(await evaluateSchist(test, env, context))) {
          // Evaluate all expressions except last (not in tail position)
          for (let j = 1; j < clause.elements.length - 1; j++) {
            await evaluateSchist(clause.elements[j], env, context);
          }
          // Last expression is in tail position - return thunk
          return thunk(() => evaluate(clause.elements[clause.elements.length - 1], env, context));
        }
      }
      // No clause matched
      return undefined;
    }

    if (operator === 'let') {
      if (elements.length !== 3) {
        throw new Error('let requires 2 arguments: (let ((var val)...) body)');
      }
      const bindings = elements[1];
      const body = elements[2];

      if (!(bindings instanceof SExpressionNode)) {
        throw new Error('let bindings must be a list');
      }

      // Transform (let ((x 1) (y 2)) body) to ((lambda (x y) body) 1 2)
      const params = [];
      const values = [];

      for (const binding of bindings.elements) {
        if (!(binding instanceof SExpressionNode) || binding.elements.length !== 2) {
          throw new Error('let binding must be a list of 2 elements');
        }
        params.push(binding.elements[0]);
        // Binding values are not in tail position
        values.push(await evaluateSchist(binding.elements[1], env, context));
      }

      // Create lambda and apply it
      const lambda = {
        type: 'lambda',
        params: params,
        body: body,
        env: env
      };

      // Create new environment with lambda's closure + parameters
      const newEnv = { ...lambda.env };
      for (let i = 0; i < params.length; i++) {
        newEnv[params[i]] = values[i];
      }

      // Body evaluation is in tail position - return thunk
      return thunk(() => evaluate(lambda.body, newEnv, context));
    }

    // Evaluate operator and arguments (not in tail position)
    const fn = await evaluateSchist(operator, env, context);
    const args = await Promise.all(elements.slice(1).map(arg => evaluateSchist(arg, env, context)));

    // Lambda application
    if (typeof fn === 'object' && fn.type === 'lambda') {
      if (args.length !== fn.params.length) {
        throw new Error(`lambda expects ${fn.params.length} arguments, got ${args.length}`);
      }

      // Create new environment with lambda's closure + parameters
      const newEnv = { ...fn.env };
      for (let i = 0; i < fn.params.length; i++) {
        newEnv[fn.params[i]] = args[i];
      }

      // Body evaluation is in tail position - return thunk
      // This is crucial for tail-recursive functions like the REPL!
      return thunk(() => evaluate(fn.body, newEnv, context));
    }

    // Built-in function application
    if (typeof fn === 'function') {
      // Only pass context to functions that need it (read, eval, apply)
      // Other functions (arithmetic, list ops, etc.) don't expect context
      const needsContext = typeof operator === 'string' && ['read', 'eval', 'apply'].includes(operator);
      const result = needsContext ? fn(...args, context) : fn(...args);
      // If function returns a promise, await it
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    }

    throw new Error(`Cannot call ${operator} - not a function`);
  }

  throw new Error(`Unknown expression type: ${typeof expr}`);
}

/**
 * Check if a value is truthy (anything except #f or 0)
 */
function isTruthy(value) {
  if (value === false || value === 0) return false;
  return true;
}

/**
 * Create standard Schist environment with built-in functions
 * @returns {Object} Environment with built-ins
 */
export function createSchistEnv() {
  return {
    // Arithmetic
    '+': (...args) => args.reduce((a, b) => a + b, 0),
    '-': (...args) => {
      if (args.length === 0) return 0;
      if (args.length === 1) return -args[0];
      return args.reduce((a, b) => a - b);
    },
    '*': (...args) => args.reduce((a, b) => a * b, 1),
    '/': (...args) => {
      if (args.length === 0) throw new Error('/ requires at least 1 argument');
      if (args.length === 1) return 1 / args[0];
      return args.reduce((a, b) => {
        if (b === 0) throw new Error('Division by zero');
        return a / b;
      });
    },

    // Comparison
    '=': (a, b) => a === b,
    'eq': (a, b) => a === b,
    '<': (a, b) => a < b,
    '>': (a, b) => a > b,
    '<=': (a, b) => a <= b,
    '>=': (a, b) => a >= b,

    // List operations
    'list': (...args) => args,
    'car': (list) => {
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error('car requires a non-empty list');
      }
      return list[0];
    },
    'cdr': (list) => {
      if (!Array.isArray(list)) {
        throw new Error('cdr requires a list');
      }
      return list.slice(1);
    },
    'cons': (item, list) => {
      if (!Array.isArray(list)) {
        // Classic cons cell (pair)
        return [item, list];
      }
      return [item, ...list];
    },
    'length': (list) => {
      if (!Array.isArray(list)) {
        throw new Error('length requires a list');
      }
      return list.length;
    },
    'null?': (list) => {
      return Array.isArray(list) && list.length === 0;
    },

    // Logic
    'not': (value) => !isTruthy(value),
    'and': (...args) => args.every(isTruthy),
    'or': (...args) => args.some(isTruthy),

    // Type predicates
    'number?': (value) => typeof value === 'number',
    'symbol?': (value) => typeof value === 'string',
    'list?': (value) => Array.isArray(value),
    'function?': (value) => typeof value === 'function' || (typeof value === 'object' && value.type === 'lambda'),

    // Meta-circular support
    'eval': async (expr, envArg, context) => {
      // Evaluate a quoted expression
      // Use provided environment or create new one
      const evalEnv = envArg || createSchistEnv();
      return await evaluateSchist(expr, evalEnv, context);
    },
    'apply': async (fn, args, context) => {
      // Apply function to list of arguments
      if (!Array.isArray(args)) {
        throw new Error('apply: second argument must be a list');
      }

      // Built-in function
      if (typeof fn === 'function') {
        const result = fn(...args, context);
        if (result instanceof Promise) {
          return await result;
        }
        return result;
      }

      // Lambda
      if (typeof fn === 'object' && fn.type === 'lambda') {
        if (args.length !== fn.params.length) {
          throw new Error(`apply: lambda expects ${fn.params.length} arguments, got ${args.length}`);
        }

        // Create new environment with lambda's closure + parameters
        const newEnv = { ...fn.env };
        for (let i = 0; i < fn.params.length; i++) {
          newEnv[fn.params[i]] = args[i];
        }

        return await evaluateSchist(fn.body, newEnv, context);
      }

      throw new Error('apply: first argument must be a function');
    },

    // I/O primitives (require context parameter)
    'display': (value) => {
      // Returns the value for use in expressions
      // Actual output handled by REPL/command
      return { type: 'display', value: value };
    },
    'write': (value) => {
      // Like display but shows proper representation (e.g., strings with quotes)
      return { type: 'write', value: value };
    },
    'print': (value) => {
      // Convenience: display + newline
      return { type: 'print', value: value };
    },
    'newline': () => {
      return { type: 'newline' };
    },
    'read': async (input, context) => {
      // Parse a string as Schist code and return the data structure
      // (read "(+ 1 2)") => (+ 1 2) as a list, not evaluated
      // (read) with no args => interactive read from user
      if (input === undefined) {
        // Interactive read from user input
        if (!context) {
          throw new Error('read: interactive read requires context');
        }
        const userInput = await context.readLine('read> ');
        if (userInput === null) {
          // Ctrl+C pressed - return empty list
          return [];
        }
        return parseSchist(userInput);
      }
      if (typeof input !== 'string') {
        throw new Error('read: input must be a string');
      }
      return parseSchist(input);
    },
  };
}

/**
 * Convert a Schist value to a string for display (no quotes on strings)
 * @param {any} value - Value to format
 * @returns {string} Formatted string
 */
export function schistToString(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? '#t' : '#f';
  if (typeof value === 'function') return '<builtin-function>';
  if (typeof value === 'object' && value.type === 'lambda') return '<lambda>';
  if (Array.isArray(value)) {
    return '(' + value.map(schistToString).join(' ') + ')';
  }
  return String(value);
}

/**
 * Convert a Schist value to proper representation (with quotes on strings)
 * @param {any} value - Value to format
 * @returns {string} Formatted string with proper escaping
 */
export function schistWrite(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `"${value}"`;  // Strings get quotes
  if (typeof value === 'boolean') return value ? '#t' : '#f';
  if (typeof value === 'function') return '<builtin-function>';
  if (typeof value === 'object' && value.type === 'lambda') return '<lambda>';
  if (Array.isArray(value)) {
    return '(' + value.map(schistWrite).join(' ') + ')';
  }
  return String(value);
}
