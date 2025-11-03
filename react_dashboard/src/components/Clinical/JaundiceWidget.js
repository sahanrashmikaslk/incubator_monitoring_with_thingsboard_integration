import React, { useEffect, useState } from 'react';
import './JaundiceWidget.css';

const dropletIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 3.5c-1.9 2.9-5.5 6.8-5.5 10.1A5.5 5.5 0 0012 19.1a5.5 5.5 0 005.5-5.5c0-3.3-3.6-7.2-5.5-10.1z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.75 15.25a2.25 2.25 0 004.5 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
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
  warning: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 19.5l7.5-15 7.5 15h-15z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="1" fill="currentColor" />
    </svg>
  ),
  clear: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 7c-1.656 0-3 1.567-3 3.5S10.344 14 12 14s3-1.567 3-3.5S13.656 7 12 7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8.75 16.5c1.25 1 2.5 1.5 3.25 1.5s2-.5 3.25-1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
};

const extractValue = (field, defaultValue = 0) => {
  if (!field) return defaultValue;
  if (Array.isArray(field) && field.length > 0) {
    const value = field[0].value;

    if (typeof defaultValue === 'number') {
      return typeof value === 'number' ? value : parseFloat(value) || defaultValue;
    }

    if (typeof defaultValue === 'boolean') {
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return Boolean(value);
    }

    return value;
  }
  return defaultValue;
};

const JaundiceWidget = ({ data, compact = false }) => {
  const [timeAgo, setTimeAgo] = useState('');
  const monitoringActive = extractValue(data?.jaundice_monitoring_active, true);

  useEffect(() => {
    let timestamp;

    if (data?.jaundice_detected && Array.isArray(data.jaundice_detected) && data.jaundice_detected.length > 0) {
      timestamp = data.jaundice_detected[0].ts;
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
      <div className="jaundice-widget jaundice-widget--loading">
        <div className="widget-header">
          <div className="widget-title">
            <div className="widget-icon">{dropletIcon}</div>
            <div className="widget-copy">
              <h3>Jaundice Detection</h3>
              <p>Imaging analytics module</p>
            </div>
          </div>
          <div className="widget-actions">
            <div className={`monitoring-badge ${monitoringActive ? 'active' : 'inactive'}`}>
              <span className="pulse-dot" aria-hidden="true"></span>
              <span>{monitoringActive ? 'Monitoring active' : 'Monitoring paused'}</span>
            </div>
          </div>
        </div>
        <div className="loading-content">
          <div className="glyph glyph-error">!</div>
          <h4>Connection error</h4>
          <p>{data?.message || 'Unable to reach the jaundice detection service.'}</p>
        </div>
      </div>
    );
  }

  if (data.status === 'no_detection') {
    return (
      <div className="jaundice-widget jaundice-widget--loading">
        <div className="widget-header">
          <div className="widget-title">
            <div className="widget-icon">{dropletIcon}</div>
            <div className="widget-copy">
              <h3>Jaundice Detection</h3>
              <p>Imaging analytics module</p>
            </div>
          </div>
          <div className="widget-actions">
            <div className={`monitoring-badge ${monitoringActive ? 'active' : 'inactive'}`}>
              <span className="pulse-dot" aria-hidden="true"></span>
              <span>{monitoringActive ? 'Monitoring active' : 'Monitoring paused'}</span>
            </div>
          </div>
        </div>
        <div className="loading-content">
          <div className="glyph glyph-idle">·</div>
          <h4>Awaiting first scan</h4>
          <p>The camera will analyse the next frame automatically.</p>
        </div>
      </div>
    );
  }

  const isDetected = extractValue(data.jaundice_detected, false);
  const confidence = Number(extractValue(data.jaundice_confidence, 0));
  const probability = Number(extractValue(data.jaundice_probability, 0));
  const brightness = Number(extractValue(data.jaundice_brightness, 0));
  const reliability = Number(extractValue(data.jaundice_reliability, 100));

  let lastTimestampLabel = '--';
  if (data.jaundice_detected && Array.isArray(data.jaundice_detected) && data.jaundice_detected.length > 0) {
    lastTimestampLabel = new Date(data.jaundice_detected[0].ts).toLocaleTimeString();
  } else if (data.timestamp) {
    lastTimestampLabel = new Date(data.timestamp).toLocaleTimeString();
  }

  const status = (() => {
    if (isDetected && probability > 70) {
      return {
        variant: 'critical',
        icon: statusIcons.alert,
        title: 'Jaundice detected',
        subtitle: `Probability at ${probability.toFixed(1)}% indicates high risk.`
      };
    }
    if (isDetected) {
      return {
        variant: 'watch',
        icon: statusIcons.warning,
        title: 'Possible jaundice',
        subtitle: 'Signal detected but below the high-risk threshold.'
      };
    }
    return {
      variant: 'normal',
      icon: statusIcons.clear,
      title: 'No jaundice markers',
      subtitle: 'Skin tone appears within the expected range.'
    };
  })();

  const reliabilityLow = reliability < 80;

  const metricBlocks = [];

  if (!compact) {
    metricBlocks.push(
      <div className="metric-item" key="confidence">
        <span className="metric-label">Confidence</span>
        <div className="metric-value-wrapper">
          <span className="metric-value">{confidence.toFixed(1)}%</span>
          <div className="progress-bar">
            <div
              className={`progress-fill ${isDetected ? 'critical' : 'normal'}`}
              style={{ width: `${Math.min(confidence, 100)}%` }}
            ></div>
          </div>
          <span className="metric-footnote">Model confidence score</span>
        </div>
      </div>
    );

    metricBlocks.push(
      <div className="metric-item" key="probability">
        <span className="metric-label">Probability</span>
        <div className="metric-value-wrapper">
          <span className="metric-value">{probability.toFixed(1)}%</span>
          <div className="progress-bar">
            <div
              className={`progress-fill ${probability > 70 ? 'critical' : 'normal'}`}
              style={{ width: `${Math.min(probability, 100)}%` }}
            ></div>
          </div>
          <span className="metric-footnote">Detection probability</span>
        </div>
      </div>
    );

    metricBlocks.push(
      <div className="metric-item" key="brightness">
        <span className="metric-label">Brightness</span>
        <div className="metric-value-wrapper">
          <span className="metric-value">{brightness.toFixed(1)}</span>
          <span className="metric-footnote">Average scene brightness</span>
        </div>
      </div>
    );

    metricBlocks.push(
      <div className="metric-item" key="reliability">
        <span className="metric-label">Reliability</span>
        <div className="metric-value-wrapper">
          <span className="metric-value">{reliability.toFixed(0)}%</span>
          <span className="metric-footnote">Lighting quality index</span>
        </div>
      </div>
    );
  }

  const showMetrics = metricBlocks.length > 0;

  return (
    <div className={`jaundice-widget status-${status.variant}`}>
      <div className="widget-header">
        <div className="widget-title">
          <div className="widget-icon">{dropletIcon}</div>
          <div className="widget-copy">
            <h3>Jaundice Detection</h3>
            <p>Imaging analytics module</p>
          </div>
        </div>
        <div className="widget-actions">
          <div className={`monitoring-badge ${monitoringActive ? 'active' : 'inactive'}`}>
            <span className="pulse-dot" aria-hidden="true"></span>
            <span>{monitoringActive ? 'Monitoring active' : 'Monitoring paused'}</span>
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

      {reliabilityLow && (
        <div className="notice-card">
          <div className="notice-glyph">{statusIcons.warning}</div>
          <div className="notice-copy">
            <strong>Low light conditions detected</strong>
            <p>Improve ambient lighting to increase detection reliability.</p>
          </div>
        </div>
      )}

      {isDetected && (
        <div className="alert-card">
          <div className="alert-glyph">{statusIcons.alert}</div>
          <div className="alert-copy">
            <strong>Review required</strong>
            <p>Flag this observation for clinical review and repeat the scan shortly.</p>
          </div>
        </div>
      )}

      <div className="widget-footer">
        <div className="last-check">
          <span className="last-check-label">Last scan</span>
          <span className="last-check-value">
            {lastTimestampLabel}
            {timeAgo ? ` • ${timeAgo}` : ''}
          </span>
        </div>
        <div className="auto-detection-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.5 12a9.5 9.5 0 0118.9 0 9.5 9.5 0 01-18.9 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 7v5l3 1.5" />
          </svg>
          <span>Auto-detection every 10 minutes</span>
        </div>
      </div>
    </div>
  );
};

export default JaundiceWidget;








