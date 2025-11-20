# Quick Admin Backend Deployment Script
# Deploys the fixed admin backend to Cloud Run

Write-Host "`n🔧 ADMIN BACKEND AUTHENTICATION FIX DEPLOYMENT`n" -ForegroundColor Cyan

# Check if in correct directory
$currentPath = Get-Location
if (-not (Test-Path "admin_backend")) {
    Write-Host "❌ Error: Must run from incubator_monitoring_with_thingsboard_integration directory" -ForegroundColor Red
    exit 1
}

# Get Cloud SQL connection name
Write-Host "📋 Getting Cloud SQL connection details..." -ForegroundColor Yellow
$connectionName = gcloud sql instances describe incubator-db --format="value(connectionName)" 2>$null

if (-not $connectionName) {
    Write-Host "   ⚠️  Cloud SQL instance 'incubator-db' not found" -ForegroundColor Yellow
    Write-Host "   Deploying without Cloud SQL..." -ForegroundColor Gray
}
else {
    Write-Host "   ✅ Connection: $connectionName" -ForegroundColor Green
}

# Deploy Admin Backend
Write-Host "`n🚀 Deploying Admin Backend with fixes..." -ForegroundColor Cyan
Write-Host "   - Fixed async/await in authentication middleware" -ForegroundColor Gray
Write-Host "   - Fixed route ordering for /me endpoint" -ForegroundColor Gray
Write-Host "   - Fixed database calls in auth routes" -ForegroundColor Gray

Set-Location admin_backend

if ($connectionName) {
    # Deploy with Cloud SQL
    gcloud run deploy incubator-admin-backend `
        --source . `
        --platform managed `
        --region us-central1 `
        --allow-unauthenticated `
        --port 8891 `
        --add-cloudsql-instances=$connectionName `
        --update-env-vars="NODE_ENV=production,DB_NAME=admin_db,DB_USER=postgres,CLOUD_SQL_CONNECTION_NAME=$connectionName"
}
else {
    # Deploy without Cloud SQL (will use in-memory storage)
    gcloud run deploy incubator-admin-backend `
        --source . `
        --platform managed `
        --region us-central1 `
        --allow-unauthenticated `
        --port 8891 `
        --update-env-vars="NODE_ENV=production"
}

Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ DEPLOYMENT SUCCESSFUL!`n" -ForegroundColor Green
    Write-Host "🔗 Admin Backend URL: https://incubator-admin-backend-571778410429.us-central1.run.app" -ForegroundColor Cyan
    Write-Host "`n📝 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Clear your browser cache and local storage" -ForegroundColor Gray
    Write-Host "   2. Try logging in with: admin@demo.com / admin123" -ForegroundColor Gray
    Write-Host "   3. Create a new admin user to test the fix" -ForegroundColor Gray
    Write-Host "   4. Test notification creation" -ForegroundColor Gray
}
else {
    Write-Host "`n❌ DEPLOYMENT FAILED!" -ForegroundColor Red
    Write-Host "   Check the error messages above" -ForegroundColor Gray
}
