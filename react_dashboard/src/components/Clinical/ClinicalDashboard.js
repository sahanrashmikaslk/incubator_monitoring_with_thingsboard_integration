import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Line } from 'react-chartjs-2';
import JaundiceWidget from './JaundiceWidget';
import CryWidget from './CryWidget';
import BabyRegistrationModal from './BabyRegistrationModal';
import NTEWidget from './NTEWidget';
import NotificationPanel from '../NotificationPanel/NotificationPanel';
import LiveCameraFeed from '../LiveCameraFeed/LiveCameraFeed';
import JaundiceDetail from './JaundiceDetail';
import CryDetail from './CryDetail';
import NTEDetail from './NTEDetail';
import nteService from '../../services/nte.service';
import notificationService from '../../services/notification.service';
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
import Sidebar from './Sidebar';
import './Sidebar.css';
import Logo from '../../images/logo.png';

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
  const { vitals, historicalData, jaundiceData, cryData, nteData, deviceId, fetchDeviceId, fetchLatestVitals, fetchHistoricalData, detectJaundiceNow, loading, error } = useData();
  const navigate = useNavigate();
  const [detectingJaundice, setDetectingJaundice] = useState(false);

  // NTE State Management
  const [showBabyModal, setShowBabyModal] = useState(false);
  const [babyList, setBabyList] = useState([]);
  const [activeBaby, setActiveBaby] = useState(null);
  const [loadingBabies, setLoadingBabies] = useState(false);

  // Notification tracking to prevent duplicates
  const lastJaundiceNotif = useRef(null);
  const lastCryNotif = useRef(null);

  // Use same IP as test dashboard - works across devices with Tailscale VPN
  const piHost = '100.89.162.22';
  const cameraPort = '8080'; // Camera 1 (Infant) - port 8080
  const cameraUrl = `http://${piHost}:${cameraPort}/?action=stream`;

  // Load baby info on mount
  useEffect(() => {
    fetchLatestVitals();
    fetchHistoricalData();
    fetchBabyList(); // Load baby list on mount
    loadLastBabyInfo(); // Load last registered baby
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to load the last registered baby info
  const loadLastBabyInfo = async () => {
    try {
      console.log('📋 Loading last registered baby info...');
      const response = await fetch(`http://${piHost}:8886/api/baby/current`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.baby) {
          setActiveBaby(data.baby);
          console.log('✅ Loaded baby info:', data.baby);
        } else {
          console.log('ℹ️ No baby currently registered');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load last baby info:', error);
    }
  };

  // Debug: Log vitals when they change
  useEffect(() => {
    console.log('🏥 ClinicalDashboard received vitals:', vitals);
  }, [vitals]);

  // Debug: Log jaundice data
  useEffect(() => {
    console.log('🟡 ClinicalDashboard received jaundiceData:', jaundiceData);
  }, [jaundiceData]);

  // Debug: Log cry data
  useEffect(() => {
    console.log('👶 ClinicalDashboard received cryData:', cryData);
  }, [cryData]);

  // Create notifications for jaundice detections
  useEffect(() => {
    if (jaundiceData) {
      console.log('🟡 Processing jaundice data:', jaundiceData);
      
      // Extract values from ThingsBoard format - use correct keys
      const brightness = jaundiceData.jaundice_brightness?.[0]?.value;
      const confidence = jaundiceData.jaundice_confidence?.[0]?.value;
      const reliability = jaundiceData.jaundice_reliability?.[0]?.value;
      const statusRaw = jaundiceData.jaundice_status?.[0]?.value;
      const timestamp = jaundiceData.jaundice_status?.[0]?.ts;

      // Status can be "Jaundice", "Normal", or boolean true/false
      const isJaundice = statusRaw === 'Jaundice' || statusRaw === true || statusRaw === 1 || statusRaw === "true" || statusRaw === "1";

      console.log('🟡 Extracted jaundice values:', { brightness, confidence, reliability, statusRaw, isJaundice, timestamp });

      // Only create notification if status is "Jaundice" (not Unknown or Normal)
      if (isJaundice && statusRaw !== 'Unknown' && timestamp !== lastJaundiceNotif.current) {
        console.log('🟡 ✅ Creating jaundice notification:', { confidence, brightness, reliability, status: statusRaw });
        
        // Determine risk level from confidence and reliability
        const riskLevel = confidence > 85 ? 'High' : confidence > 70 ? 'Medium' : 'Low';
        
        // Add brightness warning if light is too low
        const lowLight = brightness != null && brightness < 40;
        
        notificationService.createJaundiceNotification({
          confidence: confidence / 100 || 0,
          risk_level: riskLevel,
          brightness: brightness,
          low_light: lowLight,
          status: statusRaw
        });
        lastJaundiceNotif.current = timestamp;
      } else {
        console.log('🟡 ⏭️ Skipping jaundice notification:', { 
          isJaundice,
          status: statusRaw,
          isUnknown: statusRaw === 'Unknown',
          alreadyNotified: timestamp === lastJaundiceNotif.current
        });
      }
    }
  }, [jaundiceData]);

  // Create notifications for cry detections
  useEffect(() => {
    if (cryData) {
      console.log('👶 Processing cry data:', cryData);
      
      // Extract values from ThingsBoard format - use correct keys
      const detectedRaw = cryData.cry_detected?.[0]?.value;
      const audioLevel = cryData.cry_audio_level?.[0]?.value;
      const sensitivity = cryData.cry_sensitivity?.[0]?.value; // This is the confidence/sensitivity
      const totalDetections = cryData.cry_total_detections?.[0]?.value;
      const timestamp = cryData.cry_detected?.[0]?.ts;

      // Convert detected to boolean (handles string "true"/"false", number 1/0, or boolean)
      const detected = detectedRaw === true || detectedRaw === 1 || detectedRaw === "true" || detectedRaw === "1";

      console.log('👶 Extracted cry values:', { detectedRaw, detected, audioLevel, sensitivity, totalDetections, timestamp });

      // Create notification if cry is detected
      if (detected && audioLevel != null && timestamp !== lastCryNotif.current) {
        console.log('👶 ✅ Creating cry notification:', { detected, audioLevel, sensitivity, totalDetections });
        
        // Use sensitivity as confidence (it's already 0-1 range)
        const confidence = sensitivity || 0.7;
        
        notificationService.createCryNotification({
          confidence: confidence,
          is_crying: detected,
          audio_level: audioLevel || 0,
          timestamp: timestamp || Date.now()
        });
        lastCryNotif.current = timestamp;
      } else {
        console.log('👶 ⏭️ Skipping cry notification:', { 
          detected,
          audioLevel,
          hasAudioLevel: audioLevel != null,
          alreadyNotified: timestamp === lastCryNotif.current
        });
      }
    }
  }, [cryData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = () => {
    fetchLatestVitals();
    fetchHistoricalData();
  };

  // (testNotifications removed) — testing helpers removed from production UI

  // Baby Management Functions
  const fetchBabyList = async () => {
    setLoadingBabies(true);
    try {
      const response = await nteService.getBabyList();
      setBabyList(response.data.babies || []);
    } catch (error) {
      console.error('Failed to fetch baby list:', error);
    } finally {
      setLoadingBabies(false);
    }
  };

  const handleRegisterBaby = async (babyData) => {
    try {
      console.log('📝 Registering baby for INC-001:', babyData);
      
      // Prepare registration data exactly like test dashboard
      const registrationData = {
        baby_id: babyData.babyId,
        birth_date: babyData.birthDate,
        birth_time: babyData.birthTime,
        weight_g: parseInt(babyData.weight),
        name: babyData.name || undefined
      };

      // Call NTE API directly with fetch like test dashboard
      const response = await fetch(`http://100.89.162.22:8886/baby/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Baby registered:', data);
        setShowBabyModal(false);
        
        // Auto-assign this baby as active for INC-001
        setActiveBaby(data.data);
        
        // Refresh baby list
        await fetchBabyList();
        
        alert(`✅ Baby registered successfully for INC-001!\n\nBaby ID: ${babyData.babyId}\nCurrent Age: ${data.current_age_hours || 0} hours`);
      } else {
        throw new Error(data.detail || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Baby registration failed:', error);
      alert(`❌ Failed to register baby!\n\nError: ${error.message}`);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleSelectBaby = (event) => {
    const babyId = event.target.value;
    if (babyId) {
      const baby = babyList.find(b => b.baby_id === babyId);
      setActiveBaby(baby || null);
    } else {
      setActiveBaby(null);
    }
  };

  const handleExportData = () => {
    try {
      // Prepare data for export
      const exportData = [];
      
      // Header row
      exportData.push([
        'Timestamp',
        'Baby ID',
        'Baby Name',
        'SpO2 (%)',
        'Heart Rate (bpm)',
        'Skin Temp (°C)',
        'Humidity (%)',
        'Jaundice Detected',
        'Jaundice Confidence',
        'Cry Detected',
        'Cry Sensitivity',
        'NTE Range Min (°C)',
        'NTE Range Max (°C)'
      ]);

      // Add current vitals
      if (vitals) {
        const row = [
          new Date(vitals.timestamp || Date.now()).toLocaleString(),
          activeBaby?.baby_id || 'N/A',
          activeBaby?.name || 'N/A',
          vitals.spo2 || 'N/A',
          vitals.heart_rate || 'N/A',
          vitals.skin_temp || 'N/A',
          vitals.humidity || 'N/A',
          // Use jaundice_status to determine detection
          (jaundiceData?.jaundice_status?.[0]?.value === 'Jaundice') ? 'Yes' : 'No',
          jaundiceData?.jaundice_confidence?.[0]?.value || 'N/A',
          cryData?.cry_detected?.[0]?.value ? 'Yes' : 'No',
          // Use cry_sensitivity instead of cry_confidence
          cryData?.cry_sensitivity?.[0]?.value || 'N/A',
          nteData?.nte_range_min?.[0]?.value || 'N/A',
          nteData?.nte_range_max?.[0]?.value || 'N/A'
        ];
        exportData.push(row);
      }

      // Add historical data if available
      if (historicalData) {
        const maxLength = Math.max(
          historicalData.spo2?.length || 0,
          historicalData.heart_rate?.length || 0,
          historicalData.skin_temp?.length || 0,
          historicalData.humidity?.length || 0
        );

        for (let i = 0; i < maxLength; i++) {
          const row = [
            historicalData.spo2?.[i]?.timestamp ? new Date(historicalData.spo2[i].timestamp).toLocaleString() : 'N/A',
            activeBaby?.baby_id || 'N/A',
            activeBaby?.name || 'N/A',
            historicalData.spo2?.[i]?.value || 'N/A',
            historicalData.heart_rate?.[i]?.value || 'N/A',
            historicalData.skin_temp?.[i]?.value || 'N/A',
            historicalData.humidity?.[i]?.value || 'N/A',
            '', '', '', '', '', '' // Jaundice, Cry, NTE data not in historical
          ];
          exportData.push(row);
        }
      }

      // Convert to CSV
      const csvContent = exportData.map(row => row.join(',')).join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = `INC-001_Statistics_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Data exported successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
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
      color: 'amber'
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
      color: 'crimson'
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
      color: 'coral'
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
      color: 'teal'
    }
  ];

  const statusLabelMap = {
    normal: 'Normal',
    warning: 'Attention',
    critical: 'Critical',
    unknown: 'No Data'
  };

  const [currentSection, setCurrentSection] = useState('overview');
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('clinicalTheme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('clinicalTheme', theme);
    document.body.dataset.clinicalTheme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className={`clinical-dashboard theme-${theme}`}>
      {/* Header */}
      <header className="dashboard-header">
        <div className="nav-container">
          <div className="nav-left">
            <div className="brand-block">
              <div className="brand-emblem" aria-label="Karapitiya Teaching Hospital NICU">
                <img src={Logo} alt="National Hospital Galle NICU logo" className="brand-emblem-img" />
              </div>
              <div className="brand-text">
                <span className="brand-name"> National Hospital Galle</span>
                <span className="brand-sub">NICU Monitoring Unit</span>
              </div>
            </div>

            {/* patient summary removed from navbar per request */}
          </div>

          {/* center nav links removed: Home / Support / My account */}

          <div className="nav-right">
            <button
              type="button"
              className="icon-button"
              aria-label="Toggle theme"
              aria-pressed={theme === 'dark'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M18.364 18.364l-1.414-1.414M7.05 7.05 5.636 5.636M12 7a5 5 0 100 10 5 5 0 000-10z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
              {/* Massage button placed next to theme toggle as requested */}
              <button
                type="button"
                className="icon-button"
                title="Messages"
                aria-label="Messages"
                onClick={() => { console.log('Messages clicked'); /* TODO: open messages panel */ }}
              >
                {/* Inline SVG message/chat icon */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            {/* massage button moved into the notification/message icon */}

            <NotificationPanel />

            <div className="user-pill">
              <span className="user-avatar">{user?.name?.charAt(0) || 'D'}</span>
              <span className="user-name">{user?.name || 'Doctor'}</span>
            </div>

            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar Layout */}
      <div className="dashboard-layout">
        <Sidebar current={currentSection} onSelect={setCurrentSection} />

        <main className="dashboard-main">
          {/* If no device configured or ThingsBoard not available, show a helpful notice */}
          {(!deviceId || !vitals) && (
            <div className="no-data-notice" style={{
              border: '1px solid rgba(0,0,0,0.06)',
              background: '#fafafa',
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                {/* Simple spinner */}
                <div style={{width:24, height:24, borderRadius:12, border:'3px solid rgba(0,0,0,0.08)', borderTop:'3px solid #3b82f6', animation:'spin 1s linear infinite'}} />
                <div>
                  <div style={{fontWeight:700, marginBottom:6}}>Waiting for live telemetry…</div>
                  <div style={{color:'#666'}}>Loading data from ThingsBoard. If this takes long, please login to ThingsBoard.</div>
                </div>
              </div>
              <div style={{display:'flex', gap: '0.5rem'}}>
                <button className="btn" onClick={() => navigate('/login')}>Login</button>
              </div>
            </div>
          )}
          {/* Demo mode removed */}
          {/* Top actions moved out of header for a cleaner navbar */}
          <div className="top-actions">
            <div className="top-actions-left">
              {activeBaby ? (
                <>
                <div className="baby-card">
                  <div className="baby-avatar" aria-hidden="true">
                    <svg viewBox="0 0 1146.429 1629.769" fill="currentColor" aria-hidden="true" role="img">
  <g>
      <path d="M573.213,466.892c124.857,0,225.993-101.222,225.993-226.037c0-124.813-101.136-225.971-225.993-225.971   c-124.791,0-225.971,101.158-225.971,225.971C347.241,365.67,448.421,466.892,573.213,466.892"/>
      <path d="M572.819,939.348H333.971V766.831L151.244,950.717C68.691,1033.293-43.158,927.433,39.482,844.75l302.512-303.124   c24.552-24.334,51.399-39.834,93.987-39.834h136.838h0.24h134.258c42.566,0,71.403,14.998,96.589,39.834l305.617,306.076   c78.705,78.727-36.204,185.591-111.674,106.077L810.334,765.891v173.456H573.06H572.819z"/>
      <path d="M809.315,1028.754l-179.557,179.58l131.831,131.569l-135.067,135.088c-79.689,79.711,30.236,193.702,112.767,111.302   l213.553-222.123c45.824-46.786,58.526-133.209,9.379-182.356C962.047,1181.661,809.315,1028.754,809.315,1028.754"/>
      <path d="M334.036,1028.754l179.557,179.58l-131.875,131.569l135.089,135.088c79.711,79.711-30.301,193.702-112.745,111.302   L190.443,1364.17c-45.824-46.786-58.482-133.209-9.335-182.356C181.239,1181.661,334.036,1028.754,334.036,1028.754"/>
  </g>
                    </svg>
                  </div>
                  <div className="baby-card-details">
                    <div className="baby-id">{activeBaby.baby_id}</div>
                    <div className="baby-name">{activeBaby.name || ' '}</div>
                    <div className="baby-meta">{activeBaby.age_hours || 0}h • {activeBaby.weight_g || 0}g</div>
                  </div>
                  <div className="baby-card-actions">
                    <button onClick={handleExportData} className="btn-export-data small">Export {activeBaby.baby_id} Data</button>
                  </div>
                </div>
                {/* Large Register button placed after card */}
                <button onClick={() => setShowBabyModal(true)} className="btn-register-large"> + Register New Baby for INC 001</button>
                </>
              ) : (
                <div className="no-baby-info compact">
                  <span>No baby assigned</span>
                </div>
              )}
            </div>

            <div className="top-actions-right">
              {/* testNotifications removed from UI */}
            </div>
          </div>

          {/* When not on the overview, keep only the baby card and register button in the main area */}
          {currentSection === 'overview' && (
            <>
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
                      <article key={card.id} className={`vital-card card-${card.id} tone-${card.color} status-${status}`}>
                        <div className="vital-card-header">
                          <div className="vital-card-icon">{card.icon}</div>
                          <span className={`vital-card-status badge-${status}`}>
                            {statusLabelMap[status] || statusLabelMap.unknown}
                          </span>
                        </div>
                        <div className="vital-card-title">{card.label}</div>
                        <div className="vital-card-value">
                          <span className="value">{displayValue}</span>
                          <span className="unit">{card.unit}</span>
                        </div>
                        <div className="vital-card-wave" aria-hidden="true"></div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* Compact row: Jaundice + Cry + NTE (modern compact cards) */}
              <section className="compact-widgets-row">
                <div className="compact-widget">
                  <div className="compact-widget-header">Jaundice</div>
                  <div className="compact-widget-body">
                    <JaundiceWidget 
                      data={jaundiceData}
                      onDetectNow={handleDetectJaundiceNow}
                      detecting={detectingJaundice}
                    />
                  </div>
                </div>

                <div className="compact-widget">
                  <div className="compact-widget-header">Cry</div>
                  <div className="compact-widget-body">
                    <CryWidget 
                      data={cryData}
                    />
                  </div>
                </div>

                <div className="compact-widget">
                  <div className="compact-widget-header">NTE</div>
                  <div className="compact-widget-body">
                    <NTEWidget 
                      activeBaby={activeBaby}
                      vitals={vitals}
                      onBabyChange={handleSelectBaby}
                    />
                  </div>
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

              {/* Camera Section - Live Feed */}
              <section className="camera-section">
                <LiveCameraFeed 
                  deviceId="INC-001"
                  cameraUrl={cameraUrl}
                  title="Baby Monitor - NICU"
                />
              </section>
            </>
          )}
          {/* If a detail section is selected, render it as a full view in the main area */}
          {currentSection !== 'overview' && (currentSection === 'jaundice' ? (
            <section className="detail-fullview">
              <JaundiceDetail
                data={jaundiceData}
                onClose={() => setCurrentSection('overview')}
                onDetectNow={handleDetectJaundiceNow}
                detecting={detectingJaundice}
              />
            </section>
          ) : currentSection === 'cry' ? (
            <section className="detail-fullview">
              <CryDetail
                data={cryData}
                onClose={() => setCurrentSection('overview')}
              />
            </section>
          ) : currentSection === 'nte' ? (
            <section className="detail-fullview">
              <NTEDetail
                activeBaby={activeBaby}
                vitals={vitals}
                onClose={() => setCurrentSection('overview')}
              />
            </section>
          ) : null)}
        </main>
      </div>

      {/* Baby Registration Modal */}
      <BabyRegistrationModal 
        isOpen={showBabyModal}
        onClose={() => setShowBabyModal(false)}
        onSubmit={handleRegisterBaby}
      />
    </div>
  );
}

export default ClinicalDashboard;

