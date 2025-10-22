# 🔍 Debug Guide: Vital Cards Not Showing Data

## 🎯 Debugging Steps Added

I've added console logging at multiple points to trace exactly where the data is getting lost:

### Console Messages to Look For:

1. **📋 Using demo mode** or **✅ Connected to ThingsBoard device**

   - Shows which mode is active

2. **📊 Transformed vitals for display: {...}**

   - Shows the vitals object after transformation in DataContext
   - Should show: `{spo2: 97, heart_rate: 165, skin_temp: 36.5, humidity: 65, timestamp: xxx}`

3. **🏥 ClinicalDashboard received vitals: {...}**

   - Shows what the ClinicalDashboard component received
   - Should match the transformed vitals

4. **💊 Creating vital cards with values: {...}**
   - Shows the actual values being assigned to each card
   - Should show: `{spo2: 97, heart_rate: 165, ...}`

---

## 🔍 How to Debug

### Step 1: Open Browser DevTools

Press **F12** to open developer console

### Step 2: Clear Console

Click the 🚫 icon to clear old messages

### Step 3: Refresh Page

Press **Ctrl + R** to reload

### Step 4: Login

Click "👨‍⚕️ Doctor" demo button

### Step 5: Check Console Output

You should see these messages in order:

```
📋 Using demo mode
📊 Transformed vitals for display: {
  spo2: 97,
  heart_rate: 165,
  skin_temp: 36.543,
  humidity: 65,
  timestamp: 1729468800000
}
🏥 ClinicalDashboard received vitals: {
  spo2: 97,
  heart_rate: 165,
  skin_temp: 36.543,
  humidity: 65,
  timestamp: 1729468800000
}
💊 Creating vital cards with values: {
  spo2: 97,
  heart_rate: 165,
  skin_temp: 36.543,
  humidity: 65
}
```

---

## 🐛 Possible Issues and Solutions

### Issue 1: No Console Messages at All

**Problem**: App not loading or crashing before data fetch  
**Solution**:

- Check for red error messages in console
- Look for syntax errors
- Refresh page hard (Ctrl + Shift + R)

### Issue 2: "📋 Using demo mode" but no vitals message

**Problem**: fetchLatestVitals() not being called  
**Solution**:

- Check if deviceId is set (look for "Using demo mode" message)
- Verify useEffect is running
- Check if there are any errors blocking execution

### Issue 3: Vitals are `null` or `undefined`

**Problem**: Data not being fetched or transformation failed  
**Check Console For**:

```
📊 Transformed vitals for display: null
```

**Solution**:

- Wait 15 seconds for first data fetch
- Check if fetchLatestVitals has errors
- Verify latestVitals is being set

### Issue 4: Vitals object has values but cards show "--"

**Problem**: Display logic issue in ClinicalDashboard  
**Check Console Shows**:

```
💊 Creating vital cards with values: {spo2: 97, heart_rate: 165, ...}
```

But cards show "--"

**Solution**:

- The displayValue extraction logic might have an issue
- Check if card.value is actually a number
- Verify toFixed() is being called correctly

### Issue 5: Values are `undefined` in vitals object

**Problem**: Transformation not extracting values correctly  
**Check Console Shows**:

```
📊 Transformed vitals for display: {
  spo2: undefined,
  heart_rate: undefined,
  ...
}
```

**Solution**:

- Check latestVitals format (before transformation)
- Verify Array.isArray() checks are working
- Make sure latestVitals has the expected structure

---

## 🎯 What to Send Me

If vital cards are still empty, please send me:

1. **Full console output** (copy/paste all messages)
2. **Screenshot** of the empty vital cards
3. **Any red error messages**

Include these specific messages:

- The "📋 Using demo mode" or "✅ Connected" message
- The "📊 Transformed vitals" message
- The "🏥 ClinicalDashboard received" message
- The "💊 Creating vital cards" message

---

## 🔧 Quick Fix Attempts

### Try 1: Hard Refresh

```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### Try 2: Clear Browser Cache

```
F12 → Application tab → Clear Storage → Clear site data
```

### Try 3: Restart React App

```powershell
# Stop with Ctrl+C
# Then restart:
npm start
```

### Try 4: Check if vitals is defined

Type this in console:

```javascript
// This will show current vitals state
window.vitals = vitals; // Set a global for debugging
```

---

## 📝 Expected Data Flow

```
DataContext:
  fetchDeviceId()
    → setDeviceId('demo-device-id-INC-001')
    ↓
  fetchLatestVitals()
    → Generate demo data: {spo2: [{ts, value: 97}], ...}
    → setLatestVitals(demoData)
    ↓
  Transform latestVitals
    → Extract: vitals.spo2 = latestVitals.spo2[0].value = 97
    → Log: "📊 Transformed vitals for display"
    ↓
  Provide vitals via Context
    ↓
ClinicalDashboard:
  useData() receives vitals
    → Log: "🏥 ClinicalDashboard received vitals"
    ↓
  Create vitalCards array
    → Log: "💊 Creating vital cards with values"
    ↓
  Map vitalCards
    → Extract displayValue from card.value
    → Call toFixed() on number
    → Display: "97%"
```

---

## 🚨 Emergency Fallback

If nothing works, I can create a simplified version that directly generates vitals without transformation layers. But first, let's see what the console shows!

---

**Debug Mode Active** 🔍  
**Next Steps**:

1. Refresh browser
2. Open console (F12)
3. Login with demo account
4. Copy/paste console output
5. Send me the results

This will tell us exactly where the data is getting lost! 🕵️
