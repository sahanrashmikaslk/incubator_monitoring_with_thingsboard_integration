import React from 'react';
import CryWidget from './CryWidget';
import './CryWidget.css';

function CryDetail({ data, onClose }) {
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

      <p className="detail-note">
        Recent detections and audio level history are displayed above. Export cry events if you need to analyse trends
        offline.
      </p>
    </div>
  );
}

export default CryDetail;
