import React, { useState, useEffect } from 'react';
import notificationService from '../../services/notification.service';
import './NotificationPanel.css';

function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'nte', 'cry', 'jaundice', 'vital'

  useEffect(() => {
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    // Load initial notifications
    setNotifications(notificationService.getNotifications());

    return () => {
      unsubscribe();
    };
  }, []);

  const unreadCount = notificationService.getUnreadCount();

  const handleMarkAsRead = (id) => {
    notificationService.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleClear = (id) => {
    notificationService.clearNotification(id);
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all notifications?')) {
      notificationService.clearAll();
    }
  };

  const getFilteredNotifications = () => {
    if (filter === 'all') {
      return notifications;
    }
    return notifications.filter(n => n.type === filter);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return '📢';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'nte':
        return '🌡️';
      case 'cry':
        return '👶';
      case 'jaundice':
        return '🟡';
      case 'vital':
        return '💊';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <>
      {/* Notification Bell Button */}
      <div className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              {notifications.length > 0 && (
                <>
                  <button onClick={handleMarkAllAsRead} className="btn-text" title="Mark all as read">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button onClick={handleClearAll} className="btn-text" title="Clear all">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
              <button onClick={() => setIsOpen(false)} className="btn-text" title="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="notification-filters">
            <button 
              className={filter === 'all' ? 'active' : ''} 
              onClick={() => setFilter('all')}
            >
              All {notifications.length > 0 && `(${notifications.length})`}
            </button>
            <button 
              className={filter === 'nte' ? 'active' : ''} 
              onClick={() => setFilter('nte')}
            >
              🌡️ NTE
            </button>
            <button 
              className={filter === 'cry' ? 'active' : ''} 
              onClick={() => setFilter('cry')}
            >
              👶 Cry
            </button>
            <button 
              className={filter === 'jaundice' ? 'active' : ''} 
              onClick={() => setFilter('jaundice')}
            >
              🟡 Jaundice
            </button>
            <button 
              className={filter === 'vital' ? 'active' : ''} 
              onClick={() => setFilter('vital')}
            >
              💊 Vitals
            </button>
          </div>

          {/* Notifications List */}
          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>No notifications</p>
                <small>You're all caught up!</small>
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${notification.severity} ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <div className="notification-icon">
                    {getSeverityIcon(notification.severity)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {getTypeIcon(notification.type)} {notification.title}
                    </div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTimestamp(notification.timestamp)}</div>
                  </div>
                  <button 
                    className="btn-clear-notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear(notification.id);
                    }}
                    title="Clear"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && <div className="notification-backdrop" onClick={() => setIsOpen(false)} />}
    </>
  );
}

export default NotificationPanel;
