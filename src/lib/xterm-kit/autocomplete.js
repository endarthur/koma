/**
 * autocomplete.js - Tab completion for xterm.js terminals
 *
 * Provides intelligent command and argument completion with support for:
 * - Static command/subcommand lists
 * - Registry-based command extraction
 * - Schema-based flag/option completion (--flag, -f)
 * - Option value completion from choices
 * - Multi-level completion (commands → subcommands → flags → values)
 * - Bash-style behavior (single match completes, multiple shows options)
 * - Custom completion functions
 *
 * Usage:
 * ```javascript
 * import { Autocomplete } from 'xterm-kit/autocomplete.js';
 * import { CommandRegistry } from 'xterm-kit/command-registry.js';
 *
 * // With command registry (recommended - unlocks schema-based completion)
 * const registry = new CommandRegistry();
 * registry.register('ls', {
 *   description: 'List files',
 *   schema: {
 *     flags: { long: { short: 'l', description: 'Long format' } },
 *     options: { format: { choices: ['json', 'yaml', 'table'] } }
 *   }
 * });
 *
 * const completer = new Autocomplete({ registry });
 *
 * // Now supports:
 * // ls --<tab>        → --long, --format
 * // ls -<tab>         → -l
 * // ls --format <tab> → json, yaml, table
 *
 * // Simple static lists (no schema support)
 * const completer = new Autocomplete({
 *   commands: ['help', 'books', 'status'],
 *   subcommands: {
 *     'books': ['list', 'search', 'add']
 *   }
 * });
 * ```
 */

/**
 * Autocomplete engine for terminal commands
 */
export class Autocomplete {
  /**
   * Create an autocomplete instance
   * @param {Object} options - Configuration options
   * @param {string[]} [options.commands] - Static list of commands
   * @param {Object} [options.subcommands] - Map of command → subcommands
   * @param {Object} [options.registry] - Command registry with getCommands() method
   * @param {Object} [options.completers] - Custom completion functions
   * @param {boolean} [options.caseSensitive=false] - Case-sensitive matching
   */
  constructor(options = {}) {
    this.commands = options.commands || [];
    this.subcommands = options.subcommands || {};
    this.registry = options.registry || null;
    this.completers = options.completers || {};
    this.caseSensitive = options.caseSensitive || false;

    // If registry provided, extract commands
    if (this.registry) {
      this._syncFromRegistry();
    }
  }

  /**
   * Extract commands from registry
   * @private
   */
  _syncFromRegistry() {
    if (!this.registry || typeof this.registry.getCommands !== 'function') {
      return;
    }

    const registeredCommands = this.registry.getCommands();

    // Extract command names
    this.commands = registeredCommands.map(cmd =>
      typeof cmd === 'string' ? cmd : cmd.name
    );

    // TODO: In future, registry could also provide subcommand metadata
    // For now, subcommands must be provided explicitly
  }

  /**
   * Get possible completions for a line
   * @param {string} line - Current command line
   * @param {number} [cursorPos] - Cursor position (default: end of line)
   * @returns {Object|null} Completion result with {completions, partial, type, level}
   */
  getCompletions(line, cursorPos = null) {
    // Use end of line if cursor not specified
    const cursor = cursorPos !== null ? cursorPos : line.length;

    // Only complete up to cursor position
    const textToCursor = line.slice(0, cursor);
    const parts = textToCursor.split(/\s+/).filter(p => p.length > 0);

    // Empty line or just whitespace
    if (parts.length === 0) {
      return {
        completions: this.commands,
        partial: '',
        type: 'command',
        level: 0
      };
    }

    // Check if last token is being typed (no trailing space)
    const hasTrailingSpace = textToCursor.endsWith(' ');

    if (parts.length === 1 && !hasTrailingSpace) {
      // Complete command
      const partial = this._normalize(parts[0]);
      const matches = this.commands.filter(cmd =>
        this._normalize(cmd).startsWith(partial)
      );

      return {
        completions: matches,
        partial: parts[0],
        type: 'command',
        level: 0
      };
    } else if (parts.length >= 1) {
      // Complete subcommand or arguments
      const cmd = parts[0];
      const level = parts.length - (hasTrailingSpace ? 0 : 1);
      const currentToken = hasTrailingSpace ? '' : parts[parts.length - 1];

      // Check for custom completer first
      const completerKey = parts.slice(0, level + 1).join(' ');
      if (this.completers[completerKey]) {
        const partial = hasTrailingSpace ? '' : parts[parts.length - 1];
        const completions = this.completers[completerKey](partial);

        return {
          completions,
          partial,
          type: 'custom',
          level
        };
      }

      // Check for flag/option completion from registry schema
      if (this.registry) {
        const schema = this.registry.getSchema(cmd);

        if (schema) {
          // Completing a flag or option (starts with -)
          if (currentToken.startsWith('-')) {
            const flagCompletions = this._getFlagCompletions(schema, currentToken);
            if (flagCompletions.length > 0) {
              return {
                completions: flagCompletions,
                partial: currentToken,
                type: 'flag',
                level
              };
            }
          }

          // Check if previous token was an option that expects a value
          if (parts.length >= 2 && !currentToken.startsWith('-')) {
            const prevToken = parts[parts.length - (hasTrailingSpace ? 1 : 2)];
            if (prevToken.startsWith('--')) {
              const optionName = prevToken.slice(2);
              const choices = this._getOptionChoices(schema, optionName);
              if (choices && choices.length > 0) {
                const matches = choices.filter(choice =>
                  this._normalize(choice).startsWith(this._normalize(currentToken))
                );
                if (matches.length > 0) {
                  return {
                    completions: matches,
                    partial: currentToken,
                    type: 'option-value',
                    level
                  };
                }
              }
            }
          }
        }
      }

      // Check subcommands
      if (level === 1 && this.subcommands[cmd]) {
        const partial = hasTrailingSpace ? '' : this._normalize(parts[parts.length - 1]);
        const matches = this.subcommands[cmd].filter(sub =>
          this._normalize(sub).startsWith(partial)
        );

        return {
          completions: matches,
          partial: hasTrailingSpace ? '' : parts[parts.length - 1],
          type: 'subcommand',
          level: 1
        };
      }
    }

    // No completions available
    return null;
  }

  /**
   * Apply completion to line
   * @param {string} line - Current command line
   * @param {number} [cursorPos] - Cursor position (default: end of line)
   * @returns {Object|null} Result with {line, cursor, completions} or null if no completion
   */
  complete(line, cursorPos = null) {
    const cursor = cursorPos !== null ? cursorPos : line.length;
    const result = this.getCompletions(line, cursor);

    if (!result || result.completions.length === 0) {
      return null;
    }

    // Single match - auto-complete
    if (result.completions.length === 1) {
      const parts = line.slice(0, cursor).split(/\s+/);
      const completion = result.completions[0];

      // Replace last token with completion
      if (parts.length > 0 && result.partial) {
        parts[parts.length - 1] = completion;
      } else {
        parts.push(completion);
      }

      const newLine = parts.join(' ') + (line.slice(cursor) || '');
      const newCursor = parts.join(' ').length;

      return {
        line: newLine,
        cursor: newCursor,
        completions: result.completions,
        action: 'completed'
      };
    }

    // Multiple matches - return for display
    return {
      line,
      cursor,
      completions: result.completions,
      action: 'show_options'
    };
  }

  /**
   * Get common prefix of completions for partial completion
   * @param {string[]} completions - Array of completion options
   * @returns {string} Common prefix
   */
  getCommonPrefix(completions) {
    if (completions.length === 0) return '';
    if (completions.length === 1) return completions[0];

    // Find common prefix
    let prefix = completions[0];
    for (let i = 1; i < completions.length; i++) {
      const comp = completions[i];
      let j = 0;
      while (j < prefix.length && j < comp.length &&
             this._normalize(prefix[j]) === this._normalize(comp[j])) {
        j++;
      }
      prefix = prefix.slice(0, j);
      if (prefix.length === 0) break;
    }

    return prefix;
  }

  /**
   * Get flag and option completions from schema
   * @private
   * @param {Object} schema - Argparse schema
   * @param {string} partial - Partial flag/option being typed
   * @returns {string[]} Array of matching flags/options
   */
  _getFlagCompletions(schema, partial) {
    const completions = [];

    // Add flags (--flag, -f)
    if (schema.flags) {
      for (const [name, flagDef] of Object.entries(schema.flags)) {
        const longFlag = '--' + name;
        const shortFlag = flagDef.short ? '-' + flagDef.short : null;

        if (partial.startsWith('--')) {
          // Complete long flag
          if (longFlag.startsWith(partial)) {
            completions.push(longFlag);
          }
        } else if (partial.startsWith('-') && !partial.startsWith('--')) {
          // Complete short flag
          if (shortFlag && shortFlag.startsWith(partial)) {
            completions.push(shortFlag);
          }
        }
      }
    }

    // Add options (--option, -o)
    if (schema.options) {
      for (const [name, optDef] of Object.entries(schema.options)) {
        const longOpt = '--' + name;
        const shortOpt = optDef.short ? '-' + optDef.short : null;

        if (partial.startsWith('--')) {
          // Complete long option
          if (longOpt.startsWith(partial)) {
            completions.push(longOpt);
          }
        } else if (partial.startsWith('-') && !partial.startsWith('--')) {
          // Complete short option
          if (shortOpt && shortOpt.startsWith(partial)) {
            completions.push(shortOpt);
          }
        }
      }
    }

    return completions;
  }

  /**
   * Get choice values for an option from schema
   * @private
   * @param {Object} schema - Argparse schema
   * @param {string} optionName - Option name (without --)
   * @returns {string[]|null} Array of choices or null
   */
  _getOptionChoices(schema, optionName) {
    if (!schema.options || !schema.options[optionName]) {
      return null;
    }

    const optDef = schema.options[optionName];
    return optDef.choices || null;
  }

  /**
   * Normalize string for comparison
   * @private
   * @param {string} str - String to normalize
   * @returns {string} Normalized string
   */
  _normalize(str) {
    return this.caseSensitive ? str : str.toLowerCase();
  }

  /**
   * Add a custom completer function
   * @param {string} context - Context string (e.g., "books search")
   * @param {Function} completerFn - Function that returns completions
   */
  addCompleter(context, completerFn) {
    this.completers[context] = completerFn;
  }

  /**
   * Update command list (useful with dynamic commands)
   * @param {string[]} commands - New command list
   */
  setCommands(commands) {
    this.commands = commands;
  }

  /**
   * Update subcommand map
   * @param {Object} subcommands - New subcommand map
   */
  setSubcommands(subcommands) {
    this.subcommands = subcommands;
  }

  /**
   * Refresh from registry (if using registry mode)
   */
  refresh() {
    if (this.registry) {
      this._syncFromRegistry();
    }
  }
}

/**
 * Create a Tab handler for xterm.js terminal
 * @param {Terminal} term - xterm.js terminal instance
 * @param {Autocomplete} completer - Autocomplete instance
 * @param {Object} state - Shared state object with {currentLine, cursorPos}
 * @param {Function} redrawFn - Function to redraw line: (line) => void
 * @returns {Function} Handler function for Tab key
 *
 * Usage:
 * ```javascript
 * const state = { currentLine: '', cursorPos: 0 };
 * const handleTab = createTabHandler(term, completer, state, (line) => {
 *   // Redraw prompt + line
 *   term.write('\r\x1b[K' + prompt + line);
 * });
 *
 * term.onData(data => {
 *   if (data === '\t') {
 *     handleTab();
 *   }
 * });
 * ```
 */
export function createTabHandler(term, completer, state, redrawFn) {
  return function handleTab() {
    const result = completer.complete(state.currentLine, state.cursorPos);

    if (!result) {
      // No completions - do nothing (like real terminals)
      return;
    }

    if (result.action === 'completed') {
      // Single match - update line
      state.currentLine = result.line;
      state.cursorPos = result.cursor;
      redrawFn(state.currentLine);
    } else if (result.action === 'show_options') {
      // Multiple matches - show options
      term.write('\r\n\x1b[2m' + result.completions.join('  ') + '\x1b[0m\r\n');
      redrawFn(state.currentLine);
    }
  };
}

/**
 * Helper: Create autocomplete from command registry
 * @param {Object} registry - Command registry with getCommands() method
 * @param {Object} [subcommands] - Optional subcommand map
 * @returns {Autocomplete} Configured autocomplete instance
 */
export function fromRegistry(registry, subcommands = {}) {
  return new Autocomplete({
    registry,
    subcommands
  });
}
