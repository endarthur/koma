/**
 * xterm-kit: Status Indicators
 * 4-LED status indicator system (SYS, DISK, NET, USER)
 *
 * Extracted from koma's status-indicators.js
 * Made theme-aware and supports headless mode for testing
 */

import { getTheme } from './themes.js';

/**
 * Status Indicators Controller
 * Manages 4 LED indicators for system status visualization
 */
export class StatusIndicators {
  /**
   * Create status indicators
   * @param {object} options - Configuration options
   * @param {string} [options.sysElement] - CSS selector for SYS LED
   * @param {string} [options.diskElement] - CSS selector for DISK LED
   * @param {string} [options.netElement] - CSS selector for NET LED
   * @param {string} [options.userElement] - CSS selector for USER LED
   * @param {boolean} [options.headless=false] - Run without DOM (state tracking only)
   * @param {object} [options.theme] - Theme override (uses global if not specified)
   */
  constructor(options = {}) {
    this.theme = options.theme || getTheme();
    this.headless = options.headless || false;

    // DOM elements (optional - null in headless mode)
    if (!this.headless) {
      this.sysIndicator = options.sysElement
        ? document.querySelector(options.sysElement)
        : document.querySelector('.indicator[data-status="sys"] .indicator-light');
      this.diskIndicator = options.diskElement
        ? document.querySelector(options.diskElement)
        : document.querySelector('.indicator[data-status="disk"] .indicator-light');
      this.netIndicator = options.netElement
        ? document.querySelector(options.netElement)
        : document.querySelector('.indicator[data-status="net"] .indicator-light');
      this.userIndicator = options.userElement
        ? document.querySelector(options.userElement)
        : document.querySelector('.indicator[data-status="user"] .indicator-light');

      // Apply theme colors to LEDs
      this.applyThemeColors();
    } else {
      this.sysIndicator = null;
      this.diskIndicator = null;
      this.netIndicator = null;
      this.userIndicator = null;
    }

    // State tracking (works in both headless and DOM modes)
    this.state = {
      sys: 'dim',
      disk: 'dim',
      net: 'dim',
      user: 'dim'
    };

    // Auto-dim timeouts
    this.diskTimeout = null;
    this.netTimeout = null;
    this.userTimeout = null;
    this.userBlinkInterval = null;
  }

  /**
   * Apply theme colors to LED elements
   */
  applyThemeColors() {
    if (this.sysIndicator) {
      this.sysIndicator.style.backgroundColor = this.theme.indicators.sys;
    }
    if (this.diskIndicator) {
      this.diskIndicator.style.backgroundColor = this.theme.indicators.disk;
    }
    if (this.netIndicator) {
      this.netIndicator.style.backgroundColor = this.theme.indicators.net;
    }
    if (this.userIndicator) {
      this.userIndicator.style.backgroundColor = this.theme.indicators.user;
    }
  }

  /**
   * Initialize indicators - SYS is always on, others are dimmed
   */
  init() {
    // Run boot sequence
    this.bootSequence();
  }

  /**
   * Boot sequence animation - LEDs flash in sequence
   */
  async bootSequence() {
    const indicators = [
      { element: this.sysIndicator, name: 'sys' },
      { element: this.diskIndicator, name: 'disk' },
      { element: this.netIndicator, name: 'net' },
      { element: this.userIndicator, name: 'user' }
    ];

    // Ensure all start dimmed
    for (const ind of indicators) {
      this.setIndicatorState(ind.element, ind.name, 'dim');
    }

    // Flash each LED in sequence
    for (const ind of indicators) {
      if (!ind.element && !this.headless) continue;

      if (!this.headless && ind.element) {
        ind.element.classList.add('boot-sequence');
      }
      this.setIndicatorState(ind.element, ind.name, 'active');

      await new Promise(resolve => setTimeout(resolve, 150));

      if (!this.headless && ind.element) {
        ind.element.classList.remove('boot-sequence');
      }
      this.setIndicatorState(ind.element, ind.name, 'dim');
    }

    // Small pause
    await new Promise(resolve => setTimeout(resolve, 100));

    // All flash together
    for (const ind of indicators) {
      if (!this.headless && ind.element) {
        ind.element.classList.add('boot-sequence');
      }
      this.setIndicatorState(ind.element, ind.name, 'active');
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    // Remove animation class and set final states
    for (const ind of indicators) {
      if (!this.headless && ind.element) {
        ind.element.classList.remove('boot-sequence');
      }
    }

    // Final state: SYS active (with pulse), others dimmed
    this.setIndicatorState(this.sysIndicator, 'sys', 'active');
    this.setIndicatorState(this.diskIndicator, 'disk', 'dim');
    this.setIndicatorState(this.netIndicator, 'net', 'dim');
    this.setIndicatorState(this.userIndicator, 'user', 'dim');
  }

  /**
   * Flash DISK indicator during filesystem operations
   * Auto-dims after 300ms
   */
  diskActivity() {
    if (this.diskTimeout) {
      clearTimeout(this.diskTimeout);
    }

    this.setIndicatorState(this.diskIndicator, 'disk', 'active');

    // Auto-dim after 300ms
    this.diskTimeout = setTimeout(() => {
      this.setIndicatorState(this.diskIndicator, 'disk', 'dim');
    }, 300);
  }

  /**
   * Flash NET indicator during network operations
   * Auto-dims after 500ms
   */
  netActivity() {
    if (this.netTimeout) {
      clearTimeout(this.netTimeout);
    }

    this.setIndicatorState(this.netIndicator, 'net', 'active');

    // Auto-dim after 500ms
    this.netTimeout = setTimeout(() => {
      this.setIndicatorState(this.netIndicator, 'net', 'dim');
    }, 500);
  }

  /**
   * Control user-programmable LED
   * @param {string} state - 'on', 'off', 'blink', or 'dim'
   * @param {number} duration - Duration in ms for temporary states (0 = permanent)
   * @param {number} blinkInterval - Blink speed in ms (default: 500ms)
   */
  userActivity(state = 'on', duration = 1000, blinkInterval = 500) {
    // Clear existing timers
    if (this.userTimeout) {
      clearTimeout(this.userTimeout);
      this.userTimeout = null;
    }
    if (this.userBlinkInterval) {
      clearInterval(this.userBlinkInterval);
      this.userBlinkInterval = null;
    }

    if (state === 'on') {
      this.setIndicatorState(this.userIndicator, 'user', 'active');

      // Auto-dim after duration if specified
      if (duration > 0) {
        this.userTimeout = setTimeout(() => {
          this.setIndicatorState(this.userIndicator, 'user', 'dim');
        }, duration);
      }
    } else if (state === 'blink') {
      // Start blinking
      let isActive = true;
      this.setIndicatorState(this.userIndicator, 'user', 'active');

      this.userBlinkInterval = setInterval(() => {
        isActive = !isActive;
        this.setIndicatorState(this.userIndicator, 'user', isActive ? 'active' : 'dim');
      }, blinkInterval);

      // Auto-stop blinking after duration if specified
      if (duration > 0) {
        this.userTimeout = setTimeout(() => {
          if (this.userBlinkInterval) {
            clearInterval(this.userBlinkInterval);
            this.userBlinkInterval = null;
          }
          this.setIndicatorState(this.userIndicator, 'user', 'dim');
        }, duration);
      }
    } else if (state === 'off' || state === 'dim') {
      this.setIndicatorState(this.userIndicator, 'user', 'dim');
    }
  }

  /**
   * Set indicator state
   * @param {HTMLElement} indicator - The indicator element (can be null in headless)
   * @param {string} name - Indicator name (sys, disk, net, user)
   * @param {string} state - 'active' or 'dim'
   */
  setIndicatorState(indicator, name, state) {
    // Update state tracking
    this.state[name] = state;

    // Update DOM if not headless
    if (!this.headless && indicator) {
      if (state === 'active') {
        indicator.style.opacity = '1';
      } else if (state === 'dim') {
        indicator.style.opacity = '0.3';
      }
    }
  }

  /**
   * Get current state (useful for testing)
   * @returns {object} Current state of all indicators
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Wrap an async filesystem operation with disk activity indication
   * @param {Promise} promise - The async operation
   * @returns {Promise} - The original promise
   */
  async wrapDiskActivity(promise) {
    try {
      this.diskActivity();
      const result = await promise;
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Wrap an async network operation with net activity indication
   * @param {Promise} promise - The async operation
   * @returns {Promise} - The original promise
   */
  async wrapNetActivity(promise) {
    try {
      this.netActivity();
      const result = await promise;
      return result;
    } catch (error) {
      throw error;
    }
  }
}
