/**
 * Status Indicators Controller
 * Manages the acrylic header LED indicators (SYS, DISK, NET)
 */

export class StatusIndicators {
  constructor() {
    this.sysIndicator = document.querySelector('.indicator[data-status="sys"] .indicator-light');
    this.diskIndicator = document.querySelector('.indicator[data-status="disk"] .indicator-light');
    this.netIndicator = document.querySelector('.indicator[data-status="net"] .indicator-light');
    this.userIndicator = document.querySelector('.indicator[data-status="user"] .indicator-light');

    this.diskTimeout = null;
    this.netTimeout = null;
    this.userTimeout = null;
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
      this.sysIndicator,
      this.diskIndicator,
      this.netIndicator,
      this.userIndicator
    ];

    // Ensure all start dimmed
    indicators.forEach(led => {
      if (led) this.setIndicatorState(led, 'dim');
    });

    // Flash each LED in sequence
    for (const led of indicators) {
      if (!led) continue;

      led.classList.add('boot-sequence');
      this.setIndicatorState(led, 'active');

      await new Promise(resolve => setTimeout(resolve, 150));

      led.classList.remove('boot-sequence');
      this.setIndicatorState(led, 'dim');
    }

    // Small pause
    await new Promise(resolve => setTimeout(resolve, 100));

    // All flash together
    indicators.forEach(led => {
      if (led) {
        led.classList.add('boot-sequence');
        this.setIndicatorState(led, 'active');
      }
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    // Remove animation class and set final states
    indicators.forEach(led => {
      if (led) led.classList.remove('boot-sequence');
    });

    // Final state: SYS active (with pulse), others dimmed
    this.setIndicatorState(this.sysIndicator, 'active');
    this.setIndicatorState(this.diskIndicator, 'dim');
    this.setIndicatorState(this.netIndicator, 'dim');
    this.setIndicatorState(this.userIndicator, 'dim');
  }

  /**
   * Flash DISK indicator during filesystem operations
   */
  diskActivity() {
    if (!this.diskIndicator) return;

    // Clear existing timeout
    if (this.diskTimeout) {
      clearTimeout(this.diskTimeout);
    }

    // Activate indicator
    this.setIndicatorState(this.diskIndicator, 'active');

    // Auto-dim after 300ms
    this.diskTimeout = setTimeout(() => {
      this.setIndicatorState(this.diskIndicator, 'dim');
    }, 300);
  }

  /**
   * Flash NET indicator during network operations
   */
  netActivity() {
    if (!this.netIndicator) return;

    // Clear existing timeout
    if (this.netTimeout) {
      clearTimeout(this.netTimeout);
    }

    // Activate indicator
    this.setIndicatorState(this.netIndicator, 'active');

    // Auto-dim after 500ms
    this.netTimeout = setTimeout(() => {
      this.setIndicatorState(this.netIndicator, 'dim');
    }, 500);
  }

  /**
   * Control user-programmable LED
   * @param {string} state - 'on', 'off', 'blink', or 'dim'
   * @param {number} duration - Duration in ms for temporary states
   */
  userActivity(state = 'on', duration = 1000) {
    if (!this.userIndicator) return;

    // Clear existing timeout
    if (this.userTimeout) {
      clearTimeout(this.userTimeout);
    }

    if (state === 'on') {
      this.setIndicatorState(this.userIndicator, 'active');

      // Auto-dim after duration if specified
      if (duration > 0) {
        this.userTimeout = setTimeout(() => {
          this.setIndicatorState(this.userIndicator, 'dim');
        }, duration);
      }
    } else if (state === 'off' || state === 'dim') {
      this.setIndicatorState(this.userIndicator, 'dim');
    }
    // TODO: 'blink' state would need animation
  }

  /**
   * Set indicator state
   * @param {HTMLElement} indicator - The indicator element
   * @param {string} state - 'active' or 'dim'
   */
  setIndicatorState(indicator, state) {
    if (!indicator) return;

    if (state === 'active') {
      indicator.style.opacity = '1';
    } else if (state === 'dim') {
      indicator.style.opacity = '0.3';
    }
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

// Export singleton instance
export const statusIndicators = new StatusIndicators();
