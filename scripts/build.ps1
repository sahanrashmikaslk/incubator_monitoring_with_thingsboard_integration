# Build all Docker images for Incubator Monitoring System
# PowerShell script for Windows

Write-Host "🔨 Building Docker images for Incubator Monitoring System..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Load environment variables from .env file
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

# Build React Dashboard
Write-Host ""
Write-Host "📦 Building React Dashboard..." -ForegroundColor Yellow
docker build -t incubator-dashboard:latest `
$(if ($GCP_PROJECT_ID) { "-t gcr.io/$GCP_PROJECT_ID/incubator-dashboard:latest" }) `
    .\react_dashboard

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build React Dashboard" -ForegroundColor Red
    exit 1
}

# Build Admin Backend
Write-Host ""
Write-Host "📦 Building Admin Backend..." -ForegroundColor Yellow
docker build -t incubator-admin-backend:latest `
$(if ($GCP_PROJECT_ID) { "-t gcr.io/$GCP_PROJECT_ID/incubator-admin-backend:latest" }) `
    .\admin_backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build Admin Backend" -ForegroundColor Red
    exit 1
}

# Build Parent Backend
Write-Host ""
Write-Host "📦 Building Parent Backend..." -ForegroundColor Yellow
docker build -t incubator-parent-backend:latest `
$(if ($GCP_PROJECT_ID) { "-t gcr.io/$GCP_PROJECT_ID/incubator-parent-backend:latest" }) `
    .\parent_backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build Parent Backend" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All images built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Local images:" -ForegroundColor Cyan
Write-Host "  - incubator-dashboard:latest"
Write-Host "  - incubator-admin-backend:latest"
Write-Host "  - incubator-parent-backend:latest"

if ($GCP_PROJECT_ID) {
    Write-Host ""
    Write-Host "GCR images:" -ForegroundColor Cyan
    Write-Host "  - gcr.io/$GCP_PROJECT_ID/incubator-dashboard:latest"
    Write-Host "  - gcr.io/$GCP_PROJECT_ID/incubator-admin-backend:latest"
    Write-Host "  - gcr.io/$GCP_PROJECT_ID/incubator-parent-backend:latest"
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test locally: docker-compose up -d"
Write-Host "  2. Push to GCR: .\scripts\push-to-gcr.ps1"
Write-Host "  3. Deploy to GCP: .\scripts\deploy-gcp.ps1"
