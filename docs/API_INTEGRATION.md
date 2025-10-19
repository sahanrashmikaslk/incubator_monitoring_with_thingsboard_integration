# ThingsBoard API Integration Guide

## Overview
This guide explains how to integrate the custom React dashboard with ThingsBoard Cloud APIs.

## Base Configuration

### Environment Variables (.env)
```env
REACT_APP_TB_API_URL=https://thingsboard.cloud/api
REACT_APP_DEVICE_TOKEN=2ztut7be6ppooyiueorb
REACT_APP_DEVICE_ID=INC-001
REACT_APP_PI_HOST=100.99.151.101
REACT_APP_MJPEG_PORT=8081
```

## Authentication

### 1. Login
```javascript
import tbService from './services/thingsboard.service';

// User login
const login = async (username, password) => {
  try {
    const result = await tbService.login(username, password);
    console.log('User info:', result);
    // result contains: { token, refreshToken, userId, ... }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 2. Check Authentication Status
```javascript
if (tbService.isAuthenticated()) {
  console.log('User is logged in');
} else {
  console.log('User needs to login');
}
```

### 3. Logout
```javascript
tbService.logout();
```

## Device Management

### Get Device by Name
```javascript
const getDevice = async () => {
  try {
    const device = await tbService.getDevice('INC-001');
    console.log('Device UUID:', device.id.id);
    // Save device UUID for telemetry queries
  } catch (error) {
    console.error('Failed to get device:', error);
  }
};
```

## Telemetry Data

### Get Latest Telemetry
```javascript
const getLatestVitals = async (deviceId) => {
  try {
    const data = await tbService.getLatestTelemetry(deviceId, [
      'spo2',
      'heart_rate',
      'skin_temp',
      'humidity'
    ]);
    
    console.log('Latest vitals:', data);
    // data format:
    // {
    //   spo2: [{ ts: 1234567890, value: 98 }],
    //   heart_rate: [{ ts: 1234567890, value: 145 }],
    //   ...
    // }
  } catch (error) {
    console.error('Failed to get telemetry:', error);
  }
};
```

### Get Historical Data (for Charts)
```javascript
const getHistoricalData = async (deviceId) => {
  const endTs = Date.now(); // Current time
  const startTs = endTs - (24 * 60 * 60 * 1000); // 24 hours ago

  try {
    const history = await tbService.getTelemetryHistory(
      deviceId,
      ['spo2', 'heart_rate'],
      startTs,
      endTs
    );

    console.log('Historical data:', history);
    
    // Transform for Chart.js
    const chartData = {
      labels: history.spo2.map(d => new Date(d.ts).toLocaleTimeString()),
      datasets: [
        {
          label: 'SpO2',
          data: history.spo2.map(d => d.value),
          borderColor: 'rgb(75, 192, 192)',
        }
      ]
    };
  } catch (error) {
    console.error('Failed to get historical data:', error);
  }
};
```

## Real-time Updates (WebSocket)

### Subscribe to Live Telemetry
```javascript
import { useEffect, useState } from 'react';

const VitalsMonitor = ({ deviceId }) => {
  const [vitals, setVitals] = useState({});

  useEffect(() => {
    // Subscribe to real-time updates
    const ws = tbService.subscribeToTelemetry(
      deviceId,
      ['spo2', 'heart_rate', 'skin_temp', 'humidity'],
      (data) => {
        console.log('New telemetry:', data);
        setVitals(data);
      }
    );

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [deviceId]);

  return (
    <div>
      <h2>Live Vitals</h2>
      <p>SpO2: {vitals.spo2?.[0]?.value}%</p>
      <p>Heart Rate: {vitals.heart_rate?.[0]?.value} bpm</p>
      <p>Skin Temp: {vitals.skin_temp?.[0]?.value}°C</p>
      <p>Humidity: {vitals.humidity?.[0]?.value}%</p>
    </div>
  );
};
```

## Device Attributes

### Get Device Attributes
```javascript
const getDeviceAttributes = async (deviceId) => {
  try {
    const attributes = await tbService.getAttributes(deviceId, 'SERVER_SCOPE');
    console.log('Device attributes:', attributes);
    // Example: firmware_version, location, device_type
  } catch (error) {
    console.error('Failed to get attributes:', error);
  }
};
```

## Complete Example: Clinical Dashboard Component

```javascript
import React, { useEffect, useState } from 'react';
import tbService from '../services/thingsboard.service';
import { Line } from 'react-chartjs-2';

const ClinicalDashboard = () => {
  const [deviceId, setDeviceId] = useState(null);
  const [latestVitals, setLatestVitals] = useState({});
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      // 1. Get device
      const device = await tbService.getDevice('INC-001');
      const devId = device.id.id;
      setDeviceId(devId);

      // 2. Get latest vitals
      const latest = await tbService.getLatestTelemetry(devId);
      setLatestVitals(latest);

      // 3. Get historical data for chart
      const endTs = Date.now();
      const startTs = endTs - (6 * 60 * 60 * 1000); // Last 6 hours

      const history = await tbService.getTelemetryHistory(
        devId,
        ['spo2', 'heart_rate'],
        startTs,
        endTs
      );

      // Transform for Chart.js
      const chartConfig = {
        labels: history.spo2.map(d => 
          new Date(d.ts).toLocaleTimeString()
        ),
        datasets: [
          {
            label: 'SpO2 (%)',
            data: history.spo2.map(d => d.value),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
          {
            label: 'Heart Rate (bpm)',
            data: history.heart_rate.map(d => d.value),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
          }
        ]
      };
      setChartData(chartConfig);

      // 4. Subscribe to real-time updates
      const ws = tbService.subscribeToTelemetry(
        devId,
        ['spo2', 'heart_rate', 'skin_temp', 'humidity'],
        (data) => {
          setLatestVitals(prev => ({ ...prev, ...data }));
        }
      );

      setLoading(false);

      // Cleanup
      return () => ws.close();

    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>NICU Clinical Dashboard - INC-001</h1>
      
      {/* Latest Vitals */}
      <div className="vitals-grid">
        <div className="vital-card">
          <h3>SpO2</h3>
          <p className="value">{latestVitals.spo2?.[0]?.value}%</p>
        </div>
        <div className="vital-card">
          <h3>Heart Rate</h3>
          <p className="value">{latestVitals.heart_rate?.[0]?.value} bpm</p>
        </div>
        <div className="vital-card">
          <h3>Skin Temperature</h3>
          <p className="value">{latestVitals.skin_temp?.[0]?.value}°C</p>
        </div>
        <div className="vital-card">
          <h3>Humidity</h3>
          <p className="value">{latestVitals.humidity?.[0]?.value}%</p>
        </div>
      </div>

      {/* Historical Chart */}
      <div className="chart-container">
        <h2>6-Hour Trends</h2>
        {chartData && <Line data={chartData} />}
      </div>
    </div>
  );
};

export default ClinicalDashboard;
```

## API Rate Limits

ThingsBoard Cloud free tier limits:
- **Messages**: 3,000,000 per month
- **Devices**: 10 devices
- **REST API**: 1,000 requests per minute
- **WebSocket**: 10 concurrent connections

## Error Handling

```javascript
try {
  const data = await tbService.getLatestTelemetry(deviceId);
} catch (error) {
  if (error.response?.status === 401) {
    // Unauthorized - redirect to login
    console.log('Session expired, please login again');
  } else if (error.response?.status === 404) {
    // Device not found
    console.log('Device not found');
  } else if (error.response?.status === 429) {
    // Rate limit exceeded
    console.log('Too many requests, please slow down');
  } else {
    // Other errors
    console.error('API error:', error.message);
  }
}
```

## Testing with Postman

### Login
```
POST https://thingsboard.cloud/api/auth/login
Content-Type: application/json

{
  "username": "your_email@example.com",
  "password": "your_password"
}
```

### Get Latest Telemetry
```
GET https://thingsboard.cloud/api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries?keys=spo2,heart_rate
X-Authorization: Bearer {token}
```

## Next Steps

1. **Setup User Accounts**: Create users in ThingsBoard Cloud
2. **Assign Roles**: Configure parent/clinical/admin roles
3. **Test Integration**: Use Postman to verify API access
4. **Build Components**: Create React components using the service
5. **Deploy**: Host React app and configure CORS if needed
