/**
 * Koma Standard Library - Notifications Module
 * Wraps browser Notifications API
 */

export function createNotifyModule() {
  return {
    /**
     * Check if notifications are supported
     * @returns {boolean} True if supported
     */
    isSupported() {
      return 'Notification' in window;
    },

    /**
     * Get current notification permission status
     * @returns {string} 'granted', 'denied', or 'default'
     */
    permission() {
      if (!this.isSupported()) {
        return 'denied';
      }
      return Notification.permission;
    },

    /**
     * Request notification permission
     * @returns {Promise<string>} Permission result
     */
    async requestPermission() {
      if (!this.isSupported()) {
        throw new Error('Notifications not supported in this browser');
      }

      return Notification.requestPermission();
    },

    /**
     * Show a notification
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     * @returns {Promise<Notification>} Notification object
     */
    async notify(title, options = {}) {
      if (!this.isSupported()) {
        throw new Error('Notifications not supported in this browser');
      }

      // Request permission if not already granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission denied');
        }
      }

      if (Notification.permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Default options
      const notificationOptions = {
        icon: options.icon || '/favicon.ico',
        body: options.body || '',
        tag: options.tag || undefined,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      };

      return new Notification(title, notificationOptions);
    },

    /**
     * Show a simple notification (requests permission if needed)
     * @param {string} title - Notification title
     * @param {string} body - Notification body text
     * @returns {Promise<Notification>} Notification object
     */
    async send(title, body = '') {
      return this.notify(title, { body });
    },

    /**
     * Show a notification with error styling
     * @param {string} title - Notification title
     * @param {string} body - Error message
     * @returns {Promise<Notification>} Notification object
     */
    async error(title, body = '') {
      return this.notify(title, {
        body,
        tag: 'error',
        requireInteraction: true
      });
    },

    /**
     * Show a notification with success styling
     * @param {string} title - Notification title
     * @param {string} body - Success message
     * @returns {Promise<Notification>} Notification object
     */
    async success(title, body = '') {
      return this.notify(title, {
        body,
        tag: 'success'
      });
    }
  };
}
