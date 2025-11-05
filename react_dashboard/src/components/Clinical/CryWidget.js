import React, { useEffect, useMemo, useState } from 'react';
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
  const [persistentCry, setPersistentCry] = useState({
    active: false,
    expiresAt: 0,
    startedAt: null,
    payload: {}
  });
  const [holdSeconds, setHoldSeconds] = useState(0);

  const dataStatus = data?.status ?? null;
  const isLoadingState = !data || dataStatus === 'error';
  const awaitingInitialDetection = dataStatus === 'no_detection';
  const safeData = data ?? {};

  const parseTimestamp = useMemo(() => {
    const parse = (raw) => {
      if (!raw) return null;
      if (typeof raw === 'number') {
        return Number.isFinite(raw) ? raw : null;
      }
      if (typeof raw === 'string') {
        const parsed = Date.parse(raw);
        return Number.isNaN(parsed) ? null : parsed;
      }
      if (typeof raw === 'object') {
        if (raw.ts) return parse(raw.ts);
        if (raw.value) return parse(raw.value);
      }
      return null;
    };
    return parse;
  }, []);

  const getFieldTimestamp = (field) => {
    if (!field) return null;
    if (Array.isArray(field) && field.length > 0) {
      const entry = field[0];
      return parseTimestamp(entry?.ts ?? entry?.value);
    }
    return null;
  };

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

  const detectionTimestamp = useMemo(() => {
    const detectedTs = getFieldTimestamp(safeData.cry_detected);
    if (detectedTs) return detectedTs;
    const lastDetectedTs = getFieldTimestamp(safeData.cry_last_detected);
    if (lastDetectedTs) return lastDetectedTs;
    if (safeData.timestamp) {
      return parseTimestamp(safeData.timestamp);
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeData.cry_detected, safeData.cry_last_detected, safeData.timestamp]);

  const isCryDetected = extractValue(safeData.cry_detected, false);
  const audioLevel = Number(extractValue(safeData.cry_audio_level, 0));
  const sensitivity = Number(extractValue(safeData.cry_sensitivity, 0.6));
  const totalDetections = Number(extractValue(safeData.cry_total_detections, 0));
  const isMonitoring = extractValue(safeData.cry_monitoring, false);
  
  // Enhanced: Classification data (all fields prefixed with cry_)
  const cryClassification = extractValue(safeData.cry_classification, null);
  const classificationConfidence = Number(extractValue(safeData.cry_classification_confidence, 0));
  const verifiedCries = Number(extractValue(safeData.cry_verified_cries, 0));
  const falsePositives = Number(extractValue(safeData.cry_false_positives, 0));
  const classificationTop1 = extractValue(safeData.cry_classification_top1, null);
  const classificationTop2 = extractValue(safeData.cry_classification_top2, null);
  const classificationTop3 = extractValue(safeData.cry_classification_top3, null);
  const verificationRaw = extractValue(safeData.cry_verified, null);
  const verificationConfidence = Number(extractValue(safeData.cry_verification_confidence, 0));
  const verificationStatus = useMemo(() => {
    if (verificationRaw === null || verificationRaw === undefined) return null;
    if (typeof verificationRaw === 'boolean') return verificationRaw;
    if (typeof verificationRaw === 'number') return verificationRaw === 1;
    if (typeof verificationRaw === 'string') {
      const normalized = verificationRaw.trim().toLowerCase();
      if (['true', 'yes', 'verified', 'accepted'].includes(normalized)) return true;
      if (['false', 'no', 'rejected', 'invalid'].includes(normalized)) return false;
    }
    return null;
  }, [verificationRaw]);

  const audioLevelPercent = Math.min(audioLevel * 100, 100);
  const classificationSnapshot = useMemo(() => {
    const snapshot = {};
    if (cryClassification) snapshot.classification = cryClassification;
    if (classificationConfidence) snapshot.classificationConfidence = classificationConfidence;
    if (classificationTop1) snapshot.classificationTop1 = classificationTop1;
    if (classificationTop2) snapshot.classificationTop2 = classificationTop2;
    if (classificationTop3) snapshot.classificationTop3 = classificationTop3;
    if (verificationStatus !== null) snapshot.verification = verificationStatus;
    if (verificationConfidence) snapshot.verificationConfidence = verificationConfidence;
    return snapshot;
  }, [
    cryClassification,
    classificationConfidence,
    classificationTop1,
    classificationTop2,
    classificationTop3,
    verificationStatus,
    verificationConfidence
  ]);
  useEffect(() => {
    const now = Date.now();
    setPersistentCry(prev => {
      if (isCryDetected) {
        const startedAt = detectionTimestamp || now;
        const expiresAt = Math.max(prev.expiresAt || 0, startedAt + 60_000, now + 60_000);
        return {
          active: true,
          startedAt,
          expiresAt,
          payload: {
            ...prev.payload,
            ...classificationSnapshot
          }
        };
      }

      if (prev.active && prev.expiresAt > now) {
        if (Object.keys(classificationSnapshot).length === 0) {
          return prev;
        }
        const mergedPayload = { ...prev.payload, ...classificationSnapshot };
        let changed = false;
        for (const key of Object.keys(mergedPayload)) {
          if (mergedPayload[key] !== prev.payload[key]) {
            changed = true;
            break;
          }
        }
        if (!changed) {
          return prev;
        }
        return {
          ...prev,
          payload: mergedPayload
        };
      }

      if (prev.active && prev.expiresAt <= now) {
        return {
          active: false,
          expiresAt: 0,
          startedAt: null,
          payload: {}
        };
      }

      if (!prev.active && Object.keys(classificationSnapshot).length > 0) {
        const mergedPayload = { ...prev.payload, ...classificationSnapshot };
        return {
          ...prev,
          payload: mergedPayload
        };
      }

      return prev;
    });
  }, [classificationSnapshot, detectionTimestamp, isCryDetected]);

  useEffect(() => {
    if (!persistentCry.active) {
      setHoldSeconds(0);
      return;
    }

    const updateHold = () => {
      const remaining = Math.max(0, Math.ceil((persistentCry.expiresAt - Date.now()) / 1000));
      setHoldSeconds(remaining);
    };

    updateHold();
    const interval = setInterval(updateHold, 1000);
    return () => clearInterval(interval);
  }, [persistentCry.active, persistentCry.expiresAt]);

  const displayCryDetected = persistentCry.active || isCryDetected;
  const effectiveClassification =
    cryClassification ||
    persistentCry.payload.classification ||
    null;
  const effectiveConfidence =
    (classificationConfidence > 0 ? classificationConfidence : 0) ||
    (persistentCry.payload.classificationConfidence || 0);
  const effectiveTop1 = classificationTop1 || persistentCry.payload.classificationTop1 || null;
  const effectiveTop2 = classificationTop2 || persistentCry.payload.classificationTop2 || null;
  const effectiveTop3 = classificationTop3 || persistentCry.payload.classificationTop3 || null;
  const effectiveVerification =
    verificationStatus !== null
      ? verificationStatus
      : Object.prototype.hasOwnProperty.call(persistentCry.payload, 'verification')
        ? persistentCry.payload.verification
        : null;
  const effectiveVerificationConfidence =
    verificationConfidence > 0
      ? verificationConfidence
      : persistentCry.payload.verificationConfidence || 0;
  const displayTimestamp = displayCryDetected
    ? persistentCry.startedAt || detectionTimestamp
    : detectionTimestamp;

  useEffect(() => {
    if (!displayTimestamp) {
      setTimeAgo('');
      return;
    }

    const updateTimeAgo = () => {
      const diffMs = Date.now() - displayTimestamp;
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
  }, [displayTimestamp]);

  const lastTimestampLabel = displayTimestamp
    ? new Date(displayTimestamp).toLocaleTimeString()
    : '--';

  if (isLoadingState) {
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
          {dataStatus === 'error' ? (
            <>
              <div className="glyph glyph-error">!</div>
              <h4>Connection error</h4>
              <p>{data?.message || 'Unable to connect to the cry detection service.'}</p>
            </>
          ) : (
            <>
              <div className="spinner"></div>
              <h4>Connecting to cry monitor</h4>
              <p>Preparing the audio analysis service.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (awaitingInitialDetection) {
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
          <div className="glyph glyph-idle">-</div>
          <h4>Listening for first reading</h4>
          <p>Cry detection is active and monitoring ambient audio.</p>
        </div>
      </div>
    );
  }

  const status = (() => {
    if (displayCryDetected) {
      if (effectiveClassification) {
        return {
          variant: 'critical',
          icon: statusIcons.alert,
          title: `Cry detected: ${effectiveClassification}`,
          subtitle: `Classified with ${(effectiveConfidence * 100).toFixed(0)}% confidence.`
        };
      }
      return {
        variant: 'critical',
        icon: statusIcons.alert,
        title: 'Cry detected',
        subtitle: holdSeconds > 0
          ? `Holding for classification (${holdSeconds}s remaining)`
          : 'Classifying audio sample...'
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
              className={`progress-fill ${displayCryDetected ? 'critical' : 'normal'}`}
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
          <span className="metric-footnote">
            {verifiedCries > 0
              ? `${verifiedCries} verified - ${falsePositives} false positives`
              : 'Resets at midnight'}
          </span>
        </div>
      </div>
    );

    metricBlocks.push(
      <div className="metric-item" key="hold-window">
        <span className="metric-label">Hold Window</span>
        <div className="metric-value-wrapper">
          <span className="metric-value">{displayCryDetected ? `${Math.max(holdSeconds, 0)}s` : 'Idle'}</span>
          <span className="metric-footnote">Maintains state for classification</span>
        </div>
      </div>
    );

    metricBlocks.push(
      <div className="metric-item" key="verification">
        <span className="metric-label">Verification</span>
        <div className="metric-value-wrapper">
          <span className="metric-value">
            {effectiveVerification === null
              ? 'Pending'
              : effectiveVerification
                ? 'Verified'
                : 'Rejected'}
          </span>
          <span className="metric-footnote">
            {effectiveVerificationConfidence
              ? `${(effectiveVerificationConfidence * 100).toFixed(0)}% confidence`
              : 'Awaiting model confirmation'}
          </span>
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


      {!compact && displayCryDetected && (
        <div className="alert-card">
          <div className="alert-glyph">{statusIcons.alert}</div>
          <div className="alert-copy">
            <strong>Attention required</strong>
            {effectiveClassification ? (
              <>
                <p>
                  Baby is crying: <strong>{effectiveClassification}</strong> ({(effectiveConfidence * 100).toFixed(0)}% confidence)
                </p>
              </>
            ) : (
              <p>
                Cry pattern detected. Classification pending{holdSeconds > 0 ? ` (~${holdSeconds}s)` : ''}.
              </p>
            )}
            {(effectiveTop1 || effectiveTop2 || effectiveTop3) && (
              <div className="classification-breakdown">
                <div className="breakdown-heading">Classification breakdown</div>
                {effectiveTop1 && <div>- {effectiveTop1}</div>}
                {effectiveTop2 && <div>- {effectiveTop2}</div>}
                {effectiveTop3 && <div>- {effectiveTop3}</div>}
              </div>
            )}
            {effectiveVerification !== null && (
              <p className="alert-footnote">
                Verification: {effectiveVerification ? 'verified' : 'rejected'}
                {effectiveVerificationConfidence
                  ? ` (${(effectiveVerificationConfidence * 100).toFixed(0)}% confidence)`
                  : ''}
              </p>
            )}
            {!effectiveClassification && holdSeconds > 0 && (
              <p className="alert-footnote">Hold window active for downstream classifiers.</p>
            )}
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
            {timeAgo ? ` - ${timeAgo}` : ''}
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
