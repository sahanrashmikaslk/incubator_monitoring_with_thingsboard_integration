/**
 * Camera Stream Service
 * Handles video stream connections for NICU monitoring
 */

class CameraService {
  /**
   * Get raw MJPEG stream URL
   * @returns {string} Stream URL
   */
  getMJPEGStreamUrl() {
    // Use same IP as test dashboard - works across devices with Tailscale VPN
    const piHost = '100.89.162.22';
    const port = '8080';
    return `http://${piHost}:${port}/?action=stream`;

    // Camera 1 (Infant): http://100.89.162.22:8080/?action=stream
    // Camera 2 (LCD): http://100.89.162.22:8081/?action=stream
  }

  /**
   * Get HLS stream URL (for production)
   * @returns {string} HLS stream URL
   */
  getHLSStreamUrl() {
    // NOT AVAILABLE - Pi uses MJPEG streams on ports 8080 and 8081
    const piHost = '100.89.162.22';
    const port = '8080';
    return `http://${piHost}:${port}/?action=stream`;
  }

  /**
   * Check if stream is accessible
   * @param {string} streamUrl - Stream URL to check
   * @returns {Promise<boolean>} Stream availability
   */
  async checkStreamAvailability(streamUrl) {
    try {
      const response = await fetch(streamUrl, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true;
    } catch (error) {
      console.error('Stream not available:', error);
      return false;
    }
  }

  /**
   * Get snapshot from camera
   * @returns {Promise<string>} Snapshot URL
   */
  async getSnapshot() {
    const piHost = process.env.REACT_APP_PI_HOST || '100.89.162.22';
    const port = process.env.REACT_APP_MJPEG_PORT || '8081';
    return `http://${piHost}:${port}/?action=snapshot&t=${Date.now()}`;
  }
}

export default new CameraService();
