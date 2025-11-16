# Quick Start Guide - ThingsBoard Self-Hosted

## 🚀 Quick Start (5 Minutes)

### Option 1: Local Testing with Docker

```bash
cd incubator_monitoring_with_thingsboard_integration/thingsboard

# Start ThingsBoard
docker-compose up -d

# Wait 2-3 minutes for initialization
docker-compose logs -f thingsboard

# Access UI
# Open http://localhost:8080
# Login: admin@thingsboard.local / admin
```

### Option 2: Deploy to GCP Production

```powershell
cd incubator_monitoring_with_thingsboard_integration\thingsboard

# Run deployment script
.\deploy-gcp.ps1

# Follow the prompts to set database password
# Script will output your ThingsBoard URL
```

## 📝 Configuration Checklist

### After Deployment

- [ ] Change admin password
- [ ] Create device "INC-001"
- [ ] Copy device access token
- [ ] Update Pi config (`config/device_credentials.json`)
- [ ] Update dashboard config (`.env.production`)
- [ ] Test MQTT connection from Pi
- [ ] Verify data in dashboard

## 🔧 Configuration Files to Update

### 1. Pi Device Configuration

**File**: `config/device_credentials.json`

```json
{
  "thingsboard_host": "YOUR_THINGSBOARD_URL",
  "mqtt_port": 1883,
  "access_token": "YOUR_DEVICE_ACCESS_TOKEN"
}
```

**Local Docker**: Use `localhost`
**GCP Cloud Run**: Use the URL from deployment output (without https://)

### 2. Dashboard Configuration

**File**: `react_dashboard/.env.production`

```env
REACT_APP_TB_API_URL=YOUR_THINGSBOARD_URL/api
```

**Local Docker**: `http://localhost:8080/api`
**GCP Cloud Run**: `https://thingsboard-server-xxx.run.app/api`

## 🧪 Testing

### Test MQTT Connection (from Pi)

```bash
# Install mosquitto client
sudo apt-get install mosquitto-clients

# Publish test data
mosquitto_pub -h YOUR_THINGSBOARD_HOST -p 1883 \
  -u "YOUR_DEVICE_ACCESS_TOKEN" \
  -t v1/devices/me/telemetry \
  -m '{"temperature":36.5,"spo2":98}'

# Check ThingsBoard UI → Devices → Latest Telemetry
```

### Test Dashboard Connection

```bash
# Start dashboard locally
cd react_dashboard
npm start

# Should connect to ThingsBoard and show device data
```

## 🆘 Troubleshooting

### ThingsBoard not starting

```bash
# Check logs
docker-compose logs -f thingsboard

# Common issue: PostgreSQL not ready
# Wait 2-3 minutes and check again
```

### MQTT connection failed

```bash
# Verify device token is correct
# Check if ThingsBoard is accessible
curl http://localhost:8080/login

# For GCP: Ensure you're using WebSocket or have MQTT gateway
```

### Dashboard can't connect

```bash
# Verify REACT_APP_TB_API_URL is correct
# Check if ThingsBoard API is accessible
curl http://localhost:8080/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@thingsboard.local","password":"admin"}'
```

## 📚 Full Documentation

See [README.md](./README.md) for complete setup guide.

## 🔗 Resources

- ThingsBoard Docs: https://thingsboard.io/docs/
- Docker Compose: https://docs.docker.com/compose/
- Cloud Run: https://cloud.google.com/run/docs
