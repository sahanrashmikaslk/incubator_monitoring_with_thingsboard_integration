# 🚀 GCP Deployment Guide - NICU Incubator Monitoring System

## Prerequisites Checklist

Before deploying, ensure you have:

- ✅ Google Cloud SDK installed (`gcloud version` works)
- ✅ Docker Desktop running
- ✅ GCP Project created (or ready to create one)
- ✅ GCP Billing enabled on your project
- ✅ `.env` file configured with correct values

---

## Step 1: Verify Your .env Configuration

Make sure your `.env` file has the correct ThingsBoard Cloud settings:

```bash
# ThingsBoard Cloud Configuration
REACT_APP_TB_API_URL=https://thingsboard.cloud/api
REACT_APP_TB_HOST=thingsboard.cloud
REACT_APP_TB_USERNAME=sahanrashmikaslk@gmail.com
REACT_APP_TB_PASSWORD=user1@demo
REACT_APP_DEVICE_ID=INC-001
REACT_APP_DEVICE_TOKEN=2ztut7be6ppooyiueorb

# Pi Device Configuration
REACT_APP_PI_HOST=100.89.162.22
REACT_APP_CAMERA_PORT=8080
REACT_APP_LCD_CAMERA_HOST=100.89.162.22
REACT_APP_LCD_CAMERA_PORT=8081

# Admin Backend
JWT_SECRET=nicu-admin-secret-key-2025-change-me
CORS_ORIGIN=*

# Parent Backend
PARENT_JWT_SECRET=super-secret-jwt-key
PARENT_CLINICIAN_KEY=super-secret-clinician-key
```

⚠️ **IMPORTANT**: Change `JWT_SECRET`, `PARENT_JWT_SECRET`, and `PARENT_CLINICIAN_KEY` to secure random strings before deploying to production!

---

## Step 2: Login to Google Cloud

```powershell
# Login to GCP
gcloud auth login

# List your projects
gcloud projects list

# Create a new project (optional)
gcloud projects create nicu-monitoring-prod --name="NICU Monitoring"

# Set the project
gcloud config set project YOUR-PROJECT-ID
```

---

## Step 3: Enable Billing

1. Go to: https://console.cloud.google.com/billing
2. Link your project to a billing account
3. Verify billing is enabled:

```powershell
gcloud beta billing projects describe YOUR-PROJECT-ID
```

---

## Step 4: Run the Deployment Script

### Option A: Full Deployment (First Time)

This will:

- Enable all required GCP APIs
- Build Docker images
- Push images to Google Container Registry
- Deploy all services to Cloud Run

```powershell
cd C:\Users\sahan\Desktop\MYProjects\PI_webUI_for_test-monitoring\incubator_monitoring_with_thingsboard_integration

# Run full deployment
.\scripts\deploy-gcp-complete.ps1 -ProjectId "YOUR-PROJECT-ID" -SetupInfrastructure
```

### Option B: Quick Re-deployment (Updates)

If you've already deployed once and just want to update:

```powershell
# Just rebuild and redeploy
.\scripts\deploy-gcp-complete.ps1 -ProjectId "YOUR-PROJECT-ID"
```

### Option C: Deploy Only (Skip Build)

If images are already built and pushed:

```powershell
# Just deploy to Cloud Run
.\scripts\deploy-gcp-complete.ps1 -ProjectId "YOUR-PROJECT-ID" -DeployOnly
```

---

## Step 5: Deployment Process

The script will:

1. ✅ Check prerequisites (Docker, gcloud, .env)
2. ✅ Authenticate with GCP
3. ✅ Set project and region
4. ✅ Enable required APIs (if -SetupInfrastructure flag used)
5. ✅ Build Docker images for all 3 services
6. ✅ Push images to Google Container Registry
7. ✅ Deploy services to Cloud Run with optimal settings
8. ✅ Configure environment variables
9. ✅ Generate deployment summary

**Estimated Time**: 10-15 minutes (first deployment)

---

## Step 6: Access Your Deployed Application

After successful deployment, you'll see:

```
🌐 Deployed Services:
   Dashboard:       https://incubator-dashboard-xxxx-uc.a.run.app
   Admin Backend:   https://incubator-admin-backend-xxxx-uc.a.run.app
   Parent Backend:  https://incubator-parent-backend-xxxx-uc.a.run.app

🔐 Default Admin Credentials:
   Email:    admin@demo.com
   Password: admin123
```

**Open the Dashboard URL in your browser!**

---

## Step 7: Verify Deployment

### Check Service Status

```powershell
# List all Cloud Run services
gcloud run services list --region=us-central1

# Get specific service details
gcloud run services describe incubator-dashboard --region=us-central1
```

### View Logs

```powershell
# Real-time logs for dashboard
gcloud run services logs tail incubator-dashboard --region=us-central1

# Recent logs for admin backend
gcloud run services logs read incubator-admin-backend --region=us-central1 --limit=50

# Parent backend logs
gcloud run services logs read incubator-parent-backend --region=us-central1 --limit=50
```

### Test Health Endpoints

```powershell
# Test admin backend
curl https://incubator-admin-backend-xxxx-uc.a.run.app/health

# Test parent backend
curl https://incubator-parent-backend-xxxx-uc.a.run.app/health

# Test dashboard
curl https://incubator-dashboard-xxxx-uc.a.run.app/health
```

---

## Step 8: Configure Pi Connectivity (Optional but Recommended)

Since your Pi devices are on Tailscale (100.89.162.22), you have two options:

### Option A: Use Tailscale Subnet Router

Set up your GCP Cloud Run to connect via Tailscale:

1. Deploy a Tailscale subnet router in GCP
2. Configure Cloud Run to use VPC connector
3. Route traffic through Tailscale network

### Option B: Use Public Endpoints

If your Pi services have public URLs via Tailscale Funnel or port forwarding, update the `.env`:

```bash
REACT_APP_PI_HOST=your-pi-public-url.com
```

**For now, the dashboard will work but Pi camera/LCD features will need Tailscale setup.**

---

## Infrastructure Details

### Resources Allocated per Service

| Service        | CPU    | Memory | Instances | Concurrency |
| -------------- | ------ | ------ | --------- | ----------- |
| Dashboard      | 1 vCPU | 512MB  | 0-10      | 80          |
| Admin Backend  | 1 vCPU | 512MB  | 0-5       | 100         |
| Parent Backend | 1 vCPU | 512MB  | 0-5       | 100         |

### Features Enabled

- ✅ **Auto-scaling**: Scales to zero when idle (saves money!)
- ✅ **HTTPS**: Automatic SSL certificates
- ✅ **Global CDN**: Fast content delivery
- ✅ **Health checks**: Automatic restart on failure
- ✅ **Logging**: Cloud Logging enabled
- ✅ **Monitoring**: Cloud Monitoring enabled

---

## Cost Estimation

### Cloud Run Pricing (us-central1)

**Free Tier (Per Month):**

- First 2 million requests: FREE
- 360,000 vCPU-seconds: FREE
- 180,000 GiB-seconds memory: FREE

**Estimated Monthly Costs:**

| Traffic Level | Requests/Month | Estimated Cost |
| ------------- | -------------- | -------------- |
| Low           | < 100k         | $0-5           |
| Medium        | 100k-500k      | $5-15          |
| High          | 500k-2M        | $15-30         |
| Very High     | 2M+            | $30-100+       |

**Your typical usage**: Likely **$5-10/month** or less!

### Container Registry Storage

- First 0.5 GB: FREE
- Additional: $0.026 per GB-month

**Total estimate**: Images ~2GB = **$0.04/month**

---

## Troubleshooting

### Deployment Fails

```powershell
# Check if APIs are enabled
gcloud services list --enabled

# Enable missing APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Service Not Starting

```powershell
# Check service logs
gcloud run services logs read SERVICE-NAME --region=us-central1 --limit=100

# Check service status
gcloud run services describe SERVICE-NAME --region=us-central1
```

### Image Push Fails

```powershell
# Re-configure Docker auth
gcloud auth configure-docker

# List images in registry
gcloud container images list --repository=gcr.io/YOUR-PROJECT-ID
```

### Out of Memory

If services crash due to memory:

```powershell
# Increase memory to 1GB
gcloud run services update SERVICE-NAME \
  --memory=1Gi \
  --region=us-central1
```

---

## Post-Deployment Tasks

### 1. Change Default Passwords

```powershell
# Login to dashboard with admin@demo.com / admin123
# Go to Settings > Change Password
```

### 2. Update Environment Variables

To update env vars after deployment:

```powershell
gcloud run services update incubator-dashboard \
  --update-env-vars="KEY=VALUE" \
  --region=us-central1
```

### 3. Set Up Custom Domain (Optional)

```powershell
# Map custom domain
gcloud run domain-mappings create \
  --service=incubator-dashboard \
  --domain=monitor.yourdomain.com \
  --region=us-central1
```

### 4. Configure Monitoring Alerts

1. Go to: https://console.cloud.google.com/monitoring
2. Create alert policies for:
   - High error rate (>5%)
   - High latency (P99 >1s)
   - Service down

### 5. Set Up Backups

For SQLite data persistence:

```powershell
# Enable Cloud Run revisions
gcloud run services update incubator-admin-backend \
  --revision-suffix=backup-$(date +%Y%m%d) \
  --region=us-central1
```

---

## Updating Your Deployment

### Quick Update (Code Changes)

```powershell
# Rebuild and redeploy specific service
cd react_dashboard
docker build -t gcr.io/YOUR-PROJECT-ID/incubator-dashboard:latest .
docker push gcr.io/YOUR-PROJECT-ID/incubator-dashboard:latest
gcloud run deploy incubator-dashboard \
  --image=gcr.io/YOUR-PROJECT-ID/incubator-dashboard:latest \
  --region=us-central1
```

### Full Redeployment

```powershell
.\scripts\deploy-gcp-complete.ps1 -ProjectId "YOUR-PROJECT-ID"
```

---

## Rollback Strategy

### Rollback to Previous Version

```powershell
# List revisions
gcloud run revisions list --service=incubator-dashboard --region=us-central1

# Rollback to specific revision
gcloud run services update-traffic incubator-dashboard \
  --to-revisions=incubator-dashboard-00005-abc=100 \
  --region=us-central1
```

---

## Monitoring & Maintenance

### View Metrics

```powershell
# Open Cloud Console Monitoring
start https://console.cloud.google.com/run?project=YOUR-PROJECT-ID
```

### Check Costs

```powershell
# View billing
start https://console.cloud.google.com/billing
```

### Performance Optimization

If services are slow:

1. Increase CPU: `--cpu=2`
2. Increase memory: `--memory=1Gi`
3. Adjust concurrency: `--concurrency=50`
4. Set min instances: `--min-instances=1` (keeps service warm)

---

## Security Best Practices

1. ✅ Change all default passwords immediately
2. ✅ Generate secure JWT secrets (32+ characters)
3. ✅ Enable Cloud Armor (DDoS protection)
4. ✅ Set up IAM roles properly
5. ✅ Enable Cloud Audit Logs
6. ✅ Use Secret Manager for sensitive data
7. ✅ Configure CORS properly (not `*` in production)

---

## Support & Resources

- **GCP Cloud Run Docs**: https://cloud.google.com/run/docs
- **GCP Console**: https://console.cloud.google.com
- **Cost Calculator**: https://cloud.google.com/products/calculator
- **GCP Support**: https://cloud.google.com/support

---

## Quick Commands Reference

```powershell
# Deploy everything
.\scripts\deploy-gcp-complete.ps1 -ProjectId "YOUR-PROJECT-ID" -SetupInfrastructure

# View services
gcloud run services list --region=us-central1

# View logs
gcloud run services logs tail incubator-dashboard --region=us-central1

# Update service
gcloud run deploy SERVICE-NAME --image=gcr.io/PROJECT/IMAGE --region=us-central1

# Delete service
gcloud run services delete SERVICE-NAME --region=us-central1

# View costs
gcloud beta billing accounts list
```

---

## 🎉 You're Ready to Deploy!

Run this command to start:

```powershell
.\scripts\deploy-gcp-complete.ps1 -ProjectId "YOUR-PROJECT-ID" -SetupInfrastructure
```

**Questions? Check the troubleshooting section or GCP documentation!**
