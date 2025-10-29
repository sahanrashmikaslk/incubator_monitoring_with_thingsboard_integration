import React, { useEffect, useState } from 'react';
import './CryWidget.css';

const earIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M16 7a4 4 0 10-8 0v3a3 3 0 01-1 2.24A3 3 0 008 18a2 2 0 002 2 2 2 0 002-2v-1.25a2.75 2.75 0 012.75-2.75A1.25 1.25 0 0016 13V7z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const statusIcons = {
  alert: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.1" fill="currentColor" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 12c2.4-4 5-4 8 0s5.6 4 8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4 6c2.4 2.4 5.2 2.4 8 0m0 12c2.8 2.4 5.6 2.4 8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  ),
  calm: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 14s1.5 2 4 2 4-2 4-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" />
    </svg>
  )
};

const CryWidget = ({ data, compact = false }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    let timestamp;

    if (data?.cry_detected && Array.isArray(data.cry_detected) && data.cry_detected.length > 0) {
      timestamp = data.cry_detected[0].ts;
    } else if (data?.timestamp) {
      timestamp = new Date(data.timestamp).getTime();
    }

    if (!timestamp) return;

    const updateTimeAgo = () => {
      const now = Date.now();
      const diffMs = now - timestamp;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) {
        setTimeAgo('just now');
      } else if (diffMins < 60) {
        setTimeAgo(`${diffMins} min${diffMins > 1 ? 's' : ''} ago`);
      } else {
        setTimeAgo(`${diffHours} hour${diffHours > 1 ? 's' : ''} ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000);

    return () => clearInterval(interval);
  }, [data]);

  if (!data || data.status === 'error') {
    return (
      <div className="cry-widget cry-widget--loading">
        <div className="widget-header">
          <div className="widget-title">
            <div className="widget-icon">{earIcon}</div>
            <div className="widget-copy">
              <h3>Cry Detection</h3>
              <p>Voice analytics module</p>
            </div>
          </div>
        </div>
        <div className="loading-content">
          {data?.status === 'error' ? (
            <>
              <div className="glyph glyph-error">!</div>
              <h4>Connection error</h4>
              <p>{data.message || 'Unable to connect to the cry detection service.'}</p>
            </>
          ) : (
            <>
              <div className="spinner"></div>
              <h4>Connecting to cry monitor…</h4>
              <p>Preparing the audio analysis service.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (data.status === 'no_detection') {
    return (
      <div className="cry-widget cry-widget--loading">
        <div className="widget-header">
          <div className="widget-title">
            <div className="widget-icon">{earIcon}</div>
            <div className="widget-copy">
              <h3>Cry Detection</h3>
              <p>Voice analytics module</p>
            </div>
          </div>
        </div>
        <div className="loading-content">
          <div className="glyph glyph-idle">·</div>
          <h4>Listening for first reading</h4>
          <p>Cry detection is active and monitoring ambient audio.</p>
        </div>
      </div>
    );
  }

  const extractValue = (field, defaultValue = 0) => {
    if (!field) return defaultValue;
    if (Array.isArray(field) && field.length > 0) {
      const value = field[0].value;

      if (typeof defaultValue === 'boolean') {
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);
      }

      if (typeof defaultValue === 'number') {
        return typeof value === 'number' ? value : parseFloat(value) || defaultValue;
      }

      return value;
    }
    return defaultValue;
  };

  const isCryDetected = extractValue(data.cry_detected, false);
  const audioLevel = Number(extractValue(data.cry_audio_level, 0));
  const sensitivity = Number(extractValue(data.cry_sensitivity, 0.6));
  const totalDetections = Number(extractValue(data.cry_total_detections, 0));
  const isMonitoring = extractValue(data.cry_monitoring, false);

  const audioLevelPercent = Math.min(audioLevel * 100, 100);

  let lastTimestampLabel = '--';
  if (data.cry_detected && Array.isArray(data.cry_detected) && data.cry_detected.length > 0) {
    lastTimestampLabel = new Date(data.cry_detected[0].ts).toLocaleTimeString();
  } else if (data.timestamp) {
    lastTimestampLabel = new Date(data.timestamp).toLocaleTimeString();
  }

  const status = (() => {
    if (isCryDetected) {
      return {
        variant: 'critical',
        icon: statusIcons.alert,
        title: 'Cry detected',
        subtitle: 'Audio pattern matches cry signature.'
      };
    }
    if (audioLevel > sensitivity) {
      return {
        variant: 'caution',
        icon: statusIcons.activity,
        title: 'Elevated sound levels',
        subtitle: 'Ambient noise is approaching alert threshold.'
      };
    }
    if (!isMonitoring) {
      return {
        variant: 'paused',
        icon: statusIcons.activity,
        title: 'Monitoring paused',
        subtitle: 'Resume to continue listening.'
      };
    }
    return {
      variant: 'normal',
      icon: statusIcons.calm,
      title: 'Baby is calm',
      subtitle: 'Sound levels within the expected range.'
    };
  })();

  const metricBlocks = [];

  if (!compact) {
    metricBlocks.push(
      <div className="metric-item" key="audio">
        <span className="metric-label">Audio Level</span>
        <div className="metric-value-wrapper">
          <span className="metric-value">{audioLevel.toFixed(3)}</span>
          <div className="progress-bar">
            <div
              className={`progress-fill ${isCryDetected ? 'critical' : 'normal'}`}
              style={{ width: `${audioLevelPercent}%` }}
            ></div>
          </div>
          <span className="metric-footnote">Relative amplitude</span>
        </div>
      </div>
    );

    metricBlocks.push(
      <div className="metric-item" key="sensitivity">
        <span className="metric-label">Sensitivity</span>
        <div className="metric-value-wrapper">
          <span className="metric-value">{sensitivity.toFixed(1)}</span>
          <div className="sensitivity-indicator">
            <span className={`indicator-dot ${sensitivity >= 0.8 ? 'high' : sensitivity >= 0.5 ? 'medium' : 'low'}`}></span>
            <span className="indicator-label">
              {sensitivity >= 0.8 ? 'High' : sensitivity >= 0.5 ? 'Medium' : 'Low'}
            </span>
          </div>
        </div>
      </div>
    );

    metricBlocks.push(
      <div className="metric-item" key="detections">
        <span className="metric-label">Detections Today</span>
        <div className="metric-value-wrapper">
          <span className="metric-value metric-emphasis">{totalDetections}</span>
          <span className="metric-footnote">Resets at midnight</span>
        </div>
      </div>
    );
  }

  const showMetrics = metricBlocks.length > 0;

  return (
    <div className={`cry-widget status-${status.variant}`}>
      <div className="widget-header">
        <div className="widget-title">
          <div className="widget-icon">{earIcon}</div>
          <div className="widget-copy">
            <h3>Cry Detection</h3>
            <p>Voice analytics module</p>
          </div>
        </div>
        <div className="widget-actions">
          <div className={`monitoring-badge ${isMonitoring ? 'active' : 'inactive'}`}>
            <span className="pulse-dot" aria-hidden="true"></span>
            <span>{isMonitoring ? 'Monitoring active' : 'Monitoring off'}</span>
          </div>
        </div>
      </div>

      <div className={`status-banner variant-${status.variant}`}>
        <div className="status-icon">{status.icon}</div>
        <div className="status-copy">
          <span className="status-title">{status.title}</span>
          <span className="status-subtitle">{status.subtitle}</span>
        </div>
      </div>

      {showMetrics && (
        <div className="metrics-grid">
          {metricBlocks}
        </div>
      )}

      {isCryDetected && (
        <div className="alert-card">
          <div className="alert-glyph">{statusIcons.alert}</div>
          <div className="alert-copy">
            <strong>Attention required</strong>
            <p>The monitor detected sustained crying. Check on the baby promptly.</p>
          </div>
        </div>
      )}

      {!isMonitoring && (
        <div className="notice-card">
          <div className="notice-glyph">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.1" fill="currentColor" />
            </svg>
          </div>
          <div className="notice-copy">
            <strong>Cry monitoring is off</strong>
            <p>Enable monitoring to receive cry alerts in real time.</p>
          </div>
        </div>
      )}

      <div className="widget-footer">
        <div className="last-check">
          <span className="last-check-label">Last update</span>
          <span className="last-check-value">
            {lastTimestampLabel}
            {timeAgo ? ` • ${timeAgo}` : ''}
          </span>
        </div>
        <div className="auto-detection-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Auto polling every 15 seconds</span>
        </div>
      </div>
    </div>
  );
};

export default CryWidget;
