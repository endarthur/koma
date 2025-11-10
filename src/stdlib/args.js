/**
 * Koma Args Module
 * Command-line argument parsing for scripts
 */

/**
 * Parse command-line arguments
 * @param {Array<string>} argv - Arguments array (usually from 'args' parameter)
 * @param {object} schema - Argument schema definition
 * @returns {object} Parsed arguments with flags, options, and positional args
 *
 * @example
 * const parsed = args.parse(args, {
 *   flags: {
 *     verbose: { short: 'v', description: 'Verbose output' },
 *     help: { short: 'h', description: 'Show help' }
 *   },
 *   options: {
 *     output: { short: 'o', description: 'Output file' },
 *     format: { short: 'f', description: 'Format', choices: ['json', 'text'] }
 *   }
 * });
 */
function parse(argv, schema = {}) {
  const result = {
    flags: {},
    options: {},
    positional: [],
    errors: [],
    _: [],  // Alias for positional
  };

  const flags = schema.flags || {};
  const options = schema.options || {};

  // Build lookup maps for short names
  const shortToLongFlag = {};
  const shortToLongOption = {};

  Object.entries(flags).forEach(([name, spec]) => {
    result.flags[name] = false;  // Initialize to false
    if (spec.short) {
      shortToLongFlag[spec.short] = name;
    }
  });

  Object.entries(options).forEach(([name, spec]) => {
    result.options[name] = spec.default !== undefined ? spec.default : null;
    if (spec.short) {
      shortToLongOption[spec.short] = name;
    }
  });

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    // Stop parsing at --
    if (arg === '--') {
      // Everything after -- is positional
      result.positional.push(...argv.slice(i + 1));
      break;
    }

    // Long flag: --flag
    if (arg.startsWith('--')) {
      const match = arg.match(/^--([^=]+)(?:=(.+))?$/);
      if (!match) {
        result.errors.push(`Invalid argument: ${arg}`);
        i++;
        continue;
      }

      const name = match[1];
      const value = match[2];

      if (flags[name]) {
        // It's a boolean flag
        if (value !== undefined) {
          result.errors.push(`Flag --${name} does not take a value`);
        }
        result.flags[name] = true;
      } else if (options[name]) {
        // It's an option
        if (value !== undefined) {
          // --option=value format
          result.options[name] = value;
        } else {
          // --option value format
          if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
            result.options[name] = argv[i + 1];
            i++;  // Skip next arg
          } else {
            result.errors.push(`Option --${name} requires a value`);
          }
        }

        // Validate choices if specified
        const spec = options[name];
        if (spec.choices && !spec.choices.includes(result.options[name])) {
          result.errors.push(
            `Invalid value for --${name}: ${result.options[name]} ` +
            `(must be one of: ${spec.choices.join(', ')})`
          );
        }
      } else {
        result.errors.push(`Unknown option: --${name}`);
      }

      i++;
      continue;
    }

    // Short flag(s): -f or -abc
    if (arg.startsWith('-') && arg.length > 1 && arg !== '-') {
      const chars = arg.slice(1);

      // Could be multiple flags combined, or a single option with value
      let handledAsOption = false;

      // Try to parse as option first (if last char is option and has value after)
      const lastChar = chars[chars.length - 1];
      if (shortToLongOption[lastChar] && i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        // Handle preceding chars as flags
        for (let j = 0; j < chars.length - 1; j++) {
          const ch = chars[j];
          if (shortToLongFlag[ch]) {
            result.flags[shortToLongFlag[ch]] = true;
          } else {
            result.errors.push(`Unknown flag: -${ch}`);
          }
        }

        // Handle last char as option
        const optionName = shortToLongOption[lastChar];
        result.options[optionName] = argv[i + 1];
        i++;  // Skip next arg

        // Validate choices
        const spec = options[optionName];
        if (spec.choices && !spec.choices.includes(result.options[optionName])) {
          result.errors.push(
            `Invalid value for -${lastChar}: ${result.options[optionName]} ` +
            `(must be one of: ${spec.choices.join(', ')})`
          );
        }

        handledAsOption = true;
      }

      if (!handledAsOption) {
        // Parse each character as a flag
        for (const ch of chars) {
          if (shortToLongFlag[ch]) {
            result.flags[shortToLongFlag[ch]] = true;
          } else if (shortToLongOption[ch]) {
            result.errors.push(`Option -${ch} requires a value`);
          } else {
            result.errors.push(`Unknown flag: -${ch}`);
          }
        }
      }

      i++;
      continue;
    }

    // Positional argument
    result.positional.push(arg);
    i++;
  }

  // Set alias
  result._ = result.positional;

  return result;
}

/**
 * Generate usage text from schema
 * @param {string} commandName - Name of the command
 * @param {object} schema - Argument schema
 * @returns {Array<string>} Array of lines to display
 *
 * @example
 * const usage = args.usage('mycmd', {
 *   description: 'Brief description of what the command does',
 *   flags: {
 *     verbose: { short: 'v', description: 'Verbose output' }
 *   },
 *   options: {
 *     output: { short: 'o', description: 'Output file' }
 *   },
 *   positional: {
 *     description: '<input> [output]'
 *   },
 *   examples: [
 *     { command: 'mycmd input.txt', description: 'Process input.txt' },
 *     { command: 'mycmd -v input.txt', description: 'Process with verbose output' }
 *   ],
 *   notes: [
 *     'Additional information here',
 *     'More notes here'
 *   ],
 *   seeAlso: ['related-cmd', 'man mycmd']
 * });
 */
function usage(commandName, schema = {}) {
  const lines = [];

  // Usage line
  let usageLine = `Usage: ${commandName}`;

  if (schema.flags && Object.keys(schema.flags).length > 0) {
    usageLine += ' [options]';
  }

  if (schema.positional && schema.positional.description) {
    usageLine += ' ' + schema.positional.description;
  }

  lines.push(usageLine);
  lines.push('');

  // Description (optional)
  if (schema.description) {
    lines.push(schema.description);
    lines.push('');
  }

  // Flags
  if (schema.flags && Object.keys(schema.flags).length > 0) {
    lines.push('Flags:');

    Object.entries(schema.flags).forEach(([name, spec]) => {
      const shortPart = spec.short ? `-${spec.short}, ` : '    ';
      const longPart = `--${name}`;
      const desc = spec.description || '';
      lines.push(`  ${shortPart}${longPart}     ${desc}`);
    });

    lines.push('');
  }

  // Options
  if (schema.options && Object.keys(schema.options).length > 0) {
    lines.push('Options:');

    Object.entries(schema.options).forEach(([name, spec]) => {
      const shortPart = spec.short ? `-${spec.short}, ` : '    ';
      const longPart = `--${name}=<value>`;
      let desc = spec.description || '';

      if (spec.choices) {
        desc += ` (choices: ${spec.choices.join(', ')})`;
      }

      if (spec.default !== undefined) {
        desc += ` [default: ${spec.default}]`;
      }

      lines.push(`  ${shortPart}${longPart}     ${desc}`);
    });

    lines.push('');
  }

  // Examples (optional)
  if (schema.examples && schema.examples.length > 0) {
    lines.push('Examples:');

    schema.examples.forEach(example => {
      lines.push(`  ${example.command}     ${example.description || ''}`);
    });

    lines.push('');
  }

  // Notes (optional)
  if (schema.notes && schema.notes.length > 0) {
    lines.push('Notes:');
    schema.notes.forEach(note => {
      lines.push(`  ${note}`);
    });
    lines.push('');
  }

  // See Also (optional)
  if (schema.seeAlso && schema.seeAlso.length > 0) {
    lines.push(`See also: ${schema.seeAlso.join(', ')}`);
    lines.push('');
  }

  return lines;
}

/**
 * Check if help flag is present
 * @param {Array<string>} argv - Arguments array
 * @returns {boolean} True if --help or -h is present
 */
function hasHelp(argv) {
  return argv.includes('--help') || argv.includes('-h');
}

/**
 * Show help if --help flag is present
 * @param {string} commandName - Name of the command
 * @param {Array<string>} argv - Arguments array
 * @param {object} schema - Argument schema
 * @param {object} term - Terminal instance with writeln method
 * @returns {boolean} True if help was shown, false otherwise
 *
 * @example
 * if (argparse.showHelp('ls', args, schema, shell.term)) return;
 */
function showHelp(commandName, argv, schema, term) {
  if (!hasHelp(argv)) {
    return false;
  }

  const helpLines = usage(commandName, schema);
  helpLines.forEach(line => term.writeln(line));
  return true;
}

/**
 * Quick parse for simple flag checking
 * @param {Array<string>} argv - Arguments array
 * @param {string} flag - Flag to check (with or without --)
 * @returns {boolean} True if flag is present
 *
 * @example
 * args.hasFlag(args, '--verbose') // true if --verbose present
 * args.hasFlag(args, 'v') // true if -v present
 */
function hasFlag(argv, flag) {
  if (flag.startsWith('--')) {
    return argv.includes(flag);
  } else if (flag.startsWith('-')) {
    return argv.includes(flag);
  } else {
    // Check both forms
    return argv.includes(`--${flag}`) || argv.includes(`-${flag}`);
  }
}

/**
 * Get option value
 * @param {Array<string>} argv - Arguments array
 * @param {string} option - Option name (with or without --)
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Option value or default
 *
 * @example
 * args.getOption(args, '--output', 'default.txt')
 * args.getOption(args, 'o', 'default.txt')
 */
function getOption(argv, option, defaultValue = null) {
  const longForm = option.startsWith('--') ? option : `--${option}`;
  const shortForm = option.startsWith('-') && !option.startsWith('--') ? option : null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // Check for --option=value
    if (arg.startsWith(longForm + '=')) {
      return arg.slice(longForm.length + 1);
    }

    // Check for --option value
    if (arg === longForm && i + 1 < argv.length) {
      return argv[i + 1];
    }

    // Check for -o value
    if (shortForm && arg === shortForm && i + 1 < argv.length) {
      return argv[i + 1];
    }
  }

  return defaultValue;
}

/**
 * Create args module for scripts
 * @returns {object} Args module API
 */
export function createArgsModule() {
  return {
    parse,
    usage,
    hasHelp,
    showHelp,
    hasFlag,
    getOption,
  };
}
