import React, { useState, useEffect, useMemo } from 'react';
import notificationService from '../../services/notification.service';
import './NotificationPanel.css';

const severityIcons = {
  critical: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.8 2.5h8.4l5.3 5.3v8.4l-5.3 5.3H7.8L2.5 16.2V7.8L7.8 2.5z" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4l9 15H3l9-15z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5L11 15l4.5-4.5" />
    </svg>
  )
};

const typeMeta = {
  nte: {
    label: 'NTE',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 14.5V6a2 2 0 10-4 0v8.5a3 3 0 104 0z" />
        <path d="M10 11h4" />
      </svg>
    )
  },
  cry: {
    label: 'Cry',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 9v6" />
        <path d="M9 7v10" />
        <path d="M13 9v6" />
        <path d="M17 8a4 4 0 010 8" />
        <path d="M19.5 7.5a6 6 0 010 9" />
      </svg>
    )
  },
  jaundice: {
    label: 'Jaundice',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4.5c-2.7 3.4-5 6.4-5 9a5 5 0 1010 0c0-2.6-2.3-5.6-5-9z" />
      </svg>
    )
  },
  vital: {
    label: 'Vitals',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 13h2.8l2.2-5 3 10 2.2-5H20" />
      </svg>
    )
  },
  camera: {
    label: 'Camera',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h2l1.2-1.8A2 2 0 018.3 4h7.4a2 2 0 011.7.9L18.7 7H21a1 1 0 011 1v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a1 1 0 011-1z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    )
  },
  system: {
    label: 'System',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
        <path d="M19.4 15.5l1 1.7-1.5 2.6-1.9-.35a7.6 7.6 0 01-1.8 1l-.3 1.95H9.1l-.3-1.95a7.6 7.6 0 01-1.8-1l-2 .35-1.5-2.6 1-1.7a7.7 7.7 0 010-3.06l-1-1.74 1.5-2.58 2 .34a7.6 7.6 0 011.8-1l.3-1.96h5.4l.3 1.96a7.6 7.6 0 011.8 1l2-.34 1.5 2.58-1 1.74a7.7 7.7 0 010 3.06z" />
      </svg>
    )
  }
};

const filterOrder = ['all', 'nte', 'cry', 'jaundice', 'vital', 'camera'];

const renderSeverityIcon = (severity) => severityIcons[severity] || severityIcons.info;
const getTypeMeta = (type) => typeMeta[type] || typeMeta.system;

function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((updated) => setNotifications(updated));
    setNotifications(notificationService.getNotifications());
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const body = document.body;
    if (!body) return;

    if (isOpen) {
      body.classList.add('notifications-open');
      body.style.overflow = 'hidden';
    } else {
      body.classList.remove('notifications-open');
      body.style.overflow = '';
    }

    return () => {
      body.classList.remove('notifications-open');
      body.style.overflow = '';
    };
  }, [isOpen]);

  const unreadCount = notificationService.getUnreadCount();

  const handleMarkAsRead = (id) => notificationService.markAsRead(id);
  const handleMarkAllAsRead = () => notificationService.markAllAsRead();
  const handleClear = (id) => notificationService.clearNotification(id);
  const handleClearAll = () => {
    if (window.confirm('Clear all notifications?')) {
      notificationService.clearAll();
    }
  };

  const typeCounts = useMemo(
    () =>
      notifications.reduce((acc, note) => {
        acc[note.type] = (acc[note.type] || 0) + 1;
        return acc;
      }, {}),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') {
      return notifications;
    }
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2a2 2 0 01-.6 1.4L4 17h5" />
          <path d="M15 17v1a3 3 0 11-6 0v-1" />
        </svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </div>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              {notifications.length > 0 && (
                <>
                  <button onClick={handleMarkAllAsRead} className="btn-text" title="Mark all as read">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button onClick={handleClearAll} className="btn-text" title="Clear all">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-1.99-1.9L5 7m14 0H5m3.5 0l.7-2.1A2 2 0 0111.2 3h1.6a2 2 0 011.99 1.9L15.5 7" />
                    </svg>
                  </button>
                </>
              )}
              <button onClick={() => setIsOpen(false)} className="btn-text" title="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="notification-filters">
            {filterOrder.map((optionId) => {
              const isAll = optionId === 'all';
              const meta = isAll ? null : getTypeMeta(optionId);
              const count = isAll ? notifications.length : typeCounts[optionId] || 0;
              return (
                <button
                  key={optionId}
                  type="button"
                  className={filter === optionId ? 'active' : ''}
                  onClick={() => setFilter(optionId)}
                >
                  {meta && <span className="filter-icon">{meta.icon}</span>}
                  <span>{isAll ? 'All' : meta.label}</span>
                  {count > 0 && <span className="filter-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7" />
                  <path d="M20 13v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5h2.6a1 1 0 01.7.3l2.4 2.4a1 1 0 00.7.3h3.2a1 1 0 00.7-.3l2.4-2.4a1 1 0 01.7-.3H20z" />
                </svg>
                <p>No notifications</p>
                <small>You're all caught up!</small>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const severityIcon = renderSeverityIcon(notification.severity);
                const type = getTypeMeta(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.severity} ${notification.read ? 'read' : 'unread'}`}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                  >
                    <div className="notification-icon">{severityIcon}</div>
                    <div className="notification-content">
                      <div className="notification-title">
                        <span className="notification-type-icon">{type.icon}</span>
                        <span className="notification-type-label">{type.label}</span>
                        <span className="notification-title-text">{notification.title}</span>
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
                      type="button"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {isOpen && <div className="notification-backdrop" onClick={() => setIsOpen(false)} />}
    </>
  );
}

export default NotificationPanel;
