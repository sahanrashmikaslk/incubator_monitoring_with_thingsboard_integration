#!/bin/bash

# Quick Setup Script for Raspberry Pi
# Run this on your Raspberry Pi to setup the monitoring system

set -e  # Exit on error

echo "================================"
echo "NICU Monitor - Quick Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Pi
if [[ ! -f /proc/device-tree/model ]] || ! grep -q "Raspberry Pi" /proc/device-tree/model; then
    echo -e "${RED}Warning: This script is designed for Raspberry Pi${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ Raspberry Pi detected${NC}"

# Update system
echo ""
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo ""
echo "Installing dependencies..."
sudo apt install -y python3-pip python3-venv git v4l-utils cmake libjpeg-dev

# Check Python version
PYTHON_VERSION=$(python3 --version | grep -oP '\d+\.\d+')
if (( $(echo "$PYTHON_VERSION < 3.11" | bc -l) )); then
    echo -e "${YELLOW}Warning: Python 3.11+ recommended (found $PYTHON_VERSION)${NC}"
fi

# Setup virtual environment
echo ""
echo "Creating Python virtual environment..."
cd ~/incubator_monitoring/pi_client
python3 -m venv venv
source venv/bin/activate

# Install Python packages
echo ""
echo "Installing Python packages (this may take a while)..."
pip install --upgrade pip
pip install -r requirements.txt

# Check camera
echo ""
echo "Checking camera..."
if ls /dev/video* 1> /dev/null 2>&1; then
    echo -e "${GREEN}✓ Camera detected: $(ls /dev/video*)${NC}"
else
    echo -e "${RED}✗ No camera detected!${NC}"
    echo "Please connect a USB camera and run this script again."
    exit 1
fi

# Setup mjpg-streamer
echo ""
read -p "Install mjpg-streamer for camera streaming? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ~
    if [ ! -d "mjpg-streamer" ]; then
        git clone https://github.com/jacksonliam/mjpg-streamer.git
        cd mjpg-streamer/mjpg-streamer-experimental
        make
        sudo make install
        echo -e "${GREEN}✓ mjpg-streamer installed${NC}"
    else
        echo -e "${YELLOW}mjpg-streamer already exists${NC}"
    fi
fi

# Configure device credentials
echo ""
echo "Configuring device credentials..."
cd ~/incubator_monitoring/config

if [ ! -f device_credentials.json ]; then
    echo -e "${YELLOW}Creating device_credentials.json${NC}"
    echo "Please enter your ThingsBoard device token:"
    read -r DEVICE_TOKEN
    
    cat > device_credentials.json <<EOF
{
  "device_id": "INC-001",
  "access_token": "$DEVICE_TOKEN",
  "thingsboard_host": "thingsboard.cloud",
  "mqtt_port": 1883,
  "http_port": 443,
  "api_url": "https://thingsboard.cloud/api"
}
EOF
    echo -e "${GREEN}✓ Configuration saved${NC}"
else
    echo -e "${GREEN}✓ Configuration already exists${NC}"
fi

# Check YOLO model
echo ""
echo "Checking YOLO model..."
if [ -f ~/incubator_monitoring/pi_client/models/incubator_yolov8n.pt ]; then
    echo -e "${GREEN}✓ YOLO model found${NC}"
else
    echo -e "${YELLOW}⚠ YOLO model not found!${NC}"
    echo "Please copy your trained model to:"
    echo "  ~/incubator_monitoring/pi_client/models/incubator_yolov8n.pt"
fi

# Setup systemd services
echo ""
read -p "Setup systemd services (auto-start on boot)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Camera service
    sudo tee /etc/systemd/system/camera-stream.service > /dev/null <<EOF
[Unit]
Description=MJPEG Camera Streamer
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 640x480 -f 15" -o "output_http.so -p 8081 -w /usr/local/share/mjpg-streamer/www"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # LCD reader service
    sudo tee /etc/systemd/system/lcd-reader.service > /dev/null <<EOF
[Unit]
Description=LCD Reader with ThingsBoard MQTT
After=network.target camera-stream.service
Requires=camera-stream.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/incubator_monitoring/pi_client
Environment="PATH=$HOME/incubator_monitoring/pi_client/venv/bin"
ExecStart=$HOME/incubator_monitoring/pi_client/venv/bin/python3 lcd_reader.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Reload and enable services
    sudo systemctl daemon-reload
    sudo systemctl enable camera-stream.service
    sudo systemctl enable lcd-reader.service
    
    echo -e "${GREEN}✓ Services configured${NC}"
    
    read -p "Start services now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl start camera-stream.service
        sudo systemctl start lcd-reader.service
        
        echo ""
        echo "Service status:"
        sudo systemctl status camera-stream.service --no-pager -l
        sudo systemctl status lcd-reader.service --no-pager -l
    fi
fi

# Final instructions
echo ""
echo "================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Verify camera stream:"
echo "   http://$(hostname -I | awk '{print $1}'):8081"
echo ""
echo "2. Check LCD reader logs:"
echo "   sudo journalctl -u lcd-reader.service -f"
echo ""
echo "3. Verify data in ThingsBoard:"
echo "   https://thingsboard.cloud"
echo ""
echo "4. Configure React dashboard with Pi IP:"
echo "   http://$(hostname -I | awk '{print $1}')"
echo ""
echo "For troubleshooting, see: docs/DEPLOYMENT.md"
echo ""
