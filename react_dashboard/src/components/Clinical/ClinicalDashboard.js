import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './ClinicalDashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function ClinicalDashboard() {
  const { user, logout } = useAuth();
  const { vitals, historicalData, fetchLatestVitals, fetchHistoricalData, loading } = useData();
  const navigate = useNavigate();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const piHost = process.env.REACT_APP_PI_HOST || '100.99.151.101';
  const cameraPort = process.env.REACT_APP_CAMERA_PORT || '8081';
  const cameraUrl = `http://${piHost}:${cameraPort}/?action=stream`;

  useEffect(() => {
    fetchLatestVitals();
    fetchHistoricalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debug: Log vitals when they change
  useEffect(() => {
    console.log('🏥 ClinicalDashboard received vitals:', vitals);
  }, [vitals]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = () => {
    fetchLatestVitals();
    fetchHistoricalData();
  };

  // Get vital status (normal, warning, critical)
  const getVitalStatus = (vitalType, value) => {
    if (!value) return 'unknown';
    
    // Extract numeric value from different formats
    let numericValue;
    if (Array.isArray(value)) {
      numericValue = value[0]?.value;
    } else if (typeof value === 'object' && 'value' in value) {
      numericValue = value.value;
    } else if (typeof value === 'number') {
      numericValue = value;
    }
    
    if (typeof numericValue !== 'number') return 'unknown';
    
    const ranges = {
      spo2: { critical: 85, warning: 90, normal: 95 },
      heart_rate: { critical: 180, warning: 170, normal: 160 },
      skin_temp: { min_critical: 35.5, min_warning: 36.0, max_warning: 37.5, max_critical: 38.0 },
      humidity: { min_warning: 40, max_warning: 70 }
    };

    switch(vitalType) {
      case 'spo2':
        if (numericValue < ranges.spo2.critical) return 'critical';
        if (numericValue < ranges.spo2.warning) return 'warning';
        return 'normal';
      
      case 'heart_rate':
        if (numericValue > ranges.heart_rate.critical) return 'critical';
        if (numericValue > ranges.heart_rate.warning) return 'warning';
        return 'normal';
      
      case 'skin_temp':
        if (numericValue < ranges.skin_temp.min_critical || numericValue > ranges.skin_temp.max_critical) return 'critical';
        if (numericValue < ranges.skin_temp.min_warning || numericValue > ranges.skin_temp.max_warning) return 'warning';
        return 'normal';
      
      case 'humidity':
        if (numericValue < ranges.humidity.min_warning || numericValue > ranges.humidity.max_warning) return 'warning';
        return 'normal';
      
      default:
        return 'normal';
    }
  };

  // Prepare chart data
  const prepareChartData = (parameter) => {
    // Handle null or undefined historicalData
    if (!historicalData || !historicalData[parameter]) {
      return {
        labels: [],
        datasets: [{
          label: parameter.replace('_', ' ').toUpperCase(),
          data: [],
          borderColor: {
            spo2: '#3b82f6',
            heart_rate: '#ef4444',
            skin_temp: '#f59e0b',
            humidity: '#10b981'
          }[parameter],
          backgroundColor: {
            spo2: 'rgba(59, 130, 246, 0.1)',
            heart_rate: 'rgba(239, 68, 68, 0.1)',
            skin_temp: 'rgba(245, 158, 11, 0.1)',
            humidity: 'rgba(16, 185, 129, 0.1)'
          }[parameter],
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6
        }]
      };
    }

    const data = historicalData[parameter] || [];
    
    return {
      labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
      datasets: [{
        label: parameter.replace('_', ' ').toUpperCase(),
        data: data.map(d => d.value),
        borderColor: {
          spo2: '#3b82f6',
          heart_rate: '#ef4444',
          skin_temp: '#f59e0b',
          humidity: '#10b981'
        }[parameter],
        backgroundColor: {
          spo2: 'rgba(59, 130, 246, 0.1)',
          heart_rate: 'rgba(239, 68, 68, 0.1)',
          skin_temp: 'rgba(245, 158, 11, 0.1)',
          humidity: 'rgba(16, 185, 129, 0.1)'
        }[parameter],
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Debug vital values
  console.log('💊 Creating vital cards with values:', {
    spo2: vitals?.spo2,
    heart_rate: vitals?.heart_rate,
    skin_temp: vitals?.skin_temp,
    humidity: vitals?.humidity
  });

  const vitalCards = [
    {
      id: 'spo2',
      label: 'SpO₂',
      value: vitals?.spo2,
      unit: '%',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      color: 'blue'
    },
    {
      id: 'heart_rate',
      label: 'Heart Rate',
      value: vitals?.heart_rate,
      unit: 'bpm',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      color: 'red'
    },
    {
      id: 'skin_temp',
      label: 'Skin Temperature',
      value: vitals?.skin_temp,
      unit: '°C',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'orange'
    },
    {
      id: 'humidity',
      label: 'Humidity',
      value: vitals?.humidity,
      unit: '%',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
      color: 'green'
    }
  ];

  return (
    <div className="clinical-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-badge clinical">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1>Clinical Dashboard</h1>
              <p className="device-name">INC-001 • NICU Monitor</p>
            </div>
          </div>
          
          <div className="header-right">
            <button onClick={handleRefresh} className="btn-refresh" disabled={loading}>
              <svg className={loading ? 'spinning' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <div className="user-info">
              <div className="user-avatar clinical">
                {user?.name?.charAt(0) || 'D'}
              </div>
              <div>
                <p className="user-name">{user?.name || 'Doctor'}</p>
                <p className="user-role">{user?.role?.toUpperCase()}</p>
              </div>
            </div>
            
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Vital Signs Cards */}
        <section className="vitals-section">
          <div className="section-header">
            <h2>Live Vital Signs</h2>
            {vitals?.timestamp && (
              <span className="last-update">
                Last updated: {new Date(vitals.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="vitals-grid">
            {vitalCards.map(card => {
              const status = getVitalStatus(card.id, card.value);
              
              // Safely extract numeric value (handle arrays, objects, or primitives)
              let displayValue = '--';
              if (card.value !== null && card.value !== undefined) {
                // If it's an array (ThingsBoard format), get the first value
                if (Array.isArray(card.value)) {
                  const val = card.value[0]?.value;
                  displayValue = typeof val === 'number' ? val.toFixed(card.id === 'skin_temp' ? 1 : 0) : '--';
                } 
                // If it's an object with a value property
                else if (typeof card.value === 'object' && 'value' in card.value) {
                  const val = card.value.value;
                  displayValue = typeof val === 'number' ? val.toFixed(card.id === 'skin_temp' ? 1 : 0) : '--';
                }
                // If it's already a number
                else if (typeof card.value === 'number') {
                  displayValue = card.value.toFixed(card.id === 'skin_temp' ? 1 : 0);
                }
              }
              
              return (
                <div key={card.id} className={`vital-card ${card.color} ${status}`}>
                  <div className="vital-header">
                    <div className={`vital-icon ${card.color}`}>
                      {card.icon}
                    </div>
                    <span className={`status-badge ${status}`}>
                      {status === 'critical' && '🚨'}
                      {status === 'warning' && '⚠️'}
                      {status === 'normal' && '✓'}
                    </span>
                  </div>
                  <h3>{card.label}</h3>
                  <div className="vital-value">
                    {displayValue}
                    <span className="unit">{card.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Charts Section */}
        <section className="charts-section">
          <div className="section-header">
            <h2>Historical Trends (Last 6 Hours)</h2>
          </div>
          
          <div className="charts-grid">
            {vitalCards.map(card => (
              <div key={card.id} className="chart-container">
                <h4>{card.label}</h4>
                <div className="chart-wrapper">
                  <Line data={prepareChartData(card.id)} options={chartOptions} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Camera Section (Toggle) */}
        <section className="camera-section">
          <div className="section-header">
            <h2>Baby Monitor</h2>
            <button 
              onClick={() => setShowCamera(!showCamera)} 
              className="btn-toggle-camera"
            >
              {showCamera ? 'Hide Camera' : 'Show Camera'}
            </button>
          </div>
          
          {showCamera && (
            <div className="camera-container">
              {!cameraError ? (
                <img 
                  src={`${cameraUrl}#${Date.now()}`}
                  alt="Baby Camera Feed"
                  className="camera-stream"
                  onError={() => setCameraError(true)}
                />
              ) : (
                <div className="camera-error">
                  <p>Camera feed unavailable</p>
                  <button onClick={() => setCameraError(false)} className="btn-retry">
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default ClinicalDashboard;
