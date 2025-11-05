import React from 'react';
import CryWidget from './CryWidget';
import './CryWidget.css';

const extractValue = (field, fallback = null) => {
  if (!field) return fallback;
  if (Array.isArray(field) && field.length > 0) {
    return field[0]?.value ?? fallback;
  }
  return field ?? fallback;
};

const normaliseBoolean = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', 'yes', 'verified'].includes(normalised)) return true;
    if (['false', 'no', 'rejected'].includes(normalised)) return false;
  }
  return null;
};

function CryDetail({ data, onClose }) {
  const classification = extractValue(data?.cry_classification, null);
  const classificationConfidence = Number(extractValue(data?.cry_classification_confidence, 0)) || 0;
  const verificationRaw = extractValue(data?.cry_verified, null);
  const verification = normaliseBoolean(verificationRaw);
  const verificationConfidence = Number(extractValue(data?.cry_verification_confidence, 0)) || 0;
  const top1 = extractValue(data?.cry_classification_top1, null);
  const top2 = extractValue(data?.cry_classification_top2, null);
  const top3 = extractValue(data?.cry_classification_top3, null);
  const audioLevel = extractValue(data?.cry_audio_level, null);
  const detectionsToday = extractValue(data?.cry_total_detections, null);
  const verifiedCount = extractValue(data?.cry_verified_cries, null);
  const falsePositives = extractValue(data?.cry_false_positives, null);
  const lastDetectedTs = data?.cry_detected?.[0]?.ts
    || extractValue(data?.cry_last_detected, null)
    || (data?.timestamp ? Date.parse(data.timestamp) : null);
  const lastDetectedLabel = lastDetectedTs ? new Date(lastDetectedTs).toLocaleString() : 'Not available';
  const holdWindow = '60 seconds (minimum)';

  const topCandidates = [top1, top2, top3].filter(Boolean);

  const verificationLabel = (() => {
    if (verification === null) return 'Pending model verification';
    const base = verification ? 'Verified by classifier' : 'Rejected by classifier';
    if (verificationConfidence > 0) {
      return `${base} - ${(verificationConfidence * 100).toFixed(0)}% confidence`;
    }
    return base;
  })();

  return (
    <div className="detail-view">
      <div className="detail-view-bar">
        <button type="button" className="detail-close" onClick={onClose} aria-label="Close cry detail view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="detail-heading">
        <h3>Cry Analysis</h3>
        <p className="detail-note">
          Inspect the cry detection metrics and sensitivity settings to verify monitoring before exporting events.
        </p>
      </div>

      <CryWidget data={data} />

      <div className="detail-info-panel detail-note">
        <h4>Cry pipeline insights</h4>
        <ul className="detail-info-list">
          <li className="detail-info-item">
            <span className="detail-info-label">Primary classification</span>
            <span className="detail-info-value">
              {classification
                ? `${classification} (${(classificationConfidence * 100).toFixed(0)}% confidence)`
                : 'Classification pending'}
            </span>
          </li>
          <li className="detail-info-item">
            <span className="detail-info-label">Verification</span>
            <span className="detail-info-value">{verificationLabel}</span>
          </li>
          {topCandidates.length > 0 && (
            <li className="detail-info-item">
              <span className="detail-info-label">Top candidates</span>
              <span className="detail-info-value">{topCandidates.join(' | ')}</span>
            </li>
          )}
          <li className="detail-info-item">
            <span className="detail-info-label">Audio level</span>
            <span className="detail-info-value">
              {audioLevel != null ? Number(audioLevel).toFixed(3) : 'Not available'}
            </span>
          </li>
          <li className="detail-info-item">
            <span className="detail-info-label">Today's detections</span>
            <span className="detail-info-value">
              {detectionsToday != null ? detectionsToday : 'No telemetry'}
              {verifiedCount != null && falsePositives != null
                ? ` (verified ${verifiedCount}, false positives ${falsePositives})`
                : ''}
            </span>
          </li>
          <li className="detail-info-item">
            <span className="detail-info-label">Last detected</span>
            <span className="detail-info-value">{lastDetectedLabel}</span>
          </li>
          <li className="detail-info-item">
            <span className="detail-info-label">Hold window</span>
            <span className="detail-info-value">{holdWindow}</span>
          </li>
        </ul>
      </div>

      <p className="detail-note">
        Recent detections and audio level history are displayed above. Export cry events if you need to analyse trends
        offline.
      </p>
    </div>
  );
}

export default CryDetail;
