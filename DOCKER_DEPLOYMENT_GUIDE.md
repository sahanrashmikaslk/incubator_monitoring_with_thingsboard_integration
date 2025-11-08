# 🚀 Incubator Monitoring System - Docker Deployment Guide

Complete guide for dockerizing and deploying the Incubator Monitoring System to Google Cloud Platform.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [GCP Deployment](#gcp-deployment)
4. [Tailscale Setup](#tailscale-setup)
5. [Monitoring & Logs](#monitoring--logs)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Software

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose
- Google Cloud SDK (`gcloud` CLI)
- Git
- Node.js 18+ (for local development)

### Required Accounts

- Google Cloud Platform account with billing enabled
- Tailscale account (for secure Pi connectivity)
- ThingsBoard Cloud account (or self-hosted)

### Installation

**Windows (PowerShell as Administrator):**

```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Docker Desktop
choco install docker-desktop -y

# Install Google Cloud SDK
choco install gcloudsdk -y

# Restart your terminal and verify
docker --version
gcloud --version
```

**Linux:**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin -y

# Install gcloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

---

## 💻 Local Development

### Step 1: Clone & Configure

```bash
cd incubator_monitoring_with_thingsboard_integration

# Copy environment template
cp .env.example .env

# Edit .env with your values
notepad .env  # Windows
nano .env     # Linux
```

**Important Environment Variables:**

```bash
# ThingsBoard Connection
THINGSBOARD_HOST=100.89.162.23
THINGSBOARD_PORT=9090

# Pi Device (Tailscale IPs)
PI_HOST=100.89.162.22
PI_LCD_PORT=9001

# Admin Backend
JWT_SECRET=change-this-to-a-secure-random-string

# Tailscale (if using)
TAILSCALE_AUTH_KEY=tskey-auth-xxxxx
```

### Step 2: Build Docker Images

**Windows:**

```powershell
.\scripts\build.ps1
```

**Linux/Mac:**

```bash
chmod +x scripts/*.sh
./scripts/build.sh
```

### Step 3: Start Services Locally

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### Step 4: Access Services

- **Dashboard:** http://localhost:3001
- **Admin Backend:** http://localhost:5056
- **Parent Backend:** http://localhost:5000

### Step 5: Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (data will be lost)
docker-compose down -v
```

---

## ☁️ GCP Deployment

### Step 1: GCP Project Setup

```powershell
# Login to Google Cloud
gcloud auth login

# Create new project (or use existing)
gcloud projects create incubator-monitoring-prod
gcloud config set project incubator-monitoring-prod

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Set default region
gcloud config set run/region us-central1
```

### Step 2: Update Environment Variables

Edit `.env` file:

```bash
GCP_PROJECT_ID=incubator-monitoring-prod
GCP_REGION=us-central1
JWT_SECRET=your-production-secret-here
```

### Step 3: Build & Push Images

**Windows:**

```powershell
# Build images with GCR tags
.\scripts\build.ps1

# Push to Google Container Registry
.\scripts\push-to-gcr.ps1
```

**Linux/Mac:**

```bash
./scripts/build.sh
./scripts/push-to-gcr.sh
```

### Step 4: Deploy to Cloud Run

**Windows:**

```powershell
.\scripts\deploy-gcp.ps1
```

**Linux/Mac:**

```bash
./scripts/deploy-gcp.sh
```

The script will output the URLs for each service:

```
✅ All services deployed successfully!

🌐 Service URLs:
  Dashboard:      https://incubator-dashboard-xxxxx.run.app
  Admin Backend:  https://incubator-admin-backend-xxxxx.run.app
  Parent Backend: https://incubator-parent-backend-xxxxx.run.app
```

### Step 5: Update React App URLs

After deployment, update the React app to use the deployed backend URLs:

1. Create `react_dashboard/.env.production`:

```bash
REACT_APP_ADMIN_API_URL=https://incubator-admin-backend-xxxxx.run.app
REACT_APP_PARENT_API_URL=https://incubator-parent-backend-xxxxx.run.app
```

2. Rebuild and redeploy the dashboard:

```powershell
docker build -t gcr.io/$env:GCP_PROJECT_ID/incubator-dashboard:latest .\react_dashboard
docker push gcr.io/$env:GCP_PROJECT_ID/incubator-dashboard:latest
gcloud run deploy incubator-dashboard --image gcr.io/$env:GCP_PROJECT_ID/incubator-dashboard:latest
```

---

## 🔐 Tailscale Setup

Tailscale provides secure connectivity between your GCP services and the Raspberry Pi without exposing ports.

### On Raspberry Pi (Already Done)

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Connect to your network
sudo tailscale up

# Verify connection
tailscale status
# Should show: 100.89.162.22
```

### On GCP Compute Engine (Optional)

If you need direct Pi access from GCP:

```bash
# Create a VM instance
gcloud compute instances create tailscale-gateway \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud

# SSH into the instance
gcloud compute ssh tailscale-gateway

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --advertise-routes=100.89.162.0/24
```

### Verify Connectivity

```bash
# From GCP VM
ping 100.89.162.22  # Pi device
curl http://100.89.162.22:9001/status  # LCD reader
curl http://100.89.162.23:9090  # ThingsBoard
```

---

## 📊 Monitoring & Logs

### View Cloud Run Logs

```powershell
# Dashboard logs
gcloud run services logs read incubator-dashboard --limit=50

# Admin backend logs
gcloud run services logs read incubator-admin-backend --limit=50

# Parent backend logs
gcloud run services logs read incubator-parent-backend --limit=50

# Follow logs in real-time
gcloud run services logs tail incubator-dashboard
```

### Check Service Health

```powershell
# Get service details
gcloud run services describe incubator-dashboard

# Get service URL
gcloud run services describe incubator-dashboard --format="value(status.url)"

# Test health endpoints
curl https://incubator-dashboard-xxxxx.run.app/health
curl https://incubator-admin-backend-xxxxx.run.app/api/auth/health
```

### Docker Compose Logs (Local)

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f react-dashboard
docker-compose logs -f admin-backend

# Last 100 lines
docker-compose logs --tail=100
```

---

## 🐛 Troubleshooting

### Issue: Docker build fails

**Solution:**

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Issue: Can't connect to Pi from GCP

**Solution:**

```bash
# Verify Tailscale connection
tailscale status

# Check Pi is online
ping 100.89.162.22

# Test Pi services
curl http://100.89.162.22:9001/status
```

### Issue: Admin Backend 500 error

**Solution:**

```bash
# Check logs
docker-compose logs admin-backend

# Verify JWT_SECRET is set
docker-compose exec admin-backend env | grep JWT_SECRET

# Restart service
docker-compose restart admin-backend
```

### Issue: React Dashboard can't reach backend

**Solution:**

1. Check nginx proxy configuration
2. Verify backend URLs in environment variables
3. Check CORS settings in backend services

```bash
# Test backend directly
curl http://localhost:5056/api/auth/health
curl http://localhost:5000/api/health

# Check nginx logs
docker-compose logs react-dashboard
```

### Issue: GCP deployment fails

**Solution:**

```bash
# Verify authentication
gcloud auth list
gcloud auth login

# Check project settings
gcloud config list

# Verify APIs are enabled
gcloud services list --enabled
```

### Issue: Out of memory errors

**Solution:**
Update `docker-compose.yml` or Cloud Run configuration:

```yaml
# For Cloud Run
gcloud run services update incubator-admin-backend \
--memory 1Gi \
--region us-central1
```

---

## 🔒 Security Best Practices

1. **Change default secrets:**

   ```bash
   # Generate secure JWT secret
   openssl rand -base64 32
   ```

2. **Use environment-specific configs:**

   - `.env.development` - for local dev
   - `.env.production` - for GCP deployment

3. **Restrict CORS origins:**

   ```bash
   CORS_ORIGIN=https://your-domain.com
   ```

4. **Enable HTTPS:**

   - Cloud Run provides automatic HTTPS
   - Configure custom domain with SSL

5. **Use Secret Manager (GCP):**

   ```bash
   # Store secrets securely
   echo -n "my-secret" | gcloud secrets create jwt-secret --data-file=-

   # Reference in Cloud Run
   gcloud run services update incubator-admin-backend \
     --update-secrets=JWT_SECRET=jwt-secret:latest
   ```

---

## 📱 Accessing the System

### Production URLs

- **Dashboard:** https://incubator-dashboard-xxxxx.run.app
- **Admin Login:** https://incubator-dashboard-xxxxx.run.app/admin-login

### Default Credentials

- **Admin Email:** admin@demo.com
- **Admin Password:** (set during first setup)

---

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml` for automatic deployments:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Build and Deploy
        run: |
          ./scripts/build.sh
          ./scripts/push-to-gcr.sh
          ./scripts/deploy-gcp.sh
```

---

## 📞 Support

For issues or questions:

1. Check this README
2. Review logs: `docker-compose logs` or `gcloud run services logs`
3. Check GitHub issues
4. Contact system administrator

---

## 📝 License

MIT License - See LICENSE file for details
