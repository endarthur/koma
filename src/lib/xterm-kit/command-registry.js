/**
 * command-registry.js - Command registration and metadata management
 *
 * Central registry for terminal commands with support for:
 * - Command metadata (name, description, category)
 * - Argparse schemas (for autocomplete and help generation)
 * - Command handlers
 * - Category grouping
 *
 * Deep integration with autocomplete for intelligent flag/option completion.
 *
 * Usage:
 * ```javascript
 * import { CommandRegistry } from 'xterm-kit/command-registry.js';
 *
 * const registry = new CommandRegistry();
 *
 * // Register with full schema
 * registry.register('ls', {
 *   description: 'List directory contents',
 *   category: 'filesystem',
 *   schema: {
 *     flags: {
 *       long: { short: 'l', description: 'Long format' },
 *       all: { short: 'a', description: 'Show hidden' }
 *     },
 *     options: {
 *       format: {
 *         description: 'Output format',
 *         choices: ['json', 'yaml', 'table']
 *       }
 *     }
 *   },
 *   handler: lsCommand  // Optional
 * });
 *
 * // Get schema for autocomplete
 * const schema = registry.getSchema('ls');
 * ```
 */

/**
 * Command Registry
 * Manages command metadata, schemas, and optional handlers
 */
export class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.categories = new Map();
  }

  /**
   * Register a command with metadata and schema
   * @param {string} name - Command name
   * @param {Object} metadata - Command metadata
   * @param {string} metadata.description - Brief description
   * @param {string} [metadata.category='other'] - Category (filesystem, shell, etc.)
   * @param {Object} [metadata.schema] - Argparse schema (flags, options, positional, etc.)
   * @param {Function} [metadata.handler] - Command handler function
   * @param {Object} [metadata.subcommands] - Subcommand map for autocomplete
   */
  register(name, metadata = {}) {
    const {
      description = '',
      category = 'other',
      schema = null,
      handler = null,
      subcommands = null
    } = metadata;

    this.commands.set(name, {
      name,
      description,
      category,
      schema,
      handler,
      subcommands
    });

    // Add to category index
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(name);
  }

  /**
   * Get all command names
   * @returns {string[]} Array of command names
   */
  getCommandNames() {
    return Array.from(this.commands.keys());
  }

  /**
   * Get all commands, optionally filtered by category
   * @param {string} [category] - Optional category filter
   * @returns {Array} Array of command objects
   */
  getCommands(category = null) {
    if (category) {
      const names = this.categories.get(category) || [];
      return names.map(name => this.commands.get(name));
    }

    return Array.from(this.commands.values());
  }

  /**
   * Get a specific command's metadata
   * @param {string} name - Command name
   * @returns {Object|null} Command metadata or null
   */
  getCommand(name) {
    return this.commands.get(name) || null;
  }

  /**
   * Get a command's argparse schema
   * @param {string} name - Command name
   * @returns {Object|null} Schema or null
   */
  getSchema(name) {
    const cmd = this.commands.get(name);
    return cmd?.schema || null;
  }

  /**
   * Get a command's handler function
   * @param {string} name - Command name
   * @returns {Function|null} Handler or null
   */
  getHandler(name) {
    const cmd = this.commands.get(name);
    return cmd?.handler || null;
  }

  /**
   * Get a command's subcommands
   * @param {string} name - Command name
   * @returns {Object|null} Subcommands map or null
   */
  getSubcommands(name) {
    const cmd = this.commands.get(name);
    return cmd?.subcommands || null;
  }

  /**
   * Check if command exists
   * @param {string} name - Command name
   * @returns {boolean} True if command exists
   */
  has(name) {
    return this.commands.has(name);
  }

  /**
   * Get all categories
   * @returns {Array<string>} Category names
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Get commands grouped by category
   * @returns {Object} Object with categories as keys
   */
  getByCategory() {
    const result = {};
    for (const [category, names] of this.categories.entries()) {
      result[category] = names.map(name => this.commands.get(name));
    }
    return result;
  }

  /**
   * Unregister a command
   * @param {string} name - Command name
   * @returns {boolean} True if command was removed
   */
  unregister(name) {
    const cmd = this.commands.get(name);
    if (!cmd) return false;

    // Remove from category
    const categoryCommands = this.categories.get(cmd.category);
    if (categoryCommands) {
      const idx = categoryCommands.indexOf(name);
      if (idx !== -1) {
        categoryCommands.splice(idx, 1);
      }
    }

    return this.commands.delete(name);
  }

  /**
   * Clear all commands
   */
  clear() {
    this.commands.clear();
    this.categories.clear();
  }

  /**
   * Get count of registered commands
   * @returns {number} Number of commands
   */
  size() {
    return this.commands.size;
  }
}

/**
 * Create a singleton registry instance (optional pattern)
 * Users can also create their own instances: new CommandRegistry()
 */
export function createRegistry() {
  return new CommandRegistry();
}
