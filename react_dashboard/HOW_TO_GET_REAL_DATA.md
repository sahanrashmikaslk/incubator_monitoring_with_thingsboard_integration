# 🎯 How to Get Real Data from ThingsBoard

## 🔄 What Changed

I've updated the app to automatically connect to ThingsBoard when you login with real credentials!

### ✅ Files Modified:

1. **Login.js** - Added "ThingsBoard Real Data" button
2. **DataContext.js** - Smart detection of demo vs real users
3. **thingsboard.service.js** - Fixed device lookup endpoint

---

## 🚀 How to Use Real ThingsBoard Data

### Method 1: Click "ThingsBoard Real Data" Button (Easiest!)

1. **Open the app**: http://localhost:3000 (or 3001)
2. **Click the purple button**: "🔷 ThingsBoard Real Data"
3. **Done!** The app will:
   - Auto-login with your ThingsBoard credentials
   - Connect to device INC-001
   - Fetch real sensor data
   - Display live vitals

### Method 2: Manual Login

1. **Enter credentials manually**:
   - Email: `sahanrashmikaslk@gmail.com`
   - Password: `user1@demo`
2. **Click "Sign In"**
3. **Check console** for connection status

---

## 🔍 How to Verify Real Data is Working

### 1. Check Browser Console (F12)

**Demo Mode** (shows fake data):

```
📋 Using demo mode
```

**Real ThingsBoard Mode** (shows real data):

```
✅ Connected to ThingsBoard device: INC-001 [device-uuid-here]
Received telemetry from ThingsBoard: {...}
Received historical data from ThingsBoard: {...}
```

### 2. Check the Data Values

**Demo Data**: Random values that change every 15 seconds

- SpO₂: Always 95-99%
- Heart Rate: Always 160-180 bpm
- Values are completely random

**Real Data**: Actual sensor readings from your Pi

- Values match what your sensors are sending
- Changes reflect actual infant status
- Consistent with ThingsBoard dashboard

### 3. Check User Badge

Look at the top-right corner:

- **Demo users**: Show "👨‍⚕️ Dr. Smith" or "Parent User"
- **ThingsBoard users**: Show "sahanrashmikaslk" or your email

---

## 🎭 Smart Mode Detection

The app now automatically detects which mode to use:

```javascript
Demo Mode:
- Login with demo accounts (parent/doctor/admin@demo.com)
- Password: role123
- Generates random vitals
- No ThingsBoard connection needed

Real Mode:
- Login with sahanrashmikaslk@gmail.com
- Password: user1@demo
- Connects to ThingsBoard Cloud
- Fetches device INC-001 data
- Shows actual sensor readings
```

---

## ⚠️ Troubleshooting

### Issue: Still Seeing Demo Data After ThingsBoard Login

**Check Console for Errors**:

1. **Error: "Device 'INC-001' not found"**

   - **Solution**: Check device exists in ThingsBoard
   - Go to https://thingsboard.cloud → Devices
   - Verify device name is exactly "INC-001"

2. **Error: "Failed to get device: 401 Unauthorized"**

   - **Solution**: Credentials might be wrong
   - Verify `.env` has correct username/password
   - Try logging into ThingsBoard Cloud directly
   - Restart React app after changing .env

3. **Error: "Network Error" or timeout**
   - **Solution**: Check internet connection
   - Verify firewall isn't blocking thingsboard.cloud
   - Check ThingsBoard Cloud is accessible

### Issue: Console Shows "📋 Using demo mode"

This happens when:

- You logged in with demo account (parent@demo.com, etc.)
- ThingsBoard authentication failed
- Device not found in ThingsBoard

**Solution**: Click "ThingsBoard Real Data" button instead of demo buttons

### Issue: Data Not Updating

**Check These**:

1. **Is the device online in ThingsBoard?**

   - Login to https://thingsboard.cloud
   - Navigate to Devices → INC-001
   - Check "Latest telemetry" tab
   - Verify data is recent (< 1 minute old)

2. **Is Pi publishing data?**

   - Check Pi MQTT bridge status
   - Verify sensors are working
   - Check Pi network connection

3. **Browser console errors?**
   - Look for red error messages
   - Check API call responses
   - Verify device UUID is correct

---

## 🔧 Manual Configuration Steps

If automatic login doesn't work, try these steps:

### Step 1: Verify .env Configuration

Check `react_dashboard/.env` contains:

```env
REACT_APP_TB_USERNAME=sahanrashmikaslk@gmail.com
REACT_APP_TB_PASSWORD=user1@demo
REACT_APP_TB_API_URL=https://thingsboard.cloud/api
REACT_APP_DEVICE_ID=INC-001
REACT_APP_DEVICE_TOKEN=2ztut7be6ppooyiueorb
```

### Step 2: Restart React App

Environment variables require app restart:

```powershell
# Stop app (Ctrl+C in terminal)
# Then restart:
cd incubator_monitoring_with_thingsboard_integration\react_dashboard
npm start
```

### Step 3: Test ThingsBoard Login

1. Go to https://thingsboard.cloud
2. Login with: sahanrashmikaslk@gmail.com / user1@demo
3. If this fails, your credentials are wrong
4. Update .env and restart app

### Step 4: Verify Device Exists

In ThingsBoard Cloud:

1. Left menu → **Devices**
2. Search for "INC-001"
3. Click on it
4. Go to **Latest telemetry** tab
5. Check data is being received
6. Note the device ID (long UUID)

---

## 📊 Data Flow Diagram

```
Login Page
    │
    ├─► Click "ThingsBoard Real Data"
    │   └─► Auto-fill credentials from .env
    │       └─► Call tbService.login()
    │           └─► Get JWT token
    │               └─► Set isDemo: false
    │
    ├─► Click Demo Button
    │   └─► Set isDemo: true
    │       └─► Generate mock data
    │
    └─► After Login Success
        └─► DataContext checks user.isDemo
            │
            ├─► isDemo = true
            │   └─► Generate random vitals
            │       └─► Update every 15s
            │
            └─► isDemo = false
                └─► Call tbService.getDevice('INC-001')
                    └─► Get device UUID
                        └─► Call tbService.getLatestTelemetry(uuid)
                            └─► Display real sensor data
                                └─► Refresh every 15s
```

---

## 🎯 Expected Behavior

### When Everything Works:

1. **Click "ThingsBoard Real Data" button**
2. **Console shows**:

   ```
   ✅ Connected to ThingsBoard device: INC-001 a1b2c3d4-...
   Received telemetry from ThingsBoard: {
     spo2: [{ts: 1729468800000, value: 97}],
     heart_rate: [{ts: 1729468800000, value: 165}],
     ...
   }
   ```

3. **Dashboard displays**:

   - Real SpO₂ value (from your sensor)
   - Real Heart Rate (from your sensor)
   - Real Skin Temperature (from your sensor)
   - Real Humidity (from your sensor)

4. **Data updates every 15 seconds** with fresh values

5. **Charts show historical data** from last 6 hours

---

## 🔐 Security Note

The "ThingsBoard Real Data" button uses credentials from `.env` file:

- ✅ Safe for development/testing
- ⚠️ **NOT** safe for production
- For production, users should manually login
- Or use OAuth/SSO integration

To disable auto-login for production:

1. Remove the `thingsBoardLogin()` function
2. Remove the ThingsBoard button
3. Users must manually enter credentials

---

## 📱 Next Steps

### 1. Ensure Pi is Publishing Data

SSH to your Raspberry Pi and check:

```bash
# Check MQTT bridge status
systemctl status thingsboard-mqtt-bridge

# View logs
journalctl -u thingsboard-mqtt-bridge -f

# Test MQTT publishing manually
mosquitto_pub -h localhost -t "v1/devices/me/telemetry" \
  -u "2ztut7be6ppooyiueorb" \
  -m '{"spo2":98,"heart_rate":165}'
```

### 2. Monitor ThingsBoard Cloud

1. Login to https://thingsboard.cloud
2. Go to Devices → INC-001
3. Open "Latest telemetry" tab
4. Verify data is updating
5. Check timestamps are recent

### 3. Test the Dashboard

1. Login with ThingsBoard button
2. Watch console for connection messages
3. Verify vitals display real values
4. Check charts show historical data
5. Wait 15 seconds for auto-refresh

---

## 🎊 Success Checklist

- [ ] Clicked "ThingsBoard Real Data" button
- [ ] Console shows "✅ Connected to ThingsBoard device"
- [ ] Console shows "Received telemetry from ThingsBoard"
- [ ] Dashboard displays realistic values
- [ ] Values match ThingsBoard Cloud dashboard
- [ ] Data auto-refreshes every 15 seconds
- [ ] Charts show 6 hours of history
- [ ] No error messages in console

---

## 📞 Still Not Working?

If you're still seeing demo data after following all steps:

1. **Open browser DevTools (F12)**
2. **Go to Console tab**
3. **Take a screenshot of any error messages**
4. **Check Network tab** for failed API calls
5. **Verify** the request to `thingsboard.cloud/api/auth/login`
6. **Check response** - should have `token` field

Common issues:

- Device name mismatch (case-sensitive!)
- Wrong credentials in .env
- ThingsBoard account suspended
- Network/firewall blocking API
- Device not publishing data

**Quick Test**: Can you login to https://thingsboard.cloud with the same credentials? If not, the credentials are wrong!

---

**Last Updated**: October 20, 2025  
**Status**: ✅ Ready for Real Data!  
**Mode**: Auto-detect (Demo + Real ThingsBoard)
