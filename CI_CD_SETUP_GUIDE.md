# CI/CD Setup Guide for GCP Cloud Run

This guide will help you set up automated deployment from GitHub to Google Cloud Platform (GCP).

## 🎯 What This Does

Every time you push code to the `production` branch, GitHub Actions will automatically:

1. Build your React Dashboard
2. Build your Unified Backend
3. Deploy both to GCP Cloud Run
4. Display the live URLs

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ GCP Project: `neonatal-incubator-monitoring`
- ✅ GitHub Repository: `sahanrashmikaslk/incubator_monitoring_with_thingsboard_integration`
- ✅ GCP APIs enabled:
  - Cloud Run API
  - Cloud Build API
  - Secret Manager API
  - VPC Access API

## 🔧 One-Time Setup

### Step 1: Add GCP_SA_KEY to GitHub Secrets

1. **Copy the service account JSON** (already created - it's in `gcp-sa-key.json` at the root)
2. Go to: https://github.com/sahanrashmikaslk/incubator_monitoring_with_thingsboard_integration/settings/secrets/actions
3. Click **"New repository secret"**
4. Name: `GCP_SA_KEY`
5. Value: Paste the entire JSON content
6. Click **"Add secret"**

### Step 2: Verify GCP Secrets Exist

The following secrets should already be created in GCP Secret Manager:

- ✅ `jwt-secret`
- ✅ `parent-jwt-secret`
- ✅ `parent-clinician-key`
- ✅ `db-password`

**Update them with real values:**

```bash
echo "your-actual-jwt-secret" | gcloud secrets versions add jwt-secret --data-file=-
echo "your-actual-parent-jwt-secret" | gcloud secrets versions add parent-jwt-secret --data-file=-
echo "your-actual-clinician-key" | gcloud secrets versions add parent-clinician-key --data-file=-
echo "your-actual-db-password" | gcloud secrets versions add db-password --data-file=-
```

### Step 3: Create Production Branch

```bash
cd C:\Users\sahan\Desktop\MYProjects\PI_webUI_for_test-monitoring\incubator_monitoring_with_thingsboard_integration
git checkout -b production
git push -u origin production
```

## 🚀 Daily Workflow

### Deploying to Production

1. **Make your changes** on any branch
2. **Commit and push** to GitHub
3. **Merge to production branch:**
   ```bash
   git checkout production
   git merge master  # or your feature branch
   git push origin production
   ```
4. **Watch the deployment** at:
   - https://github.com/sahanrashmikaslk/incubator_monitoring_with_thingsboard_integration/actions

That's it! GitHub Actions will automatically deploy to GCP.

## 📊 Monitoring

### Check Deployment Status

- GitHub Actions: https://github.com/sahanrashmikaslk/incubator_monitoring_with_thingsboard_integration/actions
- GCP Cloud Run Console: https://console.cloud.google.com/run?project=neonatal-incubator-monitoring

### View Live Services

- **React Dashboard**: https://react-dashboard-nwvggkb2qa-uc.a.run.app
- **Unified Backend**: https://incubator-monitoring-backend-571778410429.us-central1.run.app

### Check Logs

```bash
# React Dashboard logs
gcloud run services logs read react-dashboard --region=us-central1

# Backend logs
gcloud run services logs read incubator-monitoring-backend --region=us-central1
```

## 🔍 Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs**:

   - Go to: https://github.com/sahanrashmikaslk/incubator_monitoring_with_thingsboard_integration/actions
   - Click on the failed workflow
   - Review the error messages

2. **Common Issues**:

   **Missing GCP_SA_KEY secret**:

   - Error: "google-github-actions/auth failed"
   - Fix: Add `GCP_SA_KEY` to GitHub secrets (see Step 1)

   **Missing GCP secrets**:

   - Error: "Secret not found: jwt-secret"
   - Fix: Create the secret (see Step 2)

   **Build errors**:

   - Error: "npm install failed" or "docker build failed"
   - Fix: Test build locally first

   ```bash
   cd react_dashboard
   npm install
   npm run build
   ```

   **VPC Connector not found**:

   - Error: "VPC connector 'tailscale-connector' not found"
   - Fix: Verify VPC connector exists:

   ```bash
   gcloud compute networks vpc-access connectors describe tailscale-connector --region=us-central1
   ```

### Rollback to Previous Version

If a deployment breaks production:

```bash
# List recent revisions
gcloud run revisions list --service=react-dashboard --region=us-central1

# Route traffic to a previous revision
gcloud run services update-traffic react-dashboard \
  --to-revisions=react-dashboard-00042-abc=100 \
  --region=us-central1
```

## 🔒 Security Notes

- ✅ Service account key (`gcp-sa-key.json`) is in `.gitignore` - never commit it!
- ✅ All secrets are stored in GCP Secret Manager
- ✅ Service account has minimal required permissions
- ✅ Cloud Run services use VPC connector for secure Pi communication

## 💰 Cost Estimates

With current configuration:

- **Cloud Run**: ~$5-10/month (with low traffic)
- **VPC Connector**: ~$7/month
- **Secret Manager**: Free tier (< 10k accesses/month)
- **Cloud Build**: Free tier (120 build-minutes/day)

**Total: ~$12-17/month**

## 📞 Support

If you encounter issues:

1. Check GitHub Actions logs
2. Check GCP Cloud Run logs
3. Verify all secrets are configured
4. Ensure VPC connector is running

---

**Created**: November 13, 2025
**Last Updated**: November 13, 2025
