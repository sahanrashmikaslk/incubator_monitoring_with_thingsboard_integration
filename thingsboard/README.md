# ThingsBoard Self-Hosted Setup Guide

## 🎯 Overview

This guide helps you migrate from ThingsBoard Cloud (trial) to a self-hosted ThingsBoard instance running on Docker locally and deployed to GCP for production.

## 📋 Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Testing with Docker](#testing-with-docker)
3. [GCP Production Deployment](#gcp-production-deployment)
4. [Migration from Cloud to Self-Hosted](#migration-from-cloud-to-self-hosted)
5. [Configuration Updates](#configuration-updates)

---

## 🔧 Local Development Setup

### Prerequisites

- Docker Desktop installed and running
- Docker Compose installed (included with Docker Desktop)
- At least 4GB RAM available for Docker

### Step 1: Start ThingsBoard Locally

```bash
cd incubator_monitoring_with_thingsboard_integration/thingsboard

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f thingsboard

# Wait for initialization (first start takes 2-3 minutes)
```

### Step 2: Access ThingsBoard UI

1. Open browser: http://localhost:8080
2. Login with default credentials:
   - **Email**: `admin@thingsboard.local`
   - **Password**: `admin`
3. **IMPORTANT**: Change password immediately after first login

### Step 3: Create Device

1. Go to **Devices** → **Add Device** (+)
2. Name: `INC-001` (or your incubator ID)
3. Device Profile: `Default`
4. Click **Add**
5. Click on device → **Copy Access Token**
6. Save this token for configuration

---

## 🧪 Testing with Docker

### Test MQTT Connection from Pi

```bash
# Install mosquitto client on Pi
sudo apt-get install mosquitto-clients

# Test publish telemetry
mosquitto_pub -h localhost -p 1883 -t v1/devices/me/telemetry \
  -u "YOUR_DEVICE_ACCESS_TOKEN" \
  -m '{"temperature":36.5,"humidity":60,"spo2":98,"heart_rate":120}'
```

### Update Pi Configuration

Edit `config/device_credentials.json`:

```json
{
  "thingsboard_host": "localhost",
  "mqtt_port": 1883,
  "access_token": "YOUR_DEVICE_ACCESS_TOKEN_FROM_STEP3"
}
```

### Test Dashboard Connection

Update `react_dashboard/.env.local`:

```env
REACT_APP_TB_API_URL=http://localhost:8080/api
```

Restart React app and test data visualization.

---

## ☁️ GCP Production Deployment

### Architecture

```
┌─────────────────────────────────────────┐
│         Cloud Run Services              │
├─────────────────────────────────────────┤
│  • ThingsBoard Server (Container)       │
│  • Admin Backend                        │
│  • Parent Backend                       │
│  • Monitoring Backend                   │
│  • Dashboard (React + Nginx)            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Cloud SQL PostgreSQL               │
├─────────────────────────────────────────┤
│  • incubator-db                         │
│    ├─ admin_db                          │
│    ├─ parent_db                         │
│    ├─ incubator_system                  │
│    └─ thingsboard (NEW)                 │
└─────────────────────────────────────────┘
```

### Step 1: Create ThingsBoard Database in Cloud SQL

```bash
# Create database
gcloud sql databases create thingsboard \
  --instance=incubator-db

# Create user for ThingsBoard
gcloud sql users create thingsboard_user \
  --instance=incubator-db \
  --password=SECURE_PASSWORD_HERE
```

### Step 2: Build ThingsBoard Container

Create `thingsboard/Dockerfile.gcp`:

```dockerfile
FROM thingsboard/tb-postgres:3.6.2

# GCP-specific configurations
ENV SPRING_DATASOURCE_URL=jdbc:postgresql://localhost/thingsboard
ENV SPRING_DATASOURCE_USERNAME=thingsboard_user
ENV TB_QUEUE_TYPE=in-memory
ENV HTTP_BIND_PORT=8080
ENV MQTT_BIND_PORT=1883

EXPOSE 8080 1883

CMD ["start-tb.sh"]
```

### Step 3: Deploy to Cloud Run

```bash
cd incubator_monitoring_with_thingsboard_integration/thingsboard

# Build and push container
gcloud builds submit --tag gcr.io/neonatal-incubator-monitoring/thingsboard:latest

# Deploy to Cloud Run
gcloud run deploy thingsboard-server \
  --image gcr.io/neonatal-incubator-monitoring/thingsboard:latest \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --port 8080 \
  --allow-unauthenticated \
  --add-cloudsql-instances neonatal-incubator-monitoring:us-central1:incubator-db \
  --set-env-vars "SPRING_DATASOURCE_URL=jdbc:postgresql:///thingsboard?host=/cloudsql/neonatal-incubator-monitoring:us-central1:incubator-db&user=thingsboard_user&password=SECURE_PASSWORD" \
  --set-env-vars "TB_QUEUE_TYPE=in-memory" \
  --set-env-vars "HTTP_BIND_ADDRESS=0.0.0.0" \
  --set-env-vars "HTTP_BIND_PORT=8080" \
  --min-instances 1 \
  --max-instances 3
```

### Step 4: Setup MQTT Gateway (for IoT devices)

Since Cloud Run doesn't support MQTT (TCP 1883) directly, we have two options:

**Option A: Use Cloud Run with WebSockets**

- ThingsBoard supports MQTT over WebSockets
- No additional infrastructure needed
- Pi devices connect via `ws://thingsboard-server-xxx.run.app/mqtt`

**Option B: Use Compute Engine VM (Recommended for MQTT)**

- Create a small VM for MQTT gateway
- Forward MQTT traffic to ThingsBoard Cloud Run
- More reliable for IoT devices

```bash
# Create MQTT gateway VM
gcloud compute instances create thingsboard-mqtt-gateway \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --boot-disk-size=10GB \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=mqtt-gateway
```

---

## 🔄 Migration from Cloud to Self-Hosted

### Step 1: Export Data from ThingsBoard Cloud

1. Login to https://thingsboard.cloud
2. Go to **Devices** → Select your device
3. Export device configuration (copy JSON)
4. Export telemetry data (if needed):
   - Go to **Latest Telemetry**
   - Use API to export historical data

### Step 2: Import to Self-Hosted

1. Access your self-hosted instance (local or GCP)
2. Create new device with same name
3. Import configuration
4. Update device access token in Pi configuration

### Step 3: Update All Configurations

#### Pi Device Config

Edit `config/device_credentials.json`:

```json
{
  "thingsboard_host": "YOUR_GCP_URL_OR_LOCALHOST",
  "mqtt_port": 1883,
  "access_token": "NEW_DEVICE_ACCESS_TOKEN"
}
```

#### React Dashboard Config

Update `.env.production`:

```env
# For GCP deployment
REACT_APP_TB_API_URL=https://thingsboard-server-xxx.run.app/api

# For local testing
REACT_APP_TB_API_URL=http://localhost:8080/api
```

#### ThingsBoard Service

Edit `react_dashboard/src/services/thingsboard.service.js`:

```javascript
// Update base URL
const TB_API_URL =
  process.env.REACT_APP_TB_API_URL || "http://localhost:8080/api";
```

---

## ⚙️ Configuration Updates

### Environment Variables

Create `thingsboard/.env.production`:

```env
# PostgreSQL Configuration
POSTGRES_DB=thingsboard
POSTGRES_USER=thingsboard_user
POSTGRES_PASSWORD=SECURE_PASSWORD_HERE

# ThingsBoard Configuration
TB_ADMIN_EMAIL=admin@yourdomain.com
TB_ADMIN_PASSWORD=CHANGE_ME_AFTER_FIRST_LOGIN

# Cloud SQL Connection
CLOUD_SQL_CONNECTION_NAME=neonatal-incubator-monitoring:us-central1:incubator-db
DATABASE_URL=jdbc:postgresql:///thingsboard?host=/cloudsql/neonatal-incubator-monitoring:us-central1:incubator-db

# MQTT Configuration
MQTT_BIND_ADDRESS=0.0.0.0
MQTT_BIND_PORT=1883

# Security
JWT_TOKEN_EXPIRATION_TIME=900000
JWT_REFRESH_TOKEN_EXPIRATION_TIME=604800000
```

### Dashboard Environment

Create `react_dashboard/.env.production`:

```env
# ThingsBoard API
REACT_APP_TB_API_URL=https://thingsboard-server-xxx.run.app/api

# Admin Backend
REACT_APP_ADMIN_API_URL=https://incubator-admin-backend-xxx.run.app

# Parent Backend
REACT_APP_PARENT_API_URL=https://incubator-parent-backend-xxx.run.app

# Monitoring Backend
REACT_APP_API_URL=https://incubator-monitoring-backend-xxx.run.app

# Pi Device Access
REACT_APP_PI_HOST=100.89.162.22
REACT_APP_CAMERA_PORT=8080
```

---

## 🚀 Quick Start Commands

### Local Development

```bash
# Start ThingsBoard locally
cd thingsboard
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

### GCP Deployment

```bash
# Deploy ThingsBoard to Cloud Run
cd thingsboard
./deploy-gcp.sh

# Update dashboard with new ThingsBoard URL
cd ../react_dashboard
# Edit .env.production with new REACT_APP_TB_API_URL
gcloud run deploy incubator-dashboard --source . --region us-central1
```

---

## 📊 Monitoring & Troubleshooting

### Check ThingsBoard Health

```bash
# Local Docker
curl http://localhost:8080/login

# GCP Cloud Run
curl https://thingsboard-server-xxx.run.app/login
```

### View Logs

```bash
# Local Docker
docker-compose logs -f thingsboard

# GCP Cloud Run
gcloud run services logs read thingsboard-server --region us-central1
```

### Database Connection Test

```bash
# Local Docker
docker exec -it thingsboard-postgres psql -U postgres -d thingsboard -c "SELECT version();"

# GCP Cloud SQL
gcloud sql connect incubator-db --user=thingsboard_user --database=thingsboard
```

---

## 🔒 Security Best Practices

1. **Change Default Passwords**

   - ThingsBoard admin password
   - PostgreSQL password
   - Device access tokens

2. **Enable HTTPS/TLS**

   - Cloud Run provides HTTPS automatically
   - For MQTT, use port 8883 with SSL certificates

3. **Restrict Access**

   - Use VPC for internal communication
   - Configure firewall rules
   - Enable Cloud SQL authentication

4. **Regular Backups**
   - Enable Cloud SQL automated backups
   - Export device configurations regularly

---

## 📞 Support

For issues:

1. Check logs first: `docker-compose logs -f`
2. Verify database connection
3. Check ThingsBoard documentation: https://thingsboard.io/docs/
4. Review GCP Cloud Run logs

---

## 🎉 Next Steps

1. ✅ Start ThingsBoard locally with Docker
2. ✅ Create device and test MQTT
3. ✅ Update Pi configuration
4. ✅ Test dashboard connection
5. ✅ Deploy to GCP Cloud Run
6. ✅ Update production configurations
7. ✅ Migrate data from cloud trial
8. ✅ Decommission cloud trial account
