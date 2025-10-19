# NICU Incubator Monitoring System with ThingsBoard Integration

## Overview
Production-grade NICU monitoring system integrating:
- Real-time vitals monitoring (SpO2, Heart Rate, Skin Temperature, Humidity)
- Jaundice detection via camera
- NTE (Neutral Thermal Environment) recommendations
- Live video streaming
- Multi-role access (Parents, Clinical Staff, Admins)

## Architecture
- **Backend**: ThingsBoard Cloud (IoT platform)
- **Frontend**: Custom React Dashboard
- **Device**: Raspberry Pi 3B+ with camera
- **Communication**: MQTT (Pi → ThingsBoard), REST API (React → ThingsBoard)
- **Authentication**: JWT-based (ThingsBoard)

## Project Structure
```
incubator_monitoring_with_thingsboard_integration/
├── pi_client/              # Raspberry Pi code
│   ├── lcd_reader.py       # OCR + MQTT publisher
│   ├── jaundice_detector.py
│   ├── camera_streamer.py
│   ├── config.py
│   └── requirements.txt
├── react_dashboard/        # Custom React UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── ParentPortal/
│   │   │   ├── ClinicalDashboard/
│   │   │   └── AdminPanel/
│   │   └── services/
│   │       ├── thingsboard.service.js
│   │       └── camera.service.js
│   └── package.json
├── backend_services/       # Custom APIs (NTE, Jaundice)
│   ├── nte_api.py
│   ├── jaundice_api.py
│   └── requirements.txt
├── config/
│   ├── thingsboard_config.json
│   ├── device_credentials.json
│   └── .env.example
└── docs/
    ├── ARCHITECTURE.md
    ├── API_INTEGRATION.md
    └── DEPLOYMENT.md
```

## Device Configuration
- **Device ID**: INC-001
- **ThingsBoard Host**: thingsboard.cloud
- **Access Token**: See `config/device_credentials.json`

## Quick Start

### 1. Raspberry Pi Setup
```bash
cd pi_client
pip install -r requirements.txt
python lcd_reader.py
```

### 2. React Dashboard
```bash
cd react_dashboard
npm install
npm start
```

### 3. Backend Services
```bash
cd backend_services
pip install -r requirements.txt
python nte_api.py
```

## Features

### For Parents
- Live camera feed (HLS streaming)
- View-only access to baby vitals
- No historical data or controls

### For Clinical Staff (Doctors/Nurses)
- Full vitals dashboard with charts
- Historical trends
- Jaundice detection alerts
- NTE recommendations
- Camera access

### For Admins
- User management
- Device configuration
- Access control
- System monitoring

## Technology Stack
- **IoT Platform**: ThingsBoard Cloud
- **Frontend**: React, TailwindCSS, Chart.js
- **Backend**: Python (FastAPI)
- **Database**: PostgreSQL (ThingsBoard managed)
- **Video Streaming**: HLS/RTSP
- **MQTT**: Paho MQTT Client
- **OCR**: EasyOCR
- **Object Detection**: YOLOv8

## Deployment
See `docs/DEPLOYMENT.md` for detailed deployment instructions.

## License
Private - NICU Monitoring System
