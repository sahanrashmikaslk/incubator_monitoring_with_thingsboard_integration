# NICU Incubator Monitoring System with ThingsBoard Integration

## Overview

Production-grade NICU monitoring system integrating:

- Real-time vitals monitoring (SpO2, Heart Rate, Skin Temperature, Humidity)
- Jaundice detection via camera
- Cry detection via microphone
- NTE (Neutral Thermal Environment) recommendations
- Live video streaming
- Multi-role access (Parents, Clinical Staff, Technical Admins)

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

## Features

### For Parents

- Live camera feed (When Permission granted by Clinical Staff)
- Chat with Clinical Staff

### For Clinical Staff (Doctors/Nurses)

- Full vitals dashboard with charts
- Historical trends
- Jaundice detection alerts
- Cry detection alerts
- NTE recommendations
- Camera access

### For Admins

- User management
- Device configuration
- Access control
- System monitoring

## Technology Stack

### Core Platform

- **IoT Platform**: ThingsBoard Community Edition (CE)
- **Database**: PostgreSQL (via ThingsBoard)
- **Message Broker**: MQTT (Paho MQTT Client)
- **Web Server**: Nginx (reverse proxy & static file serving)

### Frontend

- **Framework**: React 18.2.0
- **Routing**: React Router DOM 6.20.0
- **UI Components**: Custom components with Lucide React icons
- **Charts**: Chart.js 4.4.0 with React Chart.js 2
- **HTTP Client**: Axios 1.6.2
- **Build Tool**: React Scripts 5.0.1

### Backend Services

#### Backend APIs

- **Framework**: Express.js
- **Admin Backend**:
  - Admin authentication & authorization
  - Admin user management
  - System notifications
  - Setup tokens & configuration
- **Parent Backend**:
  - Parent authentication & registration
  - Baby-parent associations
  - Parent-clinician messaging
  - Camera access invitations
- **Database**: Google Cloud SQL PostgreSQL
  - `admin_db` (admin users, tokens, notifications)
  - `parent_db` (parents, babies, messages, invitations)
- **Auth**: JWT tokens, bcrypt password hashing

#### Python Service APIs

- **Framework**: FastAPI (async REST APIs)
- **Services**:
  - LCD reading service (OCR + YOLO)
  - Jaundice detection service (PyTorch)
  - Cry detection service (TensorFlow)
  - Camera streaming service (OpenCV)

#### Deployment

- **Production**: GCP Cloud Run (serverless containers)
  - `incubator-admin-backend`
  - `incubator-parent-backend`
  - `incubator-dashboard` (React frontend)
- **Local**: Docker containers
- **Proxy**: Nginx reverse proxy

### Machine Learning & Computer Vision

- **Deep Learning Frameworks**:
  - PyTorch (jaundice detection models)
  - TensorFlow 2.x (cry classification with YAMNet)
  - ONNX Runtime (optimized inference)
- **Object Detection**:
  - Ultralytics YOLOv8 (LCD display segmentation)
  - Custom trained models
- **OCR Engines**:
  - EasyOCR (primary LCD text recognition)
  - Tesseract OCR (secondary/fallback)
- **Models**:
  - MobileNetV3 (jaundice classification)
  - YAMNet (cry sound classification)
  - Custom YOLOv8 (incubator display detection)

### Edge Computing (Raspberry Pi)

- **Hardware**: Raspberry Pi 4B+
- **OS**: Raspberry Pi OS (Linux)
- **Camera**: Pi Camera Module / USB Webcam
- **Microphone**: USB audio device
- **Services**:
  - LCD reading (YOLO + OCR + MQTT)
  - Jaundice detection (PyTorch + MQTT)
  - Cry detection (TensorFlow + MQTT)
  - Camera streaming (HTTP/HLS)

### Video Streaming

- **Protocol**: HTTP Live Streaming (HLS)
- **Fallback**: MJPEG stream
- **Server**: Custom Python HTTP server
- **Camera Access**: OpenCV (cv2)

### Communication Protocols

- **MQTT**: Device-to-cloud telemetry (Paho MQTT)
- **REST API**: Dashboard-to-ThingsBoard (Axios)
- **WebSocket**: Real-time updates (via ThingsBoard)
- **HTTP**: Video streaming & custom APIs

### Development & Deployment

- **Containerization**: Docker, Docker Compose
- **Cloud Platform**: Google Cloud Platform (GCP)
  - Cloud Run (serverless containers)
  - Cloud Build (CI/CD)
  - Container Registry (GCR)
- **Version Control**: Git, GitHub
- **Build Tools**: npm, pip, Docker
