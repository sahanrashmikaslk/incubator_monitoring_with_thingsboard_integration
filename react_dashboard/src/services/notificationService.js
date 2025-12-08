// Notification Service for sending cry, jaundice, NTE alerts to database

const API_BASE_URL = process.env.REACT_APP_PARENT_BACKEND_URL || 'https://incubator-parent-backend-nwvggkb2qa-uc.a.run.app';

class DatabaseNotificationService {
  /**
   * Create a cry detection notification
   * @param {string} babyId - Baby ID
   * @param {object} cryData - Cry detection data
   */
  async createCryNotification(babyId, cryData) {
    try {
      const severity = cryData.verified ? 'warning' : 'info';
      const classification = cryData.classification || 'Unknown';
      const confidence = cryData.classification_confidence || 0;

      await this.createNotification({
        baby_id: babyId,
        type: 'cry',
        severity,
        title: cryData.verified ? 'Cry Detected!' : 'Possible Cry Detected',
        message: `Baby crying detected${classification !== 'Unknown' ? ` - ${classification}` : ''} (${Math.round(confidence * 100)}% confidence)`,
        data: {
          classification,
          confidence,
          verified: cryData.verified,
          audio_level: cryData.audio_level,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Failed to create cry notification:', error);
    }
  }

  /**
   * Create a jaundice detection notification
   * @param {string} babyId - Baby ID
   * @param {object} jaundiceData - Jaundice detection data
   */
  async createJaundiceNotification(babyId, jaundiceData) {
    try {
      const confidence = jaundiceData.confidence || 0;
      const severity = confidence > 0.85 ? 'critical' : confidence > 0.7 ? 'warning' : 'info';
      const riskLevel = jaundiceData.risk_level || 'Unknown';

      await this.createNotification({
        baby_id: babyId,
        type: 'jaundice',
        severity,
        title: `Jaundice Detected - ${riskLevel} Risk`,
        message: `Jaundice detected with ${Math.round(confidence * 100)}% confidence. ${jaundiceData.low_light ? 'Note: Low lighting conditions.' : ''}`,
        data: {
          confidence,
          risk_level: riskLevel,
          brightness: jaundiceData.brightness,
          low_light: jaundiceData.low_light,
          status: jaundiceData.status,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Failed to create jaundice notification:', error);
    }
  }

  /**
   * Create an NTE recommendation notification
   * @param {string} babyId - Baby ID
   * @param {object} nteData - NTE recommendation data
   */
  async createNTENotification(babyId, nteData) {
    try {
      const criticalCount = nteData.critical_count || 0;
      const warningCount = nteData.warning_count || 0;
      
      const severity = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'info';
      const totalIssues = criticalCount + warningCount;

      await this.createNotification({
        baby_id: babyId,
        type: 'nte',
        severity,
        title: `NTE Alert: ${totalIssues} Issue${totalIssues !== 1 ? 's' : ''} Found`,
        message: nteData.latest_advice || 'Temperature regulation recommendations available',
        data: {
          age_hours: nteData.age_hours,
          weight_g: nteData.weight_g,
          range_min: nteData.range_min,
          range_max: nteData.range_max,
          critical_count: criticalCount,
          warning_count: warningCount,
          latest_advice: nteData.latest_advice,
          latest_detail: nteData.latest_detail,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Failed to create NTE notification:', error);
    }
  }

  /**
   * Create a generic notification
   * @param {object} notification - Notification data
   */
  async createNotification(notification) {
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notification)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create notification');
    }

    return await response.json();
  }

  /**
   * Get all notifications for a baby
   * @param {string} babyId - Baby ID
   * @param {string} token - Authentication token
   * @param {number} limit - Max notifications to fetch
   */
  async getNotifications(babyId, token, limit = 50) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${babyId}?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    const data = await response.json();
    return data.notifications;
  }

  /**
   * Get unread notifications for a baby
   * @param {string} babyId - Baby ID
   * @param {string} token - Authentication token
   */
  async getUnreadNotifications(babyId, token) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${babyId}/unread`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch unread notifications');
    }

    const data = await response.json();
    return data.notifications;
  }

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @param {string} token - Authentication token
   */
  async markAsRead(notificationId, token) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }

    return await response.json();
  }

  /**
   * Mark all notifications as read for a baby
   * @param {string} babyId - Baby ID
   * @param {string} token - Authentication token
   */
  async markAllAsRead(babyId, token) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${babyId}/read-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }

    return await response.json();
  }
}

// Export singleton instance
export const dbNotificationService = new DatabaseNotificationService();
export default dbNotificationService;
