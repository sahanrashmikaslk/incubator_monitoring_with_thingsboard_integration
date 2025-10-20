# ThingsBoard MQTT Bridge for Existing LCD Reader

## Overview
This is a **lightweight MQTT bridge** that connects your existing LCD Reading Server to ThingsBoard Cloud.

**NO DUPLICATION** - It does NOT run OCR/YOLO again. It simply:
1. Fetches readings from your existing LCD server (port 9001)
2. Publishes to ThingsBoard via MQTT every 15 seconds

## Architecture

```
┌─────────────────────────────────────┐
│  Existing LCD Reading Server        │
│  (Port 9001)                        │
│  • YOLO Detection                   │
│  • EasyOCR                          │
│  • /readings endpoint               │
└──────────────┬──────────────────────┘
               │ HTTP GET /readings
               ▼
┌─────────────────────────────────────┐
│  ThingsBoard MQTT Bridge            │
│  (This script - lcd_reader.py)     │
│  • Fetches every 15s                │
│  • Publishes to ThingsBoard         │
└──────────────┬──────────────────────┘
               │ MQTT (Port 1883)
               ▼
┌─────────────────────────────────────┐
│  ThingsBoard Cloud                  │
│  • Stores telemetry                 │
│  • Serves React Dashboard           │
└─────────────────────────────────────┘
```

## Installation

### 1. Install Dependencies (Minimal)
```bash
cd ~/incubator_monitoring_with_thingsboard_integration/pi_client
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Only installs:
- `paho-mqtt` - MQTT client
- `requests` - HTTP client

**NO heavy packages** (no OpenCV, YOLO, EasyOCR, etc.)

### 2. Configure Device Credentials
Already configured in `../config/device_credentials.json`:
```json
{
  "device_id": "INC-001",
  "access_token": "2ztut7be6ppooyiueorb",
  "thingsboard_host": "thingsboard.cloud",
  "mqtt_port": 1883
}
```

### 3. Run the Bridge
```bash
python lcd_reader.py
```

You should see:
```
✓ Connected to ThingsBoard successfully
✓ Attributes published: {...}
Fetch cycle at 2025-10-20 14:35:00
✓ Fetched: SpO2=98, HR=145, Temp=36.7, Humidity=55
✓ Telemetry published: {...}
Waiting 15 seconds...
```

## Setup as System Service

Create `/etc/systemd/system/thingsboard-bridge.service`:

```ini
[Unit]
Description=ThingsBoard MQTT Bridge
After=network.target lcd-reading.service
Requires=lcd-reading.service

[Service]
Type=simple
User=sahan
WorkingDirectory=/home/sahan/incubator_monitoring_with_thingsboard_integration/pi_client
Environment="PATH=/home/sahan/incubator_monitoring_with_thingsboard_integration/pi_client/venv/bin"
ExecStart=/home/sahan/incubator_monitoring_with_thingsboard_integration/pi_client/venv/bin/python3 lcd_reader.py
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
sudo systemctl enable thingsboard-bridge.service
sudo systemctl start thingsboard-bridge.service
```

Check status:
```bash
sudo systemctl status thingsboard-bridge.service
sudo journalctl -u thingsboard-bridge.service -f
```

## How It Works

### Data Flow
1. **Every 15 seconds**, the bridge calls:
   ```
   GET http://localhost:9001/readings
   ```

2. **Parses response** (from your existing LCD server):
   ```json
   {
     "spo2": {"value": 98, "confidence": 0.95, ...},
     "heart_rate": {"value": 145, ...},
     "skin_temp": {"value": 36.7, ...},
     "humidity": {"value": 55, ...}
   }
   ```

3. **Extracts values** and creates telemetry:
   ```json
   {
     "spo2": 98,
     "heart_rate": 145,
     "skin_temp": 36.7,
     "humidity": 55,
     "timestamp": 1729418100000
   }
   ```

4. **Publishes to ThingsBoard** via MQTT:
   ```
   Topic: v1/devices/me/telemetry
   Payload: {"spo2": 98, "heart_rate": 145, ...}
   ```

## Verify in ThingsBoard

1. Go to https://thingsboard.cloud
2. Navigate to **Devices** → **INC-001**
3. Click **Latest Telemetry** tab
4. You should see real-time data every 15 seconds

## Configuration

### Change Publish Interval
Edit `../config/thingsboard_config.json`:
```json
{
  "publish_interval": 15,  // Change to 10, 20, 30, etc.
  ...
}
```

### Change LCD Server URL
Edit `lcd_reader.py`:
```python
LCD_SERVER_URL = 'http://localhost:9001'  # Change if different
```

## Troubleshooting

### "Cannot connect to LCD Reading Server"
```bash
# Check if LCD server is running
sudo systemctl status lcd-reading.service

# Check if endpoint is accessible
curl http://localhost:9001/readings
```

### "Connection failed to ThingsBoard"
```bash
# Test MQTT connection manually
mosquitto_pub -h thingsboard.cloud -p 1883 \
  -u "2ztut7be6ppooyiueorb" \
  -t "v1/devices/me/telemetry" \
  -m '{"test": 123}'
```

### "No data in ThingsBoard"
1. Check bridge logs: `sudo journalctl -u thingsboard-bridge.service -f`
2. Verify access token is correct
3. Check device exists in ThingsBoard (INC-001)

## Benefits

✅ **No Duplication** - Uses existing OCR/YOLO pipeline  
✅ **Lightweight** - Only 2 Python packages needed  
✅ **Low RAM** - No heavy ML models loaded  
✅ **Simple** - Just HTTP GET + MQTT publish  
✅ **Reliable** - Auto-reconnect on network issues  
✅ **Cached Values** - Uses last known good values on failure  

## RAM Usage Comparison

| Component | RAM Usage |
|-----------|-----------|
| Original LCD Server (with YOLO+OCR) | ~380MB |
| ThingsBoard Bridge (this) | ~15MB |
| **Total** | **~395MB** (vs 760MB if running duplicate YOLO) |

## Next Steps

1. ✅ Bridge running and publishing data
2. 🔲 Build React dashboard (see `../react_dashboard/`)
3. 🔲 Add user authentication
4. 🔲 Create parent/clinical portals
5. 🔲 Integrate jaundice detection
6. 🔲 Add NTE recommendations

## Files in This Directory

- `lcd_reader.py` - Main MQTT bridge script
- `config.py` - Configuration loader
- `requirements.txt` - Minimal dependencies (2 packages)
- `models/` - *(Empty - no models needed!)*

## Support

- Documentation: `../docs/`
- Architecture: `../docs/ARCHITECTURE.md`
- API Guide: `../docs/API_INTEGRATION.md`
