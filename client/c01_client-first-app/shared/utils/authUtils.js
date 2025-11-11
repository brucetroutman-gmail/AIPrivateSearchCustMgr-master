/**
 * Common Authentication Utilities
 */

class AuthUtils {
  static async checkAuth() {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return null;
    
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  static async authenticatedFetch(url, options = {}) {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error('No session found');
    }
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${sessionId}`
    };
    
    // Update URL to use dynamic API base if it's a relative API call
    const finalUrl = url.startsWith('/api/') ? `${window.API_BASE_URL}${url}` : url;
    const response = await fetch(finalUrl, { ...options, headers });
    
    if (response.status === 401) {
      localStorage.removeItem('sessionId');
      window.location.href = './user-management.html';
      throw new Error('Session expired');
    }
    
    return response;
  }
  
  static logout() {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      fetch(`${window.API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` }
      }).catch(() => {});
    }
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userEmail');
    window.location.href = './user-management.html';
  }
  
  static async requireAuth() {
    const user = await this.checkAuth();
    if (!user) {
      // Clear all session data when authentication fails
      localStorage.removeItem('sessionId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userUserRole');
      window.location.href = './user-management.html';
      return null;
    }
    return user;
  }
}

export default AuthUtils;