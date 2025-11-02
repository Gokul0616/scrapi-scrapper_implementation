/**
 * Safe fetch wrapper that prevents Response.clone() errors
 * This bypasses issues with service workers, PostHog, and other interceptors
 */

// Store the original fetch before any interceptors
const originalFetch = window.fetch;

/**
 * Safe fetch that handles response cloning issues
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - The fetch response
 */
export const safeFetch = async (url, options = {}) => {
  try {
    // Use the original fetch to bypass interceptors
    const response = await originalFetch(url, {
      ...options,
      // Prevent caching which can cause clone issues
      cache: options.cache || 'no-store'
    });

    // Create a clone immediately to avoid issues with consumed bodies
    const responseClone = response.clone();
    
    return responseClone;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

/**
 * Safe fetch with JSON parsing
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<{ok: boolean, status: number, data: any, error: string}>}
 */
export const safeFetchJSON = async (url, options = {}) => {
  try {
    const response = await safeFetch(url, options);
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage += `, message: ${errorText}`;
        }
      } catch (e) {
        // Ignore error reading text
      }
      return {
        ok: false,
        status: response.status,
        data: null,
        error: errorMessage
      };
    }

    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data,
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.message || 'Network error'
    };
  }
};

export default safeFetch;
