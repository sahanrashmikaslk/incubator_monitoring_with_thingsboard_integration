# Deploy to GCP Cloud Run
# PowerShell script for Windows

Write-Host "🚀 Deploying to GCP Cloud Run..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Load environment variables
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

$GCP_PROJECT_ID = $env:GCP_PROJECT_ID
$GCP_REGION = $env:GCP_REGION
$JWT_SECRET = $env:JWT_SECRET

if (-not $GCP_PROJECT_ID) {
    Write-Host "❌ Error: GCP_PROJECT_ID not set" -ForegroundColor Red
    exit 1
}

if (-not $GCP_REGION) {
    $GCP_REGION = "us-central1"
    Write-Host "⚠️ GCP_REGION not set, using default: $GCP_REGION" -ForegroundColor Yellow
}

# Deploy Admin Backend
Write-Host ""
Write-Host "📦 Deploying Admin Backend..." -ForegroundColor Yellow
gcloud run deploy incubator-admin-backend `
    --image gcr.io/$GCP_PROJECT_ID/incubator-admin-backend:latest `
    --platform managed `
    --region $GCP_REGION `
    --allow-unauthenticated `
    --port 5056 `
    --memory 512Mi `
    --cpu 1 `
    --set-env-vars "NODE_ENV=production,JWT_SECRET=$JWT_SECRET,PORT=5056" `
    --max-instances 10 `
    --min-instances 0 `
    --timeout 300

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Admin Backend" -ForegroundColor Red
    exit 1
}

$ADMIN_BACKEND_URL = gcloud run services describe incubator-admin-backend --region $GCP_REGION --format "value(status.url)"

# Deploy Parent Backend
Write-Host ""
Write-Host "📦 Deploying Parent Backend..." -ForegroundColor Yellow
gcloud run deploy incubator-parent-backend `
    --image gcr.io/$GCP_PROJECT_ID/incubator-parent-backend:latest `
    --platform managed `
    --region $GCP_REGION `
    --allow-unauthenticated `
    --port 5000 `
    --memory 512Mi `
    --cpu 1 `
    --set-env-vars "NODE_ENV=production,PORT=5000,THINGSBOARD_HOST=$env:THINGSBOARD_HOST,PI_HOST=$env:PI_HOST" `
    --max-instances 10 `
    --min-instances 0 `
    --timeout 300

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Parent Backend" -ForegroundColor Red
    exit 1
}

$PARENT_BACKEND_URL = gcloud run services describe incubator-parent-backend --region $GCP_REGION --format "value(status.url)"

# Deploy React Dashboard
Write-Host ""
Write-Host "📦 Deploying React Dashboard..." -ForegroundColor Yellow
gcloud run deploy incubator-dashboard `
    --image gcr.io/$GCP_PROJECT_ID/incubator-dashboard:latest `
    --platform managed `
    --region $GCP_REGION `
    --allow-unauthenticated `
    --port 80 `
    --memory 512Mi `
    --cpu 1 `
    --max-instances 10 `
    --min-instances 0 `
    --timeout 300

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy React Dashboard" -ForegroundColor Red
    exit 1
}

$DASHBOARD_URL = gcloud run services describe incubator-dashboard --region $GCP_REGION --format "value(status.url)"

Write-Host ""
Write-Host "✅ All services deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Service URLs:" -ForegroundColor Cyan
Write-Host "  Dashboard:      $DASHBOARD_URL" -ForegroundColor White
Write-Host "  Admin Backend:  $ADMIN_BACKEND_URL" -ForegroundColor White
Write-Host "  Parent Backend: $PARENT_BACKEND_URL" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update React app environment variables with these URLs"
Write-Host "  2. Rebuild and redeploy React Dashboard if needed"
Write-Host "  3. Configure custom domain (optional)"
Write-Host "  4. Setup Tailscale for Pi connectivity"
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  gcloud run services logs read incubator-dashboard --region $GCP_REGION"
Write-Host "  gcloud run services logs read incubator-admin-backend --region $GCP_REGION"
Write-Host "  gcloud run services logs read incubator-parent-backend --region $GCP_REGION"
