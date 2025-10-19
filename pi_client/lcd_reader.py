"""
Raspberry Pi LCD Reader with ThingsBoard MQTT Integration
Reads incubator parameters via OCR and publishes to ThingsBoard Cloud
"""

import json
import time
import logging
import requests
import cv2
import numpy as np
import paho.mqtt.client as mqtt
from datetime import datetime
from ultralytics import YOLO
import easyocr
import gc

# Configuration
CONFIG_PATH = '../config/device_credentials.json'
TB_CONFIG_PATH = '../config/thingsboard_config.json'

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

# Camera and OCR configuration
CAMERA_STREAM_URL = 'http://localhost:8081/?action=stream'
MODEL_PATH = '/home/sahan/monitoring/models/incubator_yolov8n.pt'
CAPTURE_INTERVAL = tb_config['publish_interval']  # 15 seconds

# Class names (order matters - matches YOLO training)
CLASS_NAMES = ['heart_rate_value', 'humidity_value', 'skin_temp_value', 'spo2_value']

# Parameter mapping for display
PARAMETER_MAP = {
    'heart_rate_value': 'Heart Rate',
    'humidity_value': 'Humidity',
    'skin_temp_value': 'Skin Temperature',
    'spo2_value': 'SpO2'
}


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


class IncubatorMonitor:
    """Monitor incubator parameters via OCR and YOLO detection"""
    
    def __init__(self):
        logger.info("Initializing Incubator Monitor...")
        
        # Load YOLO model
        logger.info("Loading YOLO model...")
        self.model = YOLO(MODEL_PATH)
        
        # Initialize EasyOCR reader
        logger.info("Initializing EasyOCR...")
        self.reader = easyocr.Reader(['en'], gpu=False)
        
        # Initialize ThingsBoard client
        self.tb_client = ThingsBoardClient()
        
        # Last readings cache
        self.last_readings = {}
        
        logger.info("✓ Initialization complete")
    
    def capture_frame(self):
        """Capture frame from MJPEG stream"""
        try:
            response = requests.get(CAMERA_STREAM_URL, stream=True, timeout=5)
            
            if response.status_code != 200:
                logger.error(f"Stream error: HTTP {response.status_code}")
                return None
            
            # Read MJPEG frame
            bytes_data = bytes()
            for chunk in response.iter_content(chunk_size=1024):
                bytes_data += chunk
                
                # Find JPEG boundaries
                a = bytes_data.find(b'\xff\xd8')  # JPEG start
                b = bytes_data.find(b'\xff\xd9')  # JPEG end
                
                if a != -1 and b != -1:
                    jpg = bytes_data[a:b+2]
                    bytes_data = bytes_data[b+2:]
                    
                    # Decode image
                    frame = cv2.imdecode(
                        np.frombuffer(jpg, dtype=np.uint8),
                        cv2.IMREAD_COLOR
                    )
                    
                    if frame is not None:
                        return frame
                    
            logger.warning("No valid frame found in stream")
            return None
            
        except Exception as e:
            logger.error(f"Error capturing frame: {e}")
            return None
    
    def detect_parameters(self, frame):
        """Detect parameter regions using YOLO"""
        try:
            results = self.model.predict(frame, conf=0.5, verbose=False)
            
            detections = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    
                    if cls < len(CLASS_NAMES):
                        detections.append({
                            'class': CLASS_NAMES[cls],
                            'bbox': (x1, y1, x2, y2),
                            'confidence': conf
                        })
            
            return detections
        
        except Exception as e:
            logger.error(f"Detection error: {e}")
            return []
    
    def extract_text(self, frame, bbox):
        """Extract text from detected region using OCR"""
        try:
            x1, y1, x2, y2 = bbox
            roi = frame[y1:y2, x1:x2]
            
            if roi.size == 0:
                return None
            
            # EasyOCR
            results = self.reader.readtext(roi, detail=0)
            
            if results:
                text = ' '.join(results).strip()
                return text
            
            return None
            
        except Exception as e:
            logger.error(f"OCR error: {e}")
            return None
    
    def parse_value(self, text, param_type):
        """Parse OCR text to extract numeric value"""
        if not text:
            return None
        
        # Remove common OCR artifacts
        text = text.replace('O', '0').replace('o', '0')
        text = ''.join(filter(lambda x: x.isdigit() or x == '.', text))
        
        try:
            value = float(text)
            
            # Validation ranges
            if param_type == 'spo2_value':
                if 70 <= value <= 100:
                    return round(value, 1)
            elif param_type == 'heart_rate_value':
                if 50 <= value <= 220:
                    return round(value, 0)
            elif param_type == 'skin_temp_value':
                if 30 <= value <= 42:
                    return round(value, 1)
            elif param_type == 'humidity_value':
                if 0 <= value <= 100:
                    return round(value, 1)
            
            return None
        except ValueError:
            return None
    
    def read_parameters(self):
        """Read all parameters from incubator display"""
        logger.info("Capturing frame...")
        frame = self.capture_frame()
        
        if frame is None:
            logger.error("Failed to capture frame")
            return None
        
        logger.info("Detecting parameters...")
        detections = self.detect_parameters(frame)
        
        if not detections:
            logger.warning("No parameters detected")
            return None
        
        readings = {}
        
        for detection in detections:
            param_class = detection['class']
            bbox = detection['bbox']
            
            logger.info(f"Processing {param_class}...")
            text = self.extract_text(frame, bbox)
            
            if text:
                value = self.parse_value(text, param_class)
                if value is not None:
                    # Map to ThingsBoard telemetry keys
                    if param_class == 'spo2_value':
                        readings['spo2'] = value
                    elif param_class == 'heart_rate_value':
                        readings['heart_rate'] = value
                    elif param_class == 'skin_temp_value':
                        readings['skin_temp'] = value
                    elif param_class == 'humidity_value':
                        readings['humidity'] = value
                    
                    logger.info(f"✓ {PARAMETER_MAP[param_class]}: {value}")
        
        return readings if readings else None
    
    def run(self):
        """Main monitoring loop"""
        logger.info("Starting monitoring loop...")
        
        # Connect to ThingsBoard
        if not self.tb_client.connect():
            logger.error("Failed to connect to ThingsBoard. Exiting.")
            return
        
        try:
            while True:
                logger.info(f"\n{'='*50}")
                logger.info(f"Reading cycle at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                # Read parameters
                readings = self.read_parameters()
                
                if readings:
                    # Add timestamp
                    readings['timestamp'] = int(time.time() * 1000)
                    
                    # Publish to ThingsBoard
                    success = self.tb_client.publish_telemetry(readings)
                    
                    if success:
                        self.last_readings = readings
                    
                else:
                    logger.warning("No valid readings, using cached values")
                    if self.last_readings:
                        self.tb_client.publish_telemetry(self.last_readings)
                
                # Memory cleanup
                gc.collect()
                
                # Wait for next cycle
                logger.info(f"Waiting {CAPTURE_INTERVAL} seconds...")
                time.sleep(CAPTURE_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("\nShutdown requested...")
        finally:
            self.tb_client.disconnect()
            logger.info("Monitor stopped")


if __name__ == '__main__':
    try:
        monitor = IncubatorMonitor()
        monitor.run()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
