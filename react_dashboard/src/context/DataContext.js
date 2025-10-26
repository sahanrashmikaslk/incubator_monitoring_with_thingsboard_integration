import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import tbService from '../services/thingsboard.service';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [latestVitals, setLatestVitals] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [jaundiceData, setJaundiceData] = useState(null);
  const [cryData, setCryData] = useState(null);
  const [nteData, setNteData] = useState(null); // Add NTE data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  // Fetch device ID
  const fetchDeviceId = useCallback(async () => {
    try {
      const deviceName = process.env.REACT_APP_DEVICE_ID || 'INC-001';
      
      // Only try ThingsBoard if user is authenticated and NOT in demo mode
      if (user && !user.isDemo && tbService.isAuthenticated()) {
        try {
          const device = await tbService.getDevice(deviceName);
          setDeviceId(device.id.id);
          console.log('✅ Connected to ThingsBoard device:', deviceName, device.id.id);
        } catch (err) {
          // Fallback to demo mode if ThingsBoard is not available
          console.warn('⚠️ ThingsBoard not available, using demo mode:', err.message);
          setDeviceId('demo-device-id-' + deviceName);
        }
      } else {
        // Use demo mode for demo users or unauthenticated users
        console.log('📋 Using demo mode');
        setDeviceId('demo-device-id-' + deviceName);
      }
    } catch (err) {
      console.error('Failed to fetch device ID:', err);
      setError(err.message);
      // Use demo device ID as fallback
      setDeviceId('demo-device-id-INC-001');
    }
  }, [user]);

  // Fetch latest telemetry
  const fetchLatestVitals = useCallback(async () => {
    if (!deviceId) return;

    try {
      // Check if using demo mode
      if (deviceId.startsWith('demo-device-id-')) {
        // Generate demo data
        const demoData = {
          spo2: [{ ts: Date.now(), value: 95 + Math.floor(Math.random() * 5) }],
          heart_rate: [{ ts: Date.now(), value: 160 + Math.floor(Math.random() * 20) }],
          skin_temp: [{ ts: Date.now(), value: 36.0 + Math.random() }],
          humidity: [{ ts: Date.now(), value: 60 + Math.floor(Math.random() * 10) }]
        };
        setLatestVitals(demoData);
      } else {
        // Real ThingsBoard API call
        const data = await tbService.getLatestTelemetry(deviceId);
        console.log('Received telemetry from ThingsBoard:', data);
        setLatestVitals(data);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch vitals:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [deviceId]);

  // Fetch jaundice detection data from ThingsBoard
  const fetchJaundiceData = useCallback(async () => {
    if (!deviceId) return;

    try {
      // Check if using demo mode
      if (deviceId.startsWith('demo-device-id-')) {
        // Generate demo jaundice data
        const demoData = {
          jaundice_detected: [{ ts: Date.now(), value: Math.random() > 0.5 }],
          jaundice_confidence: [{ ts: Date.now(), value: 75 + Math.floor(Math.random() * 20) }],
          jaundice_probability: [{ ts: Date.now(), value: 75 + Math.floor(Math.random() * 20) }],
          jaundice_brightness: [{ ts: Date.now(), value: 60 + Math.floor(Math.random() * 40) }],
          jaundice_reliability: [{ ts: Date.now(), value: 80 + Math.floor(Math.random() * 15) }],
          jaundice_status: [{ ts: Date.now(), value: Math.random() > 0.5 ? 'Jaundice' : 'Normal' }]
        };
        setJaundiceData(demoData);
        console.log('📊 Demo jaundice data:', demoData);
      } else {
        // Fetch from ThingsBoard telemetry
        const jaundiceKeys = [
          'jaundice_detected',
          'jaundice_confidence', 
          'jaundice_probability',
          'jaundice_brightness',
          'jaundice_reliability',
          'jaundice_status'
        ];
        
        const data = await tbService.getLatestTelemetry(deviceId, jaundiceKeys);
        console.log('📊 Received jaundice data from ThingsBoard:', data);
        
        // Check if we got any data
        if (Object.keys(data).length === 0) {
          console.warn('⚠️ No jaundice data available in ThingsBoard');
          setJaundiceData({ 
            status: 'no_detection',
            message: 'No detection data available yet',
            jaundice_detected: [{ ts: Date.now(), value: false }],
            jaundice_confidence: [{ ts: Date.now(), value: 0 }],
            jaundice_probability: [{ ts: Date.now(), value: 0 }],
            jaundice_brightness: [{ ts: Date.now(), value: 0 }],
            jaundice_reliability: [{ ts: Date.now(), value: 0 }]
          });
          return;
        }
        
        setJaundiceData(data);
      }
    } catch (err) {
      console.error('❌ Failed to fetch jaundice data from ThingsBoard:', err);
      
      // Set a default state instead of leaving it null
      setJaundiceData({ 
        status: 'error',
        message: 'Failed to fetch jaundice data from ThingsBoard',
        jaundice_detected: [{ ts: Date.now(), value: false }],
        jaundice_confidence: [{ ts: Date.now(), value: 0 }],
        jaundice_probability: [{ ts: Date.now(), value: 0 }],
        jaundice_brightness: [{ ts: Date.now(), value: 0 }],
        jaundice_reliability: [{ ts: Date.now(), value: 0 }]
      });
    }
  }, [deviceId]);

  // Manual jaundice detection - triggers Pi server then fetches from ThingsBoard
  const detectJaundiceNow = useCallback(async () => {
    try {
      // Use same IP as test dashboard - works across devices with Tailscale VPN
      const piHost = '100.89.162.22';
      const response = await fetch(`http://${piHost}:8887/detect`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Detection failed');
      }
      
      const data = await response.json();
      console.log('🔍 Manual detection triggered on Pi server:', data);
      
      // Wait a moment for Pi to publish to ThingsBoard, then fetch
      setTimeout(() => {
        fetchJaundiceData();
      }, 1500); // Wait 1.5 seconds for ThingsBoard to update
      
      return data;
    } catch (err) {
      console.error('❌ Manual detection failed:', err);
      throw err;
    }
  }, [fetchJaundiceData]);

  // Fetch cry detection data from ThingsBoard
  const fetchCryData = useCallback(async () => {
    if (!deviceId) return;

    try {
      // Check if using demo mode
      if (deviceId.startsWith('demo-device-id-')) {
        // Generate demo cry data
        const demoData = {
          cry_detected: [{ ts: Date.now(), value: Math.random() > 0.7 }],
          cry_audio_level: [{ ts: Date.now(), value: (Math.random() * 0.5).toFixed(3) }],
          cry_sensitivity: [{ ts: Date.now(), value: 0.6 }],
          cry_total_detections: [{ ts: Date.now(), value: Math.floor(Math.random() * 10) }],
          cry_monitoring: [{ ts: Date.now(), value: true }]
        };
        setCryData(demoData);
        console.log('👶 Demo cry data:', demoData);
      } else {
        // Fetch from ThingsBoard telemetry
        const cryKeys = [
          'cry_detected',
          'cry_audio_level', 
          'cry_sensitivity',
          'cry_total_detections',
          'cry_monitoring'
        ];
        
        const data = await tbService.getLatestTelemetry(deviceId, cryKeys);
        console.log('👶 Received cry data from ThingsBoard:', data);
        
        // Check if we got any data
        if (Object.keys(data).length === 0) {
          console.warn('⚠️ No cry data available in ThingsBoard');
          setCryData({ 
            status: 'no_detection',
            message: 'No cry detection data available yet',
            cry_detected: [{ ts: Date.now(), value: false }],
            cry_audio_level: [{ ts: Date.now(), value: 0 }],
            cry_sensitivity: [{ ts: Date.now(), value: 0.6 }],
            cry_total_detections: [{ ts: Date.now(), value: 0 }],
            cry_monitoring: [{ ts: Date.now(), value: false }]
          });
          return;
        }
        
        setCryData(data);
      }
    } catch (err) {
      console.error('❌ Failed to fetch cry data from ThingsBoard:', err);
      
      // Set a default state instead of leaving it null
      setCryData({ 
        status: 'error',
        message: 'Failed to fetch cry data from ThingsBoard',
        cry_detected: [{ ts: Date.now(), value: false }],
        cry_audio_level: [{ ts: Date.now(), value: 0 }],
        cry_sensitivity: [{ ts: Date.now(), value: 0.6 }],
        cry_total_detections: [{ ts: Date.now(), value: 0 }],
        cry_monitoring: [{ ts: Date.now(), value: false }]
      });
    }
  }, [deviceId]);

  // Fetch NTE data from ThingsBoard
  const fetchNTEData = useCallback(async () => {
    if (!deviceId) return;

    try {
      // Check if using demo mode
      if (deviceId.startsWith('demo-device-id-')) {
        // Generate demo NTE data
        const demoData = {
          nte_baby_id: [{ ts: Date.now(), value: 'DEMO001' }],
          nte_age_hours: [{ ts: Date.now(), value: 48 }],
          nte_weight_g: [{ ts: Date.now(), value: 3200 }],
          nte_range_min: [{ ts: Date.now(), value: 34.0 }],
          nte_range_max: [{ ts: Date.now(), value: 35.0 }],
          nte_critical_count: [{ ts: Date.now(), value: 0 }],
          nte_warning_count: [{ ts: Date.now(), value: 1 }],
          nte_info_count: [{ ts: Date.now(), value: 2 }],
          nte_latest_advice: [{ ts: Date.now(), value: 'Temperature within range' }],
          nte_latest_detail: [{ ts: Date.now(), value: 'Continue monitoring' }]
        };
        setNteData(demoData);
        console.log('🌡️ Demo NTE data:', demoData);
      } else {
        // Fetch from ThingsBoard telemetry
        const nteKeys = [
          'nte_baby_id',
          'nte_age_hours',
          'nte_weight_g',
          'nte_range_min',
          'nte_range_max',
          'nte_critical_count',
          'nte_warning_count',
          'nte_info_count',
          'nte_latest_advice',
          'nte_latest_detail',
          'nte_timestamp'
        ];
        
        const data = await tbService.getLatestTelemetry(deviceId, nteKeys);
        console.log('🌡️ Received NTE data from ThingsBoard:', data);
        
        // Check if we got any data
        if (Object.keys(data).length === 0) {
          console.warn('⚠️ No NTE data available in ThingsBoard');
          setNteData({ 
            status: 'no_data',
            message: 'No NTE data available yet',
            nte_baby_id: [{ ts: Date.now(), value: null }],
            nte_age_hours: [{ ts: Date.now(), value: 0 }],
            nte_weight_g: [{ ts: Date.now(), value: 0 }]
          });
          return;
        }
        
        setNteData(data);
      }
    } catch (err) {
      console.error('❌ Failed to fetch NTE data from ThingsBoard:', err);
      
      // Set a default state
      setNteData({ 
        status: 'error',
        message: 'Failed to fetch NTE data from ThingsBoard',
        nte_baby_id: [{ ts: Date.now(), value: null }],
        nte_age_hours: [{ ts: Date.now(), value: 0 }],
        nte_weight_g: [{ ts: Date.now(), value: 0 }]
      });
    }
  }, [deviceId]);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async (hours = 6) => {
    if (!deviceId) return;

    try {
      const endTs = Date.now();
      const startTs = endTs - (hours * 60 * 60 * 1000);

      // Check if using demo mode
      if (deviceId.startsWith('demo-device-id-')) {
        // Generate demo historical data
        const dataPoints = 50;
        const demoHistory = {
          spo2: Array.from({ length: dataPoints }, (_, i) => ({
            ts: startTs + (i * (endTs - startTs) / dataPoints),
            value: 95 + Math.floor(Math.random() * 5)
          })),
          heart_rate: Array.from({ length: dataPoints }, (_, i) => ({
            ts: startTs + (i * (endTs - startTs) / dataPoints),
            value: 160 + Math.floor(Math.random() * 20)
          })),
          skin_temp: Array.from({ length: dataPoints }, (_, i) => ({
            ts: startTs + (i * (endTs - startTs) / dataPoints),
            value: 36.0 + Math.random()
          })),
          humidity: Array.from({ length: dataPoints }, (_, i) => ({
            ts: startTs + (i * (endTs - startTs) / dataPoints),
            value: 60 + Math.floor(Math.random() * 10)
          }))
        };
        setHistoricalData(demoHistory);
      } else {
        // Real ThingsBoard API call
        const data = await tbService.getTelemetryHistory(
          deviceId, 
          ['spo2', 'heart_rate', 'skin_temp', 'humidity'], 
          startTs, 
          endTs
        );
        console.log('Received historical data from ThingsBoard:', data);
        setHistoricalData(data);
      }
    } catch (err) {
      console.error('Failed to fetch historical data:', err);
      setError(err.message);
    }
  }, [deviceId]);

  // Initialize
  useEffect(() => {
    fetchDeviceId();
  }, [fetchDeviceId]);

  // Start polling when device ID is available
  useEffect(() => {
    if (!deviceId) return;

    fetchLatestVitals();
    fetchHistoricalData();
    fetchJaundiceData();
    fetchCryData();

    // Poll vitals every 15 seconds
    const vitalsInterval = setInterval(() => {
      fetchLatestVitals();
    }, 15000);

    // Poll jaundice data every 30 seconds
    const jaundiceInterval = setInterval(() => {
      fetchJaundiceData();
    }, 30000);

    // Poll cry data every 15 seconds (more frequent for real-time cry detection)
    const cryInterval = setInterval(() => {
      fetchCryData();
    }, 15000);

    // Poll NTE data every 30 seconds
    const nteInterval = setInterval(() => {
      fetchNTEData();
    }, 30000);

    return () => {
      clearInterval(vitalsInterval);
      clearInterval(jaundiceInterval);
      clearInterval(cryInterval);
      clearInterval(nteInterval);
    };
  }, [deviceId, fetchLatestVitals, fetchHistoricalData, fetchJaundiceData, fetchCryData, fetchNTEData]);

  // Transform latestVitals to simpler format for components
  // Handle both ThingsBoard format [{ts, value}] and demo format (simple numbers)
  // Also convert strings to numbers (ThingsBoard sometimes returns string values)
  const vitals = latestVitals ? {
    spo2: Array.isArray(latestVitals.spo2) 
      ? parseFloat(latestVitals.spo2[0]?.value) 
      : parseFloat(latestVitals.spo2),
    heart_rate: Array.isArray(latestVitals.heart_rate) 
      ? parseFloat(latestVitals.heart_rate[0]?.value) 
      : parseFloat(latestVitals.heart_rate),
    skin_temp: Array.isArray(latestVitals.skin_temp) 
      ? parseFloat(latestVitals.skin_temp[0]?.value) 
      : parseFloat(latestVitals.skin_temp),
    humidity: Array.isArray(latestVitals.humidity) 
      ? parseFloat(latestVitals.humidity[0]?.value) 
      : parseFloat(latestVitals.humidity),
    timestamp: Array.isArray(latestVitals.spo2) 
      ? latestVitals.spo2[0]?.ts 
      : Date.now()
  } : null;

  // Debug logging
  if (vitals) {
    console.log('📊 Transformed vitals for display:', vitals);
  }

  // Transform historical data to simpler format
  // Handle both ThingsBoard format and demo format
  const transformedHistoricalData = historicalData ? {
    spo2: Array.isArray(historicalData.spo2) 
      ? historicalData.spo2.map(item => ({ timestamp: item.ts, value: item.value })) 
      : [],
    heart_rate: Array.isArray(historicalData.heart_rate) 
      ? historicalData.heart_rate.map(item => ({ timestamp: item.ts, value: item.value })) 
      : [],
    skin_temp: Array.isArray(historicalData.skin_temp) 
      ? historicalData.skin_temp.map(item => ({ timestamp: item.ts, value: item.value })) 
      : [],
    humidity: Array.isArray(historicalData.humidity) 
      ? historicalData.humidity.map(item => ({ timestamp: item.ts, value: item.value })) 
      : []
  } : null;

  const value = {
    vitals,
    historicalData: transformedHistoricalData,
    jaundiceData,
    cryData,
    nteData,
    loading,
    error,
    deviceId,
    fetchLatestVitals,
    fetchHistoricalData,
    fetchJaundiceData,
    fetchCryData,
    fetchNTEData,
    detectJaundiceNow,
    refreshVitals: fetchLatestVitals,
    refreshHistory: fetchHistoricalData
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
