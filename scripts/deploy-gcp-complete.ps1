# ============================================================
# COMPREHENSIVE GCP DEPLOYMENT SCRIPT
# Deploy NICU Incubator Monitoring System to Google Cloud Run
# ============================================================

param(
    [string]$ProjectId = "",
    [string]$Region = "us-central1",
    [switch]$SetupInfrastructure = $false,
    [switch]$DeployOnly = $false,
    [switch]$SkipBuild = $false
)

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $InfoColor
Write-Host "║   NICU INCUBATOR MONITORING - GCP DEPLOYMENT             ║" -ForegroundColor $InfoColor
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor $InfoColor

# Step 1: Check Prerequisites
Write-Host "[1/8] Checking prerequisites..." -ForegroundColor $InfoColor

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud version 2>&1 | Select-String "Google Cloud SDK"
    Write-Host "✓ Google Cloud SDK installed: $gcloudVersion" -ForegroundColor $SuccessColor
}
catch {
    Write-Host "✗ Google Cloud SDK not found. Please install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor $ErrorColor
    exit 1
}

# Check if Docker is running
try {
    docker info > $null 2>&1
    Write-Host "✓ Docker is running" -ForegroundColor $SuccessColor
}
catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor $ErrorColor
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "✗ .env file not found. Please create it from .env.example" -ForegroundColor $ErrorColor
    exit 1
}
Write-Host "✓ .env file found" -ForegroundColor $SuccessColor

# Step 2: GCP Authentication
Write-Host "`n[2/8] Authenticating with Google Cloud..." -ForegroundColor $InfoColor

# Get current account
$currentAccount = gcloud config get-value account 2>$null
if ($currentAccount) {
    Write-Host "✓ Logged in as: $currentAccount" -ForegroundColor $SuccessColor
}
else {
    Write-Host "⚠ Not logged in. Logging in..." -ForegroundColor $WarningColor
    gcloud auth login
}

# Step 3: Set Project
Write-Host "`n[3/8] Setting up GCP project..." -ForegroundColor $InfoColor

if (-not $ProjectId) {
    $ProjectId = Read-Host "Enter your GCP Project ID (or press Enter to use current)"
    if (-not $ProjectId) {
        $ProjectId = gcloud config get-value project 2>$null
    }
}

if (-not $ProjectId) {
    Write-Host "✗ No project ID specified" -ForegroundColor $ErrorColor
    exit 1
}

Write-Host "Setting project to: $ProjectId" -ForegroundColor $InfoColor
gcloud config set project $ProjectId

Write-Host "Setting region to: $Region" -ForegroundColor $InfoColor
gcloud config set run/region $Region

# Step 4: Enable Required APIs
if ($SetupInfrastructure) {
    Write-Host "`n[4/8] Enabling required GCP APIs..." -ForegroundColor $InfoColor
    
    $requiredApis = @(
        "run.googleapis.com",              # Cloud Run
        "containerregistry.googleapis.com", # Container Registry
        "cloudbuild.googleapis.com",       # Cloud Build
        "compute.googleapis.com",          # Compute Engine (for VPC)
        "logging.googleapis.com",          # Cloud Logging
        "monitoring.googleapis.com"        # Cloud Monitoring
    )
    
    foreach ($api in $requiredApis) {
        Write-Host "  Enabling $api..." -ForegroundColor $InfoColor
        gcloud services enable $api --quiet
    }
    
    Write-Host "✓ All APIs enabled" -ForegroundColor $SuccessColor
}
else {
    Write-Host "`n[4/8] Skipping infrastructure setup (use -SetupInfrastructure to enable APIs)" -ForegroundColor $WarningColor
}

# Step 5: Build Docker Images
if (-not $SkipBuild -and -not $DeployOnly) {
    Write-Host "`n[5/8] Building Docker images..." -ForegroundColor $InfoColor
    
    $services = @(
        @{Name = "react-dashboard"; Context = "./react_dashboard"; Tag = "incubator-dashboard" },
        @{Name = "admin-backend"; Context = "./admin_backend"; Tag = "incubator-admin-backend" },
        @{Name = "parent-backend"; Context = "./parent_backend"; Tag = "incubator-parent-backend" }
    )
    
    foreach ($service in $services) {
        Write-Host "  Building $($service.Name)..." -ForegroundColor $InfoColor
        $imageName = "gcr.io/$ProjectId/$($service.Tag):latest"
        
        docker build -t $imageName $service.Context
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Failed to build $($service.Name)" -ForegroundColor $ErrorColor
            exit 1
        }
        
        Write-Host "  ✓ Built $imageName" -ForegroundColor $SuccessColor
    }
}
else {
    Write-Host "`n[5/8] Skipping build (use without -SkipBuild to build images)" -ForegroundColor $WarningColor
}

# Step 6: Push Images to GCR
if (-not $DeployOnly) {
    Write-Host "`n[6/8] Pushing images to Google Container Registry..." -ForegroundColor $InfoColor
    
    # Configure Docker to use gcloud as credential helper
    gcloud auth configure-docker --quiet
    
    $services = @("incubator-dashboard", "incubator-admin-backend", "incubator-parent-backend")
    
    foreach ($service in $services) {
        Write-Host "  Pushing $service..." -ForegroundColor $InfoColor
        $imageName = "gcr.io/$ProjectId/$($service):latest"
        
        docker push $imageName
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Failed to push $service" -ForegroundColor $ErrorColor
            exit 1
        }
        
        Write-Host "  ✓ Pushed $imageName" -ForegroundColor $SuccessColor
    }
}
else {
    Write-Host "`n[6/8] Skipping image push (use without -DeployOnly to push)" -ForegroundColor $WarningColor
}

# Step 7: Load Environment Variables
Write-Host "`n[7/8] Loading environment variables..." -ForegroundColor $InfoColor

$envVars = @{}
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($key -and $value -and -not $key.StartsWith('#')) {
            $envVars[$key] = $value
        }
    }
}

Write-Host "✓ Loaded $($envVars.Count) environment variables" -ForegroundColor $SuccessColor

# Step 8: Deploy Services to Cloud Run
Write-Host "`n[8/8] Deploying services to Cloud Run..." -ForegroundColor $InfoColor

$deployedServices = @{}

# Deploy Admin Backend
Write-Host "`n  Deploying Admin Backend..." -ForegroundColor $InfoColor
$adminBackendUrl = gcloud run deploy incubator-admin-backend `
    --image="gcr.io/$ProjectId/incubator-admin-backend:latest" `
    --platform=managed `
    --region=$Region `
    --allow-unauthenticated `
    --port=5056 `
    --memory=512Mi `
    --cpu=1 `
    --min-instances=0 `
    --max-instances=5 `
    --timeout=300 `
    --set-env-vars="NODE_ENV=production,PORT=5056,JWT_SECRET=$($envVars['JWT_SECRET']),JWT_EXPIRES_IN=7d,CORS_ORIGIN=*" `
    --format="value(status.url)" 2>&1 | Select-Object -Last 1

if ($LASTEXITCODE -eq 0) {
    $deployedServices["admin-backend"] = $adminBackendUrl
    Write-Host "  ✓ Admin Backend deployed: $adminBackendUrl" -ForegroundColor $SuccessColor
}
else {
    Write-Host "  ✗ Failed to deploy Admin Backend" -ForegroundColor $ErrorColor
}

# Deploy Parent Backend
Write-Host "`n  Deploying Parent Backend..." -ForegroundColor $InfoColor
$parentBackendUrl = gcloud run deploy incubator-parent-backend `
    --image="gcr.io/$ProjectId/incubator-parent-backend:latest" `
    --platform=managed `
    --region=$Region `
    --allow-unauthenticated `
    --port=5055 `
    --memory=512Mi `
    --cpu=1 `
    --min-instances=0 `
    --max-instances=5 `
    --timeout=300 `
    --set-env-vars="NODE_ENV=production,PARENT_BACKEND_PORT=5055,PARENT_JWT_SECRET=$($envVars['PARENT_JWT_SECRET']),PARENT_CLINICIAN_KEY=$($envVars['PARENT_CLINICIAN_KEY']),CORS_ORIGIN=*" `
    --format="value(status.url)" 2>&1 | Select-Object -Last 1

if ($LASTEXITCODE -eq 0) {
    $deployedServices["parent-backend"] = $parentBackendUrl
    Write-Host "  ✓ Parent Backend deployed: $parentBackendUrl" -ForegroundColor $SuccessColor
}
else {
    Write-Host "  ✗ Failed to deploy Parent Backend" -ForegroundColor $ErrorColor
}

# Deploy React Dashboard
Write-Host "`n  Deploying React Dashboard..." -ForegroundColor $InfoColor
$dashboardUrl = gcloud run deploy incubator-dashboard `
    --image="gcr.io/$ProjectId/incubator-dashboard:latest" `
    --platform=managed `
    --region=$Region `
    --allow-unauthenticated `
    --port=80 `
    --memory=512Mi `
    --cpu=1 `
    --min-instances=0 `
    --max-instances=10 `
    --timeout=300 `
    --set-env-vars="NODE_ENV=production,REACT_APP_ADMIN_API_URL=$adminBackendUrl,REACT_APP_PARENT_API_URL=$parentBackendUrl,REACT_APP_TB_API_URL=$($envVars['REACT_APP_TB_API_URL']),REACT_APP_TB_HOST=$($envVars['REACT_APP_TB_HOST']),REACT_APP_TB_USERNAME=$($envVars['REACT_APP_TB_USERNAME']),REACT_APP_TB_PASSWORD=$($envVars['REACT_APP_TB_PASSWORD']),REACT_APP_DEVICE_ID=$($envVars['REACT_APP_DEVICE_ID']),REACT_APP_DEVICE_TOKEN=$($envVars['REACT_APP_DEVICE_TOKEN']),REACT_APP_PI_HOST=$($envVars['REACT_APP_PI_HOST']),REACT_APP_CAMERA_PORT=$($envVars['REACT_APP_CAMERA_PORT'])" `
    --format="value(status.url)" 2>&1 | Select-Object -Last 1

if ($LASTEXITCODE -eq 0) {
    $deployedServices["dashboard"] = $dashboardUrl
    Write-Host "  ✓ React Dashboard deployed: $dashboardUrl" -ForegroundColor $SuccessColor
}
else {
    Write-Host "  ✗ Failed to deploy React Dashboard" -ForegroundColor $ErrorColor
}

# Final Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $SuccessColor
Write-Host "║           DEPLOYMENT COMPLETED SUCCESSFULLY!              ║" -ForegroundColor $SuccessColor
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor $SuccessColor

Write-Host "🌐 Deployed Services:" -ForegroundColor $InfoColor
Write-Host "   Dashboard:       $($deployedServices['dashboard'])" -ForegroundColor $SuccessColor
Write-Host "   Admin Backend:   $($deployedServices['admin-backend'])" -ForegroundColor $SuccessColor
Write-Host "   Parent Backend:  $($deployedServices['parent-backend'])" -ForegroundColor $SuccessColor

Write-Host "`n🔐 Default Admin Credentials:" -ForegroundColor $InfoColor
Write-Host "   Email:    admin@demo.com" -ForegroundColor $WarningColor
Write-Host "   Password: admin123" -ForegroundColor $WarningColor

Write-Host "`n📊 View Logs:" -ForegroundColor $InfoColor
Write-Host "   gcloud run services logs read incubator-dashboard --region=$Region" -ForegroundColor $InfoColor

Write-Host "`n💰 Estimated Monthly Cost: `$5-30 (depending on traffic)" -ForegroundColor $InfoColor

Write-Host "`n⚠️  Next Steps:" -ForegroundColor $WarningColor
Write-Host "   1. Change default admin password" -ForegroundColor $WarningColor
Write-Host "   2. Update JWT_SECRET in .env to a secure random string" -ForegroundColor $WarningColor
Write-Host "   3. Configure custom domain (optional)" -ForegroundColor $WarningColor
Write-Host "   4. Set up monitoring alerts" -ForegroundColor $WarningColor
Write-Host "   5. Configure Tailscale for Pi connectivity`n" -ForegroundColor $WarningColor

# Save deployment info
$deploymentInfo = @{
    ProjectId      = $ProjectId
    Region         = $Region
    DeploymentTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Services       = $deployedServices
} | ConvertTo-Json

$deploymentInfo | Out-File "gcp-deployment-info.json" -Encoding UTF8
Write-Host "✓ Deployment info saved to gcp-deployment-info.json`n" -ForegroundColor $SuccessColor
