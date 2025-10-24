import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import JaundiceWidget from '../Clinical/JaundiceWidget';
import CryWidget from '../Clinical/CryWidget';
import './ParentPortal.css';

function ParentPortal() {
  const { user, logout } = useAuth();
  const { jaundiceData, cryData, detectJaundiceNow } = useData();
  const navigate = useNavigate();
  const [cameraError, setCameraError] = useState(false);
  const [detectingJaundice, setDetectingJaundice] = useState(false);

  const piHost = process.env.REACT_APP_PI_HOST || '100.99.151.101';
  const cameraPort = process.env.REACT_APP_CAMERA_PORT || '8080';
  const cameraUrl = `http://${piHost}:${cameraPort}/?action=stream`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCameraError = () => {
    setCameraError(true);
  };

  const reloadCamera = () => {
    setCameraError(false);
    // Force reload
    window.location.reload();
  };

  const handleDetectJaundiceNow = async () => {
    setDetectingJaundice(true);
    try {
      await detectJaundiceNow();
    } catch (err) {
      console.error('Detection failed:', err);
      alert('Jaundice detection failed. Please try again.');
    } finally {
      setDetectingJaundice(false);
    }
  };

  return (
    <div className="parent-portal">
      {/* Header */}
      <header className="portal-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h1>NICU Monitor</h1>
              <p className="device-name">Incubator INC-001</p>
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0) || 'P'}
              </div>
              <div>
                <p className="user-name">{user?.name || 'Parent'}</p>
                <p className="user-role">Parent Portal</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="portal-main">
        <div className="camera-container">
          <div className="camera-header">
            <div className="camera-title">
              <div className="live-indicator">
                <span className="pulse-dot"></span>
                LIVE
              </div>
              <h2>Baby Camera Feed</h2>
            </div>
            <button onClick={reloadCamera} className="btn-reload">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reload
            </button>
          </div>

          <div className="camera-view">
            {!cameraError ? (
              <img 
                src={`${cameraUrl}#${Date.now()}`}
                alt="Baby Camera Feed"
                className="camera-stream"
                onError={handleCameraError}
              />
            ) : (
              <div className="camera-error">
                <svg className="error-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3>Camera Unavailable</h3>
                <p>Unable to connect to the camera feed</p>
                <p className="error-details">Please check that the camera is connected and try again</p>
                <button onClick={reloadCamera} className="btn-retry">
                  Try Again
                </button>
              </div>
            )}
          </div>

          <div className="camera-info">
            <div className="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>For detailed vitals and medical information, please contact the nursing staff</span>
            </div>
          </div>
        </div>

        {/* Jaundice Detection Widget */}
        <div className="jaundice-section">
          <JaundiceWidget 
            data={jaundiceData}
            onDetectNow={handleDetectJaundiceNow}
            detecting={detectingJaundice}
          />
        </div>

        {/* Cry Detection Widget */}
        <div className="cry-section">
          <CryWidget 
            data={cryData}
          />
        </div>

        {/* Informational Cards */}
        <div className="info-cards">
          <div className="info-card">
            <div className="card-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>24/7 Monitoring</h3>
            <p>Your baby is under constant supervision by trained medical staff</p>
          </div>

          <div className="info-card">
            <div className="card-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>Real-Time Updates</h3>
            <p>Medical staff are notified immediately of any changes in condition</p>
          </div>

          <div className="info-card">
            <div className="card-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3>Expert Care</h3>
            <p>Our NICU team has decades of experience in neonatal care</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="portal-footer">
        <p>NICU Monitor System • ThingsBoard Integration • INC-001</p>
        <p className="emergency-note">
          In case of emergency, please contact the nursing station immediately
        </p>
      </footer>
    </div>
  );
}

export default ParentPortal;
