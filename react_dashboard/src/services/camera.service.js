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
    const piHost = process.env.REACT_APP_PI_HOST || '100.99.151.101';
    const port = process.env.REACT_APP_MJPEG_PORT || '8081';
    return `http://${piHost}:${port}/?action=stream`;
  }

  /**
   * Get HLS stream URL (for production)
   * @returns {string} HLS stream URL
   */
  getHLSStreamUrl() {
    const piHost = process.env.REACT_APP_PI_HOST || '100.99.151.101';
    const port = process.env.REACT_APP_HLS_PORT || '8080';
    return `http://${piHost}:${port}/live/stream.m3u8`;
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
    const piHost = process.env.REACT_APP_PI_HOST || '100.99.151.101';
    const port = process.env.REACT_APP_MJPEG_PORT || '8081';
    return `http://${piHost}:${port}/?action=snapshot&t=${Date.now()}`;
  }
}

export default new CameraService();
