import React, { useEffect, useState } from 'react';
import './CryWidget.css';

const CryWidget = ({ data }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    // Handle ThingsBoard format where timestamp is in the telemetry data
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
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [data]);

  // Handle no data or error states
  if (!data || data.status === 'error') {
    return (
      <div className="cry-widget loading">
        <div className="widget-header">
          <div className="widget-title">
            <div className="widget-icon">👶</div>
            <h3>Cry Detection</h3>
          </div>
        </div>
        <div className="loading-content">
          {data?.status === 'error' ? (
            <>
              <div style={{ fontSize: '3rem' }}>❌</div>
              <p>Connection Error</p>
              <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
                {data.message || 'Unable to connect to cry detection server'}
              </p>
            </>
          ) : (
            <>
              <div className="spinner"></div>
              <p>Connecting to cry detection server...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Handle "no detection yet" state
  if (data.status === 'no_detection') {
    return (
      <div className="cry-widget loading">
        <div className="widget-header">
          <div className="widget-title">
            <div className="widget-icon">👶</div>
            <h3>Cry Detection</h3>
          </div>
        </div>
        <div className="loading-content">
          <div style={{ fontSize: '3rem' }}>⏳</div>
          <p>Waiting for monitoring data...</p>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
            Cry detection monitors audio continuously
          </p>
        </div>
      </div>
    );
  }

  // Helper function to extract value from ThingsBoard format
  const extractValue = (field, defaultValue = 0) => {
    if (!field) return defaultValue;
    if (Array.isArray(field) && field.length > 0) {
      const value = field[0].value;
      
      // Handle boolean values explicitly
      if (typeof defaultValue === 'boolean') {
        // Convert string "true"/"false" or actual boolean
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);
      }
      
      // Ensure numeric values are actually numbers
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
  
  // Debug logging
  console.log('👶 CryWidget - Raw data:', data);
  console.log('👶 CryWidget - Extracted values:', {
    isCryDetected,
    audioLevel,
    sensitivity,
    totalDetections,
    isMonitoring
  });
  
  // Get timestamp from telemetry data
  let timestamp = '--:--:--';
  if (data.cry_detected && Array.isArray(data.cry_detected) && data.cry_detected.length > 0) {
    timestamp = new Date(data.cry_detected[0].ts).toLocaleTimeString();
  }

  // Determine status color and icon
  const getStatusConfig = () => {
    if (!isMonitoring) {
      return {
        color: 'inactive',
        icon: '⏸️',
        text: 'Monitoring Inactive',
        bgClass: 'status-inactive'
      };
    }
    
    if (isCryDetected) {
      return {
        color: 'critical',
        icon: '🚨',
        text: 'Baby Crying',
        bgClass: 'status-critical cry-active'
      };
    } else {
      return {
        color: 'normal',
        icon: '😴',
        text: 'Baby Quiet',
        bgClass: 'status-normal'
      };
    }
  };

  const status = getStatusConfig();

  // Calculate audio level percentage (assuming max is 1.0)
  const audioLevelPercent = Math.min((audioLevel * 100), 100);

  return (
    <div className={`cry-widget ${status.bgClass}`}>
      {/* Header */}
      <div className="widget-header">
        <div className="widget-title">
          <div className="widget-icon">👶</div>
          <h3>Cry Detection</h3>
        </div>
        {isMonitoring && (
          <div className="monitoring-badge">
            <span className="pulse-dot"></span>
            <span>Active</span>
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className={`status-banner ${status.color}`}>
        <span className="status-icon">{status.icon}</span>
        <span className="status-text">{status.text}</span>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {/* <div className="metric-item"> */}
          {/* <span className="metric-label">Audio Level</span>
          <div className="metric-value-wrapper">
            <span className="metric-value">{audioLevel.toFixed(3)}</span> */}
            {/* <div className="progress-bar">
              <div 
                className={`progress-fill ${isCryDetected ? 'audio-high' : 'audio-normal'}`}
                style={{ width: `${audioLevelPercent}%` }}
              ></div>
            </div> */}
          {/* </div> */}
        {/* </div> */}

        {/* <div className="metric-item">
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
        </div> */}

        {/* <div className="metric-item">
          <span className="metric-label">Total Detections</span>
          <div className="metric-value-wrapper">
            <span className="metric-value detection-count">{totalDetections}</span>
          </div>
        </div> */}

        {/* <div className="metric-item"> */}
          {/* <span className="metric-label">Status</span>
          <div className="metric-value-wrapper">
            <span className={`status-badge ${isMonitoring ? 'active' : 'inactive'}`}>
              {isMonitoring ? '✓ Monitoring' : '✗ Stopped'}
            </span> */}
          {/* </div> */}
        {/* </div> */}
      </div>

      {/* Cry Alert Box */}
      {isCryDetected && (
        <div className="alert-box cry-alert">
          <span className="alert-icon pulse">🚨</span>
          <div className="alert-content">
            <strong>Baby is Crying</strong>
            <p>Immediate attention may be required</p>
          </div>
        </div>
      )}

      {/* Not Monitoring Warning */}
      {!isMonitoring && (
        <div className="warning-box">
          <span className="warning-icon">⚠️</span>
          <div className="warning-content">
            <strong>Monitoring Disabled</strong>
            <p>Cry detection is currently not active. Enable monitoring to receive alerts.</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="widget-footer">
        <div className="last-check">
          <span className="last-check-label">Last update:</span>
          <span className="last-check-value">
            {timestamp} {timeAgo && `• ${timeAgo}`}
          </span>
        </div>
      </div>

      {/* Auto-detection Notice */}
      <div className="auto-detection-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Real-time audio monitoring • Updates every 15 seconds</span>
      </div>
    </div>
  );
};

export default CryWidget;
