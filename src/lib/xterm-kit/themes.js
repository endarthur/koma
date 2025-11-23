/**
 * xterm-kit: Theming System
 * Configurable color themes for terminal output
 *
 * Provides global theme management and multiple built-in themes.
 * All xterm-kit components respect the global theme by default.
 */

/**
 * Default theme - standard terminal colors
 * Not project-specific, works anywhere
 */
export const defaultTheme = {
  colors: {
    error: (text) => `\x1b[31m${text}\x1b[0m`,       // red
    success: (text) => `\x1b[32m${text}\x1b[0m`,     // green
    warning: (text) => `\x1b[33m${text}\x1b[0m`,     // yellow
    info: (text) => `\x1b[90m${text}\x1b[0m`,        // gray
    primary: (text) => `\x1b[36m${text}\x1b[0m`,     // cyan
    highlight: (text) => `\x1b[7m${text}\x1b[0m`,    // inverse
    bold: (text) => `\x1b[1m${text}\x1b[0m`,         // bold
    dim: (text) => `\x1b[2m${text}\x1b[0m`,          // dim
  },
  pager: {
    prompt: '\x1b[7m-- More --\x1b[0m',              // inverse
    searchHighlight: (text) => `\x1b[7m${text}\x1b[0m`, // inverse
    percent: (text) => `\x1b[2m${text}\x1b[0m`,      // dim
  },
  indicators: {
    sys: '#00ff88',      // green
    disk: '#ff6b35',     // orange
    net: '#4a9eff',      // blue
    user: '#ffd700',     // gold
  },
  progress: {
    bar: '\x1b[32m',         // green bar
    background: '\x1b[90m',  // gray background
    spinner: '\x1b[36m',     // cyan spinner
  },
  table: {
    header: (text) => `\x1b[1m${text}\x1b[0m`,      // bold
    border: '\x1b[90m',                              // gray
  },
  box: {
    border: '\x1b[90m',      // gray borders
    title: (text) => `\x1b[1m${text}\x1b[0m`,       // bold title
  }
};

/**
 * Olivine theme - koma's phosphor green aesthetic
 * Named after the olivine mineral in komatiite rocks
 */
export const olivineTheme = {
  colors: {
    error: (text) => `\x1b[31m${text}\x1b[0m`,           // red (universal)
    success: (text) => `\x1b[38;5;48m${text}\x1b[0m`,    // phosphor green
    warning: (text) => `\x1b[38;5;208m${text}\x1b[0m`,   // lava orange
    info: (text) => `\x1b[90m${text}\x1b[0m`,            // gray
    primary: (text) => `\x1b[38;5;48m${text}\x1b[0m`,    // phosphor green
    highlight: (text) => `\x1b[7m${text}\x1b[0m`,        // inverse
    bold: (text) => `\x1b[1m${text}\x1b[0m`,             // bold
    dim: (text) => `\x1b[2m${text}\x1b[0m`,              // dim
  },
  pager: {
    prompt: '\x1b[38;5;208m-- More --\x1b[0m',           // lava orange
    searchHighlight: (text) => `\x1b[48;5;208m\x1b[30m${text}\x1b[0m`, // orange bg
    percent: (text) => `\x1b[2m${text}\x1b[0m`,          // dim
  },
  indicators: {
    sys: '#00ff88',      // olivine green
    disk: '#ff6b35',     // lava orange
    net: '#4a9eff',      // sky blue
    user: '#ffd700',     // gold
  },
  progress: {
    bar: '\x1b[38;5;48m',        // phosphor green bar
    background: '\x1b[90m',      // gray background
    spinner: '\x1b[38;5;208m',   // lava orange spinner
  },
  table: {
    header: (text) => `\x1b[1m\x1b[38;5;48m${text}\x1b[0m`,  // bold phosphor green
    border: '\x1b[90m',                                        // gray
  },
  box: {
    border: '\x1b[38;5;208m',    // lava orange borders
    title: (text) => `\x1b[1m\x1b[38;5;48m${text}\x1b[0m`,   // bold phosphor green
  }
};

/**
 * Monokai theme - popular dark color scheme
 */
export const monokaiTheme = {
  colors: {
    error: (text) => `\x1b[38;5;197m${text}\x1b[0m`,     // pink
    success: (text) => `\x1b[38;5;148m${text}\x1b[0m`,   // lime green
    warning: (text) => `\x1b[38;5;214m${text}\x1b[0m`,   // orange
    info: (text) => `\x1b[38;5;59m${text}\x1b[0m`,       // dark gray
    primary: (text) => `\x1b[38;5;81m${text}\x1b[0m`,    // bright cyan
    highlight: (text) => `\x1b[7m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
    dim: (text) => `\x1b[2m${text}\x1b[0m`,
  },
  pager: {
    prompt: '\x1b[38;5;81m-- More --\x1b[0m',            // cyan
    searchHighlight: (text) => `\x1b[48;5;81m\x1b[30m${text}\x1b[0m`,
    percent: (text) => `\x1b[2m${text}\x1b[0m`,
  },
  indicators: {
    sys: '#66d9ef',      // cyan
    disk: '#e6db74',     // yellow
    net: '#a6e22e',      // green
    user: '#f92672',     // pink
  },
  progress: {
    bar: '\x1b[38;5;148m',       // lime green
    background: '\x1b[90m',
    spinner: '\x1b[38;5;81m',    // cyan
  },
  table: {
    header: (text) => `\x1b[1m\x1b[38;5;81m${text}\x1b[0m`,
    border: '\x1b[38;5;59m',
  },
  box: {
    border: '\x1b[38;5;59m',
    title: (text) => `\x1b[1m\x1b[38;5;81m${text}\x1b[0m`,
  }
};

/**
 * Solarized Dark theme - precision colors for terminals
 */
export const solarizedDarkTheme = {
  colors: {
    error: (text) => `\x1b[38;5;160m${text}\x1b[0m`,     // red
    success: (text) => `\x1b[38;5;64m${text}\x1b[0m`,    // green
    warning: (text) => `\x1b[38;5;136m${text}\x1b[0m`,   // yellow
    info: (text) => `\x1b[38;5;240m${text}\x1b[0m`,      // base01
    primary: (text) => `\x1b[38;5;33m${text}\x1b[0m`,    // blue
    highlight: (text) => `\x1b[7m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
    dim: (text) => `\x1b[2m${text}\x1b[0m`,
  },
  pager: {
    prompt: '\x1b[38;5;33m-- More --\x1b[0m',
    searchHighlight: (text) => `\x1b[48;5;33m\x1b[38;5;15m${text}\x1b[0m`,
    percent: (text) => `\x1b[2m${text}\x1b[0m`,
  },
  indicators: {
    sys: '#268bd2',      // blue
    disk: '#b58900',     // yellow
    net: '#2aa198',      // cyan
    user: '#6c71c4',     // violet
  },
  progress: {
    bar: '\x1b[38;5;64m',        // green
    background: '\x1b[38;5;240m',
    spinner: '\x1b[38;5;33m',    // blue
  },
  table: {
    header: (text) => `\x1b[1m\x1b[38;5;33m${text}\x1b[0m`,
    border: '\x1b[38;5;240m',
  },
  box: {
    border: '\x1b[38;5;240m',
    title: (text) => `\x1b[1m\x1b[38;5;33m${text}\x1b[0m`,
  }
};

// ============================================================================
// Global Theme Management
// ============================================================================

let currentTheme = defaultTheme;

/**
 * Set global theme for all xterm-kit components
 * @param {object} theme - Theme object
 * @example
 * import { setTheme, olivineTheme } from 'xterm-kit/themes.js';
 * setTheme(olivineTheme);
 */
export function setTheme(theme) {
  currentTheme = theme;
}

/**
 * Get current global theme
 * @returns {object} Current theme
 */
export function getTheme() {
  return currentTheme;
}

/**
 * Reset to default theme
 */
export function resetTheme() {
  currentTheme = defaultTheme;
}

/**
 * Create a custom theme by merging overrides with the default theme
 * @param {object} overrides - Theme properties to override
 * @returns {object} New theme object
 * @example
 * const myTheme = createTheme({
 *   colors: {
 *     success: (text) => `\x1b[35m${text}\x1b[0m`, // magenta success
 *   }
 * });
 * setTheme(myTheme);
 */
export function createTheme(overrides = {}) {
  return {
    colors: {
      ...defaultTheme.colors,
      ...(overrides.colors || {})
    },
    pager: {
      ...defaultTheme.pager,
      ...(overrides.pager || {})
    },
    indicators: {
      ...defaultTheme.indicators,
      ...(overrides.indicators || {})
    },
    progress: {
      ...defaultTheme.progress,
      ...(overrides.progress || {})
    },
    table: {
      ...defaultTheme.table,
      ...(overrides.table || {})
    },
    box: {
      ...defaultTheme.box,
      ...(overrides.box || {})
    }
  };
}
