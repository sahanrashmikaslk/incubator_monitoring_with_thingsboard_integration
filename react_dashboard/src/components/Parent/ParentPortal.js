import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LiveCameraFeed from "../LiveCameraFeed/LiveCameraFeed";
import Logo from "../../images/logo.png";
import parentService from "../../services/parent.service";
import "./ParentPortal.css";

const coerceTimestamp = (value) => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return NaN;
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) {
        return numeric > 1e12 ? numeric : numeric * 1000;
      }
    }
    let candidate = trimmed;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      candidate = trimmed.replace(' ', 'T');
      if (!candidate.includes(':', candidate.indexOf('T'))) {
        candidate += ':00';
      }
      if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(candidate)) {
        candidate += 'Z';
      }
    }
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : NaN;
  }
  return NaN;
};

function ParentPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("clinicalTheme") === "dark" ? "dark" : "light";
  });
  const [messages, setMessages] = useState([]);
  const [careTips, setCareTips] = useState([]);
  const [showMessages, setShowMessages] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [lastViewedMessagesAt, setLastViewedMessagesAt] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = window.localStorage.getItem('parentMessagesLastViewed');
    const parsed = stored ? parseInt(stored, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const messageListRef = useRef(null);
  const messagesRef = useRef([]);
  const safeLastViewedMessagesAt = Number.isFinite(lastViewedMessagesAt) ? lastViewedMessagesAt : 0;

  const normalizeTimestamp = useCallback((value) => {
    const millis = coerceTimestamp(value);
    return Number.isFinite(millis) ? millis : Date.now();
  }, []);

  const formatTimestamp = useCallback((timestamp) => {
    if (!Number.isFinite(timestamp)) return '--';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  }, []);

  const composeMessage = useCallback((record, overrideUnread) => {
    const senderType = (record.senderType || record.sender_type || '').toLowerCase();
    const fallbackIdParts = [
      record.id,
      record.messageId,
      record.babyId || record.baby_id,
      record.senderId || record.sender_id,
      record.senderType || record.sender_type,
      record.createdAt || record.created_at,
      record.content
    ].filter(Boolean);
    const messageId = fallbackIdParts.length > 0 ? fallbackIdParts.join('|') : `synthetic-${Date.now()}`;
    const rawMillis = coerceTimestamp(record.createdAt ?? record.created_at);
    let createdAt = Number.isFinite(rawMillis) ? rawMillis : null;

    if (!Number.isFinite(createdAt)) {
      const previous = messagesRef.current.find(message => message.id === messageId);
      if (previous && Number.isFinite(previous.createdAt)) {
        createdAt = previous.createdAt;
      } else {
        createdAt = Date.now();
      }
    }

    const backendUnread = record.unread === true || record.unread === 'true' || record.unread === 1 || record.unread === '1';
    const inferredUnread = senderType !== 'parent' && createdAt > safeLastViewedMessagesAt;
    const unread = typeof overrideUnread === 'boolean'
      ? overrideUnread
      : (backendUnread || inferredUnread);

    return {
      id: messageId,
      babyId: record.babyId || record.baby_id,
      senderType,
      senderName: record.senderName
        || record.sender_name
        || (senderType === 'parent' ? (user?.name || 'You') : 'Care team'),
      content: record.content,
      createdAt,
      formattedTime: formatTimestamp(createdAt),
      unread
    };
  }, [formatTimestamp, normalizeTimestamp, safeLastViewedMessagesAt, user?.name]);

  const piHost = process.env.REACT_APP_PI_HOST || "100.89.162.22";
  const cameraPort = process.env.REACT_APP_CAMERA_PORT || "8080";
  const cameraUrl = `http://${piHost}:${cameraPort}/?action=stream`;
  const [streamUrl, setStreamUrl] = useState(null);
  const [cameraAccess, setCameraAccess] = useState({
    status: parentService.hasBackend ? 'revoked' : 'granted',
    pendingRequest: false,
    requestedAt: null,
    updatedAt: null
  });
  const [cameraAccessError, setCameraAccessError] = useState('');
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState('');

  const effectiveCameraUrl = streamUrl || cameraUrl;
  const accessEnabled = cameraAccess.status === 'granted';

  const statusMessaging = useMemo(() => {
    if (accessEnabled) {
      return {
        headline: "Secure connection active",
        description: "You can view the live stream and follow updates from the medical team."
      };
    }

    if (cameraAccess.pendingRequest) {
      return {
        headline: "Waiting for live view approval",
        description: "We notified the NICU team. They will enable your access shortly."
      };
    }

    return {
      headline: "Live view requires approval",
      description: "Request permission from the NICU team to unlock the live camera stream."
    };
  }, [accessEnabled, cameraAccess.pendingRequest]);

  const requestedAtLabel = useMemo(() => {
    if (!cameraAccess.requestedAt) return '';
    const date = new Date(cameraAccess.requestedAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  }, [cameraAccess.requestedAt]);

  const previousAccessStatus = useRef(cameraAccess.status);

  const refreshCameraAccess = useCallback(async () => {
    if (!parentService.hasBackend) {
      setCameraAccess({
        status: 'granted',
        pendingRequest: false,
        requestedAt: null,
        updatedAt: null
      });
      setCameraAccessError('');
      return;
    }

    if (!user?.token) {
      setCameraAccess(current => ({
        ...current,
        status: 'revoked',
        pendingRequest: false
      }));
      return;
    }

    try {
      const record = await parentService.fetchCameraAccessStatus(user.token);
      setCameraAccess({
        status: record.status || 'revoked',
        pendingRequest: Boolean(record.pendingRequest),
        requestedAt: record.requestedAt || null,
        updatedAt: record.updatedAt || null
      });
      setRequestFeedback(record.pendingRequest ? 'Request pending approval' : '');
      setCameraAccessError('');
    } catch (error) {
      setCameraAccessError(error.message || 'Unable to verify camera access.');
    }
  }, [user?.token]);

  useEffect(() => {
    refreshCameraAccess();

    if (!parentService.hasBackend || !user?.token) {
      return undefined;
    }

    const interval = setInterval(() => {
      refreshCameraAccess();
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshCameraAccess, user?.token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("clinicalTheme", theme);
    document.body.dataset.clinicalTheme = theme;
  }, [theme]);

  useEffect(() => {
    if (!showMessages) return;
    if (!messageListRef.current) return;
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, showMessages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!showMessages) return;

    const latestTimestamp = messages.reduce((latest, message) => {
      const timestamp = typeof message.createdAt === 'number'
        ? message.createdAt
        : normalizeTimestamp(message.createdAt);
      return Math.max(latest, timestamp, safeLastViewedMessagesAt);
    }, safeLastViewedMessagesAt);

    if (latestTimestamp > safeLastViewedMessagesAt) {
      setLastViewedMessagesAt(latestTimestamp);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('parentMessagesLastViewed', String(latestTimestamp));
      }
    }

    const hasUnreadFromClinician = messages.some(message => {
      const senderType = (message.senderType || '').toLowerCase();
      return senderType !== 'parent' && message.unread;
    });

    if (hasUnreadFromClinician) {
      setMessages(prev => {
        const updated = prev.map(message => {
          const senderType = (message.senderType || '').toLowerCase();
          return senderType !== 'parent' && message.unread
            ? { ...message, unread: false }
            : message;
        });
        messagesRef.current = updated;
        return updated;
      });
    }
  }, [messages, showMessages, normalizeTimestamp, safeLastViewedMessagesAt]);


  const loadMessages = useCallback(async () => {
    try {
      const records = await parentService.fetchMessages(user?.token);
      return (records || [])
        .map(record => composeMessage(record))
        .sort((a, b) => a.createdAt - b.createdAt);
    } catch (error) {
      console.error("Failed to load parent messages:", error);
      throw error;
    }
  }, [composeMessage, user?.token]);
  useEffect(() => {
    let isMounted = true;

    const hydrateMessages = async () => {
        try {
          const normalized = await loadMessages();
          if (!isMounted) return;
          const existingById = new Map(
            (messagesRef.current || []).map(entry => [entry.id, entry])
          );
          const merged = normalized.map(entry => {
            if (!entry) return entry;
            if (typeof entry.createdAt !== 'number' || entry.createdAt <= 0) {
              const persisted = existingById.get(entry.id);
              if (persisted && Number.isFinite(persisted.createdAt) && persisted.createdAt > 0) {
                return {
                  ...entry,
                  createdAt: persisted.createdAt,
                  formattedTime: formatTimestamp(persisted.createdAt)
                };
              }
              const synthetic = Date.now();
              return {
                ...entry,
                createdAt: synthetic,
                formattedTime: formatTimestamp(synthetic)
              };
            }
            return entry;
          });
          setMessages(merged);
          messagesRef.current = merged;
        setMessageError('');
      } catch (error) {
        if (!isMounted) return;
        setMessageError(error.message || "Unable to load messages right now.");
      }
    };

    const hydrateCareTips = async () => {
      try {
        const tips = await parentService.fetchCareTips();
        if (!isMounted) return;
        const decorated = tips.map(tip => {
          let icon = tip.icon;
          if (!icon || icon.length > 2) {
            switch (tip.icon) {
              case "KC":
                icon = "KC";
                break;
              case "HH":
                icon = "HH";
                break;
              case "SR":
                icon = "SR";
                break;
              default:
                icon = "TIP";
            }
          }
          return { ...tip, icon };
        });
        setCareTips(decorated);
      } catch (error) {
        console.error("Failed to load parent care tips:", error);
      }
    };

    hydrateMessages();
    const interval = setInterval(hydrateMessages, 30000);
    hydrateCareTips();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadMessages]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };


  const unreadCount = useMemo(() => {
    return messages.reduce((total, message) => {
      const senderType = (message.senderType || '').toLowerCase();
      const messageTimestamp = typeof message.createdAt === 'number'
        ? message.createdAt
        : normalizeTimestamp(message.createdAt);
      const inferredUnread = senderType !== 'parent' && messageTimestamp > safeLastViewedMessagesAt;
      return total + ((message.unread || inferredUnread) ? 1 : 0);
    }, 0);
  }, [messages, normalizeTimestamp, safeLastViewedMessagesAt]);

  const handleToggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));

  const handleRequestCameraAccess = async () => {
    if (!parentService.hasBackend) {
      setCameraAccess({
        status: 'granted',
        pendingRequest: false,
        requestedAt: null,
        updatedAt: new Date().toISOString()
      });
      setRequestFeedback('Preview mode: live view already enabled.');
      setCameraAccessError('');
      return;
    }

    if (!user?.token) {
      setCameraAccessError('Please sign in again to request access.');
      return;
    }

    if (requestingAccess) {
      return;
    }

    if (cameraAccess.pendingRequest) {
      setRequestFeedback('Request pending approval');
      return;
    }

    setRequestFeedback('');
    setCameraAccessError('');
    setRequestingAccess(true);

    try {
      const record = await parentService.requestCameraAccess(user.token);
      setCameraAccess({
        status: record.status || cameraAccess.status,
        pendingRequest: Boolean(record.pendingRequest),
        requestedAt: record.requestedAt || null,
        updatedAt: record.updatedAt || null
      });
      setRequestFeedback(
        record.alreadyPending ? 'Request already pending approval' : 'Request sent to the NICU team'
      );
    } catch (error) {
      setCameraAccessError(error.message || 'Unable to submit request.');
    } finally {
      setRequestingAccess(false);
    }
  };

  useEffect(() => {
    if (!accessEnabled) {
      setStreamUrl(null);
      return undefined;
    }

    let mounted = true;
    const fetchToken = async () => {
      try {
        if (!parentService.hasBackend) return;
        const resp = await parentService.requestStreamToken(user?.token);
        if (!mounted) return;
        if (resp && resp.url) {
          setStreamUrl(resp.url);
        } else {
          setStreamUrl(null);
        }
      } catch (err) {
        console.warn('Failed to obtain stream token', err);
        if (mounted) setStreamUrl(null);
      }
    };

    fetchToken();
    const interval = setInterval(fetchToken, 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user?.token, accessEnabled]);

  useEffect(() => {
    if (cameraAccess.status === previousAccessStatus.current) {
      return;
    }

    if (cameraAccess.status === 'granted' && previousAccessStatus.current !== 'granted') {
      setStreamKey(Date.now());
      setRequestFeedback('');
    }

    previousAccessStatus.current = cameraAccess.status;
  }, [cameraAccess.status]);
  const handleOpenMessages = () => {
    setShowMessages(true);
    const now = Date.now();
    setLastViewedMessagesAt(now);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('parentMessagesLastViewed', String(now));
    }
    setMessages(prev => {
      const updated = prev.map(message => {
        const senderType = (message.senderType || '').toLowerCase();
        return senderType !== 'parent' ? { ...message, unread: false } : message;
      });
      messagesRef.current = updated;
      return updated;
    });
  };
  const handleCloseMessages = () => setShowMessages(false);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    setMessageError('');
    const body = newMessage.trim();
    if (!body) return;
    setSendingMessage(true);

    try {
      const response = await parentService.sendMessage({
        content: body,
        token: user?.token
      });
      const composed = composeMessage({
        ...response,
        senderType: response.senderType || 'parent',
        senderName: response.senderName || user?.name || 'You'
      }, false);
      setMessages(prev => {
        const next = [...prev, composed];
        messagesRef.current = next;
        return next;
      });
      setNewMessage('');
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessageError(error.message || "Unable to send your message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className={`parent-dashboard theme-${theme}`}>
      {showMessages && (
        <div className="message-overlay" role="dialog" aria-modal="true" aria-labelledby="parentMessagesTitle">
          <div className="message-panel">
            <div className="message-panel-header">
              <div>
                <h3 id="parentMessagesTitle">Updates from the care team</h3>
                <p>Conversations between your family and the NICU appear here. New messages will alert you instantly.</p>
              </div>
              <button
                type="button"
                className="icon-button close"
                onClick={handleCloseMessages}
                aria-label="Close messages"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overlay-message-list" ref={messageListRef}>
              {messages.map(message => (
                <article
                  key={message.id}
                  className={`overlay-message ${message.senderType} ${message.unread ? "unread" : ""}`}
                >
                  <div className="message-meta">
                    <span className="message-author">
                      {message.senderName || (message.senderType === 'parent' ? 'You' : 'Care team')}
                    </span>
                    <span className="message-time">{message.formattedTime}</span>
                  </div>
                  <p className="message-content">{message.content}</p>
                </article>
              ))}
              {messages.length === 0 && (
                <p className="overlay-empty">
                  No messages yet. The care team will post updates here as soon as they are available.
                </p>
              )}
            </div>

            <form className="message-composer" onSubmit={handleSendMessage}>
              {messageError && (
                <div className="message-error" role="alert">
                  {messageError}
                </div>
              )}
              <textarea
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder="Send a note to the care team..."
                rows={3}
                maxLength={500}
                disabled={sendingMessage}
              />
              <button type="submit" className="btn-primary" disabled={sendingMessage || !newMessage.trim()}>
                {sendingMessage ? 'Sending...' : 'Send message'}
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="parent-header">
        <div className="nav-container">
          <div className="brand-block">
            <div className="brand-emblem" aria-label="National Hospital Galle NICU">
              <img src={Logo} alt="National Hospital Galle NICU logo" />
            </div>
            <div className="brand-text">
              <span className="brand-name">National Hospital Galle</span>
              <span className="brand-sub">NICU Monitoring Unit - Parent Portal</span>
            </div>
          </div>

          <div className="nav-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Toggle theme"
              aria-pressed={theme === "dark"}
              onClick={handleToggleTheme}
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M18.364 18.364l-1.414-1.414M7.05 7.05 5.636 5.636M12 7a5 5 0 100 10 5 5 0 000-10z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              className={`icon-button message-button ${unreadCount > 0 ? 'has-unread' : ''}`}
              aria-label="View messages"
              aria-haspopup="dialog"
              aria-expanded={showMessages}
              onClick={handleOpenMessages}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {unreadCount > 0 && <span className="message-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            <div className="user-pill">
              <span className="user-avatar">{user?.name?.charAt(0) || "P"}</span>
              <div className="user-meta">
                <span className="user-name">{user?.name || "Parent"}</span>
                <span className="user-role">Parent access</span>
              </div>
            </div>
            <button type="button" className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="parent-main">
        <section className="status-banner">
          <div className="status-left">
            <span className={`status-dot ${accessEnabled ? "online" : cameraAccess.pendingRequest ? "pending" : "offline"}`} />
            <div>
              <h2>{statusMessaging.headline}</h2>
              <p>
                {statusMessaging.description}
                {cameraAccessError ? ` ${cameraAccessError}` : ''}
              </p>
              {!accessEnabled && cameraAccess.pendingRequest && requestedAtLabel && (
                <p className="status-subtext">Request logged at {requestedAtLabel}</p>
              )}
              {requestFeedback && accessEnabled && (
                <p className="status-subtext">{requestFeedback}</p>
              )}
            </div>
          </div>
          <div className="status-actions">
            <button
              type="button"
              className={`btn-primary status-messages-button ${unreadCount > 0 ? 'has-unread' : ''}`}
              onClick={handleOpenMessages}
            >
              <span className="button-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>Care team messages</span>
              {unreadCount > 0 && <span className="message-pill">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
          </div>
        </section>

        <section className="content-grid">
          <div className="video-card">
            <div className="video-card-header">
              <div className="video-card-title">
                <span className="video-card-label">Live monitoring</span>
                <h3>Baby camera feed</h3>
              </div>
              <div className="video-card-actions">
                {accessEnabled ? (
                  <span className="camera-access-pill granted">Live view enabled</span>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary camera-permission-button"
                    onClick={handleRequestCameraAccess}
                    disabled={requestingAccess || cameraAccess.pendingRequest}
                  >
                    {cameraAccess.pendingRequest ? 'Request pending' : requestingAccess ? 'Sending...' : 'Request live view'}
                  </button>
                )}
              </div>
            </div>

            {accessEnabled ? (
              <LiveCameraFeed
                key={streamKey}
                deviceId="INC-001"
                cameraUrl={effectiveCameraUrl}
                title="Baby camera feed"
                showControls={false}
                headerActions={<span className="camera-access-pill granted">Parent access enabled</span>}
                onSnapshot={() => {}}
              />
            ) : (
              <div className={`camera-locked-panel ${cameraAccess.pendingRequest ? 'pending' : 'revoked'}`}>
                <div className="lock-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                    <path d="M12 15v2" />
                    <circle cx="12" cy="14" r="1" />
                  </svg>
                </div>
                <h4>{cameraAccess.pendingRequest ? 'Awaiting clinical approval' : 'Live view locked'}</h4>
                <p>
                  {cameraAccess.pendingRequest
                    ? 'The NICU team will enable your stream when they approve the request.'
                    : 'Ask the NICU team for permission to unlock the live view.'}
                </p>
                {cameraAccess.pendingRequest && requestedAtLabel && (
                  <span className="panel-meta">Requested at {requestedAtLabel}</span>
                )}
                {!cameraAccess.pendingRequest && (
                  <button
                    type="button"
                    className="btn-secondary camera-permission-button"
                    onClick={handleRequestCameraAccess}
                    disabled={requestingAccess}
                  >
                    {requestingAccess ? 'Sending...' : 'Request access'}
                  </button>
                )}
                {cameraAccessError && (
                  <span className="panel-error" role="alert">
                    {cameraAccessError}
                  </span>
                )}
                {requestFeedback && !accessEnabled && (
                  <span className="panel-note">{requestFeedback}</span>
                )}
              </div>
            )}
          </div>

          <article className="card care-card">
            <header>
              <h3>Care guidance</h3>
              <p>Helpful pointers curated by the NICU team for families of INC-001.</p>
            </header>
            <div className="tips-grid">
              {careTips.map(tip => (
                <div key={tip.id} className="tip-item">
                  <div className="tip-icon" aria-hidden="true">
                    {tip.icon}
                  </div>
                  <div className="tip-content">
                    <h4>{tip.title}</h4>
                    <p>{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>

      <footer className="parent-footer">
        <span>For urgent matters, contact the nursing station directly.</span>
        <span>NICU Monitor - INC-001</span>
      </footer>
    </div>
  );
}

export default ParentPortal;
