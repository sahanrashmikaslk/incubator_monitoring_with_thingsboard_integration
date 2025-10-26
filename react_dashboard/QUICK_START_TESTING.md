# 🚀 Quick Start Testing Guide

## Prerequisites

- Pi device running at `100.89.162.22`
- All services running (NTE, camera, cry, jaundice detectors)
- React development environment set up

## Start Testing in 5 Minutes

### Step 1: Start React App (1 min)

```bash
cd C:\Users\sahan\Desktop\MYProjects\PI_webUI_for_test-monitoring\incubator_monitoring_with_thingsboard_integration\react_dashboard
npm start
```

Wait for browser to open at `http://localhost:3000`

### Step 2: Login (30 seconds)

- Username: `doctor`
- Password: `doctor123`
- Click "Login"

### Step 3: Test Baby Registration (1 min)

1. Click **"Register Baby"** button (purple, in header)
2. Fill form:
   - Baby ID: `TEST001`
   - Name: `Test Baby`
   - Birth Date: Today's date
   - Birth Time: Current time
   - Weight: `3200`
3. Click "Register Baby"
4. ✅ Success message should appear
5. ✅ Baby should appear in dropdown

### Step 4: Test NTE Recommendations (1 min)

1. Select `TEST001` from dropdown
2. ✅ NTE Widget should load
3. ✅ Should show:
   - Baby details (age, weight)
   - NTE target range
   - Current readings
   - Recommendations list
4. Toggle "Auto-refresh" ON
5. ✅ Should refresh every 60 seconds

### Step 5: Test Notifications (1 min)

1. Look at notification bell icon (header)
2. ✅ Should have badge with number if alerts exist
3. Click bell icon
4. ✅ Notification panel should open
5. ✅ Should show NTE alert (if temperature out of range)
6. Test filters:
   - Click "All" - Shows all notifications
   - Click "🌡️ NTE" - Shows only NTE
   - Click "👶 Cry" - Shows only cry
   - Click "🟡 Jaundice" - Shows only jaundice
7. Click a notification
8. ✅ Should mark as read (blue background gone)
9. Click "Mark all as read"
10. ✅ Badge should update
11. Click backdrop to close

### Step 6: Test Camera Feed (1 min)

1. Scroll to camera section
2. ✅ Should show "Connecting to INC-001..."
3. ✅ Pulse animation should display
4. Wait for connection (5-10 seconds)
5. ✅ Should show "LIVE" badge
6. ✅ Connection timer should start
7. ✅ Video stream should display
8. Click eye icon (hide)
9. ✅ Feed should hide but stay connected
10. Click eye icon again (show)
11. ✅ Feed should reappear
12. Click X button (disconnect)
13. ✅ Should disconnect and show "Click connect to start"

## Expected Results

### ✅ Working Correctly:

- Baby registration succeeds
- Baby appears in dropdown immediately
- NTE widget loads with recommendations
- Notification bell shows badge
- Notifications panel opens/closes
- Notifications filter by type
- Mark as read works
- Sound plays for critical alerts
- Camera connects with animation
- LIVE indicator appears
- Connection timer counts up
- Hide/show/disconnect controls work

### ❌ Common Issues:

#### Issue: "Failed to register baby"

- **Cause**: NTE server not responding
- **Fix**: Check NTE server running: `ssh sahan@100.89.162.22 "sudo systemctl status nte-server"`
- **Restart**: `ssh sahan@100.89.162.22 "sudo systemctl restart nte-server"`

#### Issue: "No notifications appearing"

- **Cause**: Detectors not sending data to ThingsBoard
- **Fix**: Check ThingsBoard connection in browser
- **Check**: Verify vitals updating in dashboard

#### Issue: "Camera stuck on Connecting..."

- **Cause**: Camera server not running
- **Fix**: `ssh sahan@100.89.162.22 "sudo systemctl restart camera-server"`
- **Check**: Visit `http://100.89.162.22:8081/?action=stream` directly

#### Issue: "No sound for alerts"

- **Cause**: Browser requires user interaction first
- **Fix**: Click anywhere on page, then sound will work
- **Note**: This is browser security policy

#### Issue: "Dropdown empty (no babies)"

- **Cause**: Failed to fetch from NTE server
- **Fix**: Check browser console for errors
- **Check**: `curl http://100.89.162.22:8886/baby/list`

## Advanced Testing

### Test Cry Detection (if cry detector active):

1. Make noise near Pi microphone
2. Wait 2-3 seconds
3. ✅ Notification should appear: "👶 Baby Crying Detected"
4. ✅ Sound alert should play (3 beeps)
5. Check notification panel
6. ✅ Should be in "Cry" filter

### Test Jaundice Detection:

1. Click "Detect Jaundice Now" button
2. Wait for detection to complete
3. ✅ Notification should appear: "🟡 Jaundice Detection Result"
4. ✅ Should show bilirubin level
5. Check notification panel
6. ✅ Should be in "Jaundice" filter

### Test NTE Alerts:

1. Select a baby
2. Wait for recommendations to load
3. If temperature out of range:
   - ✅ Notification should appear: "🌡️ NTE Alert"
   - ✅ Sound alert should play
   - ✅ Severity based on how far out of range

### Test Multiple Babies:

1. Register another baby: `TEST002`
2. Switch between babies in dropdown
3. ✅ NTE widget should update
4. ✅ Recommendations should change
5. ✅ New notifications created for each baby

## Performance Testing

### Browser Console:

- Open DevTools (F12)
- Go to Console tab
- ✅ Should see logs like:
  - "🏥 ClinicalDashboard received vitals:"
  - "✅ Baby registered successfully"
  - "📡 Fetching recommendations for..."
- ❌ Should NOT see errors (red text)

### Network Tab:

- Open DevTools (F12)
- Go to Network tab
- Filter by "XHR"
- ✅ Should see successful calls to:
  - `/baby/list` (200 OK)
  - `/baby/register` (200 OK)
  - `/recommendations` (200 OK)
- ✅ Response times should be < 1 second

### React DevTools:

- Install React DevTools extension
- Check component tree
- ✅ NotificationPanel should be in tree
- ✅ NTEWidget should be in tree
- ✅ LiveCameraFeed should be in tree
- ✅ No unnecessary re-renders

## Mobile Testing (Optional)

### On Your Phone:

1. Connect to same network as PC
2. Open `http://YOUR_PC_IP:3000/clinical`
3. Login
4. ✅ All components should be responsive
5. ✅ Notification panel should fit screen
6. ✅ Camera feed should scale properly
7. ✅ Touch interactions should work

## Production Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] No console errors
- [ ] Sound alerts working
- [ ] Camera connects reliably
- [ ] Notifications appear correctly
- [ ] All CRUD operations work (Create, Read, Update, Delete)
- [ ] Mobile responsive
- [ ] ThingsBoard integration working
- [ ] Pi services stable
- [ ] Network latency acceptable
- [ ] Build succeeds: `npm run build`

## Support Commands

### Check All Services on Pi:

```bash
ssh sahan@100.89.162.22 "
  echo '=== NTE Server ==='
  sudo systemctl status nte-server | grep Active

  echo '=== Camera Server ==='
  sudo systemctl status camera-server | grep Active

  echo '=== Cry Detector ==='
  sudo systemctl status cry-detector | grep Active

  echo '=== Jaundice Detector ==='
  sudo systemctl status jaundice-server | grep Active
"
```

### Restart All Services:

```bash
ssh sahan@100.89.162.22 "
  sudo systemctl restart nte-server
  sudo systemctl restart camera-server
  sudo systemctl restart cry-detector
  sudo systemctl restart jaundice-server
  echo 'All services restarted!'
"
```

### Check Logs:

```bash
# NTE Server logs
ssh sahan@100.89.162.22 "journalctl -u nte-server -f"

# Camera Server logs
ssh sahan@100.89.162.22 "journalctl -u camera-server -f"
```

## Quick Fixes

### Reset Everything:

```bash
# On Windows (PowerShell):
cd react_dashboard
Remove-Item -Recurse -Force node_modules
npm install
npm start

# Restart Pi services
ssh sahan@100.89.162.22 "sudo systemctl restart nte-server camera-server cry-detector jaundice-server"
```

### Clear Browser Data:

1. Open DevTools (F12)
2. Application tab → Clear Storage
3. Click "Clear site data"
4. Refresh page (Ctrl+R)

---

## 🎉 Success Criteria

Your integration is working correctly if:

1. ✅ Baby registration succeeds
2. ✅ Dropdown populates with babies
3. ✅ NTE recommendations display
4. ✅ Notifications appear and work
5. ✅ Sound alerts play
6. ✅ Camera connects and streams
7. ✅ No console errors
8. ✅ ThingsBoard receives data

**Time to complete**: 5-10 minutes
**Difficulty**: Easy
**Result**: Fully functional clinical dashboard with NTE + Notifications + Live Camera!
