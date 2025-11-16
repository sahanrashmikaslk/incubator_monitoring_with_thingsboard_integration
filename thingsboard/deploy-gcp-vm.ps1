#!/usr/bin/env pwsh
# Deploy ThingsBoard to GCP Compute Engine VM with full MQTT support
# This maintains compatibility with your Pi's existing MQTT configuration

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = Read-Host "Enter your GCP Project ID"
$REGION = "us-central1"
$ZONE = "us-central1-a"
$VM_NAME = "thingsboard-server"
$MACHINE_TYPE = "e2-medium"  # 2 vCPUs, 4GB RAM (~$50/month)
$DISK_SIZE = "30GB"
$IMAGE_FAMILY = "ubuntu-2204-lts"
$IMAGE_PROJECT = "ubuntu-os-cloud"

Write-Host "`n🚀 ThingsBoard GCP Compute Engine Deployment`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Set project
Write-Host "📌 Setting GCP project: $PROJECT_ID" -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Enable required APIs
Write-Host "`n🔧 Enabling required GCP APIs..." -ForegroundColor Yellow
gcloud services enable compute.googleapis.com
Write-Host "✅ APIs enabled`n" -ForegroundColor Green

# Create firewall rules
Write-Host "🔥 Creating firewall rules..." -ForegroundColor Yellow

# HTTP/HTTPS for web UI
$httpRuleExists = gcloud compute firewall-rules list --filter="name=thingsboard-http" --format="value(name)"
if ([string]::IsNullOrWhiteSpace($httpRuleExists)) {
    gcloud compute firewall-rules create thingsboard-http `
        --allow tcp:8080, tcp:443 `
        --target-tags=thingsboard-server `
        --description="Allow HTTP/HTTPS access to ThingsBoard"
    Write-Host "✅ HTTP firewall rule created" -ForegroundColor Green
}
else {
    Write-Host "✅ HTTP firewall rule already exists" -ForegroundColor Green
}

# MQTT for Pi devices
$mqttRuleExists = gcloud compute firewall-rules list --filter="name=thingsboard-mqtt" --format="value(name)"
if ([string]::IsNullOrWhiteSpace($mqttRuleExists)) {
    gcloud compute firewall-rules create thingsboard-mqtt `
        --allow tcp:1883 `
        --target-tags=thingsboard-server `
        --description="Allow MQTT access for IoT devices"
    Write-Host "✅ MQTT firewall rule created" -ForegroundColor Green
}
else {
    Write-Host "✅ MQTT firewall rule already exists" -ForegroundColor Green
}

# Create startup script that will install Docker and run ThingsBoard
$STARTUP_SCRIPT = @'
#!/bin/bash
set -e

echo "=== ThingsBoard VM Setup Script ==="

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Create ThingsBoard directory
mkdir -p /opt/thingsboard
cd /opt/thingsboard

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: thingsboard-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: thingsboard
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: tb_postgres_password_2024
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - thingsboard-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  thingsboard:
    image: thingsboard/tb-postgres:3.6.2
    container_name: thingsboard-server
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/thingsboard
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: tb_postgres_password_2024
      TB_QUEUE_TYPE: in-memory
      MQTT_BIND_ADDRESS: 0.0.0.0
      MQTT_BIND_PORT: 1883
      HTTP_BIND_ADDRESS: 0.0.0.0
      HTTP_BIND_PORT: 8080
    volumes:
      - thingsboard-data:/data
      - thingsboard-logs:/var/log/thingsboard
    ports:
      - "8080:8080"
      - "1883:1883"
    networks:
      - thingsboard-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/login || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s

volumes:
  postgres-data:
  thingsboard-data:
  thingsboard-logs:

networks:
  thingsboard-network:
    driver: bridge
EOF

# Start ThingsBoard
echo "Starting ThingsBoard..."
docker compose up -d

# Wait for ThingsBoard to be ready
echo "Waiting for ThingsBoard to start (this may take 2-3 minutes)..."
sleep 30
for i in {1..60}; do
    if curl -f http://localhost:8080/login > /dev/null 2>&1; then
        echo "✅ ThingsBoard is ready!"
        break
    fi
    echo "Waiting... ($i/60)"
    sleep 5
done

echo "=== ThingsBoard Setup Complete ==="
'@

# Save startup script to temp file
$TEMP_SCRIPT = New-TemporaryFile
Set-Content -Path $TEMP_SCRIPT.FullName -Value $STARTUP_SCRIPT

# Check if VM already exists
Write-Host "`n💻 Checking if VM exists..." -ForegroundColor Yellow
$vmExists = gcloud compute instances list --filter="name=$VM_NAME AND zone:$ZONE" --format="value(name)"

if ([string]::IsNullOrWhiteSpace($vmExists)) {
    Write-Host "🏗️  Creating VM instance..." -ForegroundColor Yellow
    gcloud compute instances create $VM_NAME `
        --zone=$ZONE `
        --machine-type=$MACHINE_TYPE `
        --boot-disk-size=$DISK_SIZE `
        --boot-disk-type=pd-standard `
        --image-family=$IMAGE_FAMILY `
        --image-project=$IMAGE_PROJECT `
        --tags=thingsboard-server `
        --metadata-from-file startup-script=$($TEMP_SCRIPT.FullName) `
        --scopes=https://www.googleapis.com/auth/cloud-platform
    
    Write-Host "✅ VM created successfully`n" -ForegroundColor Green
}
else {
    Write-Host "✅ VM already exists`n" -ForegroundColor Green
    $update = Read-Host "Do you want to update the VM with the latest startup script? (y/n)"
    if ($update -eq 'y') {
        gcloud compute instances add-metadata $VM_NAME `
            --zone=$ZONE `
            --metadata-from-file startup-script=$($TEMP_SCRIPT.FullName)
        
        Write-Host "Restarting VM to apply changes..." -ForegroundColor Yellow
        gcloud compute instances stop $VM_NAME --zone=$ZONE --quiet
        gcloud compute instances start $VM_NAME --zone=$ZONE --quiet
        Write-Host "✅ VM restarted`n" -ForegroundColor Green
    }
}

# Clean up temp file
Remove-Item $TEMP_SCRIPT.FullName

# Get VM external IP
Write-Host "🌐 Getting VM external IP..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$EXTERNAL_IP = gcloud compute instances describe $VM_NAME --zone=$ZONE --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "📊 VM Information:" -ForegroundColor Yellow
Write-Host "   Name: $VM_NAME" -ForegroundColor White
Write-Host "   Zone: $ZONE" -ForegroundColor White
Write-Host "   Machine Type: $MACHINE_TYPE" -ForegroundColor White
Write-Host "   External IP: $EXTERNAL_IP`n" -ForegroundColor White

Write-Host "🌐 ThingsBoard Access:" -ForegroundColor Yellow
Write-Host "   Web UI: http://${EXTERNAL_IP}:8080" -ForegroundColor Cyan
Write-Host "   API: http://${EXTERNAL_IP}:8080/api" -ForegroundColor Cyan
Write-Host "   MQTT: ${EXTERNAL_IP}:1883`n" -ForegroundColor Cyan

Write-Host "🔑 Default Admin Credentials:" -ForegroundColor Yellow
Write-Host "   Email: tenant@thingsboard.org" -ForegroundColor White
Write-Host "   Password: tenant" -ForegroundColor White
Write-Host "   ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!`n" -ForegroundColor Red

Write-Host "⏳ Note: ThingsBoard is starting up (may take 2-3 minutes)" -ForegroundColor Yellow
Write-Host "   Check status: gcloud compute ssh $VM_NAME --zone=$ZONE --command='docker ps'`n" -ForegroundColor Gray

Write-Host "📱 Update your Pi configuration:" -ForegroundColor Yellow
Write-Host "   1. SSH to your Pi: ssh sahan@192.168.1.232" -ForegroundColor White
Write-Host "   2. Edit device_credentials.json:" -ForegroundColor White
Write-Host "      thingsboard_host: $EXTERNAL_IP" -ForegroundColor Cyan
Write-Host "      mqtt_port: 1883" -ForegroundColor Cyan
Write-Host "      http_port: 8080" -ForegroundColor Cyan
Write-Host "   3. Restart services to apply changes`n" -ForegroundColor White

Write-Host "🔧 Useful Commands:" -ForegroundColor Yellow
Write-Host "   SSH to VM: gcloud compute ssh $VM_NAME --zone=$ZONE" -ForegroundColor Gray
Write-Host "   View logs: gcloud compute ssh $VM_NAME --zone=$ZONE --command='cd /opt/thingsboard && docker compose logs -f'" -ForegroundColor Gray
Write-Host "   Stop VM: gcloud compute instances stop $VM_NAME --zone=$ZONE" -ForegroundColor Gray
Write-Host "   Start VM: gcloud compute instances start $VM_NAME --zone=$ZONE" -ForegroundColor Gray
Write-Host "   Delete VM: gcloud compute instances delete $VM_NAME --zone=$ZONE`n" -ForegroundColor Gray

Write-Host "💰 Estimated Cost: ~`$50-80/month (e2-medium + 30GB disk + egress)" -ForegroundColor Green
Write-Host ""
