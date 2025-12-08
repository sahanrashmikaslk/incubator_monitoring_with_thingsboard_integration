# Incubator Monitoring System - Mobile App API Guide

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           NICU Incubator Monitoring System                           │
│                          Complete Architecture Diagram                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  RASPBERRY PI (Incubator Device)                                                     │
│  IP: 100.89.162.22 (Tailscale VPN)                                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ LCD Reading      │  │ Jaundice         │  │ Cry Detection    │                 │
│  │ Server           │  │ Detection        │  │ Service          │                 │
│  │ Port: 9001       │  │ Port: 8887       │  │ Port: 8080       │                 │
│  │                  │  │                  │  │                  │                 │
│  │ - Reads temp     │  │ - AI jaundice    │  │ - Audio monitor  │                 │
│  │ - Reads humidity │  │   detection      │  │ - Cry classify   │                 │
│  │ - Incubator LCD  │  │ - ONNX model     │  │ - Real-time      │                 │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                 │
│           │                     │                     │                              │
│           └─────────────────────┴─────────────────────┘                              │
│                                 │                                                    │
│                    ┌────────────▼────────────┐                                      │
│                    │ ThingsBoard MQTT Client │                                      │
│                    │ (Pi Client Service)     │                                      │
│                    │ - Publishes every 15s   │                                      │
│                    │ - Telemetry aggregator  │                                      │
│                    └────────────┬────────────┘                                      │
│                                 │                                                    │
└─────────────────────────────────┼────────────────────────────────────────────────────┘
                                  │
                                  │ MQTT Protocol (TLS)
                                  │ mqtt://thingsboard.cloud:1883
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  THINGSBOARD CLOUD PLATFORM                                                          │
│  URL: https://thingsboard.cloud                                                      │
│  Region: Global (Multi-region)                                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐            │
│  │ Device: INC-001                                                     │            │
│  │ Device Token: 2ztut7be6ppooyiueorb                                 │            │
│  │                                                                     │            │
│  │ Telemetry Storage (Time-Series DB):                                │            │
│  │ ├─ spo2, heart_rate, skin_temp, humidity, air_temp                │            │
│  │ ├─ jaundice_detected, jaundice_confidence, jaundice_probability   │            │
│  │ ├─ cry_detected, cry_classification, cry_audio_level              │            │
│  │ └─ nte_age_hours, nte_range_min, nte_latest_advice                │            │
│  │                                                                     │            │
│  │ REST API Endpoint:                                                 │            │
│  │ https://thingsboard.cloud/api                                      │            │
│  │                                                                     │            │
│  │ Authentication:                                                    │            │
│  │ POST /api/auth/login                                               │            │
│  │ Header: X-Authorization: Bearer <token>                            │            │
│  └────────────────────────────────────────────────────────────────────┘            │
│                                                                                      │
└──────────────────────────────────────┬───────────────────────────────────────────────┘
                                       │
                                       │ HTTPS REST API
                                       │ (Clinical Dashboard queries)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  CLINICAL DASHBOARD (React Web App)                                                  │
│  URL: https://react-dashboard-571778410429.us-central1.run.app                      │
│  Hosted: Google Cloud Run (us-central1)                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  User Roles:                                                                        │
│  ├─ Doctor (doctor@demo.com)                                                        │
│  ├─ Nurse (nurse@demo.com)                                                          │
│  └─ Admin (admin@demo.com)                                                          │
│                                                                                      │
│  Features:                                                                          │
│  ├─ Real-time vitals display (from ThingsBoard)                                    │
│  ├─ Jaundice detection alerts                                                      │
│  ├─ Cry detection monitoring                                                       │
│  ├─ NTE temperature recommendations                                                │
│  ├─ Historical trend charts (6h, 24h)                                              │
│  ├─ Parent messaging (via Unified Backend)                                         │
│  └─ Camera access management                                                       │
│                                                                                      │
└──────────────────────────────────┬───────────────────────────────────────────────────┘
                                   │
                                   │ HTTPS REST API
                                   │ (Parent management, notifications)
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  UNIFIED BACKEND (Node.js + Express)                                                 │
│  URL: https://incubator-monitoring-backend-571778410429.us-central1.run.app         │
│  Hosted: Google Cloud Run (us-central1)                                             │
│  Port: 8080 (internal)                                                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  API Endpoints:                                                                     │
│  ├─ /health                          (Health check)                                │
│  ├─ /api/admin/*                     (Admin management)                            │
│  ├─ /api/parent/*                    (Parent portal)                               │
│  ├─ /api/parent/clinician/*          (Clinician → Parent actions)                  │
│  └─ /api/notifications/*             (Clinical notifications)                      │
│                                                                                      │
│  Authentication:                                                                    │
│  ├─ JWT tokens (for parents & admins)                                              │
│  ├─ Bearer token: Authorization: Bearer <token>                                    │
│  └─ API Key (clinician): X-API-Key: super-secret-clinician-key                    │
│                                                                                      │
│  Environment Variables:                                                             │
│  ├─ NODE_ENV=production                                                            │
│  ├─ INSTANCE_CONNECTION_NAME=neonatal-incubator-monitoring:us-central1:incubator-db│
│  ├─ DB_USER=incubator_app                                                          │
│  ├─ DB_PASSWORD=IncubatorApp2025SecurePass                                         │
│  ├─ DB_NAME=incubator_system                                                       │
│  └─ JWT_SECRET=incubator_jwt_secret_change_in_production_2024                     │
│                                                                                      │
│  Cloud SQL Connection:                                                             │
│  Via Unix Socket: /cloudsql/neonatal-incubator-monitoring:us-central1:incubator-db │
│                                                                                      │
└──────────────────────────────────┬───────────────────────────────────────────────────┘
                                   │
                                   │ Unix Socket (Private)
                                   │ Cloud SQL Connector
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  POSTGRESQL CLOUD SQL DATABASE                                                       │
│  Instance: incubator-db                                                             │
│  Connection: neonatal-incubator-monitoring:us-central1:incubator-db                 │
│  Region: us-central1                                                                │
│  Database: incubator_system                                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Tables (8):                                                                        │
│  ├─ admins              (Admin user accounts)                                      │
│  ├─ babies              (Baby records with metadata)                               │
│  ├─ parents             (Parent accounts linked to babies)                         │
│  ├─ invitations         (Parent invitation codes with PIN)                         │
│  ├─ messages            (Communication between parents & clinicians)               │
│  ├─ camera_access       (Camera permission management)                             │
│  ├─ notifications       (Clinical alerts - cry, jaundice, NTE)                     │
│  └─ setup_tokens        (Admin account setup tokens)                               │
│                                                                                      │
│  Data Persistence:                                                                  │
│  ✅ Permanent storage (survives all deployments)                                   │
│  ✅ Automatic daily backups                                                        │
│  ✅ Point-in-time recovery available                                               │
│                                                                                      │
└──────────────────────────────────┬───────────────────────────────────────────────────┘
                                   │
                                   │ HTTPS REST API (JWT Auth)
                                   │
                   ┌───────────────┴────────────────┬───────────────────────┐
                   │                                │                       │
                   ▼                                ▼                       ▼
┌─────────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────┐
│  PARENT MOBILE APP          │  │  ADMIN MOBILE APP        │  │  CLINICIAN WEB APP   │
│  (React Native / Flutter)   │  │  (React Native / Flutter)│  │  (React Dashboard)   │
├─────────────────────────────┤  ├──────────────────────────┤  ├──────────────────────┤
│                             │  │                          │  │                      │
│  Features:                  │  │  Features:               │  │  Features:           │
│  ✓ Phone/Password login     │  │  ✓ Email/Password login  │  │  ✓ ThingsBoard login │
│  ✓ Register with invite     │  │  ✓ Create admins         │  │  ✓ Live vitals       │
│  ✓ View baby vitals         │  │  ✓ Manage users          │  │  ✓ Send messages     │
│  ✓ Receive notifications    │  │  ✓ System notifications  │  │  ✓ Create invites    │
│  ✓ Chat with clinicians     │  │  ✓ View all babies       │  │  ✓ Approve camera    │
│  ✓ Request camera access    │  │  ✓ Analytics dashboard   │  │  ✓ Jaundice alerts   │
│  ✓ View camera stream       │  │  ✓ Audit logs            │  │  ✓ Cry detection     │
│                             │  │                          │  │  ✓ NTE alerts        │
│  API Endpoints:             │  │  API Endpoints:          │  │                      │
│  → Unified Backend          │  │  → Unified Backend       │  │  API Endpoints:      │
│  → /api/parent/*            │  │  → /api/admin/*          │  │  → ThingsBoard API   │
│                             │  │                          │  │  → Unified Backend   │
└─────────────────────────────┘  └──────────────────────────┘  └──────────────────────┘
```

---

## 🌐 Network Architecture & IP Addresses

### **Production URLs:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Component                    │ URL/IP                                │
├──────────────────────────────┼───────────────────────────────────────┤
│ Unified Backend              │ https://incubator-monitoring-backend-│
│                              │ 571778410429.us-central1.run.app      │
├──────────────────────────────┼───────────────────────────────────────┤
│ React Dashboard              │ https://react-dashboard-571778410429 │
│                              │ .us-central1.run.app                  │
├──────────────────────────────┼───────────────────────────────────────┤
│ ThingsBoard Cloud API        │ https://thingsboard.cloud/api         │
├──────────────────────────────┼───────────────────────────────────────┤
│ ThingsBoard MQTT Broker      │ mqtt://thingsboard.cloud:1883         │
├──────────────────────────────┼───────────────────────────────────────┤
│ Raspberry Pi (Tailscale VPN) │ 100.89.162.22                         │
│  ├─ LCD Reading Server       │ http://100.89.162.22:9001             │
│  ├─ Jaundice Detection       │ http://100.89.162.22:8887             │
│  └─ Cry Detection            │ http://100.89.162.22:8080             │
├──────────────────────────────┼───────────────────────────────────────┤
│ Cloud SQL Instance           │ neonatal-incubator-monitoring:        │
│                              │ us-central1:incubator-db              │
│                              │ (Private - Unix Socket only)          │
└─────────────────────────────────────────────────────────────────────┘
```

### **Development/Test URLs:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Component                    │ URL/IP                                │
├──────────────────────────────┼───────────────────────────────────────┤
│ Unified Backend (Local)      │ http://localhost:8080                 │
├──────────────────────────────┼───────────────────────────────────────┤
│ Parent Backend (Local)       │ http://localhost:5000                 │
├──────────────────────────────┼───────────────────────────────────────┤
│ Admin Backend (Local)        │ http://localhost:5056                 │
├──────────────────────────────┼───────────────────────────────────────┤
│ React Dashboard (Local)      │ http://localhost:3000                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Tailscale VPN & Reverse Proxy Architecture

### **Why Tailscale?**

The Raspberry Pi is deployed in a hospital environment without public IP. Tailscale creates a secure mesh VPN network allowing Cloud Run services to communicate with the Pi device privately.

### **Tailscale Network Topology:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TAILSCALE MESH VPN                            │
│                     (100.64.0.0/10 - CGNAT Range)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Node 1: Raspberry Pi (Hospital)                                    │
│  ├─ Tailscale IP: 100.89.162.22                                    │
│  ├─ Hostname: pi-incubator                                         │
│  └─ Services:                                                       │
│     ├─ Port 8080: Camera Stream                                    │
│     ├─ Port 8081: LCD Camera Stream                                │
│     ├─ Port 8887: Jaundice Detection API                           │
│     ├─ Port 8888: Cry Detection API                                │
│     ├─ Port 9000: Health/Management API                            │
│     ├─ Port 9001: LCD Reading Server                               │
│     └─ Port 8090: Test Dashboard (HTML)                            │
│                                                                      │
│  Node 2: GCP Tailscale Router (Proxy VM)                           │
│  ├─ Tailscale IP: 100.114.45.10                                   │
│  ├─ GCP Internal IP: 10.128.0.2                                   │
│  ├─ GCP External IP: 34.60.196.25 (Nginx Reverse Proxy)           │
│  ├─ Instance: tailscale-router (e2-micro)                         │
│  ├─ Zone: us-central1-a                                            │
│  └─ Purpose: Bridge GCP VPC ↔ Tailscale Network                   │
│                                                                      │
│  Node 3: Developer Laptop (Optional)                               │
│  ├─ Tailscale IP: 100.x.x.x (varies)                              │
│  └─ Purpose: Direct SSH access to Pi for maintenance               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### **VPC Network Architecture:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  GOOGLE CLOUD PLATFORM - VPC Network                                │
│  Project: neonatal-incubator-monitoring                             │
│  Region: us-central1                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  VPC Connector: tailscale-connector                        │    │
│  │  ├─ IP Range: 10.8.0.0/28                                 │    │
│  │  ├─ Instances: 2-10 (auto-scaling)                        │    │
│  │  ├─ Purpose: Connect Cloud Run → VPC                      │    │
│  │  └─ Cost: ~$10-18/month                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           │                                          │
│                           │ Routes traffic to VPC                    │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  GCP VPC Network (default)                                 │    │
│  │  ├─ Subnet Range: 10.128.0.0/9                            │    │
│  │  └─ Firewall: allow-tailscale-vpc                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           │                                          │
│                           │ Routes to Tailscale Router               │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Tailscale Router VM                                       │    │
│  │  ├─ Name: tailscale-router                                │    │
│  │  ├─ Type: e2-micro (1 vCPU, 1GB RAM)                      │    │
│  │  ├─ Internal IP: 10.128.0.2                               │    │
│  │  ├─ External IP: 34.60.196.25                             │    │
│  │  ├─ Tailscale IP: 100.114.45.10                           │    │
│  │  └─ Subnet Route Advertised: 10.128.0.0/9                │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           │                                          │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
                            │ Tailscale Mesh VPN
                            │ (Encrypted WireGuard)
                            ▼
                   ┌─────────────────────┐
                   │   Raspberry Pi      │
                   │   100.89.162.22     │
                   │   (Hospital)        │
                   └─────────────────────┘
```

### **Nginx Reverse Proxy Configuration:**

The Tailscale Router VM runs Nginx to proxy requests from public internet to Pi services:

```nginx
# External IP: 34.60.196.25 (Public Access Point)
# Internal Tailscale IP: 100.114.45.10

server {
    listen 80;

    # Proxy to Pi Health/Management Server (port 9000)
    location ~ ^/api/pi:9000/(.*)$ {
        proxy_pass http://100.89.162.22:9000/$1;
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
    }

    # Proxy to Pi LCD Reading Server (port 9001)
    location /api/pi/lcd/ {
        proxy_pass http://100.89.162.22:9001/;
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
    }

    # Proxy to Pi Camera Stream (port 8080)
    location /api/pi/camera/ {
        proxy_pass http://100.89.162.22:8080/;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
    }

    # Proxy to Pi LCD Display Camera (port 8081)
    location /api/pi/lcd-camera/ {
        proxy_pass http://100.89.162.22:8081/;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
    }

    # Proxy to Pi Jaundice Detection (port 8887)
    location /api/pi/jaundice/ {
        proxy_pass http://100.89.162.22:8887/;
        proxy_connect_timeout 30s;
        proxy_read_timeout 120s;
    }

    # Proxy to Pi Cry Detection (port 8888)
    location ~ ^/api/pi:8888/(.*)$ {
        proxy_pass http://100.89.162.22:8888/$1;
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
    }

    # Proxy to Pi Test Dashboard (port 8090)
    location /api/pi/snapshot/ {
        proxy_pass http://100.89.162.22:8090/;
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
    }
}
```

### **React Dashboard Nginx Configuration:**

The React Dashboard (Cloud Run) also has Nginx that proxies to the Tailscale Router:

```nginx
server {
    listen 80;

    # Proxy ALL /api/pi/* requests to Tailscale Router VM
    location /api/pi {
        proxy_pass http://34.60.196.25;  # Tailscale Router External IP
        proxy_http_version 1.1;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Proxy to Admin Backend (Cloud Run)
    location /api/admin/ {
        proxy_pass https://incubator-admin-backend-571778410429.us-central1.run.app/api/admin/;
    }

    # Proxy to Parent Backend (Cloud Run)
    location /api/parent/ {
        proxy_pass https://incubator-parent-backend-571778410429.us-central1.run.app/api/;
    }
}
```

### **Complete Request Path Example:**

**Scenario: Clinical Dashboard fetches jaundice detection result**

```
1. User Browser
   ↓ HTTPS
   https://react-dashboard-571778410429.us-central1.run.app/api/pi/jaundice/detect

2. React Dashboard (Cloud Run - Nginx)
   ↓ HTTP
   http://34.60.196.25/api/pi/jaundice/detect

3. Tailscale Router VM (34.60.196.25 - Nginx)
   ↓ Tailscale VPN (WireGuard encrypted)
   http://100.89.162.22:8887/detect

4. Raspberry Pi (100.89.162.22:8887)
   - Jaundice Detection Service processes request
   - Returns: {"detected": true, "confidence": 85}

5. Response flows back through the same path
```

### **Tailscale Connection Details:**

| Property            | Value                              |
| ------------------- | ---------------------------------- |
| **Network Type**    | Mesh VPN (peer-to-peer)            |
| **Protocol**        | WireGuard (UDP)                    |
| **Encryption**      | ChaCha20-Poly1305                  |
| **IP Range**        | 100.64.0.0/10 (CGNAT)              |
| **Raspberry Pi IP** | 100.89.162.22                      |
| **GCP Router IP**   | 100.114.45.10                      |
| **Connection Mode** | Direct (not relayed)               |
| **Latency**         | ~50-100ms (depending on location)  |
| **Authentication**  | Tailscale Auth Key                 |
| **Subnet Routing**  | 10.128.0.0/9 (GCP VPC → Tailscale) |

### **Key Benefits:**

1. **✅ No Public IP Required** - Pi can be behind hospital NAT/firewall
2. **✅ Encrypted Communication** - All traffic encrypted with WireGuard
3. **✅ Zero Trust Access** - Only authenticated devices can connect
4. **✅ Automatic Reconnection** - Handles network changes seamlessly
5. **✅ Cross-Platform** - Works on Linux (Pi), Windows (Dev), Cloud VMs
6. **✅ NAT Traversal** - Works through complex network configurations
7. **✅ Low Latency** - Direct peer-to-peer connections when possible

### **Accessing Pi Services:**

**From Cloud Run Services:**

```
Cloud Run → VPC Connector → GCP VPC → Tailscale Router → Tailscale VPN → Pi
```

**From Clinical Dashboard (Public):**

```
Browser → Cloud Run (Dashboard) → Nginx → Tailscale Router VM → Tailscale VPN → Pi
```

**From Developer Laptop:**

```
# Install Tailscale on your machine
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Direct access to Pi
ssh pi@100.89.162.22
curl http://100.89.162.22:9001/status
```

### **Security Considerations:**

1. **Tailscale ACLs** - Configure access control lists in Tailscale admin
2. **Firewall Rules** - GCP firewall allows only VPC traffic to Tailscale Router
3. **No Direct Pi Exposure** - Pi has no public IP, only Tailscale VPN access
4. **Nginx Proxy** - Additional layer of access control and logging
5. **JWT Authentication** - Backend APIs require JWT tokens
6. **HTTPS Only** - All external traffic encrypted with TLS

---

## 📡 Data Flow Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Raspberry  │  MQTT   │ ThingsBoard │  HTTPS  │  Clinical   │
│     Pi      ├────────>│    Cloud    ├────────>│  Dashboard  │
│             │  15s    │             │  Query  │             │
└─────────────┘         └─────────────┘         └─────────────┘
      │                                                 │
      │                                                 │
      │ Manual Trigger (Jaundice Detection)            │ HTTPS
      │ POST http://100.89.162.22:8887/detect          │
      │                                                 │
      └─────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Parent    │  HTTPS  │   Unified   │  SQL    │  PostgreSQL │
│  Mobile App ├────────>│   Backend   ├────────>│  Cloud SQL  │
│             │  JWT    │             │  Unix   │             │
└─────────────┘         └─────────────┘  Socket └─────────────┘
                               │
                               │ JWT Auth
                               │
┌─────────────┐                │
│    Admin    │  HTTPS         │
│  Mobile App ├────────────────┘
│             │  JWT
└─────────────┘

┌─────────────┐         ┌─────────────┐
│  Clinical   │  API    │   Unified   │
│  Dashboard  │  Key    │   Backend   │
│             ├────────>│  /clinician │
│             │  X-API  │  endpoints  │
└─────────────┘  -Key   └─────────────┘
```

---

## 🔄 Complete Request Flow Examples

### **Example 1: Parent Views Baby Vitals**

```
1. Parent Mobile App sends:
   GET https://incubator-monitoring-backend-571778410429.us-central1.run.app/api/parent/baby
   Authorization: Bearer <parent-jwt-token>

2. Unified Backend:
   - Verifies JWT token
   - Extracts baby_id from parent record
   - Queries Cloud SQL database

3. Cloud SQL returns:
   baby_id: "BABY001"
   baby_name: "Baby Smith"
   metadata: {...}

4. Parent App also fetches notifications:
   GET .../api/notifications/BABY001
   Authorization: Bearer <parent-jwt-token>

5. Response includes:
   - Cry detection alerts (from clinical dashboard)
   - Jaundice alerts (from clinical dashboard)
   - NTE warnings (from clinical dashboard)
```

### **Example 2: Clinical Dashboard Shows Live Vitals**

```
1. Raspberry Pi (every 15 seconds):
   - Reads LCD: temp=36.5°C, humidity=65%
   - Detects jaundice: confidence=85%
   - Monitors cry: detected=false

2. Pi Client publishes to ThingsBoard:
   MQTT → mqtt://thingsboard.cloud:1883
   Topic: v1/devices/me/telemetry
   Payload: {
     "skin_temp": 36.5,
     "humidity": 65,
     "jaundice_detected": true,
     "jaundice_confidence": 85,
     "cry_detected": false
   }

3. ThingsBoard stores in time-series DB

4. Clinical Dashboard queries:
   GET https://thingsboard.cloud/api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries?keys=skin_temp,humidity,jaundice_detected
   X-Authorization: Bearer <thingsboard-token>

5. ThingsBoard responds:
   {
     "skin_temp": [{"ts": 1699876543210, "value": "36.5"}],
     "humidity": [{"ts": 1699876543210, "value": "65"}],
     "jaundice_detected": [{"ts": 1699876543210, "value": "true"}]
   }

6. Dashboard displays vitals in real-time
```

### **Example 3: Doctor Sends Message to Parent**

```
1. Clinical Dashboard:
   POST https://incubator-monitoring-backend-571778410429.us-central1.run.app/api/parent/clinician/messages
   X-API-Key: super-secret-clinician-key
   {
     "babyId": "BABY001",
     "senderName": "Dr. Smith",
     "content": "Baby is doing well today."
   }

2. Unified Backend:
   - Verifies API key
   - Inserts message into Cloud SQL database
   - Links message to baby_id=BABY001

3. Cloud SQL stores:
   INSERT INTO messages (baby_id, sender_type, sender_name, content)
   VALUES ('BABY001', 'clinician', 'Dr. Smith', 'Baby is doing well today.')

4. Parent Mobile App polls:
   GET .../api/parent/messages
   Authorization: Bearer <parent-jwt-token>

5. Unified Backend:
   - Extracts baby_id from parent's JWT token
   - Queries messages for that baby_id
   - Returns all messages (parent + clinician)

6. Parent sees new message with push notification
```

---

## 🔗 Base URL

```
https://incubator-monitoring-backend-571778410429.us-central1.run.app
```

## 📊 Database

- **Type**: PostgreSQL (Cloud SQL)
- **Persistence**: Permanent storage
- **Location**: Google Cloud Platform (us-central1)

---

## 🔐 Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 📱 PARENT APP API ENDPOINTS

### 1. Parent Authentication

#### Login

```http
POST /api/parent/login
Content-Type: application/json

{
  "phone": "+94771234567",
  "password": "parent_password"
}

Response (200):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "parent": {
    "id": 1,
    "baby_id": "BABY001",
    "name": "John Doe",
    "phone": "+94771234567",
    "created_at": "2025-11-13T10:00:00.000Z"
  }
}
```

#### Register (Claim Invitation)

```http
POST /api/parent/register
Content-Type: application/json

{
  "invitation_code": "ABC123XYZ",
  "pin_code": "1234",
  "parent_name": "John Doe",
  "phone": "+94771234567",
  "password": "secure_password"
}

Response (201):
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "parent": {
    "id": 1,
    "baby_id": "BABY001",
    "baby_name": "Baby Smith",
    "name": "John Doe",
    "phone": "+94771234567"
  }
}
```

### 2. Baby Information

#### Get Baby Details

```http
GET /api/parent/baby
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "baby": {
    "baby_id": "BABY001",
    "baby_name": "Baby Smith",
    "metadata": {
      "birth_date": "2025-11-10",
      "weight": "2.5kg",
      "condition": "stable"
    },
    "created_at": "2025-11-10T08:00:00.000Z"
  }
}
```

### 3. Notifications (Clinical Alerts)

#### Get All Notifications

```http
GET /api/notifications/:baby_id?limit=50
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "baby_id": "BABY001",
  "notifications": [
    {
      "id": 1,
      "baby_id": "BABY001",
      "type": "cry",
      "severity": "warning",
      "title": "Baby Crying Detected",
      "message": "Your baby has been crying for 2 minutes",
      "data": "{\"duration_seconds\":120,\"intensity\":\"medium\"}",
      "is_read": false,
      "created_at": "2025-11-13T10:30:00.000Z"
    },
    {
      "id": 2,
      "type": "jaundice",
      "severity": "critical",
      "title": "Jaundice Alert",
      "message": "High bilirubin levels detected",
      "is_read": false,
      "created_at": "2025-11-13T09:15:00.000Z"
    }
  ],
  "count": 2
}
```

**Notification Types:**

- `cry` - Baby crying detected
- `jaundice` - Jaundice/bilirubin alert
- `nte` - Neonatal temperature emergency
- `temperature` - Temperature out of range
- `oxygen` - Oxygen saturation alert
- `heartrate` - Heart rate alert
- `general` - General notification

**Severity Levels:**

- `info` - Informational
- `warning` - Needs attention
- `critical` - Urgent action required

#### Get Unread Notifications

```http
GET /api/notifications/:baby_id/unread
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "baby_id": "BABY001",
  "unread_count": 3,
  "notifications": [...]
}
```

#### Mark Notification as Read

```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### Mark All Notifications as Read

```http
PUT /api/notifications/:baby_id/read-all
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### 4. Messages (Chat with Clinicians)

#### Get All Messages

```http
GET /api/parent/messages?limit=100
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "baby_id": "BABY001",
      "sender_type": "clinician",
      "sender_name": "Dr. Smith",
      "sender_id": "dr.smith@hospital.com",
      "content": "Baby is doing well today",
      "created_at": "2025-11-13T10:00:00.000Z"
    },
    {
      "id": 2,
      "sender_type": "parent",
      "sender_name": "John Doe",
      "content": "Thank you doctor",
      "created_at": "2025-11-13T10:05:00.000Z"
    }
  ]
}
```

#### Send Message

```http
POST /api/parent/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "How is my baby doing?"
}

Response (201):
{
  "success": true,
  "message": {
    "id": 3,
    "baby_id": "BABY001",
    "sender_type": "parent",
    "sender_name": "John Doe",
    "content": "How is my baby doing?",
    "created_at": "2025-11-13T10:30:00.000Z"
  }
}
```

### 5. Camera Access

#### Request Camera Access

```http
POST /api/parent/camera/request
Authorization: Bearer <token>

Response (201):
{
  "success": true,
  "message": "Camera access request sent to clinician"
}
```

#### Get Camera Access Status

```http
GET /api/parent/camera/status
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "access": {
    "id": 1,
    "status": "approved",
    "pending_request": false,
    "requested_at": "2025-11-13T09:00:00.000Z",
    "updated_at": "2025-11-13T09:30:00.000Z"
  }
}
```

**Camera Access Statuses:**

- `pending` - Request under review
- `approved` - Access granted
- `denied` - Access denied

---

## 👨‍⚕️ ADMIN APP API ENDPOINTS

### 1. Admin Authentication

#### Login

```http
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@incubator.local",
  "password": "admin123"
}

Response (200):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "uuid-here",
    "email": "admin@incubator.local",
    "name": "Default Admin",
    "role": "admin",
    "status": "active",
    "created_at": "2025-11-10T00:00:00.000Z"
  }
}
```

**Default Admin Credentials:**

- Email: `admin@incubator.local`
- Password: `admin123`
- ⚠️ Change after first login!

#### Setup Password (First-time setup)

```http
POST /api/admin/setup-password
Content-Type: application/json

{
  "token": "setup-token-here",
  "email": "newadmin@hospital.com",
  "password": "secure_password_123"
}

Response (200):
{
  "success": true,
  "message": "Password set successfully. You can now login."
}
```

### 2. Admin Management

#### Create New Admin

```http
POST /api/admin/create
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "newadmin@hospital.com",
  "name": "Dr. Jane Doe"
}

Response (201):
{
  "success": true,
  "admin": {
    "id": "uuid-here",
    "email": "newadmin@hospital.com",
    "name": "Dr. Jane Doe",
    "role": "admin",
    "status": "pending"
  },
  "setupToken": "uuid-setup-token",
  "setupLink": "https://admin.app/setup-password?token=uuid-setup-token&email=newadmin@hospital.com"
}
```

#### List All Admins

```http
GET /api/admin/list
Authorization: Bearer <admin-token>

Response (200):
{
  "success": true,
  "admins": [
    {
      "id": "uuid-1",
      "email": "admin@incubator.local",
      "name": "Default Admin",
      "role": "admin",
      "status": "active",
      "created_at": "2025-11-10T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Update Admin

```http
PUT /api/admin/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "status": "inactive"
}

Response (200):
{
  "success": true,
  "admin": {
    "id": "uuid-here",
    "email": "admin@hospital.com",
    "name": "Updated Name",
    "status": "inactive"
  }
}
```

#### Delete Admin

```http
DELETE /api/admin/:id
Authorization: Bearer <admin-token>

Response (200):
{
  "success": true,
  "message": "Admin deleted successfully"
}
```

### 3. Admin Notifications (System-wide)

#### Get All System Notifications

```http
GET /api/admin/notifications
Authorization: Bearer <admin-token>

Response (200):
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "baby_id": null,
      "type": "system",
      "severity": "info",
      "title": "System Update",
      "message": "Database migration completed successfully",
      "is_read": false,
      "created_at": "2025-11-13T10:00:00.000Z"
    }
  ],
  "unread": 5
}
```

#### Create System Notification

```http
POST /api/admin/notifications
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "System Maintenance",
  "message": "System will be down for maintenance on Nov 15",
  "severity": "warning",
  "source": "system"
}

Response (201):
{
  "success": true,
  "notification": {
    "id": 10,
    "type": "system",
    "severity": "warning",
    "title": "System Maintenance",
    "message": "System will be down for maintenance on Nov 15",
    "created_at": "2025-11-13T11:00:00.000Z"
  }
}
```

#### Mark Notifications as Read

```http
POST /api/admin/notifications/mark-read
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "ids": [1, 2, 3]
}

Response (200):
{
  "success": true,
  "notifications": [...],
  "unread": 2
}
```

---

## 🔧 Database Schema Reference

### Tables Overview

1. **admins** - Admin user accounts
2. **babies** - Baby records
3. **parents** - Parent accounts linked to babies
4. **invitations** - Parent invitation codes
5. **messages** - Chat messages between parents and clinicians
6. **camera_access** - Camera access requests and permissions
7. **notifications** - Clinical alerts and system notifications
8. **setup_tokens** - Admin account setup tokens

### Key Relationships

```
babies (baby_id)
  ├── parents (baby_id → babies.baby_id)
  ├── invitations (baby_id → babies.baby_id)
  ├── messages (baby_id → babies.baby_id)
  ├── camera_access (baby_id → babies.baby_id)
  └── notifications (baby_id → babies.baby_id)

parents (id)
  └── camera_access (parent_id → parents.id)

admins (id)
  └── setup_tokens (email → admins.email)
```

---

## 🚀 Mobile App Development Guidelines

### 1. **Authentication Flow**

**Parent App:**

1. Parent receives invitation code via SMS/email from clinician
2. Opens app, enters invitation code + PIN
3. Creates account with name, phone, password
4. Receives JWT token, stores securely
5. Uses token for all subsequent API calls

**Admin App:**

1. New admin receives setup email with link
2. Clicks link, sets password
3. Logs in with email/password
4. Receives JWT token, stores securely
5. Uses token for all admin operations

### 2. **Token Management**

```javascript
// Store token securely
await SecureStore.setItemAsync("jwt_token", response.token);

// Retrieve token for API calls
const token = await SecureStore.getItemAsync("jwt_token");

// Add to all API requests
fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

// Handle token expiration (401 response)
if (response.status === 401) {
  // Token expired, redirect to login
  await SecureStore.deleteItemAsync("jwt_token");
  navigation.navigate("Login");
}
```

### 3. **Real-time Updates**

For real-time notifications, implement **polling** or **WebSocket** connection:

**Polling Approach:**

```javascript
// Poll every 30 seconds for new notifications
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch("/api/notifications/:baby_id/unread", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (data.unread_count > 0) {
      // Show push notification
      schedulePushNotification(data.notifications[0]);
    }
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

**WebSocket Approach** (Future enhancement):

- Connect to WebSocket endpoint
- Subscribe to baby_id channel
- Receive real-time notifications

### 4. **Push Notifications**

Configure push notifications for critical alerts:

```javascript
// Register for push notifications
const { status } = await Notifications.requestPermissionsAsync();

// When new notification arrives
if (notification.severity === "critical") {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.message,
      sound: "critical-alert.wav",
      priority: "high",
    },
    trigger: null, // Show immediately
  });
}
```

### 5. **Error Handling**

```javascript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized - token expired
      handleTokenExpired();
    } else if (response.status === 403) {
      // Forbidden - no access
      Alert.alert("Access Denied", "You do not have permission");
    } else if (response.status === 404) {
      // Not found
      Alert.alert("Error", "Resource not found");
    } else {
      // Other errors
      const error = await response.json();
      Alert.alert("Error", error.message || "Something went wrong");
    }
  }

  return await response.json();
} catch (error) {
  console.error("API Error:", error);
  Alert.alert("Network Error", "Please check your connection");
}
```

### 6. **Data Persistence**

Use AsyncStorage for non-sensitive data:

```javascript
// Cache baby information
await AsyncStorage.setItem("baby_info", JSON.stringify(babyData));

// Cache notifications for offline viewing
await AsyncStorage.setItem("notifications", JSON.stringify(notifications));

// Retrieve cached data
const cachedBaby = await AsyncStorage.getItem("baby_info");
```

### 7. **Offline Mode**

Handle offline scenarios gracefully:

```javascript
import NetInfo from "@react-native-community/netinfo";

// Monitor network status
const [isConnected, setIsConnected] = useState(true);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    setIsConnected(state.isConnected);
  });

  return () => unsubscribe();
}, []);

// Show offline message
{
  !isConnected && (
    <Banner variant="warning">
      You are offline. Some features may not be available.
    </Banner>
  );
}
```

---

## 📊 Data Persistence Guarantee

✅ **PostgreSQL Cloud SQL** ensures:

- Data persists across app updates
- Data survives server restarts
- Data never disappears
- Automatic daily backups
- Point-in-time recovery available

❌ **No more issues with:**

- Parents disappearing after registration
- Admins being deleted on deployment
- Notifications being lost
- Messages disappearing

---

## 🔒 Security Best Practices

1. **Never store passwords in plain text**

   - All passwords hashed with bcrypt (10 rounds)

2. **Use HTTPS only**

   - All API calls use encrypted connection

3. **Implement JWT expiration**

   - Tokens expire after 7 days
   - Implement refresh token mechanism

4. **Validate all inputs**

   - Phone numbers: Format +94XXXXXXXXX
   - Passwords: Minimum 8 characters
   - Email: Valid email format

5. **Rate limiting** (Future enhancement)
   - Limit login attempts
   - Prevent API abuse

---

## 🐛 Testing & Development

### Test Endpoints

```bash
# Health check
curl https://incubator-monitoring-backend-571778410429.us-central1.run.app/health

# Test login
curl -X POST https://incubator-monitoring-backend-571778410429.us-central1.run.app/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@incubator.local","password":"admin123"}'
```

### Sample Test Data

```javascript
// Default admin for testing
{
  "email": "admin@incubator.local",
  "password": "admin123"
}

// Create test baby (via database)
INSERT INTO babies (baby_id, baby_name, metadata)
VALUES ('TEST001', 'Test Baby', '{"test": true}');

// Create test parent (via database)
INSERT INTO parents (baby_id, name, phone, password_hash)
VALUES ('TEST001', 'Test Parent', '+94771234567', '$2b$10$hash...');
```

---

---

## �‍⚕️ CLINICAL DASHBOARD API ENDPOINTS

The clinical dashboard (for doctors and nurses) uses **ThingsBoard Cloud Platform** for real-time telemetry data and the unified backend for patient management.

### 1. ThingsBoard Authentication

#### Login to ThingsBoard

```http
POST https://thingsboard.cloud/api/auth/login
Content-Type: application/json

{
  "username": "your-email@hospital.com",
  "password": "your-thingsboard-password"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Token Usage:**

- Add to all ThingsBoard API calls: `X-Authorization: Bearer <token>`
- Token expires after ~1 hour
- Use refresh token to get new access token

#### Refresh Token

```http
POST https://thingsboard.cloud/api/auth/token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}

Response (200):
{
  "token": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

### 2. Device Management

#### Get Device by Name

```http
GET https://thingsboard.cloud/api/tenant/devices?pageSize=100&page=0&textSearch=INC-001
X-Authorization: Bearer <token>

Response (200):
{
  "data": [
    {
      "id": {
        "id": "device-uuid-here",
        "entityType": "DEVICE"
      },
      "name": "INC-001",
      "type": "NICU_Incubator",
      "label": "Incubator 001",
      "customerId": null,
      "createdTime": 1699876543210
    }
  ],
  "totalPages": 1,
  "totalElements": 1
}
```

**Extract Device ID:** Use `data[0].id.id` for telemetry queries

### 3. Real-Time Telemetry (Live Vitals)

#### Get Latest Telemetry

```http
GET https://thingsboard.cloud/api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries?keys=spo2,heart_rate,skin_temp,humidity,air_temp
X-Authorization: Bearer <token>

Response (200):
{
  "spo2": [
    {
      "ts": 1699876543210,
      "value": "95"
    }
  ],
  "heart_rate": [
    {
      "ts": 1699876543210,
      "value": "165"
    }
  ],
  "skin_temp": [
    {
      "ts": 1699876543210,
      "value": "36.5"
    }
  ],
  "humidity": [
    {
      "ts": 1699876543210,
      "value": "65"
    }
  ],
  "air_temp": [
    {
      "ts": 1699876543210,
      "value": "35.0"
    }
  ]
}
```

**ThingsBoard Data Format:**

- All telemetry returned as arrays: `[{ts, value}]`
- `ts`: Unix timestamp in milliseconds
- `value`: Can be string or number (convert to number for display)

**Available Telemetry Keys:**

**Basic Vitals:**

- `spo2` - Oxygen saturation (%)
- `heart_rate` - Heart rate (bpm)
- `skin_temp` - Skin temperature (°C)
- `humidity` - Humidity (%)
- `air_temp` - Air temperature (°C)

**Jaundice Detection:**

- `jaundice_detected` - Boolean (true/false)
- `jaundice_confidence` - Detection confidence (0-100)
- `jaundice_probability` - Risk probability (0-1)
- `jaundice_brightness` - Brightness level
- `jaundice_reliability` - Reliability score
- `jaundice_status` - Status string ("detected", "not_detected", "low_light")

**Cry Detection:**

- `cry_detected` - Boolean (true/false)
- `cry_audio_level` - Audio level
- `cry_sensitivity` - Sensitivity setting (0-1)
- `cry_total_detections` - Total cry count
- `cry_monitoring` - Monitoring status (true/false)
- `cry_classification` - Cry type ("hunger", "pain", "tired", etc.)
- `cry_classification_confidence` - Classification confidence (0-100)
- `cry_verified` - AI verification status
- `cry_verified_cries` - Count of verified cries
- `cry_false_positives` - Count of false positives

**NTE (Neonatal Temperature Emergency):**

- `nte_baby_id` - Baby identifier
- `nte_age_hours` - Baby's age in hours
- `nte_weight_g` - Baby's weight in grams
- `nte_range_min` - Safe temperature minimum (°C)
- `nte_range_max` - Safe temperature maximum (°C)
- `nte_critical_count` - Critical alerts count
- `nte_warning_count` - Warning alerts count
- `nte_latest_advice` - Latest recommendation
- `nte_latest_detail` - Detailed advice

### 4. Historical Telemetry (Trends/Charts)

#### Get Telemetry History

```http
GET https://thingsboard.cloud/api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries?keys=spo2,heart_rate,skin_temp&startTs={startTimestamp}&endTs={endTimestamp}&limit=1000
X-Authorization: Bearer <token>

Parameters:
- keys: Comma-separated telemetry keys
- startTs: Start timestamp (milliseconds)
- endTs: End timestamp (milliseconds)
- limit: Max data points (default 100, max 1000)

Response (200):
{
  "spo2": [
    {"ts": 1699876543210, "value": "95"},
    {"ts": 1699876543220, "value": "96"},
    ...
  ],
  "heart_rate": [
    {"ts": 1699876543210, "value": "165"},
    {"ts": 1699876543220, "value": "163"},
    ...
  ]
}
```

**Use Cases:**

- 6-hour trend charts
- 24-hour history
- Custom time range analysis

### 5. Device Attributes

#### Get Device Attributes

```http
GET https://thingsboard.cloud/api/plugins/telemetry/DEVICE/{deviceId}/values/attributes/SERVER_SCOPE
X-Authorization: Bearer <token>

Response (200):
[
  {
    "key": "device_name",
    "value": "INC-001"
  },
  {
    "key": "firmware_version",
    "value": "1.0.0"
  },
  {
    "key": "location",
    "value": "NICU Ward A"
  }
]
```

**Attribute Scopes:**

- `SERVER_SCOPE` - Set by server/admin
- `CLIENT_SCOPE` - Set by device
- `SHARED_SCOPE` - Shared between server and device

### 6. Clinical Dashboard - Patient Management

These endpoints use the **unified backend** for managing babies, parents, and clinical notifications.

#### Create ThingsBoard User (Doctor/Nurse)

```http
POST https://thingsboard.cloud/api/user
X-Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "doctor@hospital.com",
  "firstName": "Dr. John",
  "lastName": "Smith",
  "authority": "TENANT_ADMIN",
  "additionalInfo": {
    "defaultDashboardId": null,
    "defaultDashboardFullscreen": false,
    "homeDashboardId": null,
    "homeDashboardHideToolbar": true
  }
}

Response (201):
{
  "id": {
    "id": "user-uuid",
    "entityType": "USER"
  },
  "email": "doctor@hospital.com",
  "firstName": "Dr. John",
  "lastName": "Smith",
  "authority": "TENANT_ADMIN"
}
```

#### Send Activation Link

```http
POST https://thingsboard.cloud/api/user/{userId}/activationLink
X-Authorization: Bearer <admin-token>

Response (200):
"https://thingsboard.cloud/api/noauth/activate?activateToken=..."
```

### 7. Clinical Notifications & Messages

#### Send Message to Parent

```http
POST /api/parent/clinician/messages
X-API-Key: super-secret-clinician-key
Content-Type: application/json

{
  "babyId": "BABY001",
  "senderName": "Dr. Smith",
  "content": "Baby is doing well today. Temperature and oxygen levels are stable."
}

Response (201):
{
  "id": 5,
  "babyId": "BABY001",
  "senderType": "clinician",
  "senderName": "Dr. Smith",
  "senderId": null,
  "content": "Baby is doing well today...",
  "createdAt": 1699876543210,
  "unread": false
}
```

#### Get Messages for Baby

```http
GET /api/parent/clinician/babies/{babyId}/messages
X-API-Key: super-secret-clinician-key

Response (200):
{
  "messages": [
    {
      "id": 1,
      "babyId": "BABY001",
      "senderType": "parent",
      "senderName": "Parent Name",
      "content": "How is my baby doing?",
      "createdAt": 1699876543210,
      "unread": false
    },
    {
      "id": 2,
      "senderType": "clinician",
      "senderName": "Dr. Smith",
      "content": "Baby is stable...",
      "createdAt": 1699876543220
    }
  ]
}
```

#### Create Parent Invitation

```http
POST /api/parent/clinician/invitations
X-API-Key: super-secret-clinician-key
Content-Type: application/json

{
  "babyId": "BABY001",
  "babyName": "Baby Smith",
  "caregiverRole": "mother",
  "expiresInHours": 72
}

Response (201):
{
  "code": "ABC123XYZ",
  "pin": "1234",
  "babyId": "BABY001",
  "babyName": "Baby Smith",
  "caregiverRole": "mother",
  "expiresAt": "2025-11-16T10:00:00.000Z",
  "created": true
}
```

**Share with parent:** Code + PIN

#### List Parents for Baby

```http
GET /api/parent/clinician/babies/{babyId}/parents
X-API-Key: super-secret-clinician-key

Response (200):
{
  "parents": [
    {
      "id": 1,
      "babyId": "BABY001",
      "name": "Parent Name",
      "phone": "+94771234567",
      "caregiverRole": "mother",
      "createdAt": "2025-11-13T10:00:00.000Z"
    }
  ]
}
```

#### Camera Access Management

**Get Camera Access Requests:**

```http
GET /api/parent/clinician/camera-access/requests
X-API-Key: super-secret-clinician-key

Response (200):
{
  "entries": [
    {
      "parentId": 1,
      "parentName": "Parent Name",
      "phone": "+94771234567",
      "babyId": "BABY001",
      "status": "revoked",
      "pendingRequest": true,
      "requestedAt": "2025-11-13T10:00:00.000Z",
      "updatedAt": null
    }
  ]
}
```

**Approve/Deny Camera Access:**

```http
PATCH /api/parent/clinician/camera-access/{parentId}
X-API-Key: super-secret-clinician-key
Content-Type: application/json

{
  "babyId": "BABY001",
  "status": "granted",
  "parentName": "Parent Name"
}

Response (200):
{
  "entry": {
    "parentId": 1,
    "babyId": "BABY001",
    "status": "granted",
    "pendingRequest": false,
    "requestedAt": "2025-11-13T10:00:00.000Z",
    "updatedAt": "2025-11-13T10:30:00.000Z"
  }
}
```

**Camera Access Statuses:**

- `granted` - Access approved
- `revoked` - Access denied/removed
- `pendingRequest: true` - Waiting for approval

---

## 🔐 API Authentication Summary

### Three Authentication Systems:

1. **ThingsBoard Cloud** (Clinical Dashboard - Telemetry)

   - URL: `https://thingsboard.cloud/api`
   - Auth: `X-Authorization: Bearer <token>`
   - Use: Real-time vitals, historical data, device management
   - Credentials: ThingsBoard user account (doctor/nurse)

2. **Unified Backend** (Parent & Admin Apps)

   - URL: `https://incubator-monitoring-backend-571778410429.us-central1.run.app`
   - Auth: `Authorization: Bearer <jwt-token>`
   - Use: Notifications, messages, admin management, parent accounts
   - Credentials: Email/password (admin) or phone/password (parent)

3. **Parent Backend - Clinician Endpoints**
   - URL: Same as unified backend `/api/parent/clinician/*`
   - Auth: `X-API-Key: super-secret-clinician-key`
   - Use: Send messages to parents, create invitations, manage camera access
   - Credentials: API key (server-to-server)

---

## 📊 Clinical Dashboard Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Clinical Dashboard                        │
│                  (Doctor/Nurse Mobile App)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
┌──────────────────┐                    ┌─────────────────────┐
│ ThingsBoard      │                    │ Unified Backend     │
│ Cloud Platform   │                    │ (Cloud SQL)         │
└──────────────────┘                    └─────────────────────┘
        │                                             │
        ├─ Live Vitals (SpO2, HR, Temp)             ├─ Notifications
        ├─ Historical Trends (6h, 24h)              ├─ Messages
        ├─ Jaundice Detection Data                  ├─ Parent Management
        ├─ Cry Detection Data                       ├─ Camera Access
        ├─ NTE Recommendations                      └─ Admin Management
        └─ Device Attributes
```

**Why Two Systems?**

- **ThingsBoard**: Optimized for IoT telemetry, real-time data streaming, time-series storage
- **Unified Backend**: User management, notifications, messaging, access control

---

## 📞 Support & Contact

### Production Endpoints:

- **Unified Backend**: https://incubator-monitoring-backend-571778410429.us-central1.run.app
- **ThingsBoard Cloud**: https://thingsboard.cloud/api
- **Database**: PostgreSQL Cloud SQL (persistent)
- **Region**: us-central1 (Google Cloud)
- **Uptime**: 99.9% guaranteed (min-instances=1)

### Configuration Keys:

```env
# ThingsBoard Cloud
REACT_APP_TB_API_URL=https://thingsboard.cloud/api
REACT_APP_TB_HOST=thingsboard.cloud
REACT_APP_DEVICE_ID=INC-001

# Parent Backend (for clinician endpoints)
REACT_APP_PARENT_API_URL=/api/parent
REACT_APP_PARENT_CLINICIAN_KEY=super-secret-clinician-key

# Admin Backend
REACT_APP_ADMIN_BACKEND_URL=/api
```

### Database Credentials (for backend development only)

- **Host**: Cloud SQL Unix Socket
- **Database**: `incubator_system`
- **User**: `incubator_app`
- **Password**: `IncubatorApp2025SecurePass`

⚠️ **Never expose database credentials or API keys in mobile apps!** Use API endpoints only.

---

## 🎯 Next Steps for Mobile Development

### Parent App:

1. ✅ API endpoints documented
2. ✅ Authentication flow defined
3. ⏳ Implement phone/password login
4. ⏳ Implement invitation claiming
5. ⏳ Add notification polling
6. ⏳ Add messaging with clinicians
7. ⏳ Add camera access requests

### Admin App:

1. ✅ API endpoints documented
2. ✅ Database schema provided
3. ⏳ Implement email/password login
4. ⏳ Add admin management (CRUD)
5. ⏳ Add system notifications
6. ⏳ Add push notifications

### Clinical Dashboard App:

1. ✅ ThingsBoard integration documented
2. ✅ Telemetry endpoints defined
3. ⏳ Implement ThingsBoard authentication
4. ⏳ Fetch real-time vitals (SpO2, HR, temp)
5. ⏳ Display jaundice detection alerts
6. ⏳ Display cry detection alerts
7. ⏳ Show NTE recommendations
8. ⏳ Add historical trend charts
9. ⏳ Implement parent messaging
10. ⏳ Manage camera access approvals
11. ⏳ Create parent invitations
