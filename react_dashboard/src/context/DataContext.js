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

    // Poll every 15 seconds
    const interval = setInterval(() => {
      fetchLatestVitals();
    }, 15000);

    return () => clearInterval(interval);
  }, [deviceId, fetchLatestVitals, fetchHistoricalData]);

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
    loading,
    error,
    deviceId,
    fetchLatestVitals,
    fetchHistoricalData,
    refreshVitals: fetchLatestVitals,
    refreshHistory: fetchHistoricalData
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
