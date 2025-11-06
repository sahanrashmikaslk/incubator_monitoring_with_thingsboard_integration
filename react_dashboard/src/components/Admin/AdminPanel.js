import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import {
  fetchSystemSnapshot,
  getTestDashboardUrl,
  shutdownPi,
  rebootPi,
  DEFAULT_PI_HOST
} from '../../services/admin.service';
import parentService from '../../services/parent.service';
import adminBackendService from '../../services/admin-backend.service';
import Logo from '../../images/logo.png';
import './AdminPanel.css';

const SNAPSHOT_REFRESH_MS = 45_000;
const MAX_RELATIVE_MINUTES = 90;

const ICONS = {
  power: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M7.5 6.5a7.5 7.5 0 103 12.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
  lcd: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 19h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="7.5" y="8" width="9" height="4" rx="0.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  cry: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 13h2.5l2.2-4.8L12 18l2.2-5H20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 10.5a3 3 0 115.9-1.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  jaundice: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5c-2.7 3.4-5 6.4-5 9a5 5 0 1010 0c0-2.6-2.3-5.6-5-9z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  nte: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8l6-4 6 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 10v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 18h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  access: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 8a4 4 0 11-8 0 4 4 0 018 0z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 19a6 6 0 0112 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 11.5a3 3 0 11-3-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M19.5 19a3.5 3.5 0 00-4.6-3.3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 4v6h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20v-6h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 10a8 8 0 00-8-6 7.8 7.8 0 00-5.6 2.4M4 14a8 8 0 008 6 7.8 7.8 0 005.6-2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2.5v2.5M12 19v2.5M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M2.5 12H5M19 12h2.5M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 12.6A8.5 8.5 0 0111.4 4 6.5 6.5 0 0012 17.5a6.4 6.4 0 008-4.9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  shutdown: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M7.5 6.5a7.5 7.5 0 0010 11.5M16.5 6.5a7.5 7.5 0 010 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  restart: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 12a8 8 0 018-8 8 8 0 017.5 5.5M20 12a8 8 0 01-8 8 8 8 0 01-7.5-5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 9v3h-3M4 15v-3h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  userPlus: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 11a4 4 0 11-8 0 4 4 0 018 0z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 20a6 6 0 0112 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 8v6M22 11h-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 8a3 3 0 11-6 0 3 3 0 016 0z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 18a6 6 0 0112 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 11a2.5 2.5 0 11-2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M21 18a4 4 0 00-4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l9 16H3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 9v4M12 17h0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 17v-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 8h0.01" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v4l3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
    ),
    bell: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3a4 4 0 00-4 4v2.2c0 .7-.2 1.4-.6 2L6 13.4c-.4.6-.6 1.3-.6 2.1V17h13.2v-1.5c0-.8-.2-1.5-.6-2.1l-1.4-2.1c-.4-.6-.6-1.3-.6-2.1V7a4 4 0 00-4-4z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 20a2 2 0 004 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
};

const TONE_CLASS = {
  ok: 'status-card--ok',
  warning: 'status-card--warning',
  alert: 'status-card--alert',
  muted: 'status-card--muted'
};

const sortNotificationsByRecency = (records = []) => {
  return [...records].sort((a, b) => {
    const left = new Date(b.updatedAt || b.lastTriggeredAt || b.createdAt || 0).getTime();
    const right = new Date(a.updatedAt || a.lastTriggeredAt || a.createdAt || 0).getTime();
    return left - right;
  });
};

const parseThrottledFlags = (raw) => {
  if (!raw || typeof raw !== 'string') {
    return { raw, value: null };
  }
  const trimmed = raw.trim();
  const value = trimmed.startsWith('0x') ? parseInt(trimmed, 16) : parseInt(trimmed, 10);
  if (Number.isNaN(value)) {
    return { raw: trimmed, value: null };
  }
  return {
    raw: trimmed,
    value,
    underVoltage: Boolean(value & 0x1),
    frequencyCapped: Boolean(value & 0x2),
    currentlyThrottled: Boolean(value & 0x4),
    temperatureLimit: Boolean(value & 0x8),
    underVoltageHistory: Boolean(value & 0x10000),
    frequencyHistory: Boolean(value & 0x20000),
    throttledHistory: Boolean(value & 0x40000),
    temperatureHistory: Boolean(value & 0x80000)
  };
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '--';
  const numeric = Number(timestamp);
  const millis = Number.isFinite(numeric) && numeric > 1_000_000_000 ? numeric * 1000 : Date.parse(timestamp);
  if (!Number.isFinite(millis)) return '--';

  const deltaMs = Date.now() - millis;
  if (deltaMs < 0) return 'just now';
  if (deltaMs < 60_000) return 'within 1 min';

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes === 1) return '1 min ago';
  if (minutes < MAX_RELATIVE_MINUTES) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};
const formatUptime = (uptimeHours) => {
  if (!Number.isFinite(uptimeHours)) return 'unknown';
  if (uptimeHours < 1) {
    return `${Math.round(uptimeHours * 60)} min`;
  }
  if (uptimeHours < 24) {
    return `${uptimeHours.toFixed(1)} h`;
  }

  const days = Math.floor(uptimeHours / 24);
  const hours = Math.round(uptimeHours % 24);
  return `${days}d ${hours}h`;
};

function StatusCard({ icon, title, value, tone = 'muted', description, footer }) {
  return (
    <article className={`status-card ${TONE_CLASS[tone] || ''}`}>
      <div className="status-card__icon">{icon}</div>
      <div className="status-card__content">
        <span className="status-card__title">{title}</span>
        <span className="status-card__value">{value}</span>
        {description && <p className="status-card__description">{description}</p>}
        {footer && <span className="status-card__footer">{footer}</span>}
      </div>
    </article>
  );
}

function MetricPill({ label, value, hint }) {
  return (
    <div className="metric-pill">
      <span className="metric-pill__label">{label}</span>
      <span className="metric-pill__value">{value}</span>
      {hint && <span className="metric-pill__hint">{hint}</span>}
    </div>
  );
}

function RecommendationCard({ item }) {
  return (
    <article className="recommendation-card">
      <header className="recommendation-card__header">
        <span className="recommendation-card__icon">{ICONS.check}</span>
        <div>
          <h3>{item?.title || 'Recommendation'}</h3>
          {item?.category && <span className="recommendation-card__badge">{item.category}</span>}
        </div>
      </header>
      {item?.summary && <p className="recommendation-card__summary">{item.summary}</p>}
      {item?.details && (
        <ul className="recommendation-card__list">
          {item.details.map((detail, index) => (
            <li key={index}>{detail}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('adminTheme') === 'dark' ? 'dark' : 'light';
  });
  const [section, setSection] = useState('overview');
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotError, setSnapshotError] = useState('');
  const [, setRefreshingSnapshot] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [parentQueue, setParentQueue] = useState([]);
  const [parentError, setParentError] = useState('');
  const [deviceAction, setDeviceAction] = useState(null); // 'shutting-down', 'rebooting', null
  const [deviceActionError, setDeviceActionError] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [userCreationStatus, setUserCreationStatus] = useState(null); // null, 'creating', 'success', 'error'
  const [createdUserLink, setCreatedUserLink] = useState('');
  const [creationError, setCreationError] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersError, setAdminUsersError] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationError, setNotificationError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationPanelBusy, setNotificationPanelBusy] = useState(false);
  const notificationFingerprintsRef = useRef(new Set());
  const unreadNotificationCount = useMemo(
    () => notifications.filter(notification => !notification.read).length,
    [notifications]
  );
  const pendingCameraRequests = useMemo(
    () => parentQueue.filter(entry => entry?.pendingRequest).length,
    [parentQueue]
  );

  const loadNotifications = useCallback(async () => {
    if (!adminBackendService.token) {
      setNotifications([]);
      setNotificationError('');
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    try {
      const response = await adminBackendService.listNotifications();
      const records = Array.isArray(response?.notifications) ? response.notifications : [];
      setNotifications(sortNotificationsByRecency(records));
      setNotificationError('');

      const fingerprintSet = new Set();
      records.forEach((record) => {
        if (record?.fingerprint) {
          fingerprintSet.add(record.fingerprint);
        }
      });
      notificationFingerprintsRef.current = fingerprintSet;
    } catch (error) {
      const message = error?.message || 'Unable to load notifications.';
      setNotificationError(message);
      if (message.toLowerCase().includes('admin not found')) {
        adminBackendService.clearToken();
        setShowNotifications(false);
        setNotificationError('Sign in to view notifications.');
      }
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const submitNotification = useCallback(async (payload) => {
    try {
      if (!adminBackendService.token) return;
      const response = await adminBackendService.createNotification(payload);
      const record = response?.notification;
      if (!record) return;

      setNotifications((prev) => {
        const next = prev.filter(item => item.id !== record.id);
        next.push(record);
        return sortNotificationsByRecency(next);
      });
      setNotificationError('');

      if (record.fingerprint) {
        notificationFingerprintsRef.current.add(record.fingerprint);
      }
    } catch (error) {
      console.error('Failed to persist admin notification:', error);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const unreadIds = notifications.filter(notification => !notification.read).map(notification => notification.id);
    if (unreadIds.length === 0) {
      return;
    }

    setNotificationPanelBusy(true);
    try {
      if (!adminBackendService.token) {
        setNotifications((prev) =>
          prev.map(notification => ({ ...notification, read: true, readAt: new Date().toISOString() }))
        );
        return;
      }
      const response = await adminBackendService.markNotificationsRead(unreadIds);
      const records = Array.isArray(response?.notifications) ? response.notifications : notifications;
      setNotifications(sortNotificationsByRecency(records));
      setNotificationError('');

      const fingerprintSet = new Set();
      records.forEach((record) => {
        if (record?.fingerprint) {
          fingerprintSet.add(record.fingerprint);
        }
      });
      notificationFingerprintsRef.current = fingerprintSet;
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      setNotificationError(error?.message || 'Unable to update notifications.');
    } finally {
      setNotificationPanelBusy(false);
    }
  }, [notifications]);

  const handleNotificationRefresh = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationsToggle = useCallback(() => {
    setShowNotifications((prev) => {
      const next = !prev;
      if (!prev && unreadNotificationCount > 0) {
        markAllNotificationsRead();
      }
      return next;
    });
  }, [markAllNotificationsRead, unreadNotificationCount]);

  const handleNotificationsClose = useCallback(() => {
    setShowNotifications(false);
  }, []);

  const persistSnapshotErrors = useCallback(async (snapshotData) => {
    if (!snapshotData?.errors) return;
    const entries = Object.entries(snapshotData.errors);
    if (entries.length === 0) return;

    await Promise.all(
      entries.map(([key, reason]) => {
        if (!reason) return Promise.resolve();
        const fingerprint = `edge:${key}:${reason}`;
        if (notificationFingerprintsRef.current.has(fingerprint)) {
          return Promise.resolve();
        }
        return submitNotification({
          title: `Service alert: ${key}`,
          message: reason,
          severity: 'error',
          source: key,
          fingerprint,
          metadata: {
            piHost: snapshotData.piHost || DEFAULT_PI_HOST,
            snapshotTimestamp: snapshotData.timestamp
          },
          occurredAt: snapshotData.timestamp
        });
      })
    );
  }, [submitNotification]);

  const persistSnapshotFailure = useCallback(async (message, piHost) => {
    const fingerprint = `edge:connection:${message}`;
    if (notificationFingerprintsRef.current.has(fingerprint)) {
      return;
    }
    await submitNotification({
      title: 'Edge connection issue',
      message,
      severity: 'critical',
      source: 'edge-connection',
      fingerprint,
      metadata: {
        piHost
      },
      occurredAt: new Date().toISOString()
    });
  }, [submitNotification]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminTheme', next);
      }
      return next;
    });
  }, []);

  const loadSnapshot = useCallback(async () => {
    setRefreshingSnapshot(true);
    try {
      const data = await fetchSystemSnapshot();
      setSnapshot(data);
      setSnapshotError('');
      await persistSnapshotErrors(data);
    } catch (error) {
      const message = error?.message || 'Unable to reach edge device health services.';
      setSnapshotError(message);
      await persistSnapshotFailure(message, DEFAULT_PI_HOST);
    } finally {
      setRefreshingSnapshot(false);
      setSnapshotLoading(false);
    }
  }, [persistSnapshotErrors, persistSnapshotFailure]);

  const refreshParentQueue = useCallback(async () => {
    try {
      const entries = await parentService.listCameraAccessQueue();
      setParentQueue(entries || []);
      setParentError('');
    } catch (error) {
      setParentError(error?.message || 'Unable to reach parent engagement backend.');
    }
  }, []);

  const handleShutdown = useCallback(async () => {
    const confirmed = window.confirm(
      'WARNING: This will shut down the Raspberry Pi edge device.\n\n' +
      'The device will power off completely and will need to be manually powered back on.\n\n' +
      'Are you sure you want to proceed?'
    );
    
    if (!confirmed) return;

    setDeviceAction('shutting-down');
    setDeviceActionError('');
    
    try {
      await shutdownPi(snapshot?.piHost || DEFAULT_PI_HOST);
      // Device will shutdown, so we expect to lose connection
      setTimeout(() => {
        setDeviceAction(null);
      }, 10000);
    } catch (error) {
      setDeviceActionError(error?.message || 'Failed to shutdown device');
      setDeviceAction(null);
    }
  }, [snapshot]);

  const handleReboot = useCallback(async () => {
    const confirmed = window.confirm(
      'WARNING: This will reboot the Raspberry Pi edge device.\n\n' +
      'All services will restart and the device will be unavailable for 1-2 minutes.\n\n' +
      'Are you sure you want to proceed?'
    );
    
    if (!confirmed) return;

    setDeviceAction('rebooting');
    setDeviceActionError('');
    
    try {
      await rebootPi(snapshot?.piHost || DEFAULT_PI_HOST);
      // Device will reboot, so we expect to lose connection temporarily
      setTimeout(() => {
        setDeviceAction(null);
        loadSnapshot(); // Try to reconnect
      }, 60000); // Wait 1 minute before trying to reconnect
    } catch (error) {
      setDeviceActionError(error?.message || 'Failed to reboot device');
      setDeviceAction(null);
    }
  }, [snapshot, loadSnapshot]);

  const handleOpenUserModal = useCallback(() => {
    setShowUserModal(true);
    setNewUserEmail('');
    setNewUserName('');
    setUserCreationStatus(null);
    setCreatedUserLink('');
    setCreationError('');
  }, []);

  const handleCloseUserModal = useCallback(() => {
    setShowUserModal(false);
  }, []);

  useEffect(() => {
    if (user?.backend === 'admin' && user?.token) {
      adminBackendService.setToken(user.token);
    }
  }, [user?.backend, user?.token]);

  // Load admin users from backend
  const loadAdminUsers = useCallback(async () => {
    // Check if we have a valid admin user with token
    if (user?.backend !== 'admin' || !user?.token) {
      setAdminUsersError('Admin session not found. Please sign in to manage users.');
      return;
    }
    
    // Ensure token is set in the service
    if (user.token) {
      adminBackendService.setToken(user.token);
    }
    
    try {
      await adminBackendService.verifySession();
      const response = await adminBackendService.listAdmins();
      const admins = Array.isArray(response?.admins) ? response.admins : [];
      setAdminUsers(admins);
      setAdminUsersError('');
    } catch (error) {
      console.error('Failed to load admin users:', error);
      const rawMessage = error?.message || 'Unable to load admin users.';
      const normalized = rawMessage.toLowerCase();
      if (normalized.includes('token') || normalized.includes('session') || normalized.includes('expired')) {
        // Clear both tokens - from adminBackendService and AuthContext
        adminBackendService.clearToken();
        // Force logout to clear AuthContext user state
        logout();
        setAdminUsersError('Admin session expired. Please sign in again.');
      } else {
        setAdminUsersError(`${rawMessage} Showing last known list.`);
      }
    }
  }, [user, logout]);

  const handleCreateUser = useCallback(async (e) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserName) {
      setCreationError('Email and name are required');
      return;
    }

    if (user?.backend !== 'admin' || !user?.token) {
      setCreationError('Admin session expired. Please sign in again.');
      logout();
      return;
    }
    
    // Ensure token is set in the service
    if (user.token) {
      adminBackendService.setToken(user.token);
    }

    setUserCreationStatus('creating');
    setCreationError('');

    try {
      // Call backend API to create user
      const response = await adminBackendService.createAdmin(newUserEmail, newUserName);

      if (response && response.setupLink) {
        setCreatedUserLink(response.setupLink);
        setUserCreationStatus('success');
        
        // Reload admin users list
        loadAdminUsers();
      }
    } catch (error) {
      const errorMsg = error?.message || 'Failed to create user';
      const normalized = errorMsg.toLowerCase();
      
      if (normalized.includes('token') || normalized.includes('session') || normalized.includes('expired')) {
        adminBackendService.clearToken();
        logout();
        setCreationError('Admin session expired. Please sign in again.');
      } else {
        setCreationError(errorMsg);
      }
      setUserCreationStatus('error');
    }
  }, [newUserEmail, newUserName, loadAdminUsers, logout, user]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(createdUserLink);
    alert('Setup link copied to clipboard!');
  }, [createdUserLink]);

  const handleDeleteUser = useCallback(async (userId, userEmail) => {
    if (user?.backend !== 'admin' || !user?.token) {
      alert('Admin session expired. Please sign in again to manage users.');
      logout();
      return;
    }
    
    // Ensure token is set in the service
    if (user.token) {
      adminBackendService.setToken(user.token);
    }

    const confirmed = window.confirm(
      `WARNING: Delete admin user?\n\n` +
      `Email: ${userEmail}\n\n` +
      `This action cannot be undone. The user will lose access to the admin dashboard.\n\n` +
      `Are you sure you want to proceed?`
    );
    
    if (!confirmed) return;

    try {
      await adminBackendService.deleteAdmin(userId);
      alert('User deleted successfully!');
      loadAdminUsers(); // Reload the list
    } catch (error) {
      const errorMsg = error?.message || 'Failed to delete user';
      const normalized = errorMsg.toLowerCase();
      
      if (normalized.includes('token') || normalized.includes('session') || normalized.includes('expired')) {
        adminBackendService.clearToken();
        logout();
        alert('Admin session expired. Please sign in again.');
      } else {
        alert('Failed to delete user: ' + errorMsg);
      }
    }
  }, [loadAdminUsers, logout, user]);

  const handleToggleUserList = useCallback(() => {
    setShowUserList(prev => !prev);
    if (!showUserList) {
      loadAdminUsers(); // Reload when opening
    }
  }, [showUserList, loadAdminUsers]);

  useEffect(() => {
    if (!user) {
      setShowNotifications(false);
      setNotifications([]);
      notificationFingerprintsRef.current = new Set();
      setNotificationsLoading(false);
      return;
    }
    loadNotifications();
  }, [user, loadNotifications]);

  // Removed: loadAdminUsers should only be called when user clicks "Manage Admin Users"
  // useEffect(() => {
  //   loadAdminUsers();
  // }, [loadAdminUsers]);

  useEffect(() => {
    loadSnapshot();
    const timer = window.setInterval(loadSnapshot, SNAPSHOT_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadSnapshot]);

  useEffect(() => {
    refreshParentQueue();
  }, [refreshParentQueue]);

  const testDashboardUrl = useMemo(() => getTestDashboardUrl(snapshot?.piHost || DEFAULT_PI_HOST), [snapshot]);

  const powerStatus = useMemo(() => {
    const health = snapshot?.data?.health;
    if (!health) {
      return {
        tone: 'muted',
        value: 'Offline',
        description: 'No health telemetry received from edge device.',
        footer: null
      };
    }

    const flags = parseThrottledFlags(health.throttled);
    const issues = [];
    if (flags.underVoltage) issues.push('Undervoltage');
    if (flags.currentlyThrottled) issues.push('CPU throttled');
    if (flags.frequencyCapped) issues.push('Frequency capped');
    if (flags.temperatureLimit) issues.push('Temp limit');

    const hasIssue = issues.length > 0;
    const tone = hasIssue ? (flags.underVoltage ? 'alert' : 'warning') : 'ok';
    const footerParts = [];
    if (flags.underVoltageHistory) footerParts.push('undervoltage flagged before');
    if (flags.throttledHistory) footerParts.push('throttled previously');

    return {
      tone,
      value: hasIssue ? 'Attention needed' : 'Nominal',
      description: hasIssue ? issues.join(' | ') : 'Power rails stable and within limits.',
      footer: flags.raw ? `cgencmd: ${flags.raw}` : footerParts.length ? footerParts.join(' | ') : null
    };
  }, [snapshot]);

  const lcdStatus = useMemo(() => {
    const lcd = snapshot?.data?.lcd;
    if (!lcd) {
      if (snapshot?.errors?.lcd) {
        return { tone: 'alert', value: 'Unavailable', description: snapshot.errors.lcd };
      }
      return { tone: 'muted', value: 'Pending', description: 'Awaiting LCD reader response.' };
    }

    const readings = lcd.readings || {};
    const keys = Object.keys(readings);
    if (lcd.status === 'success' && keys.length) {
      const summary = keys
        .map((key) => {
          const item = readings[key];
          const label = item?.name || key;
          const value = item?.value ?? item;
          const unit = item?.unit || '';
          return `${label}: ${value}${unit}`;
        })
        .join(' | ');
      const timestamp = typeof lcd.timestamp === 'number' ? lcd.timestamp * 1000 : lcd.timestamp;
      return {
        tone: 'ok',
        value: `${keys.length} parameters`,
        description: summary,
        footer: timestamp ? `Updated ${formatRelativeTime(timestamp)}` : null
      };
    }

    if (lcd.status === 'no_data') {
      return { tone: 'warning', value: 'No readings yet', description: lcd.message || 'LCD camera stream reachable, awaiting OCR pass.' };
    }

    return {
      tone: 'warning',
      value: lcd.status || 'Check reader',
      description: lcd.message || 'LCD reader responded without usable telemetry.'
    };
  }, [snapshot]);

  const cryStatus = useMemo(() => {
    const cry = snapshot?.data?.cry;
    if (!cry) {
      if (snapshot?.errors?.cry) {
        return { tone: 'alert', value: 'Offline', description: snapshot.errors.cry };
      }
      return { tone: 'muted', value: 'No data', description: 'Cry service not responding.' };
    }

    const lastEvent = cry.last_event || cry.latestEvent || cry.event;
    const label = lastEvent?.classification || lastEvent?.type || cry.state;
    const confidence = Number.isFinite(lastEvent?.confidence) ? `Confidence ${(lastEvent.confidence * 100).toFixed(0)}%` : null;
    return {
      tone: 'ok',
      value: label ? `${label}` : 'Monitoring',
      description: confidence || 'Listening for cry events.',
      footer: lastEvent?.timestamp ? `Last event ${formatRelativeTime(lastEvent.timestamp)}` : null
    };
  }, [snapshot]);

  const jaundiceStatus = useMemo(() => {
    const jaundice = snapshot?.data?.jaundice;
    if (!jaundice) {
      if (snapshot?.errors?.jaundice) {
        return { tone: 'warning', value: 'No feed', description: snapshot.errors.jaundice };
      }
      return { tone: 'muted', value: 'Pending', description: 'Awaiting jaundice inference results.' };
    }

    const score = jaundice.score ?? jaundice.result?.score ?? jaundice.bilirubin_index;
    const risk = jaundice.risk ?? jaundice.result?.risk ?? jaundice.classification;
    return {
      tone: risk && /high|critical/i.test(risk) ? 'alert' : 'ok',
      value: risk ? `${risk}` : 'Latest score',
      description: score ? `Index ${score}` : 'Jaundice server responded.'
    };
  }, [snapshot]);

  const nteSummary = useMemo(() => {
    // Use same logic as power status - check if health data exists
    const health = snapshot?.data?.health;
    if (!health) {
      return { 
        tone: 'muted', 
        headline: 'Offline', 
        body: 'No health telemetry received from edge device.', 
        recommendations: [], 
        activeBaby: null 
      };
    }

    const payload = snapshot?.data?.nte;
    if (!payload) {
      if (snapshot?.errors?.nte) {
        return { tone: 'alert', headline: 'NTE offline', body: snapshot.errors.nte, recommendations: [], activeBaby: null };
      }
      return { tone: 'muted', headline: 'No data', body: 'Thermal guidance engine not reached yet.', recommendations: [], activeBaby: null };
    }

    const activeBaby = payload.activeBaby || null;
    const recommendations = Array.isArray(payload.recommendations) ? payload.recommendations : [];
    const count = recommendations.length;
    const headline = count > 0 ? `${count} suggestions ready` : 'Monitoring baseline';
    const body = activeBaby?.details?.summary || activeBaby?.details?.status || 'NTE engine responded successfully.';

    return {
      tone: count > 0 ? 'ok' : 'warning',
      headline,
      body,
      recommendations,
      activeBaby
    };
  }, [snapshot]);

  const healthMetrics = useMemo(() => {
    const health = snapshot?.data?.health;
    if (!health) return [];
    const metrics = [];
    if (Number.isFinite(health.cpu)) {
      metrics.push({ label: 'CPU load', value: `${health.cpu}%` });
    }
    if (Number.isFinite(health.ram)) {
      metrics.push({ label: 'Memory use', value: `${health.ram}%` });
    }
    if (Number.isFinite(health.temp)) {
      metrics.push({ label: 'CPU temp', value: `${health.temp} C` });
    }
    if (health.load && typeof health.load === 'object') {
      metrics.push({ label: 'Load avg', value: `${health.load['1m']}` });
    }
    if (Number.isFinite(health.uptime)) {
      metrics.push({ label: 'Uptime', value: formatUptime(health.uptime) });
    }
    return metrics;
  }, [snapshot]);

  const overviewCards = [
    { key: 'power', icon: ICONS.power, title: 'Power status', ...powerStatus },
    { key: 'lcd', icon: ICONS.lcd, title: 'LCD reader', ...lcdStatus },
    { key: 'cry', icon: ICONS.cry, title: 'Cry pipeline', ...cryStatus },
    { key: 'jaundice', icon: ICONS.jaundice, title: 'Jaundice AI', ...jaundiceStatus },
    { key: 'nte', icon: ICONS.nte, title: 'NTE guidance', tone: nteSummary.tone, value: nteSummary.headline, description: nteSummary.body }
  ];

  const lastUpdated = snapshot?.timestamp ? formatRelativeTime(snapshot.timestamp) : '--';
  const uptimeHours = snapshot?.data?.health?.uptime;
  const uptimeDisplay = useMemo(
    () => (Number.isFinite(uptimeHours) ? formatUptime(uptimeHours) : '--'),
    [uptimeHours]
  );
  const highlightItems = useMemo(() => {
    // Use same logic as power status - check if health data exists
    const health = snapshot?.data?.health;
    const isOnline = !!health;
    const edgeStatus = isOnline ? 'Online' : 'Offline';
    const edgeTone = isOnline ? 'ok' : 'alert';
    const edgeHint = snapshotError 
      ? snapshotError 
      : (isOnline ? 'Edge reachable' : 'No health telemetry received from edge device.');

    return [
      {
        id: 'edge-link',
        label: 'Edge link',
        value: edgeStatus,
        tone: edgeTone,
        hint: edgeHint
      },
      {
        id: 'pending-requests',
        label: 'Camera requests',
        value: pendingCameraRequests > 99 ? '99+' : pendingCameraRequests,
        tone: pendingCameraRequests > 0 ? 'alert' : 'ok',
        hint: pendingCameraRequests > 0 ? 'Awaiting approval' : 'No pending requests'
      },
      {
        id: 'uptime',
        label: 'Device uptime',
        value: uptimeDisplay,
        tone: Number.isFinite(uptimeHours) ? 'ok' : 'muted',
        hint: Number.isFinite(uptimeHours) ? 'Continuous runtime' : 'Waiting for telemetry'
      }
      // Removed: Admin accounts card
      // {
      //   id: 'admin-users',
      //   label: 'Admin accounts',
      //   value: adminUsers.length,
      //   tone: adminUsers.length > 0 ? 'muted' : 'alert',
      //   hint: adminUsers.length > 0 ? 'Console members' : 'Invite admins'
      // }
    ];
  }, [adminUsers.length, pendingCameraRequests, snapshotError, snapshot?.data?.health, uptimeDisplay, uptimeHours]);

  const renderOverview = () => (
      <section className="panel-section">
        <header className="panel-section__header">
          <div>
            <h2>Cluster overview</h2>
            <p>Live snapshot from edge device services and analytics.</p>
          </div>
          <div className="panel-section__meta">
            <span className="meta-chip">Pi host: {snapshot?.piHost || DEFAULT_PI_HOST}</span>
            <span className="meta-chip">Refreshed {lastUpdated}</span>
          </div>
        </header>

        <div className="admin-highlights">
          {highlightItems.map(item => (
            <article key={item.id} className={`highlight-card highlight-card--${item.tone}`}>
              <span className="highlight-card__label">{item.label}</span>
              <span className="highlight-card__value">{item.value}</span>
              <span className="highlight-card__hint">{item.hint}</span>
            </article>
          ))}
        </div>

        <div className="status-grid">
          {overviewCards.map((card) => (
            <StatusCard
              key={card.key}
              icon={card.icon}
              title={card.title}
              value={card.value}
              tone={card.tone}
              description={card.description}
              footer={card.footer}
            />
          ))}
        </div>

        {healthMetrics.length > 0 && (
          <div className="metrics-bar">
            {healthMetrics.map((metric) => (
              <MetricPill key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
            ))}
          </div>
        )}

      {/* Device Control Actions */}
      <div className="device-controls">
        <div className="device-controls__header">
          <h3>Edge Device Control</h3>
          {/* <p>Manage Raspberry Pi power state</p> */}
        </div>
        
        {deviceActionError && (
          <div className="device-controls__error">
            <span className="device-controls__error-icon">{ICONS.alert}</span>
            {deviceActionError}
          </div>
        )}

        {deviceAction && (
          <div className="device-controls__status">
            <div className="spinner"></div>
            <span>
              {deviceAction === 'shutting-down' 
                ? 'Device is shutting down...' 
                : 'Device is rebooting... (will reconnect in ~1 min)'}
            </span>
          </div>
        )}

        <div className="device-controls__buttons">
          <button
            type="button"
            className="device-control-btn device-control-btn--reboot"
            onClick={handleReboot}
            disabled={deviceAction !== null}
            title="Reboot Raspberry Pi"
          >
            <span className="device-control-btn__icon">{ICONS.restart}</span>
            <div className="device-control-btn__content">
              <span className="device-control-btn__label">Restart Device</span>
              <span className="device-control-btn__hint">Reboot in 5 seconds</span>
            </div>
          </button>

          <button
            type="button"
            className="device-control-btn device-control-btn--shutdown"
            onClick={handleShutdown}
            disabled={deviceAction !== null}
            title="Shutdown Raspberry Pi"
          >
            <span className="device-control-btn__icon">{ICONS.shutdown}</span>
            <div className="device-control-btn__content">
              <span className="device-control-btn__label">Shutdown Device</span>
              <span className="device-control-btn__hint">Power off in 5 seconds</span>
            </div>
          </button>
        </div>
      </div>
    </section>
  );

  const renderSystems = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Edge device services</h2>
          <p>Monitor Edge Device subsystems, power envelope, and inference services.</p>
        </div>
        <button type="button" className="ghost-button" onClick={loadSnapshot}>
          <span className="ghost-button__icon">{ICONS.refresh}</span>
          Refresh snapshot
        </button>
      </header>

      <div className="systems-layout">
        <div className="systems-card">
          <h3>Power &amp; health</h3>
          <div className="systems-card__body">
            <StatusCard
              icon={ICONS.power}
              title="Power rail"
              value={powerStatus.value}
              tone={powerStatus.tone}
              description={powerStatus.description}
              footer={powerStatus.footer}
            />
            {healthMetrics.length > 0 && (
              <div className="systems-metrics">
                {healthMetrics.map((metric) => (
                  <MetricPill key={`health-${metric.label}`} label={metric.label} value={metric.value} hint={metric.hint} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="systems-card">
          <h3>LCD reader</h3>
          <div className="systems-card__body">
            <StatusCard
              icon={ICONS.lcd}
              title="Incubator display"
              value={lcdStatus.value}
              tone={lcdStatus.tone}
              description={lcdStatus.description}
              footer={lcdStatus.footer}
            />
            {snapshot?.data?.lcd?.readings && (
              <div className="lcd-readings">
                {Object.entries(snapshot.data.lcd.readings).map(([key, value]) => {
                  const label = value?.name || key;
                  const display = typeof value === 'object' ? `${value.value ?? '--'}` : value;
                  const confidence = typeof value === 'object' && Number.isFinite(value.ocr_confidence)
                    ? `OCR ${(value.ocr_confidence * 100).toFixed(0)}%`
                    : null;
                  return <MetricPill key={key} label={label} value={display} hint={confidence} />;
                })}
              </div>
            )}
          </div>
        </div>

        <div className="systems-card">
          <h3>Cry pipeline</h3>
          <div className="systems-card__body">
            <StatusCard
              icon={ICONS.cry}
              title="Cry classifier"
              value={cryStatus.value}
              tone={cryStatus.tone}
              description={cryStatus.description}
              footer={cryStatus.footer}
            />
          </div>
        </div>

        <div className="systems-card">
          <h3>Jaundice inference</h3>
          <div className="systems-card__body">
            <StatusCard
              icon={ICONS.jaundice}
              title="Jaundice AI"
              value={jaundiceStatus.value}
              tone={jaundiceStatus.tone}
              description={jaundiceStatus.description}
              footer={jaundiceStatus.footer}
            />
          </div>
        </div>
      </div>
    </section>
  );

  const renderNte = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Neutral Thermal Environment guidance</h2>
          <p>Review the latest incubator tuning suggestions and active baby context.</p>
        </div>
        <button type="button" className="ghost-button" onClick={loadSnapshot}>
          <span className="ghost-button__icon">{ICONS.refresh}</span>
          Pull latest NTE
        </button>
      </header>

      <div className="nte-summary">
        <StatusCard
          icon={ICONS.nte}
          title="NTE status"
          value={nteSummary.headline}
          tone={nteSummary.tone}
          description={nteSummary.body}
        />
        {nteSummary.activeBaby && typeof nteSummary.activeBaby === 'object' && (
          <div className="nte-active">
            <h3>Active baby</h3>
            <dl>
              <div>
                <dt>Baby ID</dt>
                <dd>{nteSummary.activeBaby.baby_id || nteSummary.activeBaby.babyId || nteSummary.activeBaby.baby_name || nteSummary.activeBaby.name || '--'}</dd>
              </div>
              {nteSummary.activeBaby.details?.weight && (
                <div>
                  <dt>Weight</dt>
                  <dd>{nteSummary.activeBaby.details.weight} g</dd>
                </div>
              )}
              {nteSummary.activeBaby.details?.gestation && (
                <div>
                  <dt>Gestation</dt>
                  <dd>{nteSummary.activeBaby.details.gestation}</dd>
                </div>
              )}
              {nteSummary.activeBaby.details?.temperature && (
                <div>
                  <dt>Incubator temp</dt>
                  <dd>{nteSummary.activeBaby.details.temperature} deg C</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {nteSummary.recommendations.length > 0 ? (
        <div className="recommendations-grid">
          {nteSummary.recommendations.map((item, index) => (
            <RecommendationCard key={item?.id || index} item={item} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No active recommendations. NTE engine is monitoring baseline profiles.</p>
        </div>
      )}
    </section>
  );

  const renderAccess = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Parent access pipeline</h2>
          <p>Manage camera permissions and guide staff account provisioning.</p>
        </div>
        <div className="panel-section__actions">
          <button type="button" className="ghost-button" onClick={refreshParentQueue}>
            <span className="ghost-button__icon">{ICONS.refresh}</span>
            Refresh queue
          </button>
          <button type="button" className="ghost-button" onClick={() => navigate('/staff-signup')}>
            Provision staff account
          </button>
        </div>
      </header>

      <StatusCard
        icon={ICONS.access}
        title="Camera access queue"
        value={`${parentQueue.length} request(s)`}
        tone={parentQueue.length > 0 ? 'warning' : 'ok'}
        description={parentQueue.length > 0 ? 'Review pending parent camera access approvals below.' : 'No pending camera access requests.'}
      />

      {parentError && <div className="panel-notice panel-notice--warning">{parentError}</div>}

      {parentQueue.length > 0 ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parent</th>
                <th>Phone</th>
                <th>Baby</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {parentQueue.map((entry) => (
                <tr key={`${entry.parentId}-${entry.timestamp}`}>
                  <td>{entry.parentName || entry.parentId}</td>
                  <td>{entry.phone || '--'}</td>
                  <td>{entry.babyId || '--'}</td>
                  <td>
                    <span className={`status-badge status-badge--${entry.status}`}>
                      {entry.status || 'unknown'}
                    </span>
                  </td>
                  <td>{entry.requestedAt ? formatRelativeTime(entry.requestedAt) : '--'}</td>
                  <td>{entry.updatedAt ? formatRelativeTime(entry.updatedAt) : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>Queue is clear. Parents can request access via the portal when required.</p>
        </div>
      )}
    </section>
  );

  const renderLogs = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Telemetry log</h2>
          <p>Cross-check service responses and error messages captured in the latest snapshot.</p>
        </div>
      </header>

      <div className="logs-grid">
        <div className="logs-column">
          <h3>Service responses</h3>
          {snapshot?.data ? (
            Object.entries(snapshot.data).map(([key, value]) => (
              <div key={key} className="log-entry">
                <strong>{key}</strong>
                <span className="log-entry__status">{value ? 'OK' : 'No payload'}</span>
                {value?.timestamp && <span className="log-entry__timestamp">{formatRelativeTime(value.timestamp)}</span>}
              </div>
            ))
          ) : (
            <p>No services responded.</p>
          )}
        </div>
        <div className="logs-column">
          <h3>Errors</h3>
          {snapshot?.errors && Object.keys(snapshot.errors).length > 0 ? (
            Object.entries(snapshot.errors).map(([key, reason]) => (
              <div key={key} className="log-entry log-entry--error">
                <strong>{key}</strong>
                <span className="log-entry__status">Error</span>
                <span className="log-entry__message">{reason}</span>
              </div>
            ))
          ) : (
            <p>No errors captured in the latest poll.</p>
          )}
        </div>
      </div>
    </section>
  );

  const renderSettings = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Admin preferences</h2>
          <p>Adjust appearance, manage sessions, and reach Pi dashboards.</p>
        </div>
      </header>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>Theme</h3>
          <p>Switch between the bright ward view and low-light theatre mode.</p>
          <button type="button" className="primary-button" onClick={toggleTheme}>
            <span className="primary-button__icon">{theme === 'dark' ? ICONS.sun : ICONS.moon}</span>
            {theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
          </button>
        </div>

        <div className="settings-card">
          <h3>Snapshot</h3>
          <p>Force a refresh outside the automatic 45-second cadence.</p>
          <button type="button" className="outline-button" onClick={loadSnapshot}>
            <span className="outline-button__icon">{ICONS.refresh}</span>
            Refresh now
          </button>
        </div>

        <div className="settings-card">
          <h3>Admin users</h3>
          <p>Create new admin accounts and generate password setup links.</p>
          <div className="button-group">
            <button type="button" className="primary-button" onClick={handleOpenUserModal}>
              <span className="primary-button__icon">{ICONS.userPlus}</span>
              Create admin user
            </button>
            {adminUsers.length > 0 && (
              <button type="button" className="outline-button" onClick={handleToggleUserList}>
                <span className="primary-button__icon">{ICONS.users}</span>
                Manage Users ({adminUsers.length})
              </button>
            )}
          </div>
        </div>

        <div className="settings-card">
          <h3>Staff provisioning</h3>
          <p>Launch the ThingsBoard staff onboarding wizard for new admin or nurse accounts.</p>
          <button type="button" className="outline-button" onClick={() => navigate('/staff-signup')}>
            Go to staff signup
          </button>
        </div>
      </div>
    </section>
  );

  const renderTestDashboard = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Edge Device configuration dashboard</h2>
          <p>Embedded view of the edge-hosted monitoring dashboard (tailscale accessible).</p>
        </div>
        <a className="ghost-button" href={testDashboardUrl} target="_blank" rel="noreferrer">
          Open in new tab
        </a>
      </header>

      <div className="iframe-wrapper">
        <iframe title="Edge Device configuration dashboard" src={testDashboardUrl} allow="fullscreen" />
      </div>
    </section>
  );

  const renderContent = () => {
    switch (section) {
      case 'overview':
        return renderOverview();
      case 'systems':
        return renderSystems();
      case 'nte':
        return renderNte();
      case 'access':
        return renderAccess();
      case 'logs':
        return renderLogs();
      case 'settings':
        return renderSettings();
      case 'test-dashboard':
        return renderTestDashboard();
      default:
        return renderOverview();
    }
  };

  const renderUserModal = () => {
    if (!showUserModal) return null;

    return (
      <div className="modal-overlay" onClick={handleCloseUserModal}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Create Admin User</h2>
            <button type="button" className="modal-close" onClick={handleCloseUserModal} aria-label="Close">
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body">
            {userCreationStatus === 'success' ? (
              <div className="user-success">
                <div className="success-icon">{ICONS.check}</div>
                <h3>User Created Successfully!</h3>
                <p>Send this link to the new admin to set up their password:</p>
                
                <div className="setup-link-container">
                  <input 
                    type="text" 
                    value={createdUserLink} 
                    readOnly 
                    className="setup-link-input"
                    onClick={(e) => e.target.select()}
                  />
                  <button type="button" className="copy-link-button" onClick={handleCopyLink}>
                    {ICONS.copy}
                    Copy Link
                  </button>
                </div>

                <div className="user-details">
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{newUserEmail}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{newUserName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Role:</span>
                    <span className="detail-value">Administrator</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Access:</span>
                    <span className="detail-value">Admin Dashboard Only</span>
                  </div>
                </div>

                <p className="setup-note">
                  <span className="setup-note__icon">{ICONS.alert}</span>
                  The link is valid for 24 hours. The user must set their password before it expires.
                </p>

                <button type="button" className="primary-button" onClick={handleCloseUserModal}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label htmlFor="userEmail">Email Address *</label>
                  <input
                    id="userEmail"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="admin@hospital.com"
                    required
                    disabled={userCreationStatus === 'creating'}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="userName">Full Name *</label>
                  <input
                    id="userName"
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Dr. John Doe"
                    required
                    disabled={userCreationStatus === 'creating'}
                  />
                </div>

                <div className="info-box">
                  <div className="info-box-icon">{ICONS.info}</div>
                  <div className="info-box-content">
                    <strong>Admin Access Only</strong>
                    <p>This user will have access to the Admin Dashboard for device troubleshooting and configuration purposes only.</p>
                  </div>
                </div>

                {creationError && (
                  <div className="error-message">
                    <span className="error-message__icon">{ICONS.alert}</span>
                    {creationError}
                  </div>
                )}

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="outline-button" 
                    onClick={handleCloseUserModal}
                    disabled={userCreationStatus === 'creating'}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="primary-button"
                    disabled={userCreationStatus === 'creating'}
                  >
                    {userCreationStatus === 'creating' ? (
                      <>
                        <span className="spinner-small"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <span className="primary-button__icon">{ICONS.userPlus}</span>
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`admin-panel theme-${theme}`}>
      <header className="admin-header">
        <div className="admin-header__container">
          <div className="admin-brand">
            <div className="admin-brand__emblem">
              <img src={Logo} alt="NICU shield" />
            </div>
            <div className="admin-brand__text">
              <span className="admin-brand__title">National Hospital Galle</span>
              <span className="admin-brand__subtitle">NICU Monitoring Unit - Admin Edge device operations console</span>
            </div>
          </div>

          <div className="admin-header__actions">
            <button type="button" className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? ICONS.sun : ICONS.moon}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={loadSnapshot}
              aria-label="Refresh snapshot"
            >
              {ICONS.refresh}
            </button>
            <button
              type="button"
              className={`icon-button notification-button ${unreadNotificationCount > 0 ? 'has-unread' : ''}`}
              onClick={handleNotificationsToggle}
              aria-label="View notifications"
              aria-expanded={showNotifications}
              disabled={notificationPanelBusy}
            >
              {ICONS.bell}
              {unreadNotificationCount > 0 && (
                <span className="notification-count">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>
            <div className="admin-user">
              <div className="admin-user__avatar">{user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}</div>
              <div className="admin-user__meta">
                <span className="admin-user__name">{user?.name || user?.email || 'Admin user'}</span>
                <span className="admin-user__role">Administrator</span>
              </div>
            </div>
            <button type="button" className="outline-button" onClick={logout}>
              Sign out
            </button>
        </div>
      </div>
    </header>

      {showNotifications && (
        <>
          <div className="notification-overlay" onClick={handleNotificationsClose} />
          <aside className="notification-panel" role="dialog" aria-label="Admin notifications">
            <header className="notification-panel__header">
              <h3>Notifications</h3>
              <button
                type="button"
                className="icon-button notification-panel__close"
                onClick={handleNotificationsClose}
                aria-label="Close notifications"
              >
                {ICONS.close}
              </button>
            </header>
            <div className="notification-panel__body">
              {notificationError && (
                <div className="notification-panel__error" role="alert">
                  {notificationError}
                </div>
              )}
              {notificationsLoading ? (
                <div className="notification-panel__loading">
                  <div className="spinner" aria-hidden="true" />
                  <span>Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <p className="notification-panel__empty">All clear. No notifications yet.</p>
              ) : (
                <ul className="notification-panel__list">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`notification-panel__item notification-panel__item--${notification.severity || 'info'}`}
                    >
                      <div className="notification-panel__item-header">
                        <span className="notification-panel__item-title">
                          {notification.title || 'System notification'}
                        </span>
                        <span className="notification-panel__item-time">
                          {formatRelativeTime(
                            notification.lastTriggeredAt || notification.updatedAt || notification.createdAt
                          )}
                        </span>
                      </div>
                      <p className="notification-panel__item-message">{notification.message}</p>
                      <div className="notification-panel__item-meta">
                        {notification.metadata?.piHost && (
                          <span className="notification-panel__item-tag">Host: {notification.metadata.piHost}</span>
                        )}
                        {notification.count > 1 && (
                          <span className="notification-panel__item-tag">Occurrences: {notification.count}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <footer className="notification-panel__footer">
              <button
                type="button"
                className="ghost-button"
                onClick={handleNotificationRefresh}
                disabled={notificationsLoading}
              >
                <span className="ghost-button__icon">{ICONS.refresh}</span>
                Refresh
              </button>
              {notificationPanelBusy && (
                <span className="notification-panel__status">Updating...</span>
              )}
            </footer>
          </aside>
        </>
      )}

    <div className="admin-layout">
      <AdminSidebar current={section} onSelect={setSection} />

        <main className="admin-content">
          {snapshotLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Contacting edge device services...</p>
            </div>
          ) : (
            <>
              {snapshotError && <div className="panel-notice panel-notice--alert">{snapshotError}</div>}
              {renderContent()}
            </>
          )}
        </main>
      </div>

      {/* User Management Modal */}
      {renderUserModal()}

      {/* User List Modal */}
      {showUserList && (
        <div className="modal-overlay" onClick={handleToggleUserList}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Admin Users</h2>
              <button type="button" className="modal-close" onClick={handleToggleUserList} aria-label="Close">
                {ICONS.close}
              </button>
            </div>

            <div className="modal-body">
              {adminUsersError && (
                <div className="error-message">
                  <span className="error-message__icon">{ICONS.alert}</span>
                  {adminUsersError}
                </div>
              )}
              {adminUsers.length === 0 ? (
                <div className="empty-state">
                  <p>No admin users created yet.</p>
                </div>
              ) : (
                <div className="user-list">
                  {adminUsers.map((user, index) => (
                    <div key={user.email} className="user-list-item">
                      <div className="user-list-item__avatar">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div className="user-list-item__info">
                        <div className="user-list-item__name">{user.name}</div>
                        <div className="user-list-item__email">{user.email}</div>
                        <div className="user-list-item__meta">
                          <span className={`status-badge status-badge--${user.status}`}>
                            {user.status === 'pending' ? (
                              <>
                                <span className="status-icon">{ICONS.pending}</span>
                                Pending Setup
                              </>
                            ) : (
                              <>
                                <span className="status-icon">{ICONS.check}</span>
                                Active
                              </>
                            )}
                          </span>
                          <span className="user-list-item__date">
                            Created: {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="user-list-item__actions">
                        <button
                          type="button"
                          className="delete-user-button"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          aria-label="Delete user"
                          title="Delete user"
                        >
                          {ICONS.trash}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="outline-button" onClick={handleToggleUserList}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;


