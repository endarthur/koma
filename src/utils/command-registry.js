/**
 * Command Registry
 * Central registry for all Koma commands with metadata
 */

class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.categories = new Map();
  }

  /**
   * Register a command with metadata
   * @param {string} name - Command name
   * @param {string} description - Brief description
   * @param {string} category - Category (filesystem, shell, process, etc.)
   */
  register(name, description, category = 'other') {
    this.commands.set(name, {
      name,
      description,
      category,
    });

    // Add to category index
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(name);
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
}

// Export singleton instance
export const commandRegistry = new CommandRegistry();
