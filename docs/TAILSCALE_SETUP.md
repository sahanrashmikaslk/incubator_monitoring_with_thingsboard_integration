# 🔐 Tailscale Integration with GCP Cloud Run

## Problem

Your Pi devices (100.89.162.22) are on a Tailscale network, but Cloud Run services run on Google's network and can't directly access Tailscale IPs.

## Solution Options

### **Option 1: Tailscale Subnet Router on GCP (RECOMMENDED)**

Set up a Tailscale subnet router in GCP that bridges Cloud Run ↔ Tailscale network.

### **Option 2: Tailscale Sidecar in Compute Engine**

Run a proxy server on GCP Compute Engine with Tailscale.

### **Option 3: Public Endpoints via Tailscale Funnel**

Expose Pi services publicly through Tailscale Funnel.

### **Option 4: Hybrid Architecture**

Use ThingsBoard as the data bridge (Pi → ThingsBoard → Cloud Run).

---

# 🎯 RECOMMENDED: Option 1 - Tailscale Subnet Router

This creates a secure bridge between your Cloud Run services and Tailscale network.

## Architecture

```
Cloud Run Services (GCP)
    ↓
VPC Connector
    ↓
Compute Engine VM (Tailscale Router)
    ↓
Tailscale Network (100.89.162.0/24)
    ↓
Raspberry Pi (100.89.162.22)
```

---

## Step-by-Step Setup

### Step 1: Get Tailscale Auth Key

1. Go to: https://login.tailscale.com/admin/settings/keys
2. Click **Generate auth key**
3. Settings:
   - ✅ Reusable
   - ✅ Ephemeral (optional)
   - Tag: `tag:gcp-router`
4. Copy the auth key (starts with `tskey-auth-...`)

---

### Step 2: Create Tailscale Router VM

Run this command to create a Compute Engine VM with Tailscale:

```powershell
# Set project
gcloud config set project neonatal-incubator-monitoring

# Create firewall rule to allow VPC traffic
gcloud compute firewall-rules create allow-tailscale-vpc \
  --network=default \
  --allow=tcp,udp,icmp \
  --source-ranges=10.128.0.0/9 \
  --description="Allow traffic from VPC to Tailscale router"

# Create the VM with Tailscale
gcloud compute instances create tailscale-router \
  --project=neonatal-incubator-monitoring \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default \
  --metadata=startup-script='#!/bin/bash
    # Install Tailscale
    curl -fsSL https://tailscale.com/install.sh | sh

    # Enable IP forwarding
    echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
    echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p /etc/sysctl.conf

    # Start Tailscale as subnet router
    sudo tailscale up --authkey=YOUR_TAILSCALE_AUTH_KEY --advertise-routes=10.128.0.0/9 --accept-routes

    # Install nginx for health checks
    sudo apt-get update
    sudo apt-get install -y nginx
    echo "healthy" | sudo tee /var/www/html/health
  ' \
  --maintenance-policy=MIGRATE \
  --provisioning-model=STANDARD \
  --tags=tailscale-router,http-server \
  --create-disk=auto-delete=yes,boot=yes,device-name=tailscale-router,image=projects/debian-cloud/global/images/debian-12-bookworm-v20241112,mode=rw,size=10,type=pd-balanced \
  --no-shielded-secure-boot \
  --shielded-vtpm \
  --shielded-integrity-monitoring \
  --labels=gce-container-declaration=true
```

**⚠️ IMPORTANT:** Replace `YOUR_TAILSCALE_AUTH_KEY` with your actual auth key!

---

### Step 3: Approve Subnet Routes in Tailscale

1. Go to: https://login.tailscale.com/admin/machines
2. Find your `tailscale-router` machine
3. Click the **•••** menu → **Edit route settings**
4. **Approve** the advertised routes (10.128.0.0/9)

---

### Step 4: Create VPC Connector

```powershell
# Enable VPC Access API
gcloud services enable vpcaccess.googleapis.com

# Create VPC connector
gcloud compute networks vpc-access connectors create tailscale-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10
```

---

### Step 5: Update Cloud Run Services to Use VPC

```powershell
# Get the Tailscale router internal IP
$routerIP = gcloud compute instances describe tailscale-router \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].networkIP)"

Write-Host "Tailscale Router IP: $routerIP"

# Update Admin Backend
gcloud run services update incubator-admin-backend \
  --region=us-central1 \
  --vpc-connector=tailscale-connector \
  --vpc-egress=all-traffic

# Update Parent Backend
gcloud run services update incubator-parent-backend \
  --region=us-central1 \
  --vpc-connector=tailscale-connector \
  --vpc-egress=all-traffic

# Update Dashboard
gcloud run services update incubator-dashboard \
  --region=us-central1 \
  --vpc-connector=tailscale-connector \
  --vpc-egress=all-traffic
```

---

### Step 6: Test Connectivity

```powershell
# SSH into the Tailscale router
gcloud compute ssh tailscale-router --zone=us-central1-a

# Once connected, test ping to Pi
ping 100.89.162.22

# Test HTTP connection
curl http://100.89.162.22:9001/status

# Exit SSH
exit
```

---

## Cost Breakdown

| Resource          | Type                                 | Monthly Cost     |
| ----------------- | ------------------------------------ | ---------------- |
| Compute Engine VM | e2-micro (always free tier eligible) | $0-7             |
| VPC Connector     | 2-10 instances                       | $10-50           |
| **Total**         |                                      | **$10-57/month** |

**Note:** If you're within Google Cloud's free tier ($300 credit for 90 days), this will be free!

---

## Alternative: Quick Setup Script

Save and run this automated script:

```powershell
# tailscale-setup.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$TailscaleAuthKey
)

Write-Host "🔧 Setting up Tailscale integration with GCP..." -ForegroundColor Cyan

# Enable required APIs
Write-Host "`n[1/5] Enabling APIs..." -ForegroundColor Yellow
gcloud services enable compute.googleapis.com vpcaccess.googleapis.com

# Create firewall rule
Write-Host "`n[2/5] Creating firewall rules..." -ForegroundColor Yellow
gcloud compute firewall-rules create allow-tailscale-vpc `
  --network=default `
  --allow=tcp,udp,icmp `
  --source-ranges=10.128.0.0/9 `
  --quiet 2>$null

# Create startup script
$startupScript = @"
#!/bin/bash
curl -fsSL https://tailscale.com/install.sh | sh
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p /etc/sysctl.conf
sudo tailscale up --authkey=$TailscaleAuthKey --advertise-routes=10.128.0.0/9 --accept-routes --hostname=gcp-router
sudo apt-get update && sudo apt-get install -y nginx
echo 'healthy' | sudo tee /var/www/html/health
"@

# Create Tailscale router VM
Write-Host "`n[3/5] Creating Tailscale router VM..." -ForegroundColor Yellow
gcloud compute instances create tailscale-router `
  --zone=us-central1-a `
  --machine-type=e2-micro `
  --network-interface=network-tier=PREMIUM,subnet=default `
  --metadata=startup-script=$startupScript `
  --tags=tailscale-router,http-server `
  --create-disk=auto-delete=yes,boot=yes,image=projects/debian-cloud/global/images/debian-12-bookworm-v20241112,size=10 `
  --quiet

# Wait for VM to start
Write-Host "`nWaiting for VM to start and install Tailscale (30 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Create VPC connector
Write-Host "`n[4/5] Creating VPC connector..." -ForegroundColor Yellow
gcloud compute networks vpc-access connectors create tailscale-connector `
  --region=us-central1 `
  --network=default `
  --range=10.8.0.0/28 `
  --min-instances=2 `
  --max-instances=10 `
  --quiet

# Update Cloud Run services
Write-Host "`n[5/5] Updating Cloud Run services..." -ForegroundColor Yellow

gcloud run services update incubator-admin-backend `
  --region=us-central1 `
  --vpc-connector=tailscale-connector `
  --vpc-egress=all-traffic `
  --quiet

gcloud run services update incubator-parent-backend `
  --region=us-central1 `
  --vpc-connector=tailscale-connector `
  --vpc-egress=all-traffic `
  --quiet

gcloud run services update incubator-dashboard `
  --region=us-central1 `
  --vpc-connector=tailscale-connector `
  --vpc-egress=all-traffic `
  --quiet

Write-Host "`n✅ Tailscale setup complete!" -ForegroundColor Green
Write-Host "`n⚠️  IMPORTANT: Go to https://login.tailscale.com/admin/machines" -ForegroundColor Yellow
Write-Host "   Find 'gcp-router' and approve the subnet routes (10.128.0.0/9)`n" -ForegroundColor Yellow
Write-Host "📊 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Approve routes in Tailscale admin" -ForegroundColor White
Write-Host "   2. Test: gcloud compute ssh tailscale-router --zone=us-central1-a" -ForegroundColor White
Write-Host "   3. Then run: ping 100.89.162.22`n" -ForegroundColor White
```

Save this as `tailscale-setup.ps1` and run:

```powershell
.\tailscale-setup.ps1 -TailscaleAuthKey "tskey-auth-YOUR-KEY-HERE"
```

---

## Verification Steps

After setup, verify connectivity:

### 1. Check Tailscale Router Status

```powershell
gcloud compute ssh tailscale-router --zone=us-central1-a --command="sudo tailscale status"
```

### 2. Test Pi Connectivity from Router

```powershell
gcloud compute ssh tailscale-router --zone=us-central1-a --command="ping -c 4 100.89.162.22"
```

### 3. Test from Cloud Run

Check the logs to see if services can reach the Pi:

```powershell
gcloud run services logs read incubator-dashboard --region=us-central1 --limit=50
```

---

## Troubleshooting

### Issue: Can't reach Pi from Cloud Run

**Solution 1:** Check VPC connector is attached

```powershell
gcloud run services describe incubator-dashboard --region=us-central1 --format="get(spec.template.spec.containers[0].vpcAccess)"
```

**Solution 2:** Verify routes are approved in Tailscale admin

**Solution 3:** Check Tailscale router status

```powershell
gcloud compute ssh tailscale-router --zone=us-central1-a --command="sudo tailscale status"
```

### Issue: VPC Connector creation fails

Try a different IP range:

```powershell
gcloud compute networks vpc-access connectors create tailscale-connector \
  --region=us-central1 \
  --network=default \
  --range=10.9.0.0/28
```

### Issue: High costs

Reduce VPC connector instances:

```powershell
gcloud compute networks vpc-access connectors update tailscale-connector \
  --region=us-central1 \
  --min-instances=2 \
  --max-instances=3
```

---

## 🎯 Ready to Set Up?

Run this command with your Tailscale auth key:

```powershell
# Get auth key from: https://login.tailscale.com/admin/settings/keys
# Then run the setup
.\tailscale-setup.ps1 -TailscaleAuthKey "tskey-auth-YOUR-KEY-HERE"
```

This will take about 5-10 minutes to complete.
