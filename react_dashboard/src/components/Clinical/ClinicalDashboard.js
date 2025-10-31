import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Line } from 'react-chartjs-2';
import JaundiceWidget from './JaundiceWidget';
import CryWidget from './CryWidget';
import BabyRegistrationModal from './BabyRegistrationModal';
import NTEWidget from './NTEWidget';
import AssignParentModal from './AssignParentModal';
import ParentMessagingPanel from './ParentMessagingPanel';
import CameraAccessManager from './CameraAccessManager';
import NotificationPanel from '../NotificationPanel/NotificationPanel';
import LiveCameraFeed from '../LiveCameraFeed/LiveCameraFeed';
import JaundiceDetail from './JaundiceDetail';
import CryDetail from './CryDetail';
import NTEDetail from './NTEDetail';
import parentService from '../../services/parent.service';
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
  const { vitals, historicalData, jaundiceData, cryData, nteData, deviceId, fetchLatestVitals, fetchHistoricalData, detectJaundiceNow } = useData();
  const navigate = useNavigate();
  const [detectingJaundice, setDetectingJaundice] = useState(false);

  // NTE State Management
  const [showBabyModal, setShowBabyModal] = useState(false);
  const [babyList, setBabyList] = useState([]);
  const [activeBaby, setActiveBaby] = useState(null);
  const [currentSection, setCurrentSection] = useState('overview');
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('clinicalTheme') === 'dark' ? 'dark' : 'light';
  });
  const [historyRange, setHistoryRange] = useState(1);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [autoSnapshotEnabled, setAutoSnapshotEnabled] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [alertVolume, setAlertVolume] = useState(65);
  const [soundProfile, setSoundProfile] = useState('balanced');
  const [showAssignParentModal, setShowAssignParentModal] = useState(false);
  const [showParentMessages, setShowParentMessages] = useState(false);
  const [assignedParents, setAssignedParents] = useState([]);
  const [parentsLoading, setParentsLoading] = useState(false);
  const [parentFeatureError, setParentFeatureError] = useState('');
  const [cameraAccessQueue, setCameraAccessQueue] = useState([]);
  const [cameraQueueLoading, setCameraQueueLoading] = useState(false);
  const [showCameraManager, setShowCameraManager] = useState(false);
  const [cameraActionProgress, setCameraActionProgress] = useState({});
  const parentFeaturesEnabled = parentService.hasBackend && !!parentService.clinicianApiKey;


  // Notification tracking to prevent duplicates
  const lastJaundiceNotif = useRef(null);
  const lastCryNotif = useRef(null);
  const cameraRequestSignatures = useRef(new Set());
  const pendingCameraRequests = useMemo(
    () => cameraAccessQueue.filter(entry => entry.pendingRequest).length,
    [cameraAccessQueue]
  );

  const refreshCameraAccessQueue = useCallback(async () => {
    if (!parentFeaturesEnabled) {
      setCameraAccessQueue([]);
      cameraRequestSignatures.current.clear();
      return;
    }

    try {
      setCameraQueueLoading(true);
      const entries = await parentService.listCameraAccessQueue();
      setCameraAccessQueue(entries);

      const pendingEntries = entries.filter(entry => entry.pendingRequest);
      const signatureSet = cameraRequestSignatures.current;
      const activeSignatures = new Set();

      pendingEntries.forEach(entry => {
        const signature = `${entry.parentId}-${entry.babyId}-${entry.requestedAt || entry.updatedAt || entry.status}`;
        activeSignatures.add(signature);
        if (!signatureSet.has(signature)) {
          notificationService.addNotification({
            type: 'camera',
            severity: 'warning',
            title: 'Camera access request',
            message: `${entry.parentName || entry.phone || 'Parent'} requested live view for baby ${entry.babyId}`,
            data: {
              parentId: entry.parentId,
              babyId: entry.babyId
            }
          });
          signatureSet.add(signature);
        }
      });

      signatureSet.forEach(signature => {
        if (!activeSignatures.has(signature)) {
          signatureSet.delete(signature);
        }
      });
    } catch (error) {
      console.error('Failed to load camera access queue:', error);
    } finally {
      setCameraQueueLoading(false);
    }
  }, [parentFeaturesEnabled]);

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
      const response = await fetch(`http://${piHost}:8886/api/baby/current`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.baby) {
          setActiveBaby(data.baby);
        } else {
        }
      }
    } catch (error) {
      console.error('Failed to load last baby info:', error);
    }
  };

  const formatHistoryLabel = (timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }
    if (historyRange >= 24) {
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Debug: Log vitals when they change
  useEffect(() => {
  }, [vitals]);

  // Debug: Log jaundice data
  useEffect(() => {
  }, [jaundiceData]);

  // Debug: Log cry data
  useEffect(() => {
  }, [cryData]);

  // Create notifications for jaundice detections
  useEffect(() => {
    if (jaundiceData) {
      
      // Extract values from ThingsBoard format - use correct keys
      const brightness = jaundiceData.jaundice_brightness?.[0]?.value;
      const confidence = jaundiceData.jaundice_confidence?.[0]?.value;
      const statusRaw = jaundiceData.jaundice_status?.[0]?.value;
      const timestamp = jaundiceData.jaundice_status?.[0]?.ts;

      // Status can be "Jaundice", "Normal", or boolean true/false
      const isJaundice = statusRaw === 'Jaundice' || statusRaw === true || statusRaw === 1 || statusRaw === "true" || statusRaw === "1";


      // Only create notification if status is "Jaundice" (not Unknown or Normal)
      if (isJaundice && statusRaw !== 'Unknown' && timestamp !== lastJaundiceNotif.current) {
        
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
      }
    }
  }, [jaundiceData]);

  // Create notifications for cry detections
  useEffect(() => {
    if (cryData) {
      
      // Extract values from ThingsBoard format - use correct keys
      const detectedRaw = cryData.cry_detected?.[0]?.value;
      const audioLevel = cryData.cry_audio_level?.[0]?.value;
      const sensitivity = cryData.cry_sensitivity?.[0]?.value; // This is the confidence/sensitivity
      const timestamp = cryData.cry_detected?.[0]?.ts;

      // Convert detected to boolean (handles string "true"/"false", number 1/0, or boolean)
      const detected = detectedRaw === true || detectedRaw === 1 || detectedRaw === "true" || detectedRaw === "1";


      // Create notification if cry is detected
      if (detected && audioLevel != null && timestamp !== lastCryNotif.current) {
        
        // Use sensitivity as confidence (it's already 0-1 range)
        const confidence = sensitivity || 0.7;
        
        notificationService.createCryNotification({
          confidence: confidence,
          is_crying: detected,
          audio_level: audioLevel || 0,
          timestamp: timestamp || Date.now()
        });
        lastCryNotif.current = timestamp;
      }
    }
  }, [cryData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };// (testNotifications removed) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â testing helpers removed from production UI

  // Baby Management Functions
  const fetchBabyList = async () => {
    try {
      const response = await nteService.getBabyList();
      setBabyList(response.data.babies || []);
    } catch (error) {
      console.error('Failed to fetch baby list:', error);
    } finally {
    }
  };

  const handleRegisterBaby = async (babyData) => {
    try {
      
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
        setShowBabyModal(false);
        
        // Auto-assign this baby as active for INC-001
        setActiveBaby(data.data);
        
        // Refresh baby list
        await fetchBabyList();
        
        alert(`Baby registered successfully for INC-001!\n\nBaby ID: ${babyData.babyId}\nCurrent Age: ${data.current_age_hours || 0} hours`);
      } else {
        throw new Error(data.detail || 'Registration failed');
      }
    } catch (error) {
      console.error('Baby registration failed:', error);
      alert(`Failed to register baby!\n\nError: ${error.message}`);
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
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleRunDiagnostics = () => {
    console.log('Running service diagnostics (placeholder).');
  };

  const handleExportSettingsSnapshot = () => {
    console.log('Exporting settings snapshot (placeholder).');
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
    const paletteSet = chartPalette[parameter] || chartPalette.default;
    const palette = theme === 'dark' ? paletteSet.dark : paletteSet.light;

    const emptyDataset = {
      labels: [],
      datasets: [{
        label: parameter.replace('_', ' ').toUpperCase(),
        data: [],
        borderColor: palette.line,
        backgroundColor: palette.base,
        fill: true,
        tension: 0.45,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 12,
        borderWidth: 2.5
      }]
    };

    if (!historicalData || !historicalData[parameter]) {
      return emptyDataset;
    }

    // Ensure series are ordered oldest -> newest on the x-axis. ThingsBoard may return
    // entries in descending time order which inverts the chart timeline. We sort by
    // timestamp (robust to string/number timestamps).
    const raw = historicalData[parameter] || [];
    const series = Array.isArray(raw)
      ? raw.slice().sort((a, b) => {
          const ta = a && a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tb = b && b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return ta - tb;
        })
      : [];

    return {
      labels: series.map(d => formatHistoryLabel(d.timestamp)),
      datasets: [{
        label: parameter.replace('_', ' ').toUpperCase(),
        data: series.map(d => d.value),
        borderColor: palette.line,
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) {
            return palette.base;
          }
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, palette.gradient[0]);
          gradient.addColorStop(1, palette.gradient[1]);
          return gradient;
        },
        fill: true,
        tension: 0.45,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 14,
        borderWidth: 2.5
      }]
    };
  };

  const handleHistoryRangeChange = (value) => {
    if (value === historyRange || isHistoryLoading) return;
    setHistoryRange(value);
  };

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;

    const loadHistory = async () => {
      setIsHistoryLoading(true);
      try {
        await fetchHistoricalData(historyRange);
      } catch (err) {
        console.error('Failed to load historical data:', err);
      } finally {
        if (!cancelled) {
          setIsHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [deviceId, historyRange, fetchHistoricalData]);

  const chartOptions = useMemo(() => {
    const axisColor = theme === 'dark' ? 'rgba(222, 247, 239, 0.85)' : 'rgba(15, 47, 38, 0.68)';
    const gridColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 47, 38, 0.08)';
    const tooltipBg = theme === 'dark' ? 'rgba(8, 26, 21, 0.92)' : 'rgba(255, 255, 255, 0.92)';
    const tooltipColor = theme === 'dark' ? '#e6fff6' : '#123d32';
    const tickLimit = historyRange <= 1 ? 6 : historyRange <= 4 ? 8 : historyRange <= 6 ? 10 : 12;

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipColor,
          bodyColor: tooltipColor,
          borderWidth: 0,
          padding: 12,
          displayColors: false
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: gridColor,
            drawBorder: false
          },
          ticks: {
            color: axisColor,
            font: {
              family: 'Inter, sans-serif',
              size: 11
            },
            padding: 10
          }
        },
        x: {
          grid: {
            color: gridColor,
            drawBorder: false,
            display: false
          },
          ticks: {
            color: axisColor,
            font: {
              family: 'Inter, sans-serif',
              size: 11
            },
            maxRotation: 0,
            padding: 12,
            maxTicksLimit: tickLimit
          }
        }
      },
      layout: {
        padding: {
          top: 10,
          bottom: 10,
          left: 0,
          right: 0
        }
      }
    };
  }, [theme, historyRange]);

  const vitalCards = [
    {
      id: 'spo2',
      label: 'SpO\u2082',
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

  const chartPalette = {
    spo2: {
      light: {
        line: '#f59e0b',
        gradient: ['rgba(245, 158, 11, 0.12)', 'rgba(253, 230, 138, 0.55)'],
        base: 'rgba(245, 158, 11, 0.08)'
      },
      dark: {
        line: '#fcd34d',
        gradient: ['rgba(249, 115, 22, 0.08)', 'rgba(253, 224, 71, 0.35)'],
        base: 'rgba(249, 168, 37, 0.12)'
      }
    },
    heart_rate: {
      light: {
        line: '#dc2626',
        gradient: ['rgba(248, 113, 113, 0.12)', 'rgba(248, 113, 113, 0.6)'],
        base: 'rgba(248, 113, 113, 0.08)'
      },
      dark: {
        line: '#f87171',
        gradient: ['rgba(244, 63, 94, 0.08)', 'rgba(248, 113, 113, 0.45)'],
        base: 'rgba(248, 113, 113, 0.12)'
      }
    },
    skin_temp: {
      light: {
        line: '#f97316',
        gradient: ['rgba(249, 115, 22, 0.1)', 'rgba(251, 191, 36, 0.55)'],
        base: 'rgba(249, 115, 22, 0.08)'
      },
      dark: {
        line: '#fb923c',
        gradient: ['rgba(249, 115, 22, 0.08)', 'rgba(251, 191, 36, 0.4)'],
        base: 'rgba(251, 146, 60, 0.12)'
      }
    },
    humidity: {
      light: {
        line: '#0ea5e9',
        gradient: ['rgba(14, 165, 233, 0.1)', 'rgba(125, 211, 252, 0.55)'],
        base: 'rgba(14, 165, 233, 0.08)'
      },
      dark: {
        line: '#38bdf8',
        gradient: ['rgba(14, 165, 233, 0.08)', 'rgba(125, 211, 252, 0.4)'],
        base: 'rgba(56, 189, 248, 0.12)'
      }
    },
    default: {
      light: {
        line: '#22c55e',
        gradient: ['rgba(34, 197, 94, 0.1)', 'rgba(134, 239, 172, 0.45)'],
        base: 'rgba(34, 197, 94, 0.08)'
      },
      dark: {
        line: '#4ade80',
        gradient: ['rgba(34, 197, 94, 0.08)', 'rgba(134, 239, 172, 0.35)'],
        base: 'rgba(74, 222, 128, 0.12)'
      }
    }
  };

  const statusLabelMap = {
    normal: 'Normal',
    warning: 'Attention',
    critical: 'Critical',
    unknown: 'No Data'
  };
  const historyOptions = useMemo(() => ([
    { label: '1H', value: 1 },
    { label: '4H', value: 4 },
    { label: '6H', value: 6 },
    { label: '24H', value: 24 },
    { label: '7D', value: 24 * 7 }
  ]), []);
  const historyLabel = useMemo(() => {
    if (historyRange >= 24) {
      const days = historyRange / 24;
      if (Number.isInteger(days)) {
        return `${days} Day${days > 1 ? 's' : ''}`;
      }
      return `${historyRange} Hours`;
    }
    return `${historyRange} Hour${historyRange > 1 ? 's' : ''}`;
  }, [historyRange]);
  const waitingNoticeStyles = useMemo(() => {
    const baseContainer = {
      padding: '1rem',
      marginBottom: '1rem',
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    };

    const container = theme === 'dark'
      ? {
          ...baseContainer,
          border: '1px solid rgba(66, 187, 157, 0.22)',
          background: 'rgba(8, 26, 21, 0.88)',
          color: '#d6f3eb'
        }
      : {
          ...baseContainer,
          border: '1px solid rgba(0,0,0,0.06)',
          background: '#fafafa',
          color: '#0f2f26'
        };

    return {
      container,
      spinnerRing: theme === 'dark' ? 'rgba(94, 241, 208, 0.25)' : 'rgba(0,0,0,0.08)',
      spinnerAccent: theme === 'dark' ? '#5eead4' : '#3b82f6',
      subtitle: theme === 'dark' ? 'rgba(202, 236, 225, 0.8)' : '#666666'
    };
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('clinicalTheme', theme);
    document.body.dataset.clinicalTheme = theme;
  }, [theme]);

  useEffect(() => {
    if (!parentService.hasBackend) {
      setParentFeatureError('Parent backend URL not configured. Set REACT_APP_PARENT_API_URL in the dashboard .env.');
      setAssignedParents([]);
      return;
    }
    if (!parentService.clinicianApiKey) {
      setParentFeatureError('Clinician API key missing. Set REACT_APP_PARENT_CLINICIAN_KEY in the dashboard .env.');
      setAssignedParents([]);
      return;
    }
    setParentFeatureError('');
  }, [parentFeaturesEnabled]);

  useEffect(() => {
    if (!parentFeaturesEnabled || !activeBaby?.baby_id) {
      if (!activeBaby?.baby_id) {
        setAssignedParents([]);
      }
      setParentsLoading(false);
      return;
    }

    let isMounted = true;
    setParentsLoading(true);

    parentService.listParents(activeBaby.baby_id)
      .then(data => {
        if (!isMounted) return;
        setAssignedParents(data);
        setParentFeatureError('');
      })
      .catch(err => {
        if (!isMounted) return;
        setParentFeatureError(err?.message || 'Failed to load parent assignments.');
      })
      .finally(() => {
        if (isMounted) setParentsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [parentFeaturesEnabled, activeBaby?.baby_id]);

  useEffect(() => {
    if (!parentFeaturesEnabled) {
      setCameraAccessQueue([]);
      cameraRequestSignatures.current.clear();
      setCameraQueueLoading(false);
      setCameraActionProgress({});
      return undefined;
    }

    refreshCameraAccessQueue();
    const interval = setInterval(() => {
      refreshCameraAccessQueue();
    }, 20000);

    return () => clearInterval(interval);
  }, [parentFeaturesEnabled, refreshCameraAccessQueue]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleOpenParentMessages = () => {
    if (!parentFeaturesEnabled) {
      setParentFeatureError(prev => prev || 'Parent messaging backend not configured.');
      return;
    }
    if (!activeBaby?.baby_id) {
      setParentFeatureError('Select a baby before opening messages.');
      return;
    }
    setShowParentMessages(true);
  };

  const handleCloseParentMessages = () => setShowParentMessages(false);

  const handleOpenAssignParent = () => {
    if (!parentFeaturesEnabled) {
      setParentFeatureError(prev => prev || 'Parent assignment backend not configured.');
      return;
    }
    if (!activeBaby?.baby_id) {
      setParentFeatureError('Register or select a baby before assigning a parent.');
      return;
    }
    setShowAssignParentModal(true);
  };

  const handleCloseAssignParent = () => setShowAssignParentModal(false);

  const handleInviteCreated = async () => {
    if (!parentFeaturesEnabled || !activeBaby?.baby_id) return;
    try {
      const updated = await parentService.listParents(activeBaby.baby_id);
      setAssignedParents(updated);
      setParentFeatureError('');
    } catch (err) {
      setParentFeatureError(err?.message || 'Failed to refresh parent assignments.');
    }
  };

  const handleOpenCameraManager = () => {
    if (!parentFeaturesEnabled) {
      setParentFeatureError(prev => prev || 'Parent backend not configured.');
      return;
    }
    refreshCameraAccessQueue();
    setShowCameraManager(true);
  };

  const handleCloseCameraManager = () => setShowCameraManager(false);

  const handleCameraToggle = useCallback(
    async (entry, nextStatus) => {
      if (!parentFeaturesEnabled) return;

      setCameraActionProgress(prev => ({ ...prev, [entry.parentId]: true }));
      try {
        await parentService.updateCameraAccess({
          parentId: entry.parentId,
          babyId: entry.babyId,
          status: nextStatus,
          parentName: entry.parentName
        });
        await refreshCameraAccessQueue();
        setParentFeatureError('');
      } catch (error) {
        console.error('Failed to update camera access:', error);
        setParentFeatureError(error?.message || 'Unable to update camera access.');
      } finally {
        setCameraActionProgress(prev => {
          const next = { ...prev };
          delete next[entry.parentId];
          return next;
        });
      }
    },
    [parentFeaturesEnabled, refreshCameraAccessQueue]
  );

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
                <span className="brand-name">National Hospital Galle</span>
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
                className="icon-button message-button"
                title="Parent messages"
                aria-label="Parent messages"
                onClick={handleOpenParentMessages}
                disabled={!parentFeaturesEnabled || !activeBaby?.baby_id}
              >
                {/* Inline SVG message/chat icon */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {assignedParents.length > 0 && (
                  <span className="message-count">{assignedParents.length}</span>
                )}
              </button>
            {/* massage button moved into the notification/message icon */}

            {parentFeaturesEnabled && (
              <button
                type="button"
                className={`icon-button camera-alert ${pendingCameraRequests > 0 ? 'has-alert' : ''}`}
                title="Camera access requests"
                aria-label="Camera access requests"
                aria-busy={cameraQueueLoading}
                onClick={handleOpenCameraManager}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7h2l1.2-1.8A2 2 0 018.3 4h7.4a2 2 0 011.7.9L18.7 7H21a1 1 0 011 1v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a1 1 0 011-1z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                {pendingCameraRequests > 0 && (
                  <span className="notification-badge">{pendingCameraRequests}</span>
                )}
              </button>
            )}

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
          <div className="no-data-notice" style={waitingNoticeStyles.container}>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              {/* Simple spinner */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  border: `3px solid ${waitingNoticeStyles.spinnerRing}`,
                  borderTop: `3px solid ${waitingNoticeStyles.spinnerAccent}`,
                  animation: 'spin 1s linear infinite'
                }}
              />
              <div>
                <div style={{fontWeight:700, marginBottom:6}}>Waiting for live data</div>
                <div style={{color: waitingNoticeStyles.subtitle}}>
                  Loading data.. this takes long, please login again.
                </div>
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
                    <div className="baby-meta">{activeBaby.age_hours || 0}h {activeBaby.weight_g || 0}g</div>
                  </div>
                  <div className="baby-card-actions">
                    <button onClick={handleExportData} className="btn-export-data small">Export {activeBaby.baby_id} Data</button>
                    <button
                      type="button"
                      className="btn-assign-parent small"
                      onClick={handleOpenAssignParent}
                      disabled={!parentFeaturesEnabled || !activeBaby?.baby_id || parentsLoading}
                    >
                      {parentsLoading ? 'Checking access...' : 'Assign parent access'}
                    </button>
                  </div>
                  {parentFeaturesEnabled && assignedParents.length > 0 && (
                    <p className="assigned-parent-list">
                      Parents: {assignedParents.map(parent => parent.name || parent.phone || 'Parent').join(', ')}
                    </p>
                  )}
                  {parentFeatureError && (
                    <p className="assigned-parent-error">{parentFeatureError}</p>
                  )}
                </div>
                {/* Large Register button placed after card */}
                <button onClick={() => setShowBabyModal(true)} className="btn-register-large"> + Register New Baby for INC 001</button>
                </>
              ) : (
                <div className="no-baby-info compact">
                  <span className="no-baby-label">No baby assigned</span>
                  <button
                    type="button"
                    onClick={() => setShowBabyModal(true)}
                    className="btn-register-large"
                  >
                    + Register New Baby for INC 001
                  </button>
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
                {/* NTE: wider, spans two rows visually */}
                <div className="compact-widget nte">
                  {/* <div className="widget-title-label"></div> */}
                  <NTEWidget 
                    compact={true}
                    activeBaby={activeBaby}
                    vitals={vitals}
                    onBabyChange={handleSelectBaby}
                  />
                </div>

                {/* Right column: Jaundice (top) */}
                <div className="compact-widget jaundice">
                  {/* <div className="widget-title-label"></div> */}
                  <JaundiceWidget 
                    compact={true}
                    data={jaundiceData}
                    onDetectNow={handleDetectJaundiceNow}
                    detecting={detectingJaundice}
                  />
                </div>

                {/* Right column: Cry (bottom) */}
                <div className="compact-widget cry">
                  {/* <div className="widget-title-label"></div> */}
                    <CryWidget 
                      compact={true}
                      data={cryData}
                    />
                </div>
              </section>
            </>
          )}
          {/* If a detail section is selected, render it as a full view in the main area */}
          {currentSection !== 'overview' && (currentSection === 'vitals' ? (
            <section className="detail-fullview">
              <div className="detail-view detail-vitals">
                <div className="detail-view-bar">
                  <button
                    type="button"
                    className="detail-close"
                    onClick={() => setCurrentSection('overview')}
                    aria-label="Close vital monitoring view"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="detail-heading">
                  <h3>Live Vital Monitoring</h3>
                  <p className="detail-note">
                    Track the latest vital measurements alongside historical trends for rapid bedside assessments.
                  </p>
                </div>

                <div className="vitals-grid">
                  {vitalCards.map(card => {
                    const valueToDisplay = card.value;

                    const displayValue = (() => {
                      if (!valueToDisplay) return 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â';
                      if (Array.isArray(valueToDisplay) && valueToDisplay.length > 0) {
                        const raw = valueToDisplay[0]?.value;
                        if (raw === null || raw === undefined || raw === '') return 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â';
                        return typeof raw === 'number' ? raw.toFixed(card.unit.trim() === '%' ? 0 : 1) : raw;
                      }
                      if (typeof valueToDisplay === 'object' && 'value' in valueToDisplay) {
                        const raw = valueToDisplay.value;
                        if (raw === null || raw === undefined || raw === '') return 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â';
                        return typeof raw === 'number' ? raw.toFixed(card.unit.trim() === '%' ? 0 : 1) : raw;
                      }
                      if (typeof valueToDisplay === 'number') {
                        return valueToDisplay.toFixed(card.unit.trim() === '%' ? 0 : 1);
                      }
                      return valueToDisplay;
                    })();

                    const status = getVitalStatus(card.id, card.value);

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

                <div className="charts-section detail">
                  <div className="section-header">
                    <h2>Historical Trends {'\u00b7'} {historyLabel}</h2>
                  </div>

                  <div className="chart-toolbar" role="group" aria-label="Select timeframe">
                    <span className="toolbar-label">Timeframe</span>
                    <div className="timeframe-options">
                      {historyOptions.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          className={`timeframe-button ${historyRange === option.value ? 'active' : ''}`}
                          onClick={() => handleHistoryRangeChange(option.value)}
                          disabled={isHistoryLoading && historyRange === option.value}
                        >
                          {option.label}
                          {isHistoryLoading && historyRange === option.value && (
                            <span className="timeframe-spinner" aria-hidden="true" />
                          )}
                        </button>
                      ))}
                    </div>
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
                </div>
              </div>
            </section>
          ) : currentSection === 'jaundice' ? (
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
          ) : currentSection === 'settings' ? (
            <section className="detail-fullview">
              <div className="detail-view detail-settings">
                <div className="detail-view-bar">
                  <button
                    type="button"
                    className="detail-close"
                    onClick={() => setCurrentSection('overview')}
                    aria-label="Close settings view"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="detail-heading">
                  <h3>Workspace preferences</h3>
                  <p className="detail-note">
                    Align the dashboard presentation, alerting cadence, and upkeep routines with your ward workflow.
                  </p>
                </div>

                <div className="settings-grid">
                  <article className="settings-card settings-card--accent">
                    <div className="setting-header">
                      <div className="setting-icon palette" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="5.5" strokeWidth={1.6} />
                          <path d="M12 4v2.2M12 17.8V20M7.05 7.05L8.6 8.6M15.4 15.4l1.55 1.55" strokeWidth={1.6} strokeLinecap="round" />
                          <path d="M4 12h1.8M18.2 12H20" strokeWidth={1.6} strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="setting-text">
                        <h4>Appearance</h4>
                        <p>Choose lighting-friendly themes for evening rounds and teleconsults.</p>
                      </div>
                    </div>

                    <div className="settings-controls">
                      <div className="setting-toggle">
                        <div className="setting-copy">
                          <span className="setting-title">Dark mode</span>
                          <span className="setting-meta">Optimised for low ambient light in the NICU</span>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${theme === 'dark' ? 'active' : ''}`}
                          onClick={toggleTheme}
                          aria-pressed={theme === 'dark'}
                        >
                          <span className="toggle-thumb" />
                        </button>
                      </div>

                      <div className="setting-toggle">
                        <div className="setting-copy">
                          <span className="setting-title">Privacy glass</span>
                          <span className="setting-meta">Blur live feeds when the station is idle</span>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${privacyMode ? 'active' : ''}`}
                          onClick={() => setPrivacyMode(prev => !prev)}
                          aria-pressed={privacyMode}
                        >
                          <span className="toggle-thumb" />
                        </button>
                      </div>

                      <div className="setting-slider">
                        <div className="setting-copy">
                          <label htmlFor="setting-volume" className="setting-title">Notification volume</label>
                          <span className="setting-meta">Applies to cry & jaundice alert tones</span>
                        </div>
                        <div className="slider-track">
                          <input
                            id="setting-volume"
                            type="range"
                            min="0"
                            max="100"
                            value={alertVolume}
                            onChange={(event) => setAlertVolume(Number(event.target.value))}
                          />
                          <span className="slider-value">{alertVolume}%</span>
                        </div>
                      </div>
                    </div>
                  </article>

                  <article className="settings-card">
                    <div className="setting-header">
                      <div className="setting-icon bell" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path
                            d="M18 16v-4.5a6 6 0 10-12 0V16l-1.5 1.8a1 1 0 00.75 1.7H18.75a1 1 0 00.75-1.7L18 16z"
                            strokeWidth={1.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path d="M9.5 19a2.5 2.5 0 005 0" strokeWidth={1.6} strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="setting-text">
                        <h4>Clinical alerts</h4>
                        <p>Control automation for cry, jaundice, and vitals notifications.</p>
                      </div>
                    </div>

                    <div className="settings-controls">
                      <div className="setting-toggle">
                        <div className="setting-copy">
                          <span className="setting-title">Enable notifications</span>
                          <span className="setting-meta">Publish alert cards & sound cues to staff</span>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${alertsEnabled ? 'active' : ''}`}
                          onClick={() => setAlertsEnabled(prev => !prev)}
                          aria-pressed={alertsEnabled}
                        >
                          <span className="toggle-thumb" />
                        </button>
                      </div>

                      <div className="setting-toggle">
                        <div className="setting-copy">
                          <span className="setting-title">Auto snapshots</span>
                          <span className="setting-meta">Capture frames when critical thresholds trip</span>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${autoSnapshotEnabled ? 'active' : ''}`}
                          onClick={() => setAutoSnapshotEnabled(prev => !prev)}
                          aria-pressed={autoSnapshotEnabled}
                        >
                          <span className="toggle-thumb" />
                        </button>
                      </div>

                      <div className="setting-select">
                        <label htmlFor="sound-profile" className="setting-title">Sound profile</label>
                        <select
                          id="sound-profile"
                          value={soundProfile}
                          onChange={(event) => setSoundProfile(event.target.value)}
                        >
                          <option value="gentle">Gentle</option>
                          <option value="balanced">Balanced</option>
                          <option value="urgent">Urgent</option>
                        </select>
                        <span className="setting-meta select-meta">
                          Adjusts the tone shape for speakers & pagers
                        </span>
                      </div>
                    </div>
                  </article>

                  <article className="settings-card compact">
                    <div className="setting-header">
                      <div className="setting-icon toolbox" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path
                            d="M4 7h16a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8a1 1 0 011-1z"
                            strokeWidth={1.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7" strokeWidth={1.6} strokeLinecap="round" />
                          <path d="M8 12h8" strokeWidth={1.6} strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="setting-text">
                        <h4>Quick maintenance</h4>
                        <p>Keep Pi services healthy and snapshot current preferences.</p>
                      </div>
                    </div>

                    <div className="settings-actions">
                      <button type="button" className="settings-quick primary" onClick={handleRunDiagnostics}>
                        <span>Run service check</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path d="M10 7l5 5-5 5" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button type="button" className="settings-quick" onClick={handleExportSettingsSnapshot}>
                        <span>Export preferences</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path d="M12 5v12m0 0l-4-4m4 4l4-4" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M5 19h14" strokeWidth={1.6} strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    <p className="settings-footnote">
                      Commands queue locally. Execute when the Pi tunnel is reachable via Tailscale.
                    </p>
                  </article>
                </div>
              </div>
            </section>
          ) : null)}

          {/* Video full view when selected from sidebar */}
          {currentSection === 'video' && (
            <section className="detail-fullview">
              <div className="detail-view detail-video">
                <div className="detail-view-bar">
                  <button
                    type="button"
                    className="detail-close"
                    onClick={() => setCurrentSection('overview')}
                    aria-label="Close live camera view"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="detail-video-heading">
                  <h3>Live Camera &middot; Full View</h3>
                  <p className="detail-note">
                    Monitor the incubator feed with snapshot exports, resolution controls, and connection diagnostics.
                  </p>
                </div>

                <LiveCameraFeed
                  deviceId="INC-001"
                  cameraUrl={cameraUrl}
                  title={`Live Camera - ${activeBaby?.baby_id || 'INC-001'}`}
                  showControls={true}
                  onSnapshot={() => {}}
                />

                <p className="detail-note">
                  Tip: use the snapshot action to export an image. Recording remains a placeholder until streaming support is provided.
                </p>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Baby Registration Modal */}
      <BabyRegistrationModal 
        isOpen={showBabyModal}
        onClose={() => setShowBabyModal(false)}
        onSubmit={handleRegisterBaby}
      />

      {showAssignParentModal && (
        <AssignParentModal
          isOpen={showAssignParentModal}
          onClose={handleCloseAssignParent}
          baby={activeBaby}
          parents={assignedParents}
          onInviteCreated={handleInviteCreated}
        />
      )}

      {showParentMessages && (
        <ParentMessagingPanel
          isOpen={showParentMessages}
          onClose={handleCloseParentMessages}
          baby={activeBaby}
          clinicianName={user?.name}
          parents={assignedParents}
        />
      )}

      {showCameraManager && (
        <CameraAccessManager
          isOpen={showCameraManager}
          onClose={handleCloseCameraManager}
          requests={cameraAccessQueue}
          onToggle={handleCameraToggle}
          loadingMap={cameraActionProgress}
        />
      )}
    </div>
  );
}

export default ClinicalDashboard;











