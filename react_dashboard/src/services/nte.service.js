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
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
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
      const response = await this.apiClient.post('/recommendations', {
        baby_id: babyId,
        air_temp: readings.air_temp || null,
        skin_temp: readings.skin_temp || null,
        humidity: readings.humidity || null
      });
      return response.data;
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

export default new NTEService();
