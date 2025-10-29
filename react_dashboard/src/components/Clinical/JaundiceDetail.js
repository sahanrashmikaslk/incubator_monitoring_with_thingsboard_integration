import React from "react";
import JaundiceWidget from "./JaundiceWidget";
import "./JaundiceWidget.css";

function JaundiceDetail({ data, onClose, onDetectNow, detecting }) {
  return (
    <div className="detail-surface">
      <button
        type="button"
        className="detail-close"
        onClick={onClose}
        aria-label="Close jaundice detail view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <JaundiceWidget data={data} onDetectNow={onDetectNow} detecting={detecting} />

      <div className="detail-actions">
        <button className="btn-detect-now" onClick={onDetectNow} disabled={detecting}>
          {detecting ? 'Detecting...' : 'Run Detection Now'}
        </button>
      </div>
    </div>
  );
}

export default JaundiceDetail;