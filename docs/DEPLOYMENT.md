# Deployment Guide

## Prerequisites

### Hardware
- Raspberry Pi 3B+ or newer
- USB Camera (V380 or compatible)
- MicroSD card (16GB+)
- Stable internet connection

### Software
- Raspberry Pi OS (Debian 12 recommended)
- Python 3.11+
- Node.js 18+ (for React dashboard)
- Git

### ThingsBoard Cloud
- Active ThingsBoard Cloud account
- Device created (INC-001)
- Access token obtained

## Phase 1: Raspberry Pi Setup

### 1.1 Initial System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3-pip python3-venv git v4l-utils

# Install mjpg-streamer (for camera)
sudo apt install -y cmake libjpeg-dev

# Clone mjpg-streamer
cd ~
git clone https://github.com/jacksonliam/mjpg-streamer.git
cd mjpg-streamer/mjpg-streamer-experimental
make
sudo make install
```

### 1.2 Clone Repository

```bash
cd ~
git clone <your-repo-url> incubator_monitoring
cd incubator_monitoring
```

### 1.3 Setup Python Environment

```bash
cd ~/incubator_monitoring/pi_client

# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 1.4 Configure Device Credentials

```bash
# Copy example config
cd ~/incubator_monitoring/config
cp device_credentials.json.example device_credentials.json

# Edit with your credentials
nano device_credentials.json
```

Update:
```json
{
  "device_id": "INC-001",
  "access_token": "YOUR_ACTUAL_TOKEN_HERE",
  "thingsboard_host": "thingsboard.cloud",
  "mqtt_port": 1883
}
```

### 1.5 Copy YOLO Model

```bash
# Copy from existing setup
cp /home/sahan/monitoring/models/incubator_yolov8n.pt \
   ~/incubator_monitoring/pi_client/models/

# Or train new model and copy
```

### 1.6 Start Camera Server

```bash
# Create systemd service
sudo nano /etc/systemd/system/camera-stream.service
```

Add:
```ini
[Unit]
Description=MJPEG Camera Streamer
After=network.target

[Service]
Type=simple
User=sahan
ExecStart=/usr/local/bin/mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 640x480 -f 15" -o "output_http.so -p 8081 -w /usr/local/share/mjpg-streamer/www"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable camera-stream.service
sudo systemctl start camera-stream.service
sudo systemctl status camera-stream.service
```

### 1.7 Start LCD Reader Service

```bash
# Create systemd service
sudo nano /etc/systemd/system/lcd-reader.service
```

Add:
```ini
[Unit]
Description=LCD Reader with ThingsBoard MQTT
After=network.target camera-stream.service
Requires=camera-stream.service

[Service]
Type=simple
User=sahan
WorkingDirectory=/home/sahan/incubator_monitoring/pi_client
Environment="PATH=/home/sahan/incubator_monitoring/pi_client/venv/bin"
ExecStart=/home/sahan/incubator_monitoring/pi_client/venv/bin/python3 lcd_reader.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lcd-reader.service
sudo systemctl start lcd-reader.service
sudo systemctl status lcd-reader.service
```

### 1.8 Check Logs

```bash
# Camera stream logs
sudo journalctl -u camera-stream.service -f

# LCD reader logs
sudo journalctl -u lcd-reader.service -f
```

## Phase 2: ThingsBoard Configuration

### 2.1 Create Device

1. Login to ThingsBoard Cloud: https://thingsboard.cloud
2. Navigate to **Devices** → **Add Device**
3. Name: `INC-001`
4. Device Profile: `default`
5. Copy the **Access Token**

### 2.2 Verify Data Ingestion

1. Go to **Devices** → `INC-001` → **Latest Telemetry**
2. You should see incoming data:
   - `spo2`
   - `heart_rate`
   - `skin_temp`
   - `humidity`

### 2.3 Create Dashboard (Optional)

ThingsBoard has built-in dashboards, but we'll use custom React UI.

1. **Widgets** → Create new dashboard
2. Add time-series widgets for each vital
3. Configure alarms for critical values

### 2.4 Setup Users

1. **Users** → Add User
2. Create accounts for:
   - Doctors (Customer User with full access)
   - Nurses (Customer User with full access)
   - Parents (Customer User with limited access)
   - Admins (Tenant Administrator)

3. Assign roles and permissions

## Phase 3: React Dashboard Deployment

### 3.1 Local Development

```bash
cd ~/incubator_monitoring/react_dashboard

# Install dependencies
npm install

# Create .env file
cp ../.env.example .env

# Edit .env with your values
nano .env
```

Update `.env`:
```env
REACT_APP_TB_API_URL=https://thingsboard.cloud/api
REACT_APP_DEVICE_ID=INC-001
REACT_APP_PI_HOST=100.99.151.101  # Your Pi IP
REACT_APP_MJPEG_PORT=8081
```

Start development server:
```bash
npm start
```

Access at: http://localhost:3000

### 3.2 Production Build

```bash
npm run build
```

This creates optimized files in `build/` directory.

### 3.3 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Follow prompts and configure environment variables in Vercel dashboard.

### 3.4 Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=build
```

Configure environment variables in Netlify dashboard.

### 3.5 Deploy to AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync build/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## Phase 4: Custom Backend Services (Optional)

### 4.1 NTE Recommendation API

```bash
cd ~/incubator_monitoring/backend_services

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run
uvicorn nte_api:app --host 0.0.0.0 --port 5001
```

### 4.2 Deploy Backend to AWS Lambda

Use AWS SAM or Serverless Framework:

```bash
# Install Serverless
npm install -g serverless

# Deploy
serverless deploy
```

## Phase 5: Security & Monitoring

### 5.1 Enable HTTPS

For Pi (optional):
```bash
# Install nginx
sudo apt install nginx certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

### 5.2 Firewall Configuration

```bash
# On Pi
sudo ufw allow 8081/tcp  # Camera stream
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

### 5.3 Monitoring Script

Create `/home/sahan/monitor_system.sh`:

```bash
#!/bin/bash

# Check if services are running
systemctl is-active --quiet camera-stream.service || echo "Camera stream down!"
systemctl is-active --quiet lcd-reader.service || echo "LCD reader down!"

# Check RAM usage
RAM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
echo "RAM Usage: $RAM_USAGE%"

# Check CPU temperature
CPU_TEMP=$(vcgencmd measure_temp | cut -d= -f2)
echo "CPU Temperature: $CPU_TEMP"
```

Add to crontab:
```bash
crontab -e

# Run every 5 minutes
*/5 * * * * /home/sahan/monitor_system.sh >> /var/log/monitor.log 2>&1
```

## Phase 6: Testing & Validation

### 6.1 Test MQTT Publishing

```bash
# On Pi, check logs
sudo journalctl -u lcd-reader.service -f

# Should see:
# ✓ Connected to ThingsBoard successfully
# ✓ Telemetry published: {'spo2': 98, 'heart_rate': 145, ...}
```

### 6.2 Test React Dashboard

1. Open dashboard: https://your-vercel-app.vercel.app
2. Login with ThingsBoard credentials
3. Verify real-time vitals display
4. Check charts update correctly
5. Test camera stream loads

### 6.3 Load Testing

```bash
# Simulate high load
for i in {1..100}; do
  curl http://100.99.151.101:8081/?action=snapshot &
done

# Monitor Pi resources
htop
```

## Phase 7: Backup & Recovery

### 7.1 Backup Configuration

```bash
# Backup script
tar -czf backup-$(date +%Y%m%d).tar.gz \
  ~/incubator_monitoring/config \
  ~/incubator_monitoring/pi_client/models

# Upload to cloud
rclone copy backup-*.tar.gz remote:backups/
```

### 7.2 Recovery

```bash
# Restore from backup
tar -xzf backup-20250101.tar.gz -C ~/incubator_monitoring
```

## Troubleshooting

### Pi Issues

**Camera not detected:**
```bash
ls -la /dev/video*
v4l2-ctl --list-devices
```

**Service not starting:**
```bash
sudo systemctl status lcd-reader.service
sudo journalctl -u lcd-reader.service -n 50
```

**MQTT connection failed:**
```bash
# Test connection
mosquitto_pub -h thingsboard.cloud -p 1883 \
  -u "YOUR_ACCESS_TOKEN" \
  -t "v1/devices/me/telemetry" \
  -m '{"test": 123}'
```

### Dashboard Issues

**API 401 Unauthorized:**
- Check JWT token expiry
- Verify ThingsBoard credentials
- Check CORS settings

**Data not loading:**
- Open browser console (F12)
- Check Network tab for failed requests
- Verify device ID is correct

### Performance Issues

**High RAM usage:**
```bash
# Check processes
htop

# Restart services
sudo systemctl restart lcd-reader.service
```

**Slow API responses:**
- Check ThingsBoard rate limits
- Reduce polling frequency
- Use WebSocket for real-time data

## Maintenance

### Regular Tasks

**Daily:**
- Check service status
- Monitor RAM/CPU usage
- Review error logs

**Weekly:**
- Backup configuration
- Update system packages
- Clean old logs

**Monthly:**
- Update Python packages
- Update Node packages
- Review security patches

### Updates

```bash
# Update Pi software
cd ~/incubator_monitoring
git pull origin main

# Update Python dependencies
cd pi_client
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Restart services
sudo systemctl restart lcd-reader.service
```

## Support

- **Documentation**: See `/docs` folder
- **Issues**: Create GitHub issue
- **Logs**: Check systemd journals
- **ThingsBoard**: https://thingsboard.io/docs/

## Next Steps

1. ✅ Pi setup complete
2. ✅ ThingsBoard connected
3. ✅ Dashboard deployed
4. 🔲 Add jaundice detection
5. 🔲 Implement NTE recommendations
6. 🔲 Setup user authentication
7. 🔲 Configure alerts
8. 🔲 Add multi-device support
