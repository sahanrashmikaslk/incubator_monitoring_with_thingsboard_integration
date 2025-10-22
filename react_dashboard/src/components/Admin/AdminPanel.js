import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import './AdminPanel.css';

function AdminPanel() {
  const { user, logout } = useAuth();
  const { vitals } = useData();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStatus, setSystemStatus] = useState({
    mqtt: 'connected',
    thingsboard: 'connected',
    camera: 'active',
    lcd_server: 'running'
  });

  const piHost = process.env.REACT_APP_PI_HOST || '100.99.151.101';
  const thingsboardUrl = process.env.REACT_APP_THINGSBOARD_URL;
  const deviceToken = process.env.REACT_APP_DEVICE_TOKEN;

  useEffect(() => {
    // Simulate checking system status
    checkSystemStatus();
  }, []);

  const checkSystemStatus = () => {
    // In production, this would make actual health check API calls
    console.log('Checking system status...');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mockUsers = [
    { id: 1, name: 'Dr. Sarah Johnson', role: 'Doctor', email: 'doctor@demo.com', status: 'Active' },
    { id: 2, name: 'John Smith', role: 'Parent', email: 'parent@demo.com', status: 'Active' },
    { id: 3, name: 'Nurse Emily Davis', role: 'Nurse', email: 'nurse@demo.com', status: 'Active' },
    { id: 4, name: 'Admin User', role: 'Admin', email: 'admin@demo.com', status: 'Active' }
  ];

  const mockDevices = [
    {
      id: 'INC-001',
      name: 'Incubator 001',
      status: 'Online',
      lastSeen: new Date().toISOString(),
      location: 'NICU Ward A',
      firmware: 'v2.1.0'
    }
  ];

  const mockLogs = [
    { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'INFO', message: 'MQTT message published successfully' },
    { timestamp: new Date(Date.now() - 120000).toISOString(), level: 'INFO', message: 'Vitals data collected from LCD server' },
    { timestamp: new Date(Date.now() - 180000).toISOString(), level: 'INFO', message: 'Camera feed streaming' },
    { timestamp: new Date(Date.now() - 240000).toISOString(), level: 'WARNING', message: 'SpO2 level below threshold: 89%' },
    { timestamp: new Date(Date.now() - 300000).toISOString(), level: 'INFO', message: 'System startup complete' }
  ];

  return (
    <div className="admin-panel">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-badge admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1>Admin Panel</h1>
              <p className="panel-subtitle">System Management & Configuration</p>
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar admin">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="user-name">{user?.name || 'Administrator'}</p>
                <p className="user-role">ADMIN</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-nav">
        <div className="nav-content">
          <button 
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Overview
          </button>
          <button 
            className={`nav-tab ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => setActiveTab('devices')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Devices
          </button>
          <button 
            className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Users
          </button>
          <button 
            className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Logs
          </button>
          <button 
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Settings
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="admin-main">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            <h2>System Overview</h2>
            
            {/* Status Cards */}
            <div className="status-grid">
              <div className="status-card">
                <div className="status-header">
                  <h3>MQTT Bridge</h3>
                  <span className={`status-indicator ${systemStatus.mqtt}`}></span>
                </div>
                <p className="status-value">{systemStatus.mqtt}</p>
                <p className="status-details">Publishing every 15s</p>
              </div>

              <div className="status-card">
                <div className="status-header">
                  <h3>ThingsBoard</h3>
                  <span className={`status-indicator ${systemStatus.thingsboard}`}></span>
                </div>
                <p className="status-value">{systemStatus.thingsboard}</p>
                <p className="status-details">Receiving telemetry</p>
              </div>

              <div className="status-card">
                <div className="status-header">
                  <h3>Camera Server</h3>
                  <span className={`status-indicator ${systemStatus.camera}`}></span>
                </div>
                <p className="status-value">{systemStatus.camera}</p>
                <p className="status-details">Port 8081</p>
              </div>

              <div className="status-card">
                <div className="status-header">
                  <h3>LCD Server</h3>
                  <span className={`status-indicator ${systemStatus.lcd_server}`}></span>
                </div>
                <p className="status-value">{systemStatus.lcd_server}</p>
                <p className="status-details">Port 9001</p>
              </div>
            </div>

            {/* Current Vitals Summary */}
            <div className="vitals-summary">
              <h3>Current Vitals Summary</h3>
              <div className="vitals-summary-grid">
                <div className="summary-item">
                  <span className="summary-label">SpO₂</span>
                  <span className="summary-value">{vitals?.spo2 || '--'}%</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Heart Rate</span>
                  <span className="summary-value">{vitals?.heart_rate || '--'} bpm</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Skin Temp</span>
                  <span className="summary-value">{vitals?.skin_temp ? vitals.skin_temp.toFixed(1) : '--'}°C</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Humidity</span>
                  <span className="summary-value">{vitals?.humidity || '--'}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Registered Devices</h2>
              <button className="btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Device
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Device ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Firmware</th>
                    <th>Last Seen</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockDevices.map(device => (
                    <tr key={device.id}>
                      <td><code>{device.id}</code></td>
                      <td>{device.name}</td>
                      <td>
                        <span className="badge badge-success">{device.status}</span>
                      </td>
                      <td>{device.location}</td>
                      <td>{device.firmware}</td>
                      <td>{new Date(device.lastSeen).toLocaleString()}</td>
                      <td>
                        <button className="btn-icon" title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>User Management</h2>
              <button className="btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map(usr => (
                    <tr key={usr.id}>
                      <td>{usr.name}</td>
                      <td>{usr.email}</td>
                      <td>
                        <span className={`badge badge-${usr.role.toLowerCase()}`}>
                          {usr.role}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success">{usr.status}</span>
                      </td>
                      <td>
                        <button className="btn-icon" title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="btn-icon btn-danger" title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>System Logs</h2>
              <button className="btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Logs
              </button>
            </div>

            <div className="logs-container">
              {mockLogs.map((log, index) => (
                <div key={index} className={`log-entry log-${log.level.toLowerCase()}`}>
                  <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={`log-level level-${log.level.toLowerCase()}`}>{log.level}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <h2>System Configuration</h2>
            
            <div className="settings-section">
              <h3>ThingsBoard Configuration</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label>ThingsBoard URL</label>
                  <input type="text" value={thingsboardUrl} readOnly />
                </div>
                <div className="form-group">
                  <label>Device Token</label>
                  <input type="password" value={deviceToken} readOnly />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Raspberry Pi Configuration</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label>Pi Host IP</label>
                  <input type="text" value={piHost} readOnly />
                </div>
                <div className="form-group">
                  <label>Camera Port</label>
                  <input type="text" value="8081" readOnly />
                </div>
                <div className="form-group">
                  <label>LCD Server Port</label>
                  <input type="text" value="9001" readOnly />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Alert Thresholds</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label>SpO₂ Critical (&lt;)</label>
                  <input type="number" defaultValue="85" />
                </div>
                <div className="form-group">
                  <label>SpO₂ Warning (&lt;)</label>
                  <input type="number" defaultValue="90" />
                </div>
                <div className="form-group">
                  <label>Heart Rate Critical (&gt;)</label>
                  <input type="number" defaultValue="180" />
                </div>
                <div className="form-group">
                  <label>Heart Rate Warning (&gt;)</label>
                  <input type="number" defaultValue="170" />
                </div>
              </div>
              <button className="btn-primary">Save Settings</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPanel;
