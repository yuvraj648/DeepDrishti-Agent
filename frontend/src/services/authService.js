import axios from 'axios';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5003/api/v1';

// Create axios instance with base URL (must match marineService / backend PORT)
const api = axios.create({
  baseURL: API_BASE.replace(/\/$/, ''),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      const rateLimitError = error.response.data;
      if (rateLimitError?.code === 'RATE_LIMIT_EXCEEDED') {
        const errorMessage = rateLimitError.message || 'Too many requests. Please try again later.';
        const enhancedError = new Error(errorMessage);
        enhancedError.isRateLimit = true;
        enhancedError.retryAfter = rateLimitError.retryAfter;
        enhancedError.currentRequests = rateLimitError.currentRequests;
        enhancedError.maxRequests = rateLimitError.maxRequests;
        enhancedError.windowMinutes = rateLimitError.windowMinutes;
        return Promise.reject(enhancedError);
      }
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

// Auth service functions
export const authService = {
  // Login user
  login: async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', {
      email,
      password,
      rememberMe
    });
    
    if (response.status === 'success') {
      // Store token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data;
    }
    
    throw new Error(response.message || 'Login failed');
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get current token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Request access
  requestAccess: async (name, email, requestedRole, reason) => {
    const response = await api.post('/auth/request-access', {
      name,
      email,
      requestedRole,
      reason
    });
    
    return response;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response;
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword
    });
    
    if (response.status === 'success') {
      // Store new token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response;
  }
};

// Export the axios instance for other API calls
export default api;
