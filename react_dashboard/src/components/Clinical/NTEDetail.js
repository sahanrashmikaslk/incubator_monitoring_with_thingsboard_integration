import React from 'react';
import NTEWidget from './NTEWidget';
import './NTEWidget.css';

function NTEDetail({ activeBaby, vitals, onClose }) {
  return (
    <div className="detail-surface">
      <button
        type="button"
        className="detail-close"
        onClick={onClose}
        aria-label="Close NTE detail view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <NTEWidget activeBaby={activeBaby} vitals={vitals} />

      <div className="detail-note">
        Enable auto-refresh to keep neutral thermal environment guidance current every minute. Adjust incubator settings
        according to the highest severity recommendations.
      </div>
    </div>
  );
}

export default NTEDetail;
