/**
 * NTE Service
 * Handles API calls to NTE Recommendation Engine
 */

import axios from 'axios';

// Use same IP as test dashboard - works across devices with Tailscale VPN
const PI_HOST = '100.89.162.22';
const NTE_PORT = 8886;
const NTE_API_URL = `http://${PI_HOST}:${NTE_PORT}`;

class NTEService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: NTE_API_URL,
      // Increased timeout to allow slower responses from the NTE engine
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generic request wrapper with simple retry + exponential backoff.
   * config: axios request config
   * retries: number of retries (default 2)
   * backoffMs: base backoff in ms (default 1000)
   */
  async _requestWithRetry(config, retries = 2, backoffMs = 1000) {
    let attempt = 0;
    let lastError = null;

    while (attempt <= retries) {
      const start = Date.now();
      try {
        const response = await this.apiClient.request(config);
        const duration = Date.now() - start;
        // Log slow responses to help diagnose server-side latency
        if (duration > 2000) {
          console.warn(`Slow response from NTE (${config.method} ${config.url}): ${duration}ms`);
        }
        return response.data;
      } catch (err) {
        lastError = err;
        // If we've exhausted retries, break and throw the last error
        if (attempt === retries) break;

        const delay = backoffMs * Math.pow(2, attempt); // exponential backoff
        console.warn(
          `NTE request failed (attempt ${attempt + 1}/${retries + 1}) for ${config.method} ${config.url}. Retrying in ${delay}ms...`,
          err.message
        );
        // wait
        await new Promise((res) => setTimeout(res, delay));
      }
      attempt += 1;
    }

    // All retries exhausted
    console.error('NTE request failed after retries:', lastError && lastError.message);
    throw lastError;
  }

  /**
   * Register a new baby
   */
  async registerBaby(babyData) {
    try {
      const response = await this.apiClient.post('/baby/register', {
        baby_id: babyData.babyId,
        name: babyData.name,
        birth_date: babyData.birthDate,
        birth_time: babyData.birthTime,
        weight_g: parseInt(babyData.weight)
      });
      return response.data;
    } catch (error) {
      console.error('Failed to register baby:', error);
      throw error;
    }
  }

  /**
   * Get list of all registered babies
   */
  async getBabyList() {
    try {
      const response = await this.apiClient.get('/baby/list');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch baby list:', error);
      throw error;
    }
  }

  /**
   * Get details of a specific baby
   */
  async getBaby(babyId) {
    try {
      const response = await this.apiClient.get(`/baby/${babyId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch baby details:', error);
      throw error;
    }
  }

  /**
   * Update baby information
   */
  async updateBaby(babyId, updateData) {
    try {
      const response = await this.apiClient.put(`/baby/${babyId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Failed to update baby:', error);
      throw error;
    }
  }

  /**
   * Delete a baby
   */
  async deleteBaby(babyId) {
    try {
      const response = await this.apiClient.delete(`/baby/${babyId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete baby:', error);
      throw error;
    }
  }

  /**
   * Get NTE recommendations for a baby
   */
  async getRecommendations(babyId, readings = {}) {
    try {
      // Use the request wrapper so we retry transient network/timeouts and increase resilience
      return await this._requestWithRetry(
        {
          method: 'post',
          url: '/recommendations',
          data: {
            baby_id: babyId,
            air_temp: readings.air_temp || null,
            skin_temp: readings.skin_temp || null,
            humidity: readings.humidity || null
          }
        },
        3, // retries
        1500 // base backoff ms
      );
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  }

  /**
   * Check server health
   */
  async checkHealth() {
    try {
      const response = await this.apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}
const nteService = new NTEService();

export default nteService;
