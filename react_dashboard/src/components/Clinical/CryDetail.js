import React from 'react';
import CryWidget from './CryWidget';
import './CryWidget.css';

function CryDetail({ data, onClose }) {
  return (
    <div className="detail-surface">
      <button
        type="button"
        className="detail-close"
        onClick={onClose}
        aria-label="Close cry detail view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <CryWidget data={data} />

      <div className="detail-note">
        Recent detections and audio level history are displayed above. Export events from the cry module if you need to
        review trends offline.
      </div>
    </div>
  );
}

export default CryDetail;
