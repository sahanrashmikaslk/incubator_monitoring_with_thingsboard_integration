# ThingsBoard Credentials Configuration Guide

## 📍 Where Your Credentials Are Stored

All your ThingsBoard and application credentials are stored in the `.env` file located at:

```
react_dashboard/.env
```

---

## 🔐 Current Configuration

### Your ThingsBoard Cloud Credentials

```env
# ThingsBoard User Credentials
REACT_APP_TB_USERNAME=sahanrashmikaslk@gmail.com
REACT_APP_TB_PASSWORD=user1@demo
```

These credentials are used to authenticate with ThingsBoard Cloud API to:

- Fetch real-time telemetry data
- Get historical data
- Manage devices
- Access dashboard features

### ThingsBoard API Configuration

```env
REACT_APP_TB_API_URL=https://thingsboard.cloud/api
REACT_APP_TB_HOST=thingsboard.cloud
```

### Device Configuration

```env
REACT_APP_DEVICE_ID=INC-001
REACT_APP_DEVICE_TOKEN=2ztut7be6ppooyiueorb
```

- **DEVICE_ID**: Your incubator device identifier in ThingsBoard
- **DEVICE_TOKEN**: Access token for the device (from ThingsBoard device credentials)

### Raspberry Pi Configuration

```env
REACT_APP_PI_HOST=100.99.151.101
REACT_APP_CAMERA_PORT=8081
```

---

## 🎭 Demo Mode vs Real ThingsBoard Mode

The app currently runs in **DEMO MODE** for testing purposes.

### Demo Mode (Current)

- Uses mock data instead of real ThingsBoard API
- Login credentials: demo accounts (parent@demo.com, doctor@demo.com, admin@demo.com)
- Password for all demo accounts: `role123`
- No actual ThingsBoard API calls

### Switching to Real ThingsBoard Mode

To connect to your real ThingsBoard account:

#### Option 1: Modify AuthContext (Recommended)

Edit `src/context/AuthContext.js`:

**Find this section (around line 26):**

```javascript
const login = async (email, password) => {
  try {
    // Demo authentication (replace with real ThingsBoard auth)
    const demoUsers = {
      'parent@demo.com': { role: 'parent', name: 'Parent User', email: 'parent@demo.com' },
      'doctor@demo.com': { role: 'doctor', name: 'Dr. Smith', email: 'doctor@demo.com' },
      'nurse@demo.com': { role: 'nurse', name: 'Nurse Johnson', email: 'nurse@demo.com' },
      'admin@demo.com': { role: 'admin', name: 'Admin', email: 'admin@demo.com' }
    };

    const demoUser = demoUsers[email];

    if (demoUser) {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const userData = {
        ...demoUser,
        token: 'demo-token-' + Date.now()
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Initialize ThingsBoard connection (commented out for demo)
      // await tbService.login(email, password);

      return userData;
    } else {
      throw new Error('Invalid credentials');
    }
```

**Replace with:**

```javascript
const login = async (email, password) => {
  try {
    // Real ThingsBoard authentication
    const tbResponse = await tbService.login(email, password);

    // Determine user role based on email or ThingsBoard user attributes
    let role = 'doctor'; // Default role
    if (email.includes('parent')) role = 'parent';
    else if (email.includes('admin')) role = 'admin';
    else if (email.includes('nurse')) role = 'nurse';

    const userData = {
      email,
      name: tbResponse.name || email.split('@')[0],
      role,
      token: tbResponse.token,
      refreshToken: tbResponse.refreshToken
    };

    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));

    return userData;
```

#### Option 2: Auto-Login with Your Credentials

Add a "ThingsBoard Login" button in `Login.js`:

```javascript
const thingsBoardLogin = async () => {
  setLoading(true);
  try {
    const username = process.env.REACT_APP_TB_USERNAME;
    const password = process.env.REACT_APP_TB_PASSWORD;

    const user = await login(username, password);

    // Redirect based on role
    switch (user.role) {
      case "parent":
        navigate("/parent");
        break;
      case "doctor":
      case "nurse":
        navigate("/clinical");
        break;
      case "admin":
        navigate("/admin");
        break;
      default:
        navigate("/");
    }
  } catch (err) {
    setError("ThingsBoard login failed. Please check your credentials.");
  } finally {
    setLoading(false);
  }
};

// Add this button in the render:
<button onClick={thingsBoardLogin} className="btn-demo thingsboard">
  🔷 ThingsBoard Login
</button>;
```

---

## 📊 Switching DataContext to Real Data

Currently, `src/context/DataContext.js` generates mock data. To use real ThingsBoard data:

**Find (around line 47):**

```javascript
// Demo data (replace with real API call)
// const data = await tbService.getLatestTelemetry(deviceId);

const demoData = {
  spo2: [{ ts: Date.now(), value: 95 + Math.floor(Math.random() * 5) }],
  heart_rate: [{ ts: Date.now(), value: 160 + Math.floor(Math.random() * 20) }],
  skin_temp: [{ ts: Date.now(), value: 36.0 + Math.random() }],
  humidity: [{ ts: Date.now(), value: 60 + Math.floor(Math.random() * 10) }],
};

setLatestVitals(demoData);
```

**Replace with:**

```javascript
// Real ThingsBoard API call
const data = await tbService.getLatestTelemetry(deviceId);
setLatestVitals(data);
```

Similarly for historical data (around line 74):

```javascript
// Real ThingsBoard API call
const data = await tbService.getTelemetryHistory(
  deviceId,
  ["spo2", "heart_rate", "skin_temp", "humidity"],
  startTs,
  endTs
);
setHistoricalData(data);
```

---

## 🔑 Finding Your Device Token

If you need to update your device token:

1. **Login to ThingsBoard Cloud**: https://thingsboard.cloud
2. **Navigate to Devices**: Left menu → Devices
3. **Find your device**: INC-001
4. **Click on device** → Manage credentials
5. **Copy the Access Token**
6. **Update in `.env`**:
   ```env
   REACT_APP_DEVICE_TOKEN=your-new-token-here
   ```

---

## 🔄 When to Restart React App

After changing `.env` file, you MUST restart the React development server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm start
```

Environment variables are only loaded when the app starts!

---

## 🛡️ Security Best Practices

### ⚠️ Important Security Notes:

1. **Never commit credentials to Git**:

   ```bash
   # Add to .gitignore (already done):
   .env
   .env.local
   ```

2. **For production**, use environment variables from hosting platform:

   - Netlify: Site settings → Environment variables
   - Vercel: Project settings → Environment variables
   - AWS: Systems Manager Parameter Store

3. **Don't expose tokens in browser**:
   - Currently OK for development
   - For production, create a backend proxy API

---

## 📝 Summary

### Your Credentials Location:

```
File: react_dashboard/.env

ThingsBoard Login:
  Username: sahanrashmikaslk@gmail.com
  Password: user1@demo

Device Info:
  Device ID: INC-001
  Device Token: 2ztut7be6ppooyiueorb

Pi Camera:
  Host: 100.99.151.101
  Port: 8081
```

### Current Mode:

- ✅ **Demo Mode Active** - Using mock data
- 📋 Ready to switch to real ThingsBoard API (follow Option 1 or 2 above)

### To Use Real Data:

1. Update `AuthContext.js` to uncomment ThingsBoard login
2. Update `DataContext.js` to use real API calls
3. Restart React app (`npm start`)
4. Login with your ThingsBoard credentials

---

**Need help switching to real mode? Let me know and I'll make the changes for you!** 🚀
