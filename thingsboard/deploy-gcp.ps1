# Deploy ThingsBoard to GCP Cloud Run
# PowerShell version of deploy-gcp.sh

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "neonatal-incubator-monitoring"
$REGION = "us-central1"
$SERVICE_NAME = "thingsboard-server"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/thingsboard:latest"
$CLOUD_SQL_INSTANCE = "incubator-db"
$DB_NAME = "thingsboard"
$DB_USER = "thingsboard_user"

Write-Host "`n🚀 ThingsBoard GCP Deployment`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Check if database exists
Write-Host "📊 Checking if database exists..." -ForegroundColor Yellow
$dbExists = gcloud sql databases list --instance=$CLOUD_SQL_INSTANCE --filter="name=$DB_NAME" --format="value(name)"

if ([string]::IsNullOrWhiteSpace($dbExists)) {
    Write-Host "📦 Creating ThingsBoard database..." -ForegroundColor Yellow
    gcloud sql databases create $DB_NAME --instance=$CLOUD_SQL_INSTANCE
    Write-Host "✅ Database created: $DB_NAME`n" -ForegroundColor Green
}
else {
    Write-Host "✅ Database already exists: $DB_NAME`n" -ForegroundColor Green
}

# Check if user exists
Write-Host "👤 Checking if database user exists..." -ForegroundColor Yellow
$userExists = gcloud sql users list --instance=$CLOUD_SQL_INSTANCE --filter="name=$DB_USER" --format="value(name)"

if ([string]::IsNullOrWhiteSpace($userExists)) {
    Write-Host "📝 Creating database user..." -ForegroundColor Yellow
    $DB_PASSWORD = Read-Host "Enter a secure password for ThingsBoard database user" -AsSecureString
    $DB_PASSWORD_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))
    gcloud sql users create $DB_USER --instance=$CLOUD_SQL_INSTANCE --password=$DB_PASSWORD_PLAIN
    Write-Host "✅ User created: $DB_USER`n" -ForegroundColor Green
}
else {
    Write-Host "✅ User already exists: $DB_USER" -ForegroundColor Green
    $DB_PASSWORD = Read-Host "Enter the existing password for user $DB_USER" -AsSecureString
    $DB_PASSWORD_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))
}

# Build container image
Write-Host "`n🏗️  Building ThingsBoard container image..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE_NAME -f Dockerfile.gcp .

Write-Host "`n✅ Image built: $IMAGE_NAME`n" -ForegroundColor Green

# Construct database URL
$DATABASE_URL = "jdbc:postgresql:///thingsboard?host=/cloudsql/${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}&user=${DB_USER}&password=${DB_PASSWORD_PLAIN}"

# Deploy to Cloud Run
Write-Host "☁️  Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --memory 2Gi `
    --cpu 2 `
    --timeout 300 `
    --port 8080 `
    --allow-unauthenticated `
    --add-cloudsql-instances "${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}" `
    --set-env-vars "SPRING_DATASOURCE_URL=$DATABASE_URL" `
    --set-env-vars "TB_QUEUE_TYPE=in-memory" `
    --set-env-vars "HTTP_BIND_ADDRESS=0.0.0.0" `
    --set-env-vars "HTTP_BIND_PORT=8080" `
    --set-env-vars "MQTT_BIND_ADDRESS=0.0.0.0" `
    --set-env-vars "MQTT_BIND_PORT=1883" `
    --min-instances 1 `
    --max-instances 3

# Get service URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "🌐 ThingsBoard URL: $SERVICE_URL" -ForegroundColor White
Write-Host "📱 ThingsBoard API: $SERVICE_URL/api`n" -ForegroundColor White

Write-Host "🔑 Default Admin Login:" -ForegroundColor Yellow
Write-Host "   Email: admin@thingsboard.local" -ForegroundColor White
Write-Host "   Password: admin" -ForegroundColor White
Write-Host "   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!`n" -ForegroundColor Red

Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Open $SERVICE_URL in your browser" -ForegroundColor White
Write-Host "   2. Login and change admin password" -ForegroundColor White
Write-Host "   3. Create your device (e.g., INC-001)" -ForegroundColor White
Write-Host "   4. Copy device access token" -ForegroundColor White
Write-Host "   5. Update Pi configuration:" -ForegroundColor White
Write-Host "      - thingsboard_host: $($SERVICE_URL -replace 'https://', '')" -ForegroundColor Gray
Write-Host "      - mqtt_port: Use WebSocket (port 80/443)" -ForegroundColor Gray
Write-Host "   6. Update dashboard .env.production:" -ForegroundColor White
Write-Host "      REACT_APP_TB_API_URL=$SERVICE_URL/api`n" -ForegroundColor Gray

Write-Host "⚠️  Note: MQTT over TCP (port 1883) is not available on Cloud Run." -ForegroundColor Yellow
Write-Host "   Use MQTT over WebSocket or deploy an MQTT gateway VM.`n" -ForegroundColor Yellow
