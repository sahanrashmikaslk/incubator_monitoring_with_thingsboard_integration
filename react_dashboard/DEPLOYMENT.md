# React Dashboard Deployment Guide

## 🎯 Quick Deployment Steps

### 1. Install Dependencies

```bash
cd react_dashboard
npm install
```

### 2. Start Development Server

```bash
npm start
```

The dashboard will open automatically at http://localhost:3000

### 3. Test with Demo Accounts

Login with any of these demo accounts:

| Role   | Email           | Password |
| ------ | --------------- | -------- |
| Parent | parent@demo.com | role123  |
| Doctor | doctor@demo.com | role123  |
| Nurse  | nurse@demo.com  | role123  |
| Admin  | admin@demo.com  | role123  |

## 📋 What You Should See

### Parent Portal (parent@demo.com)

- ✅ Camera feed from Pi (port 8081)
- ✅ Clean, minimal interface
- ✅ 24/7 monitoring message
- ✅ No vitals data (privacy)

### Clinical Dashboard (doctor@demo.com)

- ✅ Four vital cards: SpO₂, Heart Rate, Skin Temp, Humidity
- ✅ Color-coded status (green/yellow/red)
- ✅ Historical trend charts (Chart.js)
- ✅ Camera feed (toggleable)
- ✅ Auto-refresh every 15 seconds
- ✅ Mock data generation (95-99% SpO₂, etc.)

### Admin Panel (admin@demo.com)

- ✅ System status overview
- ✅ Device management table
- ✅ User management table
- ✅ System logs viewer
- ✅ Configuration settings

## 🔧 Current Setup (Demo Mode)

The dashboard is currently in **demo mode**:

1. **Authentication**: Hardcoded demo accounts (no real backend)
2. **Data Source**: Mock data generated in `DataContext.js`
3. **Camera**: Direct MJPEG stream from Pi (requires Pi running)
4. **Polling**: Auto-refreshes every 15 seconds

## 📊 Mock Data Values

The demo generates realistic NICU vitals:

```javascript
SpO₂:         95-99%        (normal: >95%)
Heart Rate:   165-179 bpm   (neonatal range: 120-180)
Skin Temp:    36.2-36.3°C   (normal: 36.0-37.5°C)
Humidity:     61-67%        (incubator: 40-70%)
```

## 🌐 Testing Camera Integration

### If Camera Works:

You should see live MJPEG stream from `http://100.99.151.101:8081/?action=stream`

### If Camera Shows Error:

1. Check Pi camera server is running:

```bash
ssh pi@100.99.151.101
sudo systemctl status camera_server
```

2. Test direct URL in browser:

```
http://100.99.151.101:8081/?action=stream
```

3. Check Pi network connectivity:

```bash
ping 100.99.151.101
```

## 🔄 Switching to Real ThingsBoard Data

To connect to actual ThingsBoard instead of mock data:

### Option A: Keep Mock Data for Now

✅ **Current state** - works without ThingsBoard

- Good for UI development
- No external dependencies
- Faster testing

### Option B: Connect to Real ThingsBoard

Edit `src/context/DataContext.js`:

**Replace the mock data generation**:

```javascript
// REMOVE THIS (mock data):
const fetchLatestVitals = () => {
  const vitals = {
    spo2: Math.floor(Math.random() * 5) + 95,
    heart_rate: Math.floor(Math.random() * 15) + 165,
    // ...
  };
  setVitals(vitals);
};

// ADD THIS (real ThingsBoard):
const fetchLatestVitals = async () => {
  try {
    const response = await axios.get(
      `${thingsboardUrl}/api/v1/${deviceToken}/telemetry/values`,
      { params: { keys: "spo2,heart_rate,skin_temp,humidity" } }
    );
    setVitals({
      spo2: response.data.spo2?.[0]?.value,
      heart_rate: response.data.heart_rate?.[0]?.value,
      skin_temp: response.data.skin_temp?.[0]?.value,
      humidity: response.data.humidity?.[0]?.value,
      timestamp: response.data.spo2?.[0]?.ts,
    });
  } catch (error) {
    console.error("ThingsBoard API error:", error);
  }
};
```

## 🎨 UI Components Status

### ✅ Completed Components

1. **Login.js** - Authentication UI with demo buttons
2. **ParentPortal.js** - Camera-only view for parents
3. **ClinicalDashboard.js** - Full vitals dashboard with charts
4. **AdminPanel.js** - System management interface
5. **AuthContext.js** - Authentication state management
6. **DataContext.js** - Data fetching with polling
7. **ProtectedRoute.js** - Role-based access control

### 🎯 All Features Implemented

- ✅ Role-based authentication
- ✅ Protected routes
- ✅ Auto-refresh (15s polling)
- ✅ Color-coded vital status
- ✅ Chart.js integration
- ✅ Camera stream viewer
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling

## 🚀 Next Steps After Testing

### 1. Production Readiness

- [ ] Replace demo auth with real OAuth
- [ ] Switch from mock data to ThingsBoard API
- [ ] Add WebSocket for real-time updates
- [ ] Implement proper error boundaries
- [ ] Add unit tests

### 2. Build for Production

```bash
npm run build
```

This creates optimized build in `build/` folder.

### 3. Deploy Options

**Option A: Serve Locally**

```bash
npm install -g serve
serve -s build -p 3000
```

**Option B: Deploy to Cloud**

- **Netlify**: Drag & drop `build` folder
- **Vercel**: `vercel --prod`
- **AWS S3**: Static website hosting

**Option C: Self-Host with Nginx**

```nginx
server {
    listen 80;
    root /var/www/html/react_dashboard/build;
    index index.html;
    location / {
        try_files $uri /index.html;
    }
}
```

## 📝 Environment Variables

Current `.env` configuration:

```env
REACT_APP_PI_HOST=100.99.151.101
REACT_APP_CAMERA_PORT=8081
REACT_APP_THINGSBOARD_URL=https://thingsboard.cloud
REACT_APP_DEVICE_TOKEN=2ztut7be6ppooyiueorb
REACT_APP_DEVICE_ID=INC-001
```

**Note**: Change these values for your setup!

## 🐛 Common Issues

### "Port 3000 already in use"

```bash
# Kill process using port 3000
# Windows PowerShell:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
set PORT=3001 && npm start
```

### Camera not loading

1. Check Pi camera service: `sudo systemctl status camera_server`
2. Test direct URL: http://100.99.151.101:8081/?action=stream
3. Verify Pi is accessible: `ping 100.99.151.101`

### Charts not rendering

Make sure Chart.js is installed:

```bash
npm install chart.js react-chartjs-2
```

### Blank page after deployment

Check browser console for errors. Usually:

- Missing environment variables
- Incorrect API endpoints
- CORS issues

## 📞 Testing Checklist

Before considering deployment complete:

- [ ] Can login with all 4 demo accounts
- [ ] Parent portal shows camera only
- [ ] Clinical dashboard shows 4 vitals
- [ ] Charts render correctly
- [ ] Admin panel shows all 5 tabs
- [ ] Auto-refresh works (check timestamps)
- [ ] Logout redirects to login
- [ ] Protected routes reject wrong roles
- [ ] Camera error handling works
- [ ] Responsive on mobile

## 🎉 Success Indicators

You'll know everything is working when:

1. **Login page** shows gradient background with 3 demo buttons
2. **Parent portal** displays camera feed with "LIVE" indicator
3. **Clinical dashboard** shows vitals updating every 15 seconds
4. **Admin panel** displays system status with green indicators
5. **Charts** animate smoothly with historical data
6. **Role protection** prevents unauthorized access

## 📊 Performance Expectations

- **First Load**: < 2 seconds
- **Route Changes**: < 500ms
- **Data Refresh**: < 1 second
- **Chart Rendering**: < 300ms
- **Camera Stream**: Real-time (depends on Pi)

## 💡 Tips for Development

1. **Keep browser DevTools open** to catch errors
2. **Use React DevTools** to inspect component state
3. **Check Network tab** for API call failures
4. **Test on mobile viewport** for responsive design
5. **Clear localStorage** if auth state gets stuck

---

**Ready to test? Run `npm start` and login with demo accounts!** 🚀
