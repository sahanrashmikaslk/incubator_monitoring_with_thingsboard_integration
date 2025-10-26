# NTE Integration Testing Guide

## Pre-Testing Checklist

### Backend Verification

```bash
# SSH into Pi
ssh sahan@100.89.162.22

# Check NTE server status
sudo systemctl status nte-server
# Expected: ● nte-server.service - NTE Recommendation Engine
#           Active: active (running) since...

# Test NTE health endpoint
curl http://localhost:8886/health
# Expected: {"status":"healthy","service":"NTE Recommendation Engine"}

# Check if any babies registered
curl http://localhost:8886/baby/list
# Expected: {"babies": [...]}
```

### Frontend Verification

```bash
# Navigate to React dashboard
cd c:\Users\sahan\Desktop\MYProjects\PI_webUI_for_test-monitoring\incubator_monitoring_with_thingsboard_integration\react_dashboard

# Install dependencies (if needed)
npm install

# Start development server
npm start
```

## Test Scenarios

### Test 1: Baby Registration ✅

#### Steps:

1. Open Clinical Dashboard (http://localhost:3000/clinical)
2. Login as doctor (username: `doctor`, password: `doctor123`)
3. Click **"Register Baby"** button (purple gradient button in header)
4. Verify modal opens with form fields

#### Test Case 1.1: Validation

1. Click "Register Baby" without filling fields
2. **Expected**: Error messages appear below required fields:
   - "Baby ID is required"
   - "Birth date is required"
   - "Birth time is required"
   - "Weight is required"

#### Test Case 1.2: Weight Validation

1. Enter weight: `400` (below minimum)
2. **Expected**: "Weight must be between 500 and 5000 grams"
3. Enter weight: `6000` (above maximum)
4. **Expected**: "Weight must be between 500 and 5000 grams"
5. Enter weight: `3200` (valid)
6. **Expected**: No error message

#### Test Case 1.3: Successful Registration

1. Fill in form:
   - Baby ID: `TEST001`
   - Name: `Test Baby`
   - Birth Date: Today's date
   - Birth Time: `10:00`
   - Weight: `3200`
2. Click "Register Baby"
3. **Expected**:
   - Button shows "Registering..." with spinner
   - Modal closes
   - Alert: "Baby Test Baby registered successfully!"
   - Baby appears in dropdown: "Test Baby (TEST001)"

### Test 2: Baby Selection ✅

#### Steps:

1. Click baby selector dropdown in header
2. **Expected**: Dropdown opens showing all registered babies
3. Select "Test Baby (TEST001)"
4. **Expected**:
   - Dropdown shows selected baby
   - NTE Widget loads (loading spinner appears briefly)
   - Baby details appear in NTE Widget

### Test 3: NTE Widget Display ✅

#### Test Case 3.1: Empty State

1. Ensure no baby is selected (dropdown shows "Select Baby...")
2. Scroll to NTE section
3. **Expected**:
   - Widget shows baby icon 👶
   - Message: "No baby selected"
   - Instructions to select or register baby

#### Test Case 3.2: Baby Information

1. Select a baby from dropdown
2. Verify NTE Widget header shows:
   - Baby name and ID: "Test Baby (TEST001)"
   - Age (auto-calculated from birth date/time)
   - Weight: "3200g"
3. **Expected**: All information matches registration data

#### Test Case 3.3: Baby Details Card

1. Check "Baby Details" section shows:
   - Age in hours: "X hours (Y.Z days)"
   - Weight: "3200g"
2. **Expected**: Age updates if baby is older than a day

#### Test Case 3.4: NTE Range Display

1. Check "NTE TARGET RANGE" card shows:
   - Temperature range (e.g., "34.0°C - 35.0°C")
   - Label: "Recommended Air Temperature"
2. **Expected**: Purple gradient background, centered text

#### Test Case 3.5: Current Readings

1. Check "Current Readings" grid shows 3 cards:
   - Air Temp: "28.0°C" (hardcoded)
   - Skin Temp: Value from vitals (or "--")
   - Humidity: Value from vitals (or "--")
2. **Expected**: Values displayed in blue, properly formatted

#### Test Case 3.6: Recommendations List

1. Check "Recommendations" section
2. **Expected**: List of advice items with:
   - Severity icons (🚨/⚠️/ℹ️)
   - Advice message in bold
   - Detailed explanation below
   - Background color matching severity:
     - Critical: Red (#fee2e2)
     - Warning: Yellow (#fef3c7)
     - Info: Blue (#dbeafe)

### Test 4: Auto-Refresh ✅

#### Steps:

1. Select a baby (NTE Widget loads)
2. Click "Auto-refresh" toggle button
3. **Expected**:
   - Button changes to active state (solid background)
   - Recommendations automatically refresh every 60 seconds
4. Wait 60 seconds
5. **Expected**:
   - Timestamp updates
   - Brief loading state
   - Recommendations update (if vitals changed)
6. Click "Auto-refresh" toggle again
7. **Expected**:
   - Button returns to normal state
   - Auto-refresh stops

### Test 5: Manual Refresh ✅

#### Steps:

1. Select a baby
2. Click refresh button (circular arrow icon)
3. **Expected**:
   - Icon spins
   - Loading state appears
   - Recommendations update
   - Timestamp updates
   - Icon stops spinning

### Test 6: ThingsBoard Integration ✅

#### Steps:

1. Open ThingsBoard (http://100.89.162.22:8080 or cloud instance)
2. Login and navigate to device "INC-001"
3. Select a baby in React dashboard
4. Click "Refresh" in NTE Widget
5. Go to ThingsBoard → Latest Telemetry
6. **Expected**: See NTE telemetry keys:
   ```
   nte_baby_id: "TEST001"
   nte_age_hours: 24.5
   nte_weight_g: 3200
   nte_range_min: 34.0
   nte_range_max: 35.0
   nte_critical_count: 1
   nte_warning_count: 0
   nte_info_count: 2
   nte_latest_advice: "Air temperature below recommended range"
   nte_latest_detail: "Increase incubator temperature to 34-35°C"
   nte_timestamp: "2025-01-15T14:30:45Z"
   ```

### Test 7: Error Handling ✅

#### Test Case 7.1: Network Error

1. Stop NTE server: `sudo systemctl stop nte-server`
2. Try to register a baby
3. **Expected**:
   - Alert: "Failed to register baby. Please try again."
   - Modal stays open
4. Try to fetch recommendations for selected baby
5. **Expected**:
   - Error state in NTE Widget
   - Red error box with retry button
6. Restart NTE server: `sudo systemctl start nte-server`

#### Test Case 7.2: Invalid Baby ID

1. Try to register baby with same ID as existing baby
2. **Expected**:
   - Alert with error message
   - Modal stays open

### Test 8: Responsive Design ✅

#### Desktop (1920x1080):

1. Open dashboard in full screen
2. **Expected**:
   - Baby controls inline with header items
   - Current readings: 3 columns
   - Baby details: 2 columns
   - All text readable

#### Tablet (768x1024):

1. Resize browser to 768px width
2. **Expected**:
   - Header wraps properly
   - Baby controls stack if needed
   - Current readings: 3 columns (may be tight)
   - Advice cards stack properly

#### Mobile (375x667):

1. Resize browser to 375px width
2. **Expected**:
   - Header fully stacked
   - Baby controls: Full width
   - Current readings: Single column
   - Baby details: Single column
   - Modal: Full width with padding

### Test 9: Multiple Babies ✅

#### Steps:

1. Register 3 different babies:
   - BABY001 (weight: 2000g)
   - BABY002 (weight: 3500g)
   - BABY003 (weight: 4200g)
2. Switch between babies using dropdown
3. **Expected**:
   - NTE Widget updates for each baby
   - Different NTE ranges based on age/weight
   - Recommendations change appropriately
   - No delay or lag switching babies

### Test 10: Real Vitals Integration ✅

#### Prerequisites:

- Sensors must be publishing to ThingsBoard

#### Steps:

1. Ensure vitals are being received (check Live Vital Signs cards)
2. Note current skin temperature and humidity values
3. Select a baby in NTE Widget
4. **Expected**:
   - "Current Readings" shows live skin temp from vitals
   - "Current Readings" shows live humidity from vitals
   - Recommendations reflect actual sensor readings
5. Wait for vitals to change (or simulate by updating ThingsBoard)
6. Click refresh in NTE Widget
7. **Expected**:
   - Updated vitals reflected in readings
   - Recommendations update accordingly

## Automated Testing (Optional)

### Unit Tests (Future)

```bash
npm test -- NTEWidget
npm test -- BabyRegistrationModal
```

### Integration Tests (Future)

```bash
npm run test:integration
```

## Performance Testing

### Load Test:

1. Register 10 babies
2. Switch rapidly between babies in dropdown
3. **Expected**:
   - No lag or freezing
   - Smooth transitions
   - No memory leaks (check browser dev tools)

### Network Test:

1. Throttle network in browser dev tools (3G speed)
2. Register baby
3. **Expected**:
   - Loading states appear
   - Operation completes successfully (slower)
   - No timeout errors

## Bug Reporting Template

If you find issues, report using this format:

```
**Bug Title**: [Brief description]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1.
2.
3.

**Expected Result**:


**Actual Result**:


**Screenshots**: (if applicable)

**Environment**:
- Browser:
- OS:
- Screen Size:
- NTE Server Status:

**Console Errors**: (copy from browser console)

**Additional Context**:

```

## Success Criteria

### ✅ All Tests Pass When:

- [ ] Baby registration works with validation
- [ ] Baby list loads and displays correctly
- [ ] Baby selection updates NTE Widget
- [ ] NTE Widget shows correct information
- [ ] NTE range calculates based on age/weight
- [ ] Current readings display live vitals
- [ ] Recommendations display with correct severity
- [ ] Auto-refresh works (60s interval)
- [ ] Manual refresh works
- [ ] ThingsBoard receives NTE telemetry
- [ ] Error handling works properly
- [ ] Responsive design works on all screens
- [ ] Multiple babies can be managed
- [ ] No console errors or warnings
- [ ] Performance is acceptable

## Post-Testing

### Cleanup (Optional):

```bash
# Remove test babies via API
curl -X DELETE http://100.89.162.22:8886/baby/TEST001
curl -X DELETE http://100.89.162.22:8886/baby/BABY001
curl -X DELETE http://100.89.162.22:8886/baby/BABY002
curl -X DELETE http://100.89.162.22:8886/baby/BABY003

# Or manually delete baby_data.json on Pi
ssh sahan@100.89.162.22
rm /home/sahan/baby_data.json
sudo systemctl restart nte-server
```

---

**Testing Status**: Ready for execution
**Estimated Time**: 30-45 minutes for complete test suite
**Recommended Tester**: Developer + Clinical staff for usability feedback
