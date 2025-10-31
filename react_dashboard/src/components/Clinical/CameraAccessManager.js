import React, { useMemo } from 'react';
import './CameraAccessManager.css';

function CameraAccessManager({ isOpen, onClose, requests = [], onToggle, loadingMap = {} }) {
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      if (a.pendingRequest && !b.pendingRequest) return -1;
      if (!a.pendingRequest && b.pendingRequest) return 1;
      const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
      const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [requests]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="camera-access-overlay" role="dialog" aria-modal="true" aria-labelledby="cameraAccessTitle">
      <div className="camera-access-panel">
        <header className="camera-access-header">
          <div>
            <h3 id="cameraAccessTitle">Live view permissions</h3>
            <p>Grant or pause parent access to the incubator camera. Pending requests are highlighted.</p>
          </div>
          <button type="button" className="icon-button close" onClick={onClose} aria-label="Close camera access manager">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {sortedRequests.length === 0 ? (
          <div className="camera-access-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4a7 7 0 00-7 7v1.5a4.5 4.5 0 00-3 4.2V17h20v-.3a4.5 4.5 0 00-3-4.2V11a7 7 0 00-7-7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 11a3 3 0 006 0" />
            </svg>
            <p>No parent assignments yet.</p>
            <span>Add a caregiver to enable camera permissions.</span>
          </div>
        ) : (
          <div className="camera-request-list">
            {sortedRequests.map((entry) => {
              const isLoading = Boolean(loadingMap[entry.parentId]);
              const enabled = entry.status === 'granted';

              return (
                <article
                  key={`${entry.parentId}-${entry.babyId}`}
                  className={`camera-request ${entry.pendingRequest ? 'pending' : ''}`}
                >
                  <div className="camera-request-info">
                    <h4>{entry.parentName || entry.phone || 'Parent'}</h4>
                    <span className="camera-request-meta">Baby {entry.babyId}</span>
                    {entry.pendingRequest && <span className="camera-request-badge">Pending approval</span>}
                    {entry.requestedAt && entry.pendingRequest && (
                      <span className="camera-request-meta subtle">
                        Requested {new Date(entry.requestedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <label className={`camera-toggle ${enabled ? 'enabled' : 'disabled'}`}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={isLoading}
                      onChange={() => onToggle && onToggle(entry, enabled ? 'revoked' : 'granted')}
                    />
                    <span className="camera-toggle-track">
                      <span className="camera-toggle-thumb" />
                    </span>
                    <span className="camera-toggle-label">
                      {isLoading ? 'Updating…' : enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CameraAccessManager;
