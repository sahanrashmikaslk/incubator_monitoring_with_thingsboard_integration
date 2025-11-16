# Migration Guide: ThingsBoard Cloud → Self-Hosted

## 📋 Overview

This guide helps you migrate from ThingsBoard Cloud (trial ending) to your own self-hosted ThingsBoard instance.

## ⏱️ Estimated Time

- **Preparation**: 15 minutes
- **Local Testing**: 30 minutes
- **GCP Deployment**: 45 minutes
- **Data Migration**: 30 minutes
- **Total**: ~2 hours

## 🎯 Migration Steps

### Phase 1: Preparation (Before Trial Ends)

#### 1.1 Export Current Configuration

Login to https://thingsboard.cloud and export:

**Device Information**:

1. Go to **Devices** → Click on your device
2. Copy/save:
   - Device name (e.g., `INC-001`)
   - Device type
   - Device profile
   - Current access token ⚠️ **IMPORTANT**
3. Export device attributes:
   - Click **Attributes** tab
   - Copy all client/server/shared attributes

**Telemetry Data** (optional):

1. Go to **Latest Telemetry** tab
2. Note down all telemetry keys being used
3. For historical data export:
   ```bash
   # Use ThingsBoard REST API
   curl -X GET "https://thingsboard.cloud/api/plugins/telemetry/DEVICE/YOUR_DEVICE_ID/values/timeseries?keys=temperature,humidity,spo2,heart_rate" \
     -H "X-Authorization: Bearer YOUR_TOKEN"
   ```

**Dashboard Configuration**:

1. Go to **Dashboards** (if you created any)
2. Export dashboard JSON
3. Save widget configurations

**User Credentials**:

- Save your current admin/user credentials
- List all users who need access

#### 1.2 Document Current Settings

Create a backup file `migration-config.json`:

```json
{
  "device": {
    "name": "INC-001",
    "type": "NICU_Incubator",
    "profile": "Default",
    "access_token": "YOUR_CURRENT_TOKEN",
    "attributes": {
      "device_name": "INC-001",
      "device_type": "NICU_Incubator",
      "firmware_version": "1.0.0",
      "location": "NICU Ward A"
    }
  },
  "telemetry_keys": [
    "spo2",
    "heart_rate",
    "skin_temp",
    "humidity",
    "jaundice_risk"
  ],
  "current_cloud_url": "https://thingsboard.cloud",
  "mqtt_host": "mqtt.thingsboard.cloud",
  "mqtt_port": 1883
}
```

---

### Phase 2: Local Testing

#### 2.1 Start ThingsBoard Locally

```bash
cd incubator_monitoring_with_thingsboard_integration/thingsboard

# Start services
docker-compose up -d

# Wait for startup (2-3 minutes)
docker-compose logs -f thingsboard

# When you see "Started ThingsBoard" - it's ready!
```

#### 2.2 Initial Setup

1. **Access UI**: http://localhost:8080
2. **Login**:
   - Email: `admin@thingsboard.local`
   - Password: `admin`
3. **Change Password**: Settings → Profile → Change Password

#### 2.3 Create Device

1. Go to **Devices** → Click **+** (Add Device)
2. Enter details:
   - **Name**: `INC-001` (same as cloud)
   - **Device Profile**: Default
3. Click **Add**
4. Click on device → **Copy Access Token**
5. **Save this token** - you'll need it!

#### 2.4 Import Attributes

1. Click on device → **Attributes** tab
2. Click **+** → **Add Attribute**
3. Add each attribute from your backup:
   ```json
   {
     "device_name": "INC-001",
     "device_type": "NICU_Incubator",
     "firmware_version": "1.0.0",
     "location": "NICU Ward A"
   }
   ```

#### 2.5 Test MQTT Connection

Update Pi config temporarily for testing:

**File**: `config/device_credentials.json`

```json
{
  "thingsboard_host": "localhost",
  "mqtt_port": 1883,
  "access_token": "NEW_DEVICE_ACCESS_TOKEN_FROM_STEP_2.4"
}
```

Test from Pi:

```bash
# Restart Pi MQTT service
cd ~/PI_webUI_for_test-monitoring
python3 incubator_monitoring_with_thingsboard_integration/pi_client/lcd_reader.py

# Check ThingsBoard UI → Devices → Latest Telemetry
# You should see data appearing!
```

#### 2.6 Test Dashboard Connection

Update dashboard config:

**File**: `react_dashboard/.env.local`

```env
REACT_APP_TB_API_URL=http://localhost:8080/api
```

```bash
cd react_dashboard
npm start

# Dashboard should connect and show data from local ThingsBoard
```

✅ **Checkpoint**: If everything works locally, proceed to GCP deployment!

---

### Phase 3: GCP Deployment

#### 3.1 Deploy ThingsBoard to Cloud Run

```powershell
cd incubator_monitoring_with_thingsboard_integration\thingsboard

# Run deployment script
.\deploy-gcp.ps1

# Enter database password when prompted
# Save the output URL!
```

**Expected Output**:

```
✅ Deployment Complete!
🌐 ThingsBoard URL: https://thingsboard-server-xxxxxxxxx.run.app
📱 ThingsBoard API: https://thingsboard-server-xxxxxxxxx.run.app/api
```

#### 3.2 Initial GCP Setup

1. **Access GCP ThingsBoard**: Open the URL from step 3.1
2. **Login**: `admin@thingsboard.local` / `admin`
3. **Change Password**: Immediately!
4. **Create Device**: Same as step 2.3
5. **Import Attributes**: Same as step 2.4

#### 3.3 Setup MQTT Access

**Problem**: Cloud Run doesn't support MQTT (TCP port 1883) directly.

**Solution Options**:

**Option A: MQTT over WebSocket** (Easiest)

- ThingsBoard supports MQTT over WebSocket
- Update Pi to use WebSocket connection
- No additional infrastructure needed

**Option B: MQTT Gateway VM** (Recommended)

- Deploy a small VM as MQTT gateway
- Forward MQTT to ThingsBoard Cloud Run
- More reliable for IoT devices

**For Option B**:

```bash
# Create MQTT gateway VM
gcloud compute instances create thingsboard-mqtt-gateway \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --boot-disk-size=10GB \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=mqtt-gateway

# Create firewall rule
gcloud compute firewall-rules create allow-mqtt \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:1883 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=mqtt-gateway

# SSH into VM and install MQTT proxy
gcloud compute ssh thingsboard-mqtt-gateway --zone=us-central1-a

# On the VM:
sudo apt-get update
sudo apt-get install -y mosquitto mosquitto-clients nginx

# Configure mosquitto to forward to Cloud Run
# (You'll need to set up WebSocket forwarding)
```

#### 3.4 Update Production Configurations

**Pi Device Config** (`config/device_credentials.json`):

```json
{
  "thingsboard_host": "thingsboard-server-xxxxxxxxx.run.app",
  "mqtt_port": 443,
  "access_token": "YOUR_NEW_GCP_DEVICE_TOKEN",
  "use_websocket": true
}
```

**Dashboard Config** (`.env.production`):

```env
REACT_APP_TB_API_URL=https://thingsboard-server-xxxxxxxxx.run.app/api
```

---

### Phase 4: Gradual Migration

#### 4.1 Parallel Running (Recommended)

For a smooth transition, run both cloud and self-hosted simultaneously:

1. **Keep cloud trial active** for now
2. **Deploy GCP ThingsBoard** with new device token
3. **Update Pi to send to both** (dual publish):

```python
# In lcd_reader.py, publish to both endpoints
def publish_telemetry(data):
    # Publish to cloud (old)
    cloud_client.publish(data)

    # Publish to self-hosted (new)
    selfhosted_client.publish(data)
```

4. **Monitor both** for 1-2 days
5. **Switch dashboard** to self-hosted
6. **Disable cloud publishing**
7. **Cancel cloud trial**

#### 4.2 Direct Cutover

If you can't run parallel:

1. **Prepare everything** in advance
2. **Schedule downtime** (1-2 hours)
3. **Deploy to GCP**
4. **Update all configs**
5. **Test thoroughly**
6. **Go live**

---

### Phase 5: Verification & Cleanup

#### 5.1 Verify Data Flow

**Check Pi → ThingsBoard**:

```bash
# From Pi
tail -f /var/log/thingsboard_publisher.log

# Should see: "✓ Published telemetry: ..."
```

**Check ThingsBoard**:

1. Login to GCP ThingsBoard
2. Devices → INC-001 → Latest Telemetry
3. Verify data is updating every 15 seconds

**Check Dashboard**:

1. Open your dashboard
2. Login as clinician
3. Verify real-time charts updating
4. Check historical data (if migrated)

#### 5.2 Monitor Performance

**ThingsBoard Logs**:

```bash
gcloud run services logs read thingsboard-server --region us-central1 --limit 100
```

**Database Monitoring**:

```bash
gcloud sql operations list --instance=incubator-db
```

**Resource Usage**:

- Cloud Run: Check memory/CPU in GCP Console
- Should be <50% under normal load

#### 5.3 Cleanup Cloud Trial

Once everything is verified:

1. **Export any remaining data** from cloud
2. **Delete cloud devices**
3. **Cancel subscription**
4. **Document the migration** for future reference

---

## 🔄 Rollback Plan

If something goes wrong:

### Quick Rollback Steps

1. **Revert Pi config** to cloud trial:

   ```json
   {
     "thingsboard_host": "mqtt.thingsboard.cloud",
     "mqtt_port": 1883,
     "access_token": "OLD_CLOUD_TOKEN"
   }
   ```

2. **Revert dashboard config**:

   ```env
   REACT_APP_TB_API_URL=https://thingsboard.cloud/api
   ```

3. **Restart services**:

   ```bash
   # On Pi
   sudo systemctl restart thingsboard-publisher

   # Dashboard
   gcloud run deploy incubator-dashboard --source .
   ```

---

## 📊 Comparison: Cloud vs Self-Hosted

| Feature            | ThingsBoard Cloud          | Self-Hosted GCP                 |
| ------------------ | -------------------------- | ------------------------------- |
| **Cost**           | $10-50/month (after trial) | ~$15-25/month (Cloud Run + SQL) |
| **Setup Time**     | 5 minutes                  | 2 hours                         |
| **Maintenance**    | Zero                       | Minimal (updates)               |
| **Control**        | Limited                    | Full control                    |
| **Data Ownership** | Cloud provider             | You own everything              |
| **Customization**  | Limited                    | Unlimited                       |
| **Scalability**    | Auto-scaled                | Auto-scaled (Cloud Run)         |
| **MQTT Support**   | Native                     | Requires gateway or WebSocket   |

---

## ✅ Post-Migration Checklist

- [ ] ThingsBoard accessible at GCP URL
- [ ] Admin password changed
- [ ] Device created and configured
- [ ] Pi sending data successfully
- [ ] Dashboard showing real-time data
- [ ] Historical data accessible (if migrated)
- [ ] All users can login
- [ ] Notifications working
- [ ] Backups configured
- [ ] Monitoring alerts set up
- [ ] Cloud trial cancelled
- [ ] Documentation updated

---

## 🆘 Troubleshooting

### Issue: Pi can't connect to ThingsBoard

**Solution**:

1. Check device token is correct
2. Verify ThingsBoard URL (without https://)
3. Test MQTT port accessibility
4. Check firewall rules

### Issue: Dashboard shows "Device not found"

**Solution**:

1. Verify device ID in dashboard config
2. Check if device exists in ThingsBoard
3. Ensure device name matches exactly

### Issue: No data showing in charts

**Solution**:

1. Check telemetry keys match
2. Verify time range in dashboard
3. Check if Pi is publishing data
4. Look at ThingsBoard logs

### Issue: High latency/slow performance

**Solution**:

1. Increase Cloud Run memory (2Gi → 4Gi)
2. Add more Cloud Run instances (min-instances: 2)
3. Enable Redis caching
4. Optimize database queries

---

## 📞 Support Resources

- **ThingsBoard Docs**: https://thingsboard.io/docs/
- **Community Forum**: https://groups.google.com/forum/#!forum/thingsboard
- **GitHub Issues**: https://github.com/thingsboard/thingsboard
- **GCP Support**: https://cloud.google.com/support

---

## 🎉 Success!

Once migration is complete:

- You own your data
- No trial expiration worries
- Full control over infrastructure
- Cost-effective long-term solution

**Congratulations on completing the migration!** 🚀
