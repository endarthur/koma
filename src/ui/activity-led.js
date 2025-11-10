/**
 * Activity LED Controller
 * Manages the visual activity indicator in the tab bar
 */

export class ActivityLED {
  constructor() {
    this.element = document.querySelector('.activity-led');
    this.currentActivity = null;
    this.activityQueue = [];
  }

  /**
   * Show reading activity (green pulse)
   */
  reading() {
    this.setActivity('reading');
  }

  /**
   * Show writing activity (orange pulse)
   */
  writing() {
    this.setActivity('writing');
  }

  /**
   * Flash error (red flash 3x)
   */
  error() {
    this.setActivity('error');
    // Auto-clear after animation (0.3s * 3 flashes = 0.9s)
    setTimeout(() => {
      if (this.currentActivity === 'error') {
        this.idle();
      }
    }, 1000);
  }

  /**
   * Return to idle (off)
   */
  idle() {
    this.setActivity(null);
  }

  /**
   * Set activity state with queueing
   */
  setActivity(activity) {
    // Clear existing classes
    this.element.classList.remove('reading', 'writing', 'error');

    // Add new class if specified
    if (activity) {
      this.element.classList.add(activity);
    }

    this.currentActivity = activity;
  }

  /**
   * Wrap an async operation with activity indication
   * @param {Promise} promise - The async operation
   * @param {string} type - Activity type: 'read' or 'write'
   * @returns {Promise} - The original promise
   */
  async wrap(promise, type = 'read') {
    try {
      if (type === 'read') {
        this.reading();
      } else if (type === 'write') {
        this.writing();
      }

      const result = await promise;
      this.idle();
      return result;
    } catch (error) {
      this.error();
      throw error;
    }
  }
}

// Export singleton instance
export const activityLED = new ActivityLED();
