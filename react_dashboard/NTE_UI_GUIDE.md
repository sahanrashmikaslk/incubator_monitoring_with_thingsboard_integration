# NTE React Dashboard UI Guide

## Dashboard Layout Changes

### Header Section (Top Bar)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏥 Clinical Dashboard          [Select Baby ▼] [+ Register Baby]           │
│ INC-001 • NICU Monitor          [🔄 Refresh] [👤 Doctor] [Logout]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**New Elements:**

1. **Baby Selector Dropdown**: Shows list of registered babies (format: "Name (ID)")
2. **Register Baby Button**: Purple gradient button with + icon

### Main Content Sections (Order)

```
1. Live Vital Signs (4 cards: SpO₂, Heart Rate, Skin Temp, Humidity)
   ↓
2. Jaundice Detection Widget
   ↓
3. Cry Detection Widget
   ↓
4. NTE Recommendations Widget ← NEW!
   ↓
5. Historical Trends (Charts)
   ↓
6. Baby Monitor (Camera Feed)
```

## Component Visuals

### 1. Baby Registration Modal

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Register New Baby                           [×]   │ │
│  ├────────────────────────────────────────────────────┤ │
│  │                                                    │ │
│  │  Baby ID *           Name                         │ │
│  │  ┌──────────┐       ┌──────────┐                 │ │
│  │  │ BABY001  │       │ John Doe │                 │ │
│  │  └──────────┘       └──────────┘                 │ │
│  │                                                    │ │
│  │  Birth Date *        Birth Time *                 │ │
│  │  ┌──────────┐       ┌──────────┐                 │ │
│  │  │ 2025-01-15│      │ 14:30    │                 │ │
│  │  └──────────┘       └──────────┘                 │ │
│  │                                                    │ │
│  │  Weight (grams) *                                 │ │
│  │  ┌──────────┐                                     │ │
│  │  │ 3200     │                                     │ │
│  │  └──────────┘                                     │ │
│  │                                                    │ │
│  │  * Required fields                                │ │
│  │                                                    │ │
│  │          [Cancel]  [Register Baby]                │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Features:**

- Modal overlay with semi-transparent backdrop
- 2-column grid layout for inputs
- Red border on validation errors
- Loading spinner during submission
- Slide-up animation on open

### 2. NTE Widget (With Baby Selected)

```
┌──────────────────────────────────────────────────────────────────┐
│  🌡️ NTE Recommendations                           [🔄] [⏱️]   │
│  Baby John (BABY001) • Age: 48h • Weight: 3200g                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Baby Details                                              │ │
│  │  Age: 48 hours (2.0 days)        Weight: 3200g            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  🌡️ NTE TARGET RANGE                                      │ │
│  │  34.0°C - 35.0°C                                          │ │
│  │  Recommended Air Temperature                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Current Readings                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ AIR TEMP │  │ SKIN TEMP│  │ HUMIDITY │                     │
│  │  28.0°C  │  │  36.8°C  │  │   55%    │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
│                                                                  │
│  Recommendations                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🚨 Air temperature below recommended range                 │ │
│  │    Increase incubator temperature to 34-35°C               │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ℹ️ Baby temperature within normal range                    │ │
│  │    Continue monitoring core temperature                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Last updated: 14:30:45                                         │
└──────────────────────────────────────────────────────────────────┘
```

**Features:**

- Purple gradient header
- Baby details card (light gray background)
- NTE range card (purple gradient)
- 3-column readings grid
- Severity-based advice cards:
  - 🚨 Critical (red background)
  - ⚠️ Warning (yellow background)
  - ℹ️ Info (blue background)
- Auto-refresh toggle
- Manual refresh button
- Timestamp at bottom

### 3. NTE Widget (No Baby Selected)

```
┌──────────────────────────────────────────────────────────────────┐
│  🌡️ NTE Recommendations                           [🔄] [⏱️]   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│                        👶                                        │
│                                                                  │
│              No baby selected                                    │
│                                                                  │
│     Please select a baby from the dropdown                      │
│     or register a new baby to view NTE                          │
│     recommendations                                              │
│                                                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Features:**

- Centered empty state icon
- Helpful message
- Still shows header with controls

### 4. Baby Selector Dropdown (Open)

```
┌─────────────────────────┐
│ Select Baby...         ▼│
├─────────────────────────┤
│ John Doe (BABY001)      │ ← Hover: Light gray background
├─────────────────────────┤
│ Jane Smith (BABY002)    │
├─────────────────────────┤
│ Baby Wilson (BABY003)   │
└─────────────────────────┘
```

**Features:**

- Clean dropdown styling
- Shows name and ID
- Hover effects
- Focus ring (blue border)
- Disabled state when loading

## Color Scheme

### NTE Theme Colors

- **Primary**: Purple gradient (#667eea → #764ba2)
- **Critical**: Red (#ef4444, #fee2e2 background)
- **Warning**: Yellow (#f59e0b, #fef3c7 background)
- **Info**: Blue (#3b82f6, #dbeafe background)
- **Success**: Green (#10b981)

### UI Elements

- **Borders**: Light gray (#e2e8f0)
- **Background**: Off-white (#f7fafc)
- **Text**: Dark gray (#1f2937)
- **Disabled**: Gray 40% opacity

## Responsive Breakpoints

### Desktop (>768px)

- Baby controls: Inline with other header items
- Current readings: 3-column grid
- Baby details: 2-column grid

### Mobile (<768px)

- Baby controls: Stacked vertically
- Current readings: Single column
- Baby details: Single column
- Header items: Stacked layout

## Interactions

### Button States

```
Normal:     [Register Baby]
Hover:      [Register Baby] ← Slight lift, shadow
Active:     [Register Baby] ← Pressed state
Disabled:   [Register Baby] ← Grayed out, no pointer
Loading:    [⟳ Registering...] ← Spinning icon
```

### Auto-refresh Toggle

```
Off:  [⏱️ Auto-refresh]       ← Translucent background
On:   [⏱️ Auto-refresh]       ← Solid background, active state
```

### Form Validation

```
Valid:      ┌──────────┐
            │ BABY001  │
            └──────────┘

Invalid:    ┌──────────┐
            │          │ ← Red border
            └──────────┘
            ❌ Baby ID is required
```

## Animation Effects

1. **Modal Open**: Fade-in backdrop + slide-up modal (0.3s)
2. **Modal Close**: Fade-out + slide-down (0.3s)
3. **Loading States**: Spinning icon (1s continuous)
4. **Button Hover**: Lift up 1px + shadow (0.2s)
5. **Dropdown Open**: Smooth expand (0.2s)

## Accessibility

- **Focus States**: Blue outline on all interactive elements
- **Keyboard Navigation**: Tab through form fields, Enter to submit
- **Screen Readers**: ARIA labels on all inputs and buttons
- **Color Contrast**: WCAG AA compliant
- **Error Messages**: Announced to screen readers

## Integration Points

### Data Flow Indicators

```
Header Selector → Active Baby State → NTE Widget
                        ↓
                  Baby Details
                        ↓
                  Recommendations API
                        ↓
                  Display Advice
                        ↓
                  ThingsBoard MQTT
```

### Loading States

1. **Page Load**: Fetching baby list → Populate dropdown
2. **Baby Selection**: Loading recommendations → Display widget
3. **Auto-refresh**: Silent update → No UI block
4. **Manual Refresh**: Spinning icon → Update display

---

**UI Design Language**: Clean, medical-grade interface with clear visual hierarchy and severity-based color coding for quick assessment of baby's thermal environment status.
