"""
ThingsBoard MQTT Publisher
Fetches data from existing LCD Reading Server (port 9001) and publishes to ThingsBoard Cloud
NO OCR/YOLO duplication - just MQTT integration layer
"""

import json
import time
import logging
import requests
import paho.mqtt.client as mqtt
from datetime import datetime
import os

# Configuration
CONFIG_DIR = os.path.join(os.path.dirname(__file__), '..', 'config')
CONFIG_PATH = os.path.join(CONFIG_DIR, 'device_credentials.json')
TB_CONFIG_PATH = os.path.join(CONFIG_DIR, 'thingsboard_config.json')

# Load configurations
with open(CONFIG_PATH, 'r') as f:
    device_config = json.load(f)

with open(TB_CONFIG_PATH, 'r') as f:
    tb_config = json.load(f)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ThingsBoard MQTT configuration
TB_HOST = device_config['thingsboard_host']
TB_PORT = device_config['mqtt_port']
ACCESS_TOKEN = device_config['access_token']

# MQTT topics
TELEMETRY_TOPIC = 'v1/devices/me/telemetry'
ATTRIBUTES_TOPIC = 'v1/devices/me/attributes'

# Existing LCD Reading Server
LCD_SERVER_URL = 'http://localhost:9001'
PUBLISH_INTERVAL = tb_config['publish_interval']  # 15 seconds


class ThingsBoardClient:
    """MQTT client for ThingsBoard communication"""
    
    def __init__(self):
        self.client = mqtt.Client()
        self.client.username_pw_set(ACCESS_TOKEN)
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.connected = False
        
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("✓ Connected to ThingsBoard successfully")
            self.connected = True
            # Publish device attributes on connect
            self.publish_attributes(tb_config['attributes'])
        else:
            logger.error(f"✗ Connection failed with code {rc}")
            self.connected = False
    
    def on_disconnect(self, client, userdata, rc):
        logger.warning(f"Disconnected from ThingsBoard (code: {rc})")
        self.connected = False
        
    def connect(self):
        """Connect to ThingsBoard MQTT broker"""
        try:
            self.client.connect(TB_HOST, TB_PORT, keepalive=60)
            self.client.loop_start()
            
            # Wait for connection
            timeout = 10
            start_time = time.time()
            while not self.connected and (time.time() - start_time) < timeout:
                time.sleep(0.5)
            
            if not self.connected:
                raise Exception("Connection timeout")
                
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False
    
    def publish_telemetry(self, data):
        """Publish telemetry data to ThingsBoard"""
        if not self.connected:
            logger.warning("Not connected, attempting reconnect...")
            if not self.connect():
                return False
        
        try:
            payload = json.dumps(data)
            result = self.client.publish(TELEMETRY_TOPIC, payload, qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"✓ Telemetry published: {data}")
                return True
            else:
                logger.error(f"✗ Publish failed with code {result.rc}")
                return False
        except Exception as e:
            logger.error(f"Error publishing telemetry: {e}")
            return False
    
    def publish_attributes(self, data):
        """Publish device attributes to ThingsBoard"""
        try:
            payload = json.dumps(data)
            self.client.publish(ATTRIBUTES_TOPIC, payload, qos=1)
            logger.info(f"✓ Attributes published: {data}")
        except Exception as e:
            logger.error(f"Error publishing attributes: {e}")
    
    def disconnect(self):
        """Disconnect from ThingsBoard"""
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("Disconnected from ThingsBoard")


class DataBridge:
    """Bridge between existing LCD server and ThingsBoard"""
    
    def __init__(self):
        logger.info("Initializing ThingsBoard Data Bridge...")
        
        # Initialize ThingsBoard client
        self.tb_client = ThingsBoardClient()
        
        # Last readings cache
        self.last_readings = {}
        
        logger.info("✓ Initialization complete")
    
    def fetch_readings_from_lcd_server(self):
        """Fetch latest readings from existing LCD Reading Server"""
        try:
            # Fetch from /readings endpoint on port 9001
            response = requests.get(f"{LCD_SERVER_URL}/readings", timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                # Your LCD server returns readings in this format:
                # {
                #   "spo2": { "value": 98, "confidence": 0.95, ... },
                #   "heart_rate": { "value": 145, ... },
                #   ...
                # }
                
                readings = {}
                
                # Extract values from your server's response format
                if 'spo2' in data and data['spo2'] and 'value' in data['spo2']:
                    readings['spo2'] = data['spo2']['value']
                    
                if 'heart_rate' in data and data['heart_rate'] and 'value' in data['heart_rate']:
                    readings['heart_rate'] = data['heart_rate']['value']
                    
                if 'skin_temp' in data and data['skin_temp'] and 'value' in data['skin_temp']:
                    readings['skin_temp'] = data['skin_temp']['value']
                    
                if 'humidity' in data and data['humidity'] and 'value' in data['humidity']:
                    readings['humidity'] = data['humidity']['value']
                
                if readings:
                    logger.info(f"✓ Fetched: SpO2={readings.get('spo2')}, HR={readings.get('heart_rate')}, Temp={readings.get('skin_temp')}, Humidity={readings.get('humidity')}")
                
                return readings if readings else None
            else:
                logger.warning(f"LCD server returned status {response.status_code}")
                return None
                
        except requests.exceptions.ConnectionError:
            logger.error("Cannot connect to LCD Reading Server - is it running on port 9001?")
            return None
        except Exception as e:
            logger.error(f"Error fetching from LCD server: {e}")
            return None
    
    def run(self):
        """Main publishing loop"""
        logger.info("Starting ThingsBoard publishing loop...")
        logger.info(f"Fetching data from: {LCD_SERVER_URL}")
        logger.info(f"Publishing interval: {PUBLISH_INTERVAL} seconds")
        
        # Connect to ThingsBoard
        if not self.tb_client.connect():
            logger.error("Failed to connect to ThingsBoard. Exiting.")
            return
        
        try:
            while True:
                logger.info(f"\n{'='*50}")
                logger.info(f"Fetch cycle at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                # Fetch readings from existing LCD server
                readings = self.fetch_readings_from_lcd_server()
                
                if readings:
                    # Add timestamp
                    readings['timestamp'] = int(time.time() * 1000)
                    
                    # Publish to ThingsBoard
                    success = self.tb_client.publish_telemetry(readings)
                    
                    if success:
                        self.last_readings = readings
                    
                else:
                    logger.warning("No valid readings from LCD server")
                    # Optionally publish last known good values
                    if self.last_readings:
                        logger.info("Using last known values")
                        self.tb_client.publish_telemetry(self.last_readings)
                
                # Wait for next cycle
                logger.info(f"Waiting {PUBLISH_INTERVAL} seconds...")
                time.sleep(PUBLISH_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("\nShutdown requested...")
        finally:
            self.tb_client.disconnect()
            logger.info("Data bridge stopped")


if __name__ == '__main__':
    try:
        bridge = DataBridge()
        bridge.run()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
