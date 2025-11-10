/**
 * Koma Standard Library - HTTP Module
 * Wraps fetch() for easier HTTP requests
 */

export function createHttpModule() {
  return {
    /**
     * Make an HTTP request
     * @param {string} url - URL to request
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async fetch(url, options = {}) {
      return fetch(url, options);
    },

    /**
     * Make a GET request
     * @param {string} url - URL to request
     * @param {Object} options - Additional fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async get(url, options = {}) {
      return fetch(url, {
        ...options,
        method: 'GET'
      });
    },

    /**
     * Make a POST request
     * @param {string} url - URL to request
     * @param {any} body - Request body (will be JSON stringified if object)
     * @param {Object} options - Additional fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async post(url, body, options = {}) {
      const headers = { ...options.headers };
      let processedBody = body;

      // Auto-stringify objects to JSON
      if (typeof body === 'object' && body !== null) {
        processedBody = JSON.stringify(body);
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      }

      return fetch(url, {
        ...options,
        method: 'POST',
        headers,
        body: processedBody
      });
    },

    /**
     * Make a PUT request
     * @param {string} url - URL to request
     * @param {any} body - Request body
     * @param {Object} options - Additional fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async put(url, body, options = {}) {
      const headers = { ...options.headers };
      let processedBody = body;

      if (typeof body === 'object' && body !== null) {
        processedBody = JSON.stringify(body);
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      }

      return fetch(url, {
        ...options,
        method: 'PUT',
        headers,
        body: processedBody
      });
    },

    /**
     * Make a DELETE request
     * @param {string} url - URL to request
     * @param {Object} options - Additional fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async delete(url, options = {}) {
      return fetch(url, {
        ...options,
        method: 'DELETE'
      });
    },

    /**
     * Get response as JSON
     * @param {string} url - URL to request
     * @param {Object} options - Fetch options
     * @returns {Promise<any>} Parsed JSON response
     */
    async json(url, options = {}) {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },

    /**
     * Get response as text
     * @param {string} url - URL to request
     * @param {Object} options - Fetch options
     * @returns {Promise<string>} Response text
     */
    async text(url, options = {}) {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.text();
    }
  };
}
