# Cloud SQL Migration - Quick Deployment Script
# Run this after updating code files

Write-Host "`n🗄️ CLOUD SQL POSTGRESQL MIGRATION`n" -ForegroundColor Cyan

# Step 1: Get connection details
Write-Host "📋 Cloud SQL Connection Details:" -ForegroundColor Yellow
$connectionName = gcloud sql instances describe incubator-db --format="value(connectionName)"
Write-Host "   Connection: $connectionName" -ForegroundColor Green

# Step 2: Create JWT secret if not exists
Write-Host "`n🔐 Creating JWT Secret..." -ForegroundColor Yellow
try {
    $randomJWT = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    $randomJWT | gcloud secrets create jwt-secret --data-file=- 2>&1 | Out-Null
    Write-Host "   ✅ JWT secret created" -ForegroundColor Green
}
catch {
    Write-Host "   ℹ️  JWT secret already exists" -ForegroundColor Gray
}

# Step 3: Configure Admin Backend Cloud Run
Write-Host "`n⚙️  Configuring Admin Backend..." -ForegroundColor Yellow
gcloud run services update incubator-admin-backend `
    --region=us-central1 `
    --add-cloudsql-instances=$connectionName `
    --update-env-vars="NODE_ENV=production,DB_NAME=admin_db,DB_USER=postgres,CLOUD_SQL_CONNECTION_NAME=$connectionName,PORT=8891" `
    --update-secrets="DB_PASSWORD=incubator-db-password:latest,JWT_SECRET=jwt-secret:latest,CORS_ORIGIN=admin-cors-origin:latest"

Write-Host "   ✅ Admin backend configured" -ForegroundColor Green

# Step 4: Configure Parent Backend Cloud Run  
Write-Host "`n⚙️  Configuring Parent Backend..." -ForegroundColor Yellow
gcloud run services update incubator-parent-backend `
    --region=us-central1 `
    --add-cloudsql-instances=$connectionName `
    --update-env-vars="NODE_ENV=production,DB_NAME=parent_db,DB_USER=postgres,CLOUD_SQL_CONNECTION_NAME=$connectionName,PORT=8890" `
    --update-secrets="DB_PASSWORD=incubator-db-password:latest,JWT_SECRET=jwt-secret:latest,CLINICIAN_API_KEY=parent-clinician-key:latest"

Write-Host "   ✅ Parent backend configured" -ForegroundColor Green

# Step 5: Deploy Admin Backend
Write-Host "`n🚀 Deploying Admin Backend..." -ForegroundColor Cyan
cd incubator_monitoring_with_thingsboard_integration/admin_backend
gcloud run deploy incubator-admin-backend `
    --source . `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --port 8891

# Step 6: Deploy Parent Backend
Write-Host "`n🚀 Deploying Parent Backend..." -ForegroundColor Cyan
cd ../parent_backend
gcloud run deploy incubator-parent-backend `
    --source . `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --port 8890

Write-Host "`n✅ MIGRATION COMPLETE!`n" -ForegroundColor Green
Write-Host "📊 Test data persistence:" -ForegroundColor Yellow
Write-Host "   1. Create a test admin user in the dashboard" -ForegroundColor Gray
Write-Host "   2. Restart the service: gcloud run services update incubator-admin-backend --region=us-central1" -ForegroundColor Gray
Write-Host "   3. Verify the admin user still exists" -ForegroundColor Gray
Write-Host "`n🔗 Cloud SQL Console: https://console.cloud.google.com/sql/instances/incubator-db`n" -ForegroundColor Cyan
