import React, { useEffect, useState } from 'react';
import './JaundiceWidget.css';

const JaundiceWidget = ({ data, onDetectNow, detecting }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    // Handle ThingsBoard format where timestamp is in the telemetry data
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
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [data]);

  // Handle no data or error states
  if (!data || data.status === 'error') {
    return (
      <div className="jaundice-widget loading">
        <div className="widget-header">
          <div className="widget-title">
            <div className="widget-icon">🩺</div>
            <h3>Jaundice Detection</h3>
          </div>
        </div>
        <div className="loading-content">
          {data?.status === 'error' ? (
            <>
              <div style={{ fontSize: '3rem' }}>❌</div>
              <p>Connection Error</p>
              <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
                {data.message || 'Unable to connect to jaundice detection server'}
              </p>
            </>
          ) : (
            <>
              <div className="spinner"></div>
              <p>Connecting to jaundice detection server...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Handle "no detection yet" state
  if (data.status === 'no_detection') {
    return (
      <div className="jaundice-widget loading">
        <div className="widget-header">
          <div className="widget-title">
            <div className="widget-icon">🩺</div>
            <h3>Jaundice Detection</h3>
          </div>
        </div>
        <div className="loading-content">
          <div style={{ fontSize: '3rem' }}>⏳</div>
          <p>Waiting for first detection...</p>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
            Auto-detection runs every 10 minutes
          </p>
        </div>
        <div className="widget-footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <button 
            className="btn-detect-now"
            onClick={onDetectNow}
            disabled={detecting}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {detecting ? (
              <>
                <span className="spinner-small"></span>
                Detecting...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Detect Now
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Helper function to extract value from ThingsBoard format
  const extractValue = (field, defaultValue = 0) => {
    if (!field) return defaultValue;
    if (Array.isArray(field) && field.length > 0) {
      const value = field[0].value;
      // Ensure numeric values are actually numbers
      if (typeof defaultValue === 'number') {
        return typeof value === 'number' ? value : parseFloat(value) || defaultValue;
      }
      return value;
    }
    return defaultValue;
  };

  const isDetected = extractValue(data.jaundice_detected, false);
  const confidence = Number(extractValue(data.jaundice_confidence, 0)); // Ensure it's a number
  const probability = Number(extractValue(data.jaundice_probability, 0)); // Ensure it's a number
  const brightness = Number(extractValue(data.jaundice_brightness, 0));
  const reliability = Number(extractValue(data.jaundice_reliability, 100)); // Ensure it's a number
  const detectionStatus = extractValue(data.jaundice_status, 'Unknown');
  
  // Get timestamp from telemetry data
  let timestamp = '--:--:--';
  if (data.jaundice_detected && Array.isArray(data.jaundice_detected) && data.jaundice_detected.length > 0) {
    timestamp = new Date(data.jaundice_detected[0].ts).toLocaleTimeString();
  }

  // Determine status color and icon
  const getStatusConfig = () => {
    if (isDetected) {
      if (probability > 70) {
        return {
          color: 'critical',
          icon: '🚨',
          text: 'Jaundice Detected',
          bgClass: 'status-critical'
        };
      } else {
        return {
          color: 'warning',
          icon: '⚠️',
          text: 'Possible Jaundice',
          bgClass: 'status-warning'
        };
      }
    } else {
      return {
        color: 'normal',
        icon: '✅',
        text: 'No Jaundice',
        bgClass: 'status-normal'
      };
    }
  };

  const status = getStatusConfig();

  return (
    <div className={`jaundice-widget ${status.bgClass}`}>
      {/* Header */}
      <div className="widget-header">
        <div className="widget-title">
          <div className="widget-icon">🩺</div>
          <h3>Jaundice Detection</h3>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`status-banner ${status.color}`}>
        <span className="status-icon">{status.icon}</span>
        <span className="status-text">{status.text}</span>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-label">Confidence</span>
          <div className="metric-value-wrapper">
            <span className="metric-value">{confidence.toFixed(1)}%</span>
            <div className="progress-bar">
              <div 
                className="progress-fill confidence"
                style={{ width: `${confidence}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="metric-item">
          <span className="metric-label">Probability</span>
          <div className="metric-value-wrapper">
            <span className="metric-value">{probability.toFixed(1)}%</span>
            <div className="progress-bar">
              <div 
                className="progress-fill probability"
                style={{ width: `${probability}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="metric-item">
          <span className="metric-label">Brightness</span>
          <div className="metric-value-wrapper">
            <span className="metric-value">{brightness.toFixed(1)}</span>
          </div>
        </div>

        <div className="metric-item">
          <span className="metric-label">Reliability</span>
          <div className="metric-value-wrapper">
            <span className="metric-value">{reliability.toFixed(0)}%</span>
            {reliability < 80 && (
              <span className="reliability-warning">⚠️</span>
            )}
          </div>
        </div>
      </div>

      {/* Low Light Warning */}
      {reliability < 80 && (
        <div className="warning-box">
          <span className="warning-icon">⚠️</span>
          <div className="warning-content">
            <strong>Low Light Conditions</strong>
            <p>Reliability reduced to {reliability.toFixed(0)}%. Ensure adequate lighting for accurate detection.</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="widget-footer">
        <div className="last-check">
          <span className="last-check-label">Last check:</span>
          <span className="last-check-value">
            {timestamp} {timeAgo && `• ${timeAgo}`}
          </span>
        </div>
        <button 
          className="btn-detect-now"
          onClick={onDetectNow}
          disabled={detecting}
        >
          {detecting ? (
            <>
              <span className="spinner-small"></span>
              Detecting...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Detect Now
            </>
          )}
        </button>
      </div>

      {/* Auto-detection Notice */}
      <div className="auto-detection-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Auto-detects every 10 minutes • Publishes to ThingsBoard</span>
      </div>
    </div>
  );
};

export default JaundiceWidget;
