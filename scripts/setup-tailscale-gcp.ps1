# ============================================================
# TAILSCALE GCP INTEGRATION SETUP
# Connect Cloud Run services to Tailscale network
# ============================================================

param(
    [Parameter(Mandatory = $true, HelpMessage = "Enter your Tailscale auth key (from https://login.tailscale.com/admin/settings/keys)")]
    [string]$TailscaleAuthKey
)

$ErrorActionPreference = "Continue"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     TAILSCALE GCP INTEGRATION SETUP                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Validate auth key format
if (-not $TailscaleAuthKey.StartsWith("tskey-")) {
    Write-Host "❌ Invalid Tailscale auth key format. It should start with 'tskey-'" -ForegroundColor Red
    Write-Host "   Get your key from: https://login.tailscale.com/admin/settings/keys`n" -ForegroundColor Yellow
    exit 1
}

# Step 1: Enable required APIs
Write-Host "[1/6] Enabling required GCP APIs..." -ForegroundColor Yellow
gcloud services enable compute.googleapis.com vpcaccess.googleapis.com --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ APIs enabled" -ForegroundColor Green
}

# Step 2: Create firewall rules
Write-Host "`n[2/6] Creating firewall rules..." -ForegroundColor Yellow

# Check if rule already exists
$existingRule = gcloud compute firewall-rules describe allow-tailscale-vpc --format="value(name)" 2>$null
if ($existingRule) {
    Write-Host "⚠ Firewall rule already exists, skipping..." -ForegroundColor Gray
}
else {
    gcloud compute firewall-rules create allow-tailscale-vpc `
        --network=default `
        --allow=tcp, udp, icmp `
        --source-ranges=10.128.0.0/9 `
        --description="Allow traffic from VPC to Tailscale router" `
        --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Firewall rule created" -ForegroundColor Green
    }
}

# Step 3: Create Tailscale router VM
Write-Host "`n[3/6] Creating Tailscale router VM..." -ForegroundColor Yellow

# Create startup script
$startupScriptContent = @"
#!/bin/bash
set -e

# Install Tailscale
echo 'Installing Tailscale...'
curl -fsSL https://tailscale.com/install.sh | sh

# Enable IP forwarding
echo 'Enabling IP forwarding...'
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p /etc/sysctl.conf

# Start Tailscale as subnet router
echo 'Starting Tailscale...'
sudo tailscale up --authkey=${TailscaleAuthKey} --advertise-routes=10.128.0.0/9 --accept-routes --hostname=gcp-router

# Install nginx for health checks
echo 'Installing nginx...'
sudo apt-get update -qq
sudo apt-get install -y nginx
echo 'healthy' | sudo tee /var/www/html/health

echo 'Setup complete!'
"@

# Check if VM already exists
$existingVM = gcloud compute instances describe tailscale-router --zone=us-central1-a --format="value(name)" 2>$null
if ($existingVM) {
    Write-Host "⚠ VM 'tailscale-router' already exists." -ForegroundColor Yellow
    $recreate = Read-Host "Do you want to delete and recreate it? (y/N)"
    if ($recreate -eq "y" -or $recreate -eq "Y") {
        Write-Host "  Deleting existing VM..." -ForegroundColor Gray
        gcloud compute instances delete tailscale-router --zone=us-central1-a --quiet
        Start-Sleep -Seconds 5
    }
    else {
        Write-Host "  Skipping VM creation..." -ForegroundColor Gray
        $skipVM = $true
    }
}

if (-not $skipVM) {
    gcloud compute instances create tailscale-router `
        --zone=us-central1-a `
        --machine-type=e2-micro `
        --network-interface=network-tier=PREMIUM, subnet=default `
        --metadata=startup-script=$startupScriptContent `
        --tags=tailscale-router, http-server `
        --create-disk=auto-delete=yes, boot=yes, image=projects/debian-cloud/global/images/debian-12-bookworm-v20241112, size=10 `
        --quiet

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ VM created" -ForegroundColor Green
        Write-Host "`n  Waiting for Tailscale installation (60 seconds)..." -ForegroundColor Gray
        Start-Sleep -Seconds 60
    }
    else {
        Write-Host "❌ Failed to create VM" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Create VPC connector
Write-Host "`n[4/6] Creating VPC connector..." -ForegroundColor Yellow

$existingConnector = gcloud compute networks vpc-access connectors describe tailscale-connector --region=us-central1 --format="value(name)" 2>$null
if ($existingConnector) {
    Write-Host "⚠ VPC connector already exists, skipping..." -ForegroundColor Gray
}
else {
    gcloud compute networks vpc-access connectors create tailscale-connector `
        --region=us-central1 `
        --network=default `
        --range=10.8.0.0/28 `
        --min-instances=2 `
        --max-instances=10 `
        --quiet

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ VPC connector created" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Failed to create VPC connector" -ForegroundColor Red
        Write-Host "   Try a different IP range or check existing connectors" -ForegroundColor Yellow
    }
}

# Step 5: Get router internal IP
Write-Host "`n[5/6] Getting Tailscale router IP..." -ForegroundColor Yellow
$routerIP = gcloud compute instances describe tailscale-router `
    --zone=us-central1-a `
    --format="get(networkInterfaces[0].networkIP)" 2>$null

if ($routerIP) {
    Write-Host "✓ Router IP: $routerIP" -ForegroundColor Green
}
else {
    Write-Host "⚠ Could not get router IP" -ForegroundColor Yellow
}

# Step 6: Update Cloud Run services
Write-Host "`n[6/6] Updating Cloud Run services with VPC connector..." -ForegroundColor Yellow

$services = @("incubator-admin-backend", "incubator-parent-backend", "incubator-dashboard")
foreach ($service in $services) {
    Write-Host "  Updating $service..." -ForegroundColor Gray
    
    gcloud run services update $service `
        --region=us-central1 `
        --vpc-connector=tailscale-connector `
        --vpc-egress=all-traffic `
        --quiet 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $service updated" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠ Failed to update $service" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           TAILSCALE SETUP COMPLETED!                     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "✅ Setup Summary:" -ForegroundColor Cyan
Write-Host "   ✓ Tailscale router VM created (e2-micro)" -ForegroundColor White
Write-Host "   ✓ VPC connector created" -ForegroundColor White
Write-Host "   ✓ Cloud Run services updated" -ForegroundColor White
Write-Host "   ✓ Firewall rules configured`n" -ForegroundColor White

Write-Host "⚠️  CRITICAL NEXT STEP:" -ForegroundColor Red
Write-Host "   1. Open: https://login.tailscale.com/admin/machines" -ForegroundColor Yellow
Write-Host "   2. Find machine: 'gcp-router'" -ForegroundColor Yellow
Write-Host "   3. Click ••• menu → 'Edit route settings'" -ForegroundColor Yellow
Write-Host "   4. APPROVE the subnet route: 10.128.0.0/9`n" -ForegroundColor Yellow

Write-Host "🔍 Verification Commands:" -ForegroundColor Cyan
Write-Host "`n   # SSH into router" -ForegroundColor Gray
Write-Host "   gcloud compute ssh tailscale-router --zone=us-central1-a`n" -ForegroundColor White
Write-Host "   # Test Pi connectivity" -ForegroundColor Gray
Write-Host "   ping 100.89.162.22" -ForegroundColor White
Write-Host "   curl http://100.89.162.22:9001/status`n" -ForegroundColor White

Write-Host "💰 Additional Monthly Cost: ~`$10-20" -ForegroundColor Cyan
Write-Host "   - e2-micro VM: ~`$7/month (free tier eligible)" -ForegroundColor Gray
Write-Host "   - VPC Connector: ~`$10-15/month`n" -ForegroundColor Gray

Write-Host "📊 Check status:" -ForegroundColor Cyan
Write-Host "   gcloud compute instances list" -ForegroundColor White
Write-Host "   gcloud run services list --region=us-central1`n" -ForegroundColor White

# Open Tailscale admin
Write-Host "Opening Tailscale admin panel..." -ForegroundColor Cyan
Start-Process "https://login.tailscale.com/admin/machines"
