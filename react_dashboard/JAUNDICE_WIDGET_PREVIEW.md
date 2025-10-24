# Jaundice Widget - UI Preview

## 🎨 Visual Layout

```
┌────────────────────────────────────────────────────────────────┐
│  🩺 Jaundice Detection                    [🤖 Auto] or [👆 Manual]│
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ✅ No Jaundice           (Green background)              │  │
│  │  ⚠️ Possible Jaundice      (Yellow background)            │  │
│  │  🚨 Jaundice Detected      (Red background - pulsing)     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────┬─────────────────────┐                │
│  │ CONFIDENCE          │ PROBABILITY         │                │
│  │ 64.3%               │ 35.7%               │                │
│  │ ▰▰▰▰▰▰▱▱▱▱          │ ▰▰▰▰▱▱▱▱▱▱          │                │
│  └─────────────────────┴─────────────────────┘                │
│                                                                 │
│  ┌─────────────────────┬─────────────────────┐                │
│  │ BRIGHTNESS          │ RELIABILITY         │                │
│  │ 78.5                │ 85% ⚠️              │                │
│  └─────────────────────┴─────────────────────┘                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Low Light Conditions                                   │  │
│  │ Reliability reduced to 85%. Ensure adequate lighting...  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────┬───────────┐  │
│  │ Last check:                                 │           │  │
│  │ 🤖 10:15:30 • 2 mins ago                   │ [Detect   │  │
│  │                                             │  Now]     │  │
│  └─────────────────────────────────────────────┴───────────┘  │
│                                                                 │
│  ℹ️ Auto-detects every 10 minutes • Publishes to ThingsBoard  │
└────────────────────────────────────────────────────────────────┘
```

## 🎨 Color Schemes

### Normal Status (No Jaundice)

- **Background:** White → Light Green gradient
- **Border:** 4px solid Green (#10b981)
- **Status Banner:** Green background (#d1fae5)
- **Icon:** ✅

### Warning Status (Possible Jaundice)

- **Background:** White → Light Yellow gradient
- **Border:** 4px solid Orange (#f59e0b)
- **Status Banner:** Yellow background (#fef3c7)
- **Icon:** ⚠️

### Critical Status (Jaundice Detected)

- **Background:** White → Light Red gradient
- **Border:** 4px solid Red (#ef4444)
- **Status Banner:** Red background (#fee2e2)
- **Icon:** 🚨
- **Animation:** Pulsing shadow effect

## 📊 Progress Bars

### Confidence Bar

- **Color:** Blue gradient (#3b82f6 → #2563eb)
- **Width:** Dynamic based on value (0-100%)

### Probability Bar

- **Color:** Purple gradient (#8b5cf6 → #7c3aed)
- **Width:** Dynamic based on value (0-100%)

## 🔘 Buttons

### Detect Now Button

- **Normal State:**
  - Background: Purple gradient (#8b5cf6 → #7c3aed)
  - Color: White
  - Icon: 👁️ (eye icon)
- **Hover State:**
  - Lift up 2px
  - Box shadow: Purple glow
- **Disabled/Loading State:**
  - Opacity: 60%
  - Shows spinner
  - Text: "Detecting..."

## 📱 Responsive Breakpoints

### Desktop (> 640px)

- Metrics in 2x2 grid
- Button on right side

### Mobile (≤ 640px)

- Metrics in single column
- Button full width below

## ⏰ Time Display Formats

| Time Since Check | Display Format |
| ---------------- | -------------- |
| < 1 minute       | "just now"     |
| 1-59 minutes     | "5 mins ago"   |
| 60+ minutes      | "2 hours ago"  |

## 🎭 Animations

### Critical Status Pulse

```css
@keyframes pulse-critical {
  0%,
  100% {
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.5);
  }
}
```

Duration: 2 seconds, infinite loop

### Button Hover

- Translate Y: -2px
- Box shadow appears

### Spinner

- Rotation: 360° in 0.6 seconds
- Infinite loop

## 📐 Dimensions

- **Width:** Full container width
- **Border Radius:** 12px
- **Padding:** 1.5rem (24px)
- **Icon Size:** 48px × 48px
- **Progress Bar Height:** 8px
- **Badge Height:** Auto (padding 0.375rem)

## 🎨 Typography

- **Title:** 1.25rem (20px), Weight: 600
- **Metrics Label:** 0.75rem (12px), Uppercase, Spaced
- **Metrics Value:** 1.5rem (24px), Weight: 700
- **Status Text:** 1rem (16px), Weight: 600
- **Footer Text:** 0.875rem (14px)
- **Notice Text:** 0.75rem (12px)

## 🌈 Complete Color Palette

```css
/* Primary Colors */
--purple-gradient: linear-gradient(135deg, #8b5cf6, #7c3aed);
--blue-gradient: linear-gradient(90deg, #3b82f6, #2563eb);

/* Status Colors */
--green: #10b981;
--green-light: #d1fae5;
--green-dark: #065f46;

--orange: #f59e0b;
--yellow-light: #fef3c7;
--yellow-dark: #92400e;

--red: #ef4444;
--red-light: #fee2e2;
--red-dark: #991b1b;

/* Badge Colors */
--blue-badge-bg: #dbeafe;
--blue-badge-text: #1e40af;
--orange-badge-bg: #fed7aa;
--orange-badge-text: #9a3412;

/* Neutrals */
--gray-50: #f7fafc;
--gray-200: #e2e8f0;
--gray-500: #718096;
--gray-900: #1a202c;
```

## 🎯 User Interactions

1. **View Status:** User sees at-a-glance jaundice status
2. **Read Metrics:** User checks detailed confidence/probability
3. **Check Time:** User sees when last detection occurred
4. **Manual Detect:** User clicks "Detect Now" button
5. **Wait:** Loading state shows with spinner
6. **See Result:** Widget updates with new data

## ✨ Loading State

When `detecting={true}`:

```
┌────────────────────────────────────────────────┐
│  🩺 Jaundice Detection                         │
├────────────────────────────────────────────────┤
│                                                 │
│              ⟳ (spinning)                      │
│                                                 │
│        Loading jaundice status...              │
│                                                 │
└────────────────────────────────────────────────┘
```

## 🎬 Animation Timeline

1. **Mount:** Fade in (0.3s)
2. **Data Update:** Metrics animate to new values (0.3s)
3. **Progress Bars:** Width transition (0.3s)
4. **Button Hover:** Transform and shadow (0.2s)
5. **Critical Pulse:** Continuous 2s loop

---

This preview shows the complete visual design of the JaundiceWidget component!
