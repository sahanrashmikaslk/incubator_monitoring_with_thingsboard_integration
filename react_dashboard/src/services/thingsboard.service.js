/**
 * ThingsBoard API Service
 * Handles authentication and data fetching from ThingsBoard Cloud
 */

import axios from 'axios';

const TB_API_URL = process.env.REACT_APP_TB_API_URL || 'https://thingsboard.cloud/api';
const DEVICE_TOKEN = process.env.REACT_APP_DEVICE_TOKEN || '2ztut7be6ppooyiueorb';

class ThingsBoardService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: TB_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.token = null;
    this.refreshTokenTimeout = null;
  }

  /**
   * Login to ThingsBoard
   * @param {string} username - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User info and token
   */
  async login(username, password) {
    try {
      const response = await this.apiClient.post('/auth/login', {
        username,
        password
      });

      this.token = response.data.token;
      this.refreshToken = response.data.refreshToken;
      
      // Set authorization header for future requests
      this.apiClient.defaults.headers.common['X-Authorization'] = `Bearer ${this.token}`;

      // Auto-refresh token before expiry
      this.scheduleTokenRefresh();

      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout and clear tokens
   */
  logout() {
    this.token = null;
    this.refreshToken = null;
    delete this.apiClient.defaults.headers.common['X-Authorization'];
    
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh() {
    // Refresh token 5 minutes before expiry (typical JWT expiry is 1 hour)
    const refreshTime = 55 * 60 * 1000; // 55 minutes

    this.refreshTokenTimeout = setTimeout(async () => {
      try {
        const response = await this.apiClient.post('/auth/token', {
          refreshToken: this.refreshToken
        });

        this.token = response.data.token;
        this.refreshToken = response.data.refreshToken;
        this.apiClient.defaults.headers.common['X-Authorization'] = `Bearer ${this.token}`;

        this.scheduleTokenRefresh();
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.logout();
      }
    }, refreshTime);
  }

  /**
   * Get device by name
   * @param {string} deviceName - Device name (e.g., 'INC-001')
   * @returns {Promise<Object>} Device info with ID
   */
  async getDevice(deviceName) {
    try {
      // Get all tenant devices and find by name
      const response = await this.apiClient.get('/tenant/devices', {
        params: {
          pageSize: 100,
          page: 0,
          textSearch: deviceName
        }
      });
      
      // Find exact match
      const device = response.data.data?.find(d => d.name === deviceName);
      
      if (!device) {
        throw new Error(`Device '${deviceName}' not found in ThingsBoard`);
      }
      
      console.log('Found device:', device.name, 'ID:', device.id.id);
      return device;
    } catch (error) {
      console.error('Failed to get device:', error);
      throw error;
    }
  }

  /**
   * Get latest telemetry for device
   * @param {string} deviceId - Device UUID from ThingsBoard
   * @param {Array<string>} keys - Telemetry keys (e.g., ['spo2', 'heart_rate'])
   * @returns {Promise<Object>} Latest telemetry values
   */
  async getLatestTelemetry(deviceId, keys = ['spo2', 'heart_rate', 'skin_temp', 'humidity']) {
    try {
      const keysParam = keys.join(',');
      const response = await this.apiClient.get(
        `/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${keysParam}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get telemetry:', error);
      throw error;
    }
  }

  /**
   * Get telemetry history
   * @param {string} deviceId - Device UUID
   * @param {Array<string>} keys - Telemetry keys
   * @param {number} startTs - Start timestamp (ms)
   * @param {number} endTs - End timestamp (ms)
   * @returns {Promise<Object>} Historical telemetry data
   */
  async getTelemetryHistory(deviceId, keys, startTs, endTs) {
    try {
      const keysParam = keys.join(',');
      const response = await this.apiClient.get(
        `/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`,
        {
          params: {
            keys: keysParam,
            startTs,
            endTs,
            limit: 1000
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get telemetry history:', error);
      throw error;
    }
  }

  /**
   * Get device attributes
   * @param {string} deviceId - Device UUID
   * @param {string} scope - Attribute scope ('SERVER_SCOPE', 'CLIENT_SCOPE', 'SHARED_SCOPE')
   * @returns {Promise<Array>} Device attributes
   */
  async getAttributes(deviceId, scope = 'SERVER_SCOPE') {
    try {
      const response = await this.apiClient.get(
        `/plugins/telemetry/DEVICE/${deviceId}/values/attributes/${scope}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get attributes:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time telemetry updates via WebSocket
   * @param {string} deviceId - Device UUID
   * @param {Array<string>} keys - Telemetry keys
   * @param {Function} callback - Callback for telemetry updates
   * @returns {WebSocket} WebSocket connection
   */
  subscribeToTelemetry(deviceId, keys, callback) {
    const wsUrl = TB_API_URL.replace('https', 'wss').replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/websocket`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      
      // Send subscription command
      const subscribeCmd = {
        tsSubCmds: [{
          entityType: 'DEVICE',
          entityId: deviceId,
          scope: 'LATEST_TELEMETRY',
          cmdId: 1
        }],
        historyCmds: [],
        attrSubCmds: []
      };

      ws.send(JSON.stringify(subscribeCmd));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.subscriptionId === 1 && data.data) {
        callback(data.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return ws;
  }

  /**
   * Get user info
   * @returns {Promise<Object>} User information
   */
  async getUserInfo() {
    try {
      const response = await this.apiClient.get('/auth/user');
      return response.data;
    } catch (error) {
      console.error('Failed to get user info:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!this.token;
  }
}

export default new ThingsBoardService();
