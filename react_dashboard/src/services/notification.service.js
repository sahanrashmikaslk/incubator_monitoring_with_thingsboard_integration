const STORAGE_KEY = 'clinical_notifications_v1';

/**
 * Notification Service
 * Manages real-time notifications for clinical events
 */

class NotificationService {
  constructor() {
    this.listeners = [];
    this.notifications = [];
    this.maxNotifications = 50; // Keep last 50 notifications
    this.recentNteSignatures = new Map();
    this.nteDedupWindowMs = 5 * 60 * 1000; // 5 minutes

    this.loadFromStorage();
  }

  /**
   * Add a new notification
   * @param {Object} notification - Notification object
   * @param {string} notification.id - Unique identifier
   * @param {string} notification.type - 'nte' | 'cry' | 'jaundice' | 'vital' | 'system'
   * @param {string} notification.severity - 'critical' | 'warning' | 'info' | 'success'
   * @param {string} notification.title - Notification title
   * @param {string} notification.message - Notification message
   * @param {string} notification.timestamp - ISO timestamp
   * @param {boolean} notification.read - Read status
   * @param {Object} notification.data - Additional data
   */
  addNotification(notification) {
    const newNotification = {
      id: notification.id || `notif_${Date.now()}`,
      type: notification.type,
      severity: notification.severity,
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp || new Date().toISOString(),
      read: notification.read || false,
      data: notification.data || {}
    };

    // Add to beginning of array (newest first)
    this.notifications.unshift(newNotification);

    // Limit notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.persistNotifications();

    // Notify all listeners
    this.notifyListeners();

    // Play sound for critical/warning
    if (notification.severity === 'critical' || notification.severity === 'warning') {
      this.playNotificationSound(notification.severity);
    }

    return newNotification;
  }

  /**
   * Subscribe to notification updates
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of notification changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.notifications);
    });
  }

  persistNotifications() {
    if (typeof window === 'undefined' || !window?.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      // Ignore storage errors (quota exceeded, privacy mode, etc.)
    }
  }

  loadFromStorage() {
    if (typeof window === 'undefined' || !window?.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.notifications = parsed.slice(0, this.maxNotifications);
      }
    } catch (error) {
      this.notifications = [];
    }
  }

  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   */
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.persistNotifications();
      this.notifyListeners();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.persistNotifications();
    this.notifyListeners();
  }

  /**
   * Clear a notification
   * @param {string} id - Notification ID
   */
  clearNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.persistNotifications();
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.persistNotifications();
    this.notifyListeners();
  }

  /**
   * Get all notifications
   * @returns {Array} Notifications array
   */
  getNotifications() {
    return this.notifications;
  }

  /**
   * Get unread count
   * @returns {number} Unread count
   */
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Get notifications by type
   * @param {string} type - Notification type
   * @returns {Array} Filtered notifications
   */
  getByType(type) {
    return this.notifications.filter(n => n.type === type);
  }

  /**
   * Get notifications by severity
   * @param {string} severity - Severity level
   * @returns {Array} Filtered notifications
   */
  getBySeverity(severity) {
    return this.notifications.filter(n => n.severity === severity);
  }

  /**
   * Play notification sound
   * @param {string} severity - Severity level
   */
  playNotificationSound(severity) {
    try {
      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different tones for different severities
      if (severity === 'critical') {
        // Critical: 3 short high-pitched beeps
        oscillator.frequency.value = 880; // A5
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
        
        setTimeout(() => {
          const osc2 = this.audioContext.createOscillator();
          const gain2 = this.audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(this.audioContext.destination);
          osc2.frequency.value = 880;
          gain2.gain.value = 0.3;
          osc2.start();
          osc2.stop(this.audioContext.currentTime + 0.1);
        }, 150);
        
        setTimeout(() => {
          const osc3 = this.audioContext.createOscillator();
          const gain3 = this.audioContext.createGain();
          osc3.connect(gain3);
          gain3.connect(this.audioContext.destination);
          osc3.frequency.value = 880;
          gain3.gain.value = 0.3;
          osc3.start();
          osc3.stop(this.audioContext.currentTime + 0.1);
        }, 300);
      } else if (severity === 'warning') {
        // Warning: 2 medium-pitched beeps
        oscillator.frequency.value = 660; // E5
        gainNode.gain.value = 0.2;
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
        
        setTimeout(() => {
          const osc2 = this.audioContext.createOscillator();
          const gain2 = this.audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(this.audioContext.destination);
          osc2.frequency.value = 660;
          gain2.gain.value = 0.2;
          osc2.start();
          osc2.stop(this.audioContext.currentTime + 0.15);
        }, 200);
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  /**
   * Create NTE notification from recommendation data
   * @param {Object} data - NTE recommendation data
   */
  createNTENotification(data) {
    if (!data || !data.advice || data.advice.length === 0) return;

    // Find highest severity advice
    const critical = data.advice.find(a => a.severity === 'critical');
    const warning = data.advice.find(a => a.severity === 'warning');
    const mainAdvice = critical || warning;

    if (mainAdvice) {
      const normalizedMessage = (mainAdvice.message || '').replace(/\s+/g, ' ').trim();
      const signature =
        `${data.baby_id || 'unknown'}|${mainAdvice.severity}|${mainAdvice.code || normalizedMessage}`;
      const now = Date.now();

      // prune stale signatures
      for (const [key, lastSeen] of this.recentNteSignatures) {
        if (now - lastSeen > this.nteDedupWindowMs) {
          this.recentNteSignatures.delete(key);
        }
      }

      if (this.recentNteSignatures.has(signature)) {
        return;
      }

      this.recentNteSignatures.set(signature, now);

      this.addNotification({
        type: 'nte',
        severity: mainAdvice.severity,
        title: `NTE Alert: ${data.baby_id || 'Baby'}`,
        message: mainAdvice.message,
        data: {
          baby_id: data.baby_id,
          nte_range: data.nte_range,
          advice: data.advice,
          signature
        }
      });
    }
  }

  /**
   * Create cry detection notification
   * @param {Object} data - Cry detection data
   */
  createCryNotification(data) {
    if (!data) return;

    const classification = data.classification || data.cry_classification || null;
    const confidence = typeof data.confidence === 'number'
      ? data.confidence
      : (typeof data.classification_confidence === 'number' ? data.classification_confidence : 0);
    const verification =
      typeof data.verification === 'boolean'
        ? data.verification
        : (typeof data.cry_verified === 'boolean' ? data.cry_verified : null);
    const audioLevel = typeof data.audio_level === 'number' ? data.audio_level : null;
    const durationSeconds = typeof data.duration === 'number' ? data.duration : null;

    const severity = confidence > 0.85 || classification === 'Pain' ? 'critical' : 'warning';

    const fragments = [];
    if (classification) {
      fragments.push(`${classification} (${(confidence * 100).toFixed(0)}% confidence)`);
    } else {
      fragments.push(`Confidence ${(confidence * 100).toFixed(0)}%`);
    }

    if (verification !== null) {
      fragments.push(verification ? 'Verified by classifier' : 'Awaiting verification');
    }

    if (audioLevel !== null) {
      fragments.push(`Audio level ${audioLevel.toFixed ? audioLevel.toFixed(3) : audioLevel}`);
    }

    if (durationSeconds !== null && Number.isFinite(durationSeconds)) {
      fragments.push(`Duration ${Math.round(durationSeconds)}s`);
    }

    this.addNotification({
      type: 'cry',
      severity,
      title: classification ? `Cry alert: ${classification}` : 'Cry alert',
      message: fragments.join(' - ') || 'Cry detected by audio monitor',
      data: {
        classification,
        confidence,
        verification,
        audio_level: audioLevel,
        duration: durationSeconds,
        timestamp: data.timestamp
      }
    });
  }

  /**
   * Create jaundice detection notification
   * @param {Object} data - Jaundice detection data
   */
  createJaundiceNotification(data) {
    if (!data) return;

    // Determine severity based on confidence and risk level
    let severity = 'info';
    if (data.risk_level === 'High' || (data.confidence && data.confidence > 0.85)) {
      severity = 'critical';
    } else if (data.risk_level === 'Medium' || (data.confidence && data.confidence > 0.70)) {
      severity = 'warning';
    }

    // Build message based on available data
    let message = `Jaundice detected with ${((data.confidence || 0) * 100).toFixed(0)}% confidence - Risk: ${data.risk_level || 'Unknown'}`;
    
    // Add brightness warning if available
    if (data.brightness != null && data.brightness < 40) {
      message += `\nâš ï¸ Warning: Low light condition (brightness: ${data.brightness.toFixed(0)}). Result may be less accurate.`;
    }

    this.addNotification({
      type: 'jaundice',
      severity: severity,
      title: 'Jaundice Detection Alert',
      message: message,
      data: {
        // Keep only relevant, non-clinical-debug fields
        risk_level: data.risk_level,
        confidence: data.confidence,
        brightness: data.brightness,
        low_light: data.low_light,
        status: data.status
      }
    });
  }

  /**
   * Create vital sign alert notification
   * @param {Object} data - Vital sign data
   */
  createVitalAlert(data) {
    if (!data) return;

    this.addNotification({
      type: 'vital',
      severity: data.severity || 'warning',
      title: ` Vital Sign Alert: ${data.vitalName}`,
      message: data.message,
      data: {
        vitalType: data.vitalType,
        value: data.value,
        normalRange: data.normalRange
      }
    });
  }

  /**
   * Create system notification
   * @param {string} message - Notification message
   * @param {string} severity - Severity level
   */
  createSystemNotification(message, severity = 'info') {
    this.addNotification({
      type: 'system',
      severity: severity,
      title: 'System Notification',
      message: message,
      data: {}
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

