# NICU Monitor React Dashboard

A comprehensive, role-based React dashboard for monitoring NICU incubator vitals with ThingsBoard Cloud integration.

## 🎯 Features

### Three Role-Based Portals

#### 👨‍👩‍👧 Parent Portal

- **Live camera feed** of baby (MJPEG stream)
- **Minimal interface** - camera only
- **24/7 access** from anywhere
- No access to medical vitals (HIPAA compliance)

#### 👨‍⚕️ Clinical Dashboard (Doctor/Nurse)

- **Real-time vitals display**:
  - SpO₂ (Oxygen Saturation)
  - Heart Rate
  - Skin Temperature
  - Humidity
- **Color-coded status indicators**:
  - ✅ Normal (green)
  - ⚠️ Warning (yellow)
  - 🚨 Critical (red, pulsing animation)
- **Historical trend charts** (6-hour data)
- **Camera feed** (toggleable)
- **Auto-refresh** every 15 seconds

#### ⚙️ Admin Panel

- **System Overview**: Service status monitoring
- **Device Management**: Configure incubators
- **User Management**: Add/edit/remove users
- **System Logs**: Real-time log viewer
- **Configuration**: Alert thresholds, ThingsBoard settings

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ and npm
- **Raspberry Pi** with:
  - LCD OCR server running on port 9001
  - Camera server on port 8081
  - MQTT bridge publishing to ThingsBoard

### Installation

1. **Navigate to dashboard directory**:

```bash
cd incubator_monitoring_with_thingsboard_integration/react_dashboard
```

2. **Install dependencies**:

```bash
npm install
```

3. **Configure environment** (edit `.env` file):

```env
# Raspberry Pi Configuration
REACT_APP_PI_HOST=100.99.151.101
REACT_APP_CAMERA_PORT=8081

# ThingsBoard Configuration
REACT_APP_THINGSBOARD_URL=https://thingsboard.cloud
REACT_APP_DEVICE_TOKEN=2ztut7be6ppooyiueorb
REACT_APP_DEVICE_ID=INC-001
```

4. **Start development server**:

```bash
npm start
```

5. **Open browser**: http://localhost:3000

## 🔐 Demo Accounts

The dashboard includes demo accounts for testing:

| Role       | Email           | Password | Access               |
| ---------- | --------------- | -------- | -------------------- |
| **Parent** | parent@demo.com | role123  | Camera only          |
| **Doctor** | doctor@demo.com | role123  | Full vitals + camera |
| **Nurse**  | nurse@demo.com  | role123  | Full vitals + camera |
| **Admin**  | admin@demo.com  | role123  | System management    |

## 📁 Project Structure

```
react_dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.js           # Login page with demo accounts
│   │   │   ├── Login.css
│   │   │   └── ProtectedRoute.js  # Role-based route protection
│   │   ├── Parent/
│   │   │   ├── ParentPortal.js    # Parent view (camera only)
│   │   │   └── ParentPortal.css
│   │   ├── Clinical/
│   │   │   ├── ClinicalDashboard.js  # Doctor/Nurse dashboard
│   │   │   └── ClinicalDashboard.css
│   │   └── Admin/
│   │       ├── AdminPanel.js      # Admin management panel
│   │       └── AdminPanel.css
│   ├── context/
│   │   ├── AuthContext.js         # Authentication state
│   │   └── DataContext.js         # ThingsBoard data fetching
│   ├── App.js                     # Main router
│   ├── index.js                   # React entry point
│   └── index.css                  # Global styles
├── .env                           # Environment variables
├── package.json                   # Dependencies
└── README.md                      # This file
```

## 🔧 Configuration

### Vital Alert Thresholds

Currently configured in `ClinicalDashboard.js`:

```javascript
const ranges = {
  spo2: { critical: 85, warning: 90, normal: 95 },
  heart_rate: { critical: 180, warning: 170, normal: 160 },
  skin_temp: {
    min_critical: 35.5,
    min_warning: 36.0,
    max_warning: 37.5,
    max_critical: 38.0,
  },
  humidity: { min_warning: 40, max_warning: 70 },
};
```

### Data Polling Interval

Auto-refresh is set to **15 seconds** in `DataContext.js`:

```javascript
const POLLING_INTERVAL = 15000; // 15 seconds
```

## 🌐 ThingsBoard Integration

### Current Setup (Demo Mode)

The dashboard currently uses **mock data** for testing without requiring ThingsBoard connection. This allows development and UI testing.

### Switching to Real ThingsBoard API

To connect to real ThingsBoard, update `DataContext.js`:

1. **Replace mock data generation** with actual API calls:

```javascript
const fetchLatestVitals = async () => {
  setLoading(true);
  try {
    const response = await axios.get(
      `${thingsboardUrl}/api/v1/${deviceToken}/telemetry/values`,
      {
        params: {
          keys: "spo2,heart_rate,skin_temp,humidity",
        },
      }
    );

    setVitals({
      spo2: response.data.spo2?.[0]?.value,
      heart_rate: response.data.heart_rate?.[0]?.value,
      skin_temp: response.data.skin_temp?.[0]?.value,
      humidity: response.data.humidity?.[0]?.value,
      timestamp: response.data.spo2?.[0]?.ts,
    });
  } catch (error) {
    console.error("Error fetching vitals:", error);
  } finally {
    setLoading(false);
  }
};
```

2. **Add WebSocket for real-time updates**:

```javascript
// In DataContext.js
useEffect(() => {
  const ws = new WebSocket(
    `wss://thingsboard.cloud/api/ws/plugins/telemetry?token=${deviceToken}`
  );

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        attrSubCmds: [],
        tsSubCmds: [
          {
            entityType: "DEVICE",
            entityId: deviceId,
            scope: "LATEST_TELEMETRY",
            cmdId: 1,
          },
        ],
      })
    );
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Update vitals state
  };

  return () => ws.close();
}, []);
```

## 📊 Technology Stack

- **React 18** - UI framework
- **React Router v6** - Navigation
- **Chart.js** - Data visualization
- **Axios** - HTTP client
- **Context API** - State management
- **CSS3** - Styling with animations

## 🎨 Design Features

- **Gradient backgrounds** for visual appeal
- **Color-coded vitals** for quick status assessment
- **Responsive design** - works on desktop, tablet, mobile
- **Loading states** and spinners
- **Smooth animations** and transitions
- **Accessibility** considerations

## 🔒 Security Considerations

### Production Deployment Checklist

- [ ] Replace demo authentication with real OAuth/JWT
- [ ] Move sensitive config to backend environment variables
- [ ] Implement HTTPS/SSL for all communications
- [ ] Add rate limiting for API calls
- [ ] Implement proper session management
- [ ] Add CORS policies
- [ ] Sanitize all user inputs
- [ ] Enable audit logging

## 🚢 Production Build

1. **Create optimized build**:

```bash
npm run build
```

2. **Serve with static server**:

```bash
npm install -g serve
serve -s build -p 3000
```

3. **Or deploy to hosting**:
   - **Netlify**: Drag & drop `build` folder
   - **Vercel**: `vercel --prod`
   - **AWS S3**: Upload to S3 bucket with static hosting
   - **Nginx**: Copy `build` folder to `/var/www/html`

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/html/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy camera stream (avoid CORS)
    location /camera/ {
        proxy_pass http://100.99.151.101:8081/;
    }
}
```

## 📈 Performance Optimization

- **Code splitting** via React lazy loading
- **Chart.js** tree-shaking for smaller bundle
- **Image optimization** for faster loads
- **Memoization** of expensive computations
- **Debounced** API calls

## 🐛 Troubleshooting

### Camera Not Loading

**Issue**: Camera feed shows "Camera Unavailable"

**Solutions**:

1. Check Pi camera server is running: `sudo systemctl status camera_server`
2. Verify port 8081 is accessible
3. Check CORS if accessing from different domain
4. Try direct URL: `http://100.99.151.101:8081/?action=stream`

### Vitals Not Updating

**Issue**: Data shows "--" or doesn't refresh

**Solutions**:

1. Verify MQTT bridge is publishing: `sudo systemctl status thingsboard-bridge`
2. Check ThingsBoard device is receiving data (dashboard)
3. Verify `.env` file has correct device token
4. Check browser console for API errors

### Login Issues

**Issue**: Can't log in with demo accounts

**Solutions**:

1. Verify credentials exactly match (case-sensitive)
2. Check browser console for JavaScript errors
3. Clear localStorage: `localStorage.clear()`
4. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Port Already in Use

**Issue**: `Port 3000 is already in use`

**Solution**:

```bash
# Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# OR run on different port
set PORT=3001 && npm start
```

## 📝 Future Enhancements

- [ ] **Real-time alerts** via WebSocket
- [ ] **Push notifications** for critical vitals
- [ ] **Historical data export** (CSV, PDF)
- [ ] **Multi-device support** (multiple incubators)
- [ ] **Mobile app** (React Native)
- [ ] **Voice commands** for hands-free operation
- [ ] **AI anomaly detection** for vital patterns
- [ ] **Integration with hospital EMR systems**
- [ ] **Telemedicine video calls**
- [ ] **Multi-language support**

## 📞 Support

For issues or questions:

- Check the troubleshooting section above
- Review browser console for errors
- Check Pi system logs: `journalctl -u thingsboard-bridge -f`

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for NICU care teams and families**
