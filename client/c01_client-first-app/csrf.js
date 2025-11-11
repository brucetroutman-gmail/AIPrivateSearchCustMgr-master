// CSRF Token Management
const TOKEN_EXPIRY_MINUTES = 58;

class CSRFManager {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.initPromise = null;
  }

  // Initialize CSRF manager
  async init() {
    if (!this.initPromise) {
      this.initPromise = this.getToken();
    }
    return this.initPromise;
  }

  // Fetch CSRF token from server
  async getToken() {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // Wait for API_BASE_URL to be available
    let retries = 0;
    while (!window.API_BASE_URL && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (!window.API_BASE_URL) {
      throw new Error('API_BASE_URL not available');
    }

    try {
      const response = await fetch(`${window.API_BASE_URL}/api/csrf-token`);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      
      const data = await response.json();
      this.token = data.csrfToken;
      this.tokenExpiry = Date.now() + (TOKEN_EXPIRY_MINUTES * 60 * 1000);
      
      return this.token;
    } catch (error) {
      // Error fetching CSRF token - silently continue
      // For development, allow requests without CSRF token if server is not available
      if (error.message.includes('fetch')) {
        // CSRF server unavailable, proceeding without token
        return null;
      }
      throw error;
    }
  }

  // Add CSRF token to request headers
  async addTokenToHeaders(headers = {}) {
    // Check if we have a valid cached token first
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      headers['X-CSRF-Token'] = this.token;
    } else {
      const token = await this.getToken();
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }
    return headers;
  }

  // Add CSRF token to FormData
  async addTokenToFormData(formData) {
    const token = await this.getToken();
    if (token) {
      formData.append('_csrf', token);
    }
    return formData;
  }

  // Enhanced fetch with automatic CSRF token
  async fetch(url, options = {}) {
    // Ensure CSRF manager is initialized
    await this.init();
    
    const method = options.method || 'GET';
    
    // Only add CSRF token for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
      if (options.body instanceof FormData) {
        await this.addTokenToFormData(options.body);
      } else {
        options.headers = await this.addTokenToHeaders(options.headers);
      }
    }

    return fetch(url, options);
  }
}

// Global CSRF manager instance
if (typeof window !== 'undefined') {
  window.csrfManager = new CSRFManager();
  // Don't initialize immediately - wait for API config to load
}