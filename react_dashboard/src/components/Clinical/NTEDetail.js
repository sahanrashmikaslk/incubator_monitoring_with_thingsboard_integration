import React from 'react';
import NTEWidget from './NTEWidget';
import './NTEWidget.css';

function NTEDetail({ activeBaby, vitals, onClose }) {
  return (
    <div className="detail-view">
      <div className="detail-view-bar">
        <button type="button" className="detail-close" onClick={onClose} aria-label="Close NTE detail view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="detail-heading">
        <h3>Thermal Guidance</h3>
        <p className="detail-note">
          Review the latest NTE recommendations, live vitals, and priority advice before applying incubator adjustments.
        </p>
      </div>

      <NTEWidget activeBaby={activeBaby} vitals={vitals} />

      <p className="detail-note">
        Enable auto-refresh to keep neutral thermal environment guidance current every minute. Apply the highest severity
        recommendations first to maintain optimal incubator conditions.
      </p>
    </div>
  );
}

export default NTEDetail;
