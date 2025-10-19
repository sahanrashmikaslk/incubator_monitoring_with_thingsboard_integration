# System Architecture

## Overview
The NICU Incubator Monitoring System is a hybrid architecture combining:
- **ThingsBoard Cloud** for backend IoT platform
- **Custom React Dashboard** for user-facing interfaces
- **Raspberry Pi** for edge computing (OCR, jaundice detection)
- **MQTT** for real-time data transmission

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Users                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐           │
│  │   Parents   │  │ Doctors/     │  │   Admins    │           │
│  │   Portal    │  │ Nurses       │  │   Panel     │           │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘           │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               Custom React Dashboard (Port 3000)                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Authentication (JWT)                                      │ │
│  │ • Role-based routing (Parents/Clinical/Admin)              │ │
│  │ • Real-time charts (Chart.js)                              │ │
│  │ • Video streaming (React Player)                           │ │
│  │ • Alert notifications                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              ThingsBoard Cloud Platform                          │
│  ┌─────────────────────┐  ┌──────────────────┐                 │
│  │ REST API            │  │ WebSocket API    │                 │
│  │ • User Auth         │  │ • Real-time      │                 │
│  │ • Telemetry Query   │  │   Telemetry      │                 │
│  │ • Device Mgmt       │  │ • Subscriptions  │                 │
│  └─────────────────────┘  └──────────────────┘                 │
│  ┌────────────────────────────────────────────┐                │
│  │ PostgreSQL Database                         │                │
│  │ • Time-series data                         │                │
│  │ • User accounts                            │                │
│  │ • Device registry                          │                │
│  └────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │ MQTT (Port 1883)
                            │
┌─────────────────────────────────────────────────────────────────┐
│              Raspberry Pi 3B+ (INC-001)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ LCD Reader (lcd_reader.py)                                 │ │
│  │ • YOLO Detection (YOLOv8n)                                 │ │
│  │ • OCR (EasyOCR)                                            │ │
│  │ • MQTT Publisher                                           │ │
│  │ • Publishes every 15 seconds                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Jaundice Detector (jaundice_detector.py)                   │ │
│  │ • MobileNetV3 (ONNX)                                       │ │
│  │ • Risk classification                                      │ │
│  │ • Publishes every 5 minutes                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Camera Server (mjpg-streamer)                              │ │
│  │ • MJPEG stream (Port 8081)                                 │ │
│  │ • Snapshot capture                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              USB Camera (V380)                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Telemetry Publishing (Pi → ThingsBoard)
```
Camera Frame → YOLO Detection → OCR Extraction → Value Parsing
     ↓
MQTT Message {
  "spo2": 98,
  "heart_rate": 145,
  "skin_temp": 36.7,
  "humidity": 55
}
     ↓
ThingsBoard MQTT Broker (Port 1883)
     ↓
Time-series Database (PostgreSQL)
```

### 2. Dashboard Data Retrieval (React → ThingsBoard)
```
User Login → JWT Token
     ↓
REST API Call: GET /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries
     ↓
JSON Response {
  "spo2": [{"ts": 1234567890, "value": 98}],
  "heart_rate": [{"ts": 1234567890, "value": 145}]
}
     ↓
React State Update → Chart Rendering
```

### 3. Real-time Updates (ThingsBoard → React)
```
WebSocket Connection
     ↓
Subscribe to device telemetry
     ↓
Server pushes new data
     ↓
Update UI in real-time
```

## Security Architecture

### Authentication Flow
```
1. User enters credentials
2. React → ThingsBoard: POST /api/auth/login
3. ThingsBoard validates credentials
4. Returns JWT token + refresh token
5. Token stored in memory (not localStorage)
6. All subsequent requests include Bearer token
7. Auto-refresh before expiry
```

### Authorization Levels
- **Parents**: Read-only camera access
- **Clinical Staff**: Full vitals dashboard, historical data, alerts
- **Admins**: User management, device configuration, system settings

### Data Encryption
- TLS/SSL for all HTTP/MQTT connections
- JWT tokens expire after 1 hour
- Refresh tokens for seamless re-authentication

## Scalability Considerations

### Current Setup (Single Incubator)
- 1 Raspberry Pi → 1 Device (INC-001)
- 1 ThingsBoard tenant
- Data published every 15 seconds
- ~5,760 messages per day

### Multi-Incubator Support
- Add more Raspberry Pis with unique device IDs (INC-002, INC-003...)
- Each device has unique access token
- ThingsBoard handles multiple devices natively
- React dashboard filters by device ID
- Admins can add/remove devices dynamically

## Technology Stack

### Edge (Raspberry Pi)
- **OS**: Debian 12 (ARM64)
- **Python**: 3.11
- **ML Models**: YOLOv8n (detection), MobileNetV3 (jaundice)
- **OCR**: EasyOCR
- **Communication**: Paho MQTT Client

### Cloud (ThingsBoard)
- **Platform**: ThingsBoard Cloud
- **Database**: PostgreSQL (managed)
- **MQTT Broker**: Built-in (Port 1883)
- **REST API**: Built-in (Port 443)
- **WebSocket**: Built-in

### Frontend (React)
- **Framework**: React 18
- **Routing**: React Router v6
- **State Management**: Context API + Hooks
- **Charts**: Chart.js
- **Video**: React Player
- **Styling**: TailwindCSS

### Backend Services (Custom)
- **Framework**: FastAPI (Python)
- **NTE Recommendations**: ML-based thermal comfort calculator
- **Jaundice Results**: Store and retrieve jaundice risk history

## Deployment Strategy

### Development Environment
- Pi connected via Tailscale (100.99.151.101)
- React dev server (localhost:3000)
- ThingsBoard cloud instance

### Production Environment
- Pi in hospital network
- React app deployed to Vercel/Netlify
- ThingsBoard cloud (production tenant)
- Custom backend on AWS Lambda / Azure Functions

## Monitoring & Maintenance

### System Health Checks
- Pi CPU/RAM monitoring
- MQTT connection status
- Camera stream availability
- ThingsBoard quota usage

### Alerts & Notifications
- Critical vitals (SpO2 < 85%)
- Device offline (no data > 1 minute)
- Jaundice risk escalation
- System errors

## Future Enhancements
1. **Mobile App**: React Native for parents
2. **AI Alerts**: Predictive alerts for vital deterioration
3. **Multi-Camera**: Support for multiple camera angles
4. **Audio Monitoring**: Cry detection
5. **Integration**: EHR/EMR systems
6. **Analytics**: Machine learning insights dashboard
