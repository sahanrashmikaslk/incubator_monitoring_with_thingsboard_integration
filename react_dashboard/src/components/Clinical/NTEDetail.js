import React from 'react';
import NTEWidget from './NTEWidget';
import './NTEWidget.css';

function NTEDetail({ activeBaby, vitals, onClose }) {
  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <div>
          <h3>NTE Recommendations — Detailed View</h3>
          <div className="detail-sub">Full NTE advice, history and baby context</div>
        </div>
        <div>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="detail-card-body">
        <NTEWidget activeBaby={activeBaby} vitals={vitals} />

        <div style={{marginTop:12}}>
          <small style={{color:'#6b7280'}}>Tip: enable auto-refresh to keep recommendations updated every minute.</small>
        </div>
      </div>
    </div>
  );
}

export default NTEDetail;
