import React from 'react';
import JaundiceWidget from './JaundiceWidget';
import './JaundiceWidget.css';

function JaundiceDetail({ data, onClose, onDetectNow, detecting }) {
  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <div>
          <h3>Jaundice — Detailed View</h3>
          <div className="detail-sub">Expanded information and controls</div>
        </div>
        <div>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="detail-card-body">
        <JaundiceWidget data={data} onDetectNow={onDetectNow} detecting={detecting} />

        <div style={{marginTop:12}}>
          <button className="btn-detect-now" onClick={onDetectNow} disabled={detecting}>
            {detecting ? 'Detecting…' : 'Run Detection Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default JaundiceDetail;
