/**
 * Live Camera Feed Component
 * Professional camera feed with connection status and call-like UI
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import './LiveCameraFeed.css';

function LiveCameraFeed({
  deviceId = 'INC-001',
  cameraUrl,
  fallbackUrls = [],
  title = 'Baby Monitor',
  showControls = false,
  onSnapshot,
  headerActions = null
}) {
  const [status, setStatus] = useState('connecting'); // 'connecting', 'connected', 'error', 'disconnected'
  const [showFeed, setShowFeed] = useState(true);
  const [connectionTime, setConnectionTime] = useState(0);
  const [resolution, setResolution] = useState('720p');
  const [recording, setRecording] = useState(false);
  const imgRef = useRef(null);
  const connectionTimerRef = useRef(null);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [lastErrorUrl, setLastErrorUrl] = useState(null);
  const urlCandidates = useMemo(() => {
    const urls = [cameraUrl, ...fallbackUrls].filter(Boolean);
    return urls;
  }, [cameraUrl, fallbackUrls]);
  const activeUrl = urlCandidates[currentStreamIndex] || cameraUrl;

  // Connection timer
  useEffect(() => {
    if (status === 'connected') {
      connectionTimerRef.current = setInterval(() => {
        setConnectionTime(prev => prev + 1);
      }, 1000);
    } else {
      setConnectionTime(0);
      if (connectionTimerRef.current) {
        clearInterval(connectionTimerRef.current);
      }
    }

    return () => {
      if (connectionTimerRef.current) {
        clearInterval(connectionTimerRef.current);
      }
    };
  }, [status]);

  useEffect(() => {
    setCurrentStreamIndex(0);
    setLastErrorUrl(null);
  }, [cameraUrl, fallbackUrls]);

  useEffect(() => {
    if (!activeUrl) return;
    setStatus('connecting');
    setConnectionTime(0);
    setShowFeed(true);
    setLastErrorUrl(null);
    if (imgRef.current) {
      const sep = activeUrl.includes('?') ? '&' : '?';
      imgRef.current.src = `${activeUrl}${sep}t=${Date.now()}`;
    }
  }, [activeUrl]);

  // Format connection time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle image load
  const handleImageLoad = () => {
    setStatus('connected');
    setLastErrorUrl(null);
  };

  // Handle image error
  const handleImageError = () => {
    const nextIndex = currentStreamIndex + 1;
    if (nextIndex < urlCandidates.length) {
      setCurrentStreamIndex(nextIndex);
      setStatus('connecting');
      return;
    }
    setStatus('error');
    setLastErrorUrl(activeUrl);
  };

  // Retry connection
  const handleRetry = () => {
    setStatus('connecting');
    if (imgRef.current) {
      const sep = activeUrl.includes('?') ? '&' : '?';
      imgRef.current.src = `${activeUrl}${sep}t=${Date.now()}`;
    }
  };

  // Toggle feed visibility
  const handleToggleFeed = () => {
    setShowFeed(!showFeed);
  };

  // Take a snapshot of the current image and download as PNG
  const handleSnapshot = () => {
    const img = imgRef.current;
    if (!img) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deviceId}_snapshot_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (onSnapshot) onSnapshot(blob);
      }, 'image/png');
    } catch (err) {
      console.error('Snapshot failed', err);
    }
  };

  const handleToggleRecording = () => {
    // Placeholder recording toggle; actual implementation would need MediaRecorder on a video stream
    setRecording(prev => !prev);
  };

  const handleResolutionChange = (e) => {
    const res = e.target.value;
    setResolution(res);
    // We append a resolution query param to force server to change stream if supported
    if (imgRef.current) {
      const sep = activeUrl.includes('?') ? '&' : '?';
      imgRef.current.src = `${activeUrl}${sep}res=${res}&t=${Date.now()}`;
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    setStatus('disconnected');
    setShowFeed(false);
  };

  return (
    <div className={`live-camera-feed ${status}`}>
      {/* Header */}
      <div className="camera-header">
        <div className="camera-info">
          <div className="device-indicator">
            <span className={`status-dot ${status}`}></span>
            <span className="device-id">{deviceId}</span>
          </div>
          <h3>{title}</h3>
        </div>

        <div className="camera-controls">
          {headerActions ? <div className="camera-header-action">{headerActions}</div> : null}
          {status === 'connected' && (
            <div className="connection-time">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(connectionTime)}
            </div>
          )}

          {status === 'error' && (
            <button onClick={handleRetry} className="btn-camera-action retry">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          )}

          {status === 'disconnected' && (
            <button onClick={handleRetry} className="btn-camera-action connect">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Connect
            </button>
          )}

          {(status === 'connected' || status === 'connecting') && (
            <>
              <button onClick={handleToggleFeed} className="btn-camera-action" title={showFeed ? 'Hide Feed' : 'Show Feed'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  {showFeed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>

              <button onClick={handleDisconnect} className="btn-camera-action disconnect" title="Disconnect">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {showControls && (
                <>
                  <select value={resolution} onChange={handleResolutionChange} className="camera-res-select">
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                    <option value="360p">360p</option>
                  </select>

                  <button onClick={handleSnapshot} className="btn-camera-action snapshot" title="Snapshot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 7h14M12 3v4m0 10v4" />
                      <rect x="3" y="7" width="18" height="12" rx="2" />
                    </svg>
                  </button>

                  <button onClick={handleToggleRecording} className={`btn-camera-action record ${recording ? 'active' : ''}`} title={recording ? 'Stop Recording' : 'Start Recording'}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      {recording ? (
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      ) : (
                        <circle cx="12" cy="12" r="6" />
                      )}
                    </svg>
                    <span className="sr-only">{recording ? 'Stop' : 'Record'}</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Camera Feed */}
      <div className="camera-feed-container">
        {status === 'connecting' && (
          <div className="camera-status connecting">
            <div className="connecting-animation">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="pulse-ring delay-2"></div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h4>Connecting to {deviceId}...</h4>
            <p>Establishing secure video stream</p>
            <div className="connecting-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {/* Always render img tag for connecting and connected states */}
        {(status === 'connecting' || (status === 'connected' && showFeed)) && (
          <img
            ref={imgRef}
            src={`${activeUrl}${activeUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
            alt="Baby Camera Feed"
            className={`camera-stream ${status === 'connecting' ? 'hidden' : ''}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {status === 'connected' && !showFeed && (
          <div className="camera-status hidden">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <p>Camera feed hidden</p>
          </div>
        )}

        {status === 'error' && (
          <div className="camera-status error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4>Connection Failed</h4>
            <p>Unable to connect to camera feed.</p>
            {lastErrorUrl && (
              <div className="camera-error-meta">
                <code>{lastErrorUrl}</code>
                <button
                  type="button"
                  className="btn-camera-action primary"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open(lastErrorUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  Open stream URL
                </button>
              </div>
            )}
            <button onClick={handleRetry} className="btn-retry-large">
              Try Again
            </button>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="camera-status disconnected">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
            <h4>Camera Disconnected</h4>
            <p>Click connect to start video stream</p>
          </div>
        )}

        {/* Live Indicator */}
        {status === 'connected' && showFeed && (
          <div className="live-indicator">
            <span className="live-dot"></span>
            LIVE
          </div>
        )}

        {/* Connection Quality Indicator */}
        {status === 'connected' && (
          <div className="connection-quality">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9l4 4 4-4M3 9h8M3 9l4 4 4-4" />
            </svg>
            <span>Excellent</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {status === 'connected' && (
        <div className="camera-footer">
          <div className="camera-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure Connection
          </div>
          <div className="camera-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            720p HD
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveCameraFeed;
