// Marine Surveillance API Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api/v1';

class MarineService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Same key as authService.login (token); legacy authToken supported
    const token =
      localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const errBody = await response.clone().json();
          if (errBody?.message) detail = errBody.message;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Feed Management
  async getFeeds(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/feeds?${queryString}` : '/feeds';
    return this.request(endpoint);
  }

  async getActiveFeeds() {
    return this.request('/feeds/active');
  }

  async getFeedById(id) {
    return this.request(`/feeds/${id}`);
  }

  async createFeed(feedData) {
    return this.request('/feeds', {
      method: 'POST',
      body: JSON.stringify(feedData)
    });
  }

  async updateFeed(id, feedData) {
    return this.request(`/feeds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(feedData)
    });
  }

  async deleteFeed(id) {
    return this.request(`/feeds/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleFeedStatus(id, status) {
    return this.request(`/feeds/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async triggerDetection(id) {
    return this.request(`/feeds/${id}/detect`, {
      method: 'POST'
    });
  }

  // Alert Management
  async getAlerts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/alerts?${queryString}` : '/alerts';
    return this.request(endpoint);
  }

  async getActiveAlerts() {
    return this.request('/alerts/active');
  }

  async getRecentAlerts(hours = 24) {
    return this.request(`/alerts/recent?hours=${hours}`);
  }

  async getAlertById(id) {
    return this.request(`/alerts/${id}`);
  }

  async createAlert(alertData) {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData)
    });
  }

  async resolveAlert(id, resolutionNotes = '') {
    return this.request(`/alerts/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ resolutionNotes })
    });
  }

  async bulkResolveAlerts(alertIds, resolutionNotes = '') {
    return this.request('/alerts/bulk-resolve', {
      method: 'PUT',
      body: JSON.stringify({ alertIds, resolutionNotes })
    });
  }

  async assignAlert(id, assignedTo) {
    return this.request(`/alerts/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ assignedTo })
    });
  }

  async deleteAlert(id) {
    return this.request(`/alerts/${id}`, {
      method: 'DELETE'
    });
  }

  // Dashboard Analytics
  async getDashboardSummary() {
    return this.request('/dashboard/summary');
  }

  async getSystemStatus() {
    return this.request('/dashboard/system-status');
  }

  async getAnalytics(period = '7d') {
    return this.request(`/dashboard/analytics?period=${period}`);
  }

  async getSurveillanceMode(feedId) {
    return this.request(`/dashboard/surveillance/${feedId}`);
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }

  // Test endpoints (for development)
  async getTestFeeds() {
    return this.request('/test/feeds');
  }

  async getTestActiveFeeds() {
    return this.request('/test/feeds/active');
  }

  async getTestAlerts() {
    return this.request('/test/alerts');
  }

  async getTestActiveAlerts() {
    return this.request('/test/alerts/active');
  }

  async getTestDashboardSummary() {
    return this.request('/test/dashboard/summary');
  }

  async getTestSystemStatus() {
    return this.request('/test/dashboard/system-status');
  }

  async getTestSurveillanceMode(feedId) {
    return this.request(`/test/dashboard/surveillance/${feedId}`);
  }

  /** Live AI panel + operator actions (requires JWT). Uses feed-scoped URLs on working /feeds router. */
  async getSurveillanceAiAnalysis(feedId) {
    return this.request(`/feeds/${feedId}/surveillance/ai-analysis`);
  }

  async postSurveillanceStream(feedId, action) {
    return this.request(`/feeds/${feedId}/surveillance/stream`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async postSurveillanceCapture(feedId, payload = {}) {
    return this.request(`/feeds/${feedId}/surveillance/capture`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async postSurveillanceEnhanceFrame(feedId) {
    return this.request(`/feeds/${feedId}/surveillance/enhance-frame`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async postSurveillanceMarkArea(feedId, rect) {
    return this.request(`/feeds/${feedId}/surveillance/mark-area`, {
      method: 'POST',
      body: JSON.stringify(rect),
    });
  }
}

// Create singleton instance
const marineService = new MarineService();

export default marineService;
