# Push Docker images to Google Container Registry
# PowerShell script for Windows

Write-Host "📤 Pushing images to Google Container Registry..." -ForegroundColor Cyan
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

if (-not $GCP_PROJECT_ID) {
    Write-Host "❌ Error: GCP_PROJECT_ID not set in .env file" -ForegroundColor Red
    exit 1
}

# Configure Docker to use gcloud as credential helper
Write-Host ""
Write-Host "🔐 Configuring Docker authentication..." -ForegroundColor Yellow
gcloud auth configure-docker

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to configure Docker authentication" -ForegroundColor Red
    exit 1
}

# Push React Dashboard
Write-Host ""
Write-Host "📤 Pushing React Dashboard..." -ForegroundColor Yellow
docker push gcr.io/$GCP_PROJECT_ID/incubator-dashboard:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push React Dashboard" -ForegroundColor Red
    exit 1
}

# Push Admin Backend
Write-Host ""
Write-Host "📤 Pushing Admin Backend..." -ForegroundColor Yellow
docker push gcr.io/$GCP_PROJECT_ID/incubator-admin-backend:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push Admin Backend" -ForegroundColor Red
    exit 1
}

# Push Parent Backend
Write-Host ""
Write-Host "📤 Pushing Parent Backend..." -ForegroundColor Yellow
docker push gcr.io/$GCP_PROJECT_ID/incubator-parent-backend:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push Parent Backend" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All images pushed to GCR successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Images in GCR:" -ForegroundColor Cyan
Write-Host "  - gcr.io/$GCP_PROJECT_ID/incubator-dashboard:latest"
Write-Host "  - gcr.io/$GCP_PROJECT_ID/incubator-admin-backend:latest"
Write-Host "  - gcr.io/$GCP_PROJECT_ID/incubator-parent-backend:latest"
Write-Host ""
Write-Host "Next step: Deploy to GCP with .\scripts\deploy-gcp.ps1" -ForegroundColor Yellow
