# ThingsBoard Easy Login Guide

## ✅ Configuration Complete!

Your ThingsBoard Easy Login button is now fully configured and ready to use!

## 📋 What's Configured

### Environment Variables (`.env` file)
```
REACT_APP_TB_API_URL=https://thingsboard.cloud/api
REACT_APP_TB_HOST=thingsboard.cloud
REACT_APP_TB_USERNAME=sahanrashmikaslk@gmail.com
REACT_APP_TB_PASSWORD=user1@demo
REACT_APP_DEVICE_ID=INC-001
REACT_APP_DEVICE_TOKEN=2ztut7be6ppooyiueorb
```

## 🚀 How to Use ThingsBoard Easy Login

### Step 1: Navigate to Login Page
- Open your browser and go to: `http://localhost:3000`
- You'll see the login page with your NICU branding

### Step 2: Click "Connect with ThingsBoard" Button
- Look for the button labeled **"Connect with ThingsBoard"**
- It's located below the "Open Staff Sign Up" button
- Click this button to automatically login with your ThingsBoard credentials

### Step 3: Automatic Login
The system will:
1. ✅ Read credentials from `.env` file
2. ✅ Authenticate with ThingsBoard Cloud (`thingsboard.cloud`)
3. ✅ Get authentication token
4. ✅ Determine your role (doctor/nurse/admin based on email)
5. ✅ Redirect you to appropriate dashboard:
   - **Clinical Dashboard** → for doctors/nurses
   - **Parent Portal** → if email contains "parent"
   - **Admin Console** → if email contains "admin"

## 🎯 What Happens Behind the Scenes

```javascript
// When you click "Connect with ThingsBoard":
1. Reads: process.env.REACT_APP_TB_USERNAME = "sahanrashmikaslk@gmail.com"
2. Reads: process.env.REACT_APP_TB_PASSWORD = "user1@demo"
3. Sends POST to: https://thingsboard.cloud/api/auth/login
4. Receives JWT token + refresh token
5. Stores authentication in localStorage
6. Redirects to /clinical (doctor dashboard)
```

## 🔐 Authentication Flow

```
┌─────────────────┐
│  Login Page     │
│                 │
│  [Connect with  │
│   ThingsBoard]  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Read .env credentials  │
│  - TB_USERNAME          │
│  - TB_PASSWORD          │
└───────────┬─────────────┘
            │
            ▼
┌──────────────────────────┐
│  POST /api/auth/login    │
│  to thingsboard.cloud    │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  Receive JWT Token       │
│  + Refresh Token         │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  Determine Role:         │
│  - doctor (default)      │
│  - nurse                 │
│  - admin                 │
│  - parent                │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  Redirect to Dashboard   │
│  /clinical               │
└──────────────────────────┘
```

## 🎨 UI Features

### Button Styling
- **Teal theme** to match your clinical dashboard
- Located prominently on login page
- Shows "Connect with ThingsBoard" text
- Disabled during authentication (loading state)

### Error Handling
If authentication fails, you'll see an error message:
```
"ThingsBoard login failed. Confirm your credentials or use the demo sign-in below."
```

## 🛠️ Troubleshooting

### Issue 1: Button Not Working
**Check:**
- Dev server is running: `http://localhost:3000`
- `.env` file exists in `react_dashboard` folder
- Credentials are correct in `.env`
- Internet connection (needs to reach thingsboard.cloud)

**Fix:**
```bash
# Restart dev server to load .env changes
cd react_dashboard
npm start
```

### Issue 2: Authentication Failed
**Possible Causes:**
1. ❌ Wrong username/password in `.env`
2. ❌ ThingsBoard account doesn't exist
3. ❌ ThingsBoard Cloud is down
4. ❌ Network/firewall blocking thingsboard.cloud

**Fix:**
1. Verify credentials at https://thingsboard.cloud
2. Check ThingsBoard Cloud status
3. Use demo accounts as fallback

### Issue 3: Can't See .env Changes
**Problem:** React doesn't hot-reload environment variables

**Fix:**
```bash
# Stop dev server (Ctrl+C)
# Start again
npm start
```

## 🔄 Alternative Login Methods

### 1. Manual Login
- Enter email: `sahanrashmikaslk@gmail.com`
- Enter password: `user1@demo`
- Click "Sign In"

### 2. Demo Accounts (Currently Commented Out)
These work offline without ThingsBoard:
- **Doctor:** `doctor@demo.com` / `role123`
- **Parent:** `parent@demo.com` / `role123`
- **Admin:** `admin@demo.com` / `role123`

## 📊 Post-Login Features

After successful ThingsBoard login, you'll have access to:

### Clinical Dashboard
- ✅ **Live vitals** from device INC-001
- ✅ **Historical data** (1h, 6h, 12h, 24h ranges)
- ✅ **Baby weight updates** with Pi server sync
- ✅ **Jaundice detection** alerts
- ✅ **Cry detection** with NTE analysis
- ✅ **Live camera feed** from Raspberry Pi
- ✅ **Parent messaging** system
- ✅ **Export data** functionality

## 🔒 Security Notes

### Current Setup (Development)
- ✅ Credentials stored in `.env` file
- ✅ HTTPS connection to ThingsBoard Cloud
- ✅ JWT token authentication
- ✅ Automatic token refresh (55 min)
- ⚠️ `.env` should be in `.gitignore` (don't commit to Git!)

### Production Recommendations
1. **Use secure credential storage** (Azure Key Vault, AWS Secrets Manager)
2. **Enable HTTPS** for your application
3. **Implement rate limiting** on login attempts
4. **Add 2FA** for ThingsBoard accounts
5. **Regular credential rotation**
6. **Audit logs** for login attempts

## 📝 Testing Checklist

- [x] `.env` file created in `react_dashboard` folder
- [x] Dev server restarted to load environment variables
- [x] Compilation successful (no errors)
- [ ] Navigate to `http://localhost:3000`
- [ ] See login page with "Connect with ThingsBoard" button
- [ ] Click button → should redirect to /clinical dashboard
- [ ] Verify live data appears on dashboard
- [ ] Test weight update feature
- [ ] Check camera feed from Pi device

## 🆘 Support

If you encounter issues:

1. **Check browser console** (F12) for errors
2. **Check terminal output** for compilation errors
3. **Verify ThingsBoard Cloud status**: https://thingsboard.cloud
4. **Test credentials manually**: Login at thingsboard.cloud
5. **Check Pi server connectivity**: `http://100.89.162.22:8886`

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Button click redirects to `/clinical`
- ✅ Dashboard loads without "Login" button
- ✅ Vitals data appears in cards
- ✅ Device shows as "Connected" (green badge)
- ✅ Charts display historical data
- ✅ Baby card shows active baby info

---

**Last Updated:** November 3, 2025  
**Status:** ✅ Fully Configured and Ready to Use  
**Dev Server:** http://localhost:3000  
**ThingsBoard:** https://thingsboard.cloud
