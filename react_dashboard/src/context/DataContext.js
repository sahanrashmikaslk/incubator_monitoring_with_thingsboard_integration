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
      
      // Only try ThingsBoard if user is authenticated and ThingsBoard client has a token
      if (user && tbService.isAuthenticated()) {
        try {
          const device = await tbService.getDevice(deviceName);
          setDeviceId(device.id.id);
          console.log('✅ Connected to ThingsBoard device:', deviceName, device.id.id);
        } catch (err) {
          // ThingsBoard not available: set deviceId to null and record error
          console.warn('⚠️ ThingsBoard not available:', err.message);
          setDeviceId(null);
          setError('ThingsBoard not available: ' + err.message);
        }
      } else {
        // If not authenticated or ThingsBoard client not ready, do not use demo mode
        console.log('⛔ Not authenticated or ThingsBoard client not ready - live data disabled');
        setDeviceId(null);
        setError('Not authenticated or ThingsBoard client not ready');
      }
    } catch (err) {
      console.error('Failed to fetch device ID:', err);
      setError(err.message);
      // Do not fall back to demo mode; leave deviceId null so no live fetches occur
      setDeviceId(null);
    }
  }, [user]);

  // Fetch latest telemetry
  const fetchLatestVitals = useCallback(async () => {
    if (!deviceId) return;

    try {
      // Real ThingsBoard API call
      const data = await tbService.getLatestTelemetry(deviceId);
      console.log('Received telemetry from ThingsBoard:', data);
      setLatestVitals(data);
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
      // Fetch from ThingsBoard telemetry (all fields prefixed with cry_)
      const cryKeys = [
        'cry_detected',
        'cry_audio_level', 
        'cry_sensitivity',
        'cry_total_detections',
        'cry_monitoring',
        'cry_classification',
        'cry_classification_confidence',
        'cry_classification_top1',
        'cry_classification_top2',
        'cry_classification_top3',
        'cry_verified',
        'cry_verification_confidence',
        'cry_verified_cries',
        'cry_false_positives',
        'cry_last_detected'
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
          cry_monitoring: [{ ts: Date.now(), value: false }],
          cry_classification: [{ ts: Date.now(), value: null }],
          cry_classification_confidence: [{ ts: Date.now(), value: 0 }],
          cry_verified_cries: [{ ts: Date.now(), value: 0 }],
          cry_false_positives: [{ ts: Date.now(), value: 0 }]
        });
        return;
      }
      
      setCryData(data);
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
        cry_monitoring: [{ ts: Date.now(), value: false }],
        cry_classification: [{ ts: Date.now(), value: null }],
        cry_classification_confidence: [{ ts: Date.now(), value: 0 }],
        cry_verified_cries: [{ ts: Date.now(), value: 0 }],
        cry_false_positives: [{ ts: Date.now(), value: 0 }]
      });
    }
  }, [deviceId]);

  // Fetch NTE data from ThingsBoard
  const fetchNTEData = useCallback(async () => {
    if (!deviceId) return;

    try {
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

      // Real ThingsBoard API call
      const data = await tbService.getTelemetryHistory(
        deviceId, 
        ['spo2', 'heart_rate', 'skin_temp', 'humidity'], 
        startTs, 
        endTs
      );
      console.log('Received historical data from ThingsBoard:', data);
      setHistoricalData(data);
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
    fetchDeviceId,
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
