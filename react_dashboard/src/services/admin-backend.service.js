// Admin Backend Service
// Handles all API calls to the admin backend (port 5056)

// Determine if we're in production (deployed) or development (localhost)
const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname.includes('run.app') || window.location.hostname.includes('appspot.com'));

// For production: use relative URLs through nginx
// For development: use environment variable or default to localhost
const getBaseUrl = () => {
  if (isProduction) {
    return ''; // Relative URLs in production
  }
  
  // Development mode
  const envUrl = typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? process.env.REACT_APP_ADMIN_BACKEND_URL
    : null;
  
  return envUrl || 'http://localhost:5056';
};

const ADMIN_BACKEND_BASE = getBaseUrl();
const API_BASE_URL = ADMIN_BACKEND_BASE ? `${ADMIN_BACKEND_BASE}/api` : '/api';

class AdminBackendService {
  constructor() {
    this.token = localStorage.getItem('adminToken');
  }

  // Get authorization headers
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Set token
  setToken(token) {
    this.token = token;
    localStorage.setItem('adminToken', token);
  }

  // Clear token
  clearToken() {
    this.token = null;
    localStorage.removeItem('adminToken');
  }

  // ============ AUTH ENDPOINTS ============

  // Login
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      this.setToken(data.token);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Verify setup token
  async verifySetupToken(token, email) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-setup-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token verification failed');
      }

      return data;
    } catch (error) {
      console.error('Verify token error:', error);
      throw error;
    }
  }

  // Setup password
  async setupPassword(token, email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password setup failed');
      }

      return data;
    } catch (error) {
      console.error('Setup password error:', error);
      throw error;
    }
  }

  // Verify current session
  async verifySession() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        this.clearToken();
        throw new Error(data.error || 'Session verification failed');
      }

      return data;
    } catch (error) {
      console.error('Verify session error:', error);
      throw error;
    }
  }

  // Logout
  logout() {
    this.clearToken();
  }

  // ============ ADMIN MANAGEMENT ENDPOINTS ============

  // Create new admin
  async createAdmin(email, name) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ email, name })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin');
      }

      return data;
    } catch (error) {
      console.error('Create admin error:', error);
      throw error;
    }
  }

  // List all admins
  async listAdmins() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/list`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to list admins');
      }

      return data;
    } catch (error) {
      console.error('List admins error:', error);
      throw error;
    }
  }

  // Get admin by ID
  async getAdmin(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get admin');
      }

      return data;
    } catch (error) {
      console.error('Get admin error:', error);
      throw error;
    }
  }

  // Update admin
  async updateAdmin(id, updates) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update admin');
      }

      return data;
    } catch (error) {
      console.error('Update admin error:', error);
      throw error;
    }
  }

  // Delete admin
  async deleteAdmin(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete admin');
      }

      return data;
    } catch (error) {
      console.error('Delete admin error:', error);
      throw error;
    }
  }

  // ============ NOTIFICATIONS ============

  async listNotifications() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/notifications`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load notifications');
      }

      return data;
    } catch (error) {
      console.error('List notifications error:', error);
      throw error;
    }
  }

  async createNotification(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/notifications`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create notification');
      }

      return data;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  async markNotificationsRead(ids) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/notifications/mark-read`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ ids })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update notifications');
      }

      return data;
    } catch (error) {
      console.error('Mark notifications read error:', error);
      throw error;
    }
  }

  // Get current admin info
  async getCurrentAdmin() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/me`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get admin info');
      }

      return data;
    } catch (error) {
      console.error('Get current admin error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const adminBackendService = new AdminBackendService();
export default adminBackendService;
