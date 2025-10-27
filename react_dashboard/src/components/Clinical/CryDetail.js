import React from 'react';
import CryWidget from './CryWidget';
import './CryWidget.css';

function CryDetail({ data, onClose }) {
  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <div>
          <h3>Cry Analysis — Detailed View</h3>
          <div className="detail-sub">Expanded cry detection timeline & controls</div>
        </div>
        <div>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="detail-card-body">
        <CryWidget data={data} />

        <div style={{marginTop:12, color:'#475569', fontSize:'0.9rem'}}>
          <p style={{margin:0}}>Recent detections and audio level history are shown above. Use the export button to save events.</p>
        </div>
      </div>
    </div>
  );
}

export default CryDetail;
