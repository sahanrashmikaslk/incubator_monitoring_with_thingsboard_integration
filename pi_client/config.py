"""
Configuration loader for Pi client
"""

import json
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent.parent
CONFIG_DIR = BASE_DIR / 'config'

def load_device_config():
    """Load device credentials from JSON"""
    config_path = CONFIG_DIR / 'device_credentials.json'
    with open(config_path, 'r') as f:
        return json.load(f)

def load_thingsboard_config():
    """Load ThingsBoard configuration"""
    config_path = CONFIG_DIR / 'thingsboard_config.json'
    with open(config_path, 'r') as f:
        return json.load(f)

# Load configurations
device_config = load_device_config()
tb_config = load_thingsboard_config()

# Export commonly used values
TB_HOST = device_config['thingsboard_host']
TB_PORT = device_config['mqtt_port']
ACCESS_TOKEN = device_config['access_token']
DEVICE_ID = device_config['device_id']

CAPTURE_INTERVAL = tb_config['publish_interval']
TELEMETRY_CONFIG = tb_config['telemetry']
MQTT_CONFIG = tb_config['mqtt']
