#!/bin/bash
# Quick Deploy Script - ThingsBoard MQTT Bridge
# Run this on Raspberry Pi to setup the MQTT bridge

set -e

echo "========================================"
echo "ThingsBoard MQTT Bridge - Quick Setup"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "lcd_reader.py" ]; then
    echo "❌ Error: Run this script from pi_client directory"
    echo "Usage: cd ~/incubator_monitoring_with_thingsboard_integration/pi_client"
    echo "       ./quick_deploy.sh"
    exit 1
fi

# Check if LCD Reading Server is running
echo "Checking if LCD Reading Server is running..."
if curl -s -f http://localhost:9001/readings > /dev/null; then
    echo "✅ LCD Reading Server is running"
else
    echo "❌ LCD Reading Server is NOT running!"
    echo "Please start it first:"
    echo "  sudo systemctl start lcd-reading.service"
    exit 1
fi

# Create virtual environment
echo ""
echo "Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "ℹ️  Virtual environment already exists"
fi

# Activate and install packages
echo ""
echo "Installing dependencies (paho-mqtt, requests)..."
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "✅ Dependencies installed"

# Test ThingsBoard connection
echo ""
echo "Testing ThingsBoard connection..."
python3 -c "
import paho.mqtt.client as mqtt
import json

# Load config
with open('../config/device_credentials.json') as f:
    config = json.load(f)

connected = False

def on_connect(client, userdata, flags, rc):
    global connected
    if rc == 0:
        print('✅ ThingsBoard connection successful!')
        connected = True
    else:
        print(f'❌ Connection failed with code {rc}')
    client.disconnect()

client = mqtt.Client()
client.username_pw_set(config['access_token'])
client.on_connect = on_connect
client.connect(config['thingsboard_host'], config['mqtt_port'], 60)
client.loop_forever()
"

# Test LCD server fetch
echo ""
echo "Testing LCD server data fetch..."
python3 -c "
import requests
import json

try:
    resp = requests.get('http://localhost:9001/readings', timeout=5)
    if resp.status_code == 200:
        data = resp.json()
        print('✅ LCD server data fetch successful!')
        print('Sample data:', {k: v.get('value') if isinstance(v, dict) else v for k, v in list(data.items())[:2]})
    else:
        print(f'⚠️  LCD server returned status {resp.status_code}')
except Exception as e:
    print(f'❌ Failed to fetch from LCD server: {e}')
"

# Ask to setup systemd service
echo ""
read -p "Setup systemd service (auto-start on boot)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo tee /etc/systemd/system/thingsboard-bridge.service > /dev/null <<EOF
[Unit]
Description=ThingsBoard MQTT Bridge
After=network.target lcd-reading.service
Requires=lcd-reading.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/incubator_monitoring_with_thingsboard_integration/pi_client
Environment="PATH=$HOME/incubator_monitoring_with_thingsboard_integration/pi_client/venv/bin"
ExecStart=$HOME/incubator_monitoring_with_thingsboard_integration/pi_client/venv/bin/python3 lcd_reader.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable thingsboard-bridge.service
    echo "✅ Service configured"
    
    read -p "Start service now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl start thingsboard-bridge.service
        sleep 2
        
        echo ""
        echo "Service status:"
        sudo systemctl status thingsboard-bridge.service --no-pager -l
        
        echo ""
        echo "Live logs (Ctrl+C to stop):"
        sudo journalctl -u thingsboard-bridge.service -f
    fi
else
    echo ""
    echo "To run manually:"
    echo "  source venv/bin/activate"
    echo "  python lcd_reader.py"
fi

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Check ThingsBoard Cloud:"
echo "   https://thingsboard.cloud → Devices → INC-001 → Latest Telemetry"
echo ""
echo "2. Monitor logs:"
echo "   sudo journalctl -u thingsboard-bridge.service -f"
echo ""
echo "3. Check service status:"
echo "   sudo systemctl status thingsboard-bridge.service"
echo ""
