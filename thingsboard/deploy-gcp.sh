#!/bin/bash

# ThingsBoard GCP Deployment Script
# Deploys ThingsBoard to Cloud Run with Cloud SQL PostgreSQL

set -e

# Configuration
PROJECT_ID="neonatal-incubator-monitoring"
REGION="us-central1"
SERVICE_NAME="thingsboard-server"
IMAGE_NAME="gcr.io/${PROJECT_ID}/thingsboard:latest"
CLOUD_SQL_INSTANCE="incubator-db"
DB_NAME="thingsboard"
DB_USER="thingsboard_user"

echo "🚀 ThingsBoard GCP Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if database exists
echo "📊 Checking if database exists..."
DB_EXISTS=$(gcloud sql databases list --instance=$CLOUD_SQL_INSTANCE --filter="name=$DB_NAME" --format="value(name)")

if [ -z "$DB_EXISTS" ]; then
  echo "📦 Creating ThingsBoard database..."
  gcloud sql databases create $DB_NAME \
    --instance=$CLOUD_SQL_INSTANCE
  echo "✅ Database created: $DB_NAME"
else
  echo "✅ Database already exists: $DB_NAME"
fi

# Check if user exists
echo "👤 Checking if database user exists..."
USER_EXISTS=$(gcloud sql users list --instance=$CLOUD_SQL_INSTANCE --filter="name=$DB_USER" --format="value(name)")

if [ -z "$USER_EXISTS" ]; then
  echo "📝 Creating database user..."
  echo "⚠️  Please enter a secure password for ThingsBoard database user:"
  read -s DB_PASSWORD
  gcloud sql users create $DB_USER \
    --instance=$CLOUD_SQL_INSTANCE \
    --password=$DB_PASSWORD
  echo "✅ User created: $DB_USER"
else
  echo "✅ User already exists: $DB_USER"
  echo "⚠️  Please enter the existing password for user $DB_USER:"
  read -s DB_PASSWORD
fi

# Build container image
echo ""
echo "🏗️  Building ThingsBoard container image..."
gcloud builds submit --tag $IMAGE_NAME -f Dockerfile.gcp .

echo ""
echo "✅ Image built: $IMAGE_NAME"

# Construct database URL for Cloud SQL Unix socket
DATABASE_URL="jdbc:postgresql:///thingsboard?host=/cloudsql/${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}&user=${DB_USER}&password=${DB_PASSWORD}"

# Deploy to Cloud Run
echo ""
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --port 8080 \
  --allow-unauthenticated \
  --add-cloudsql-instances ${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE} \
  --set-env-vars "SPRING_DATASOURCE_URL=$DATABASE_URL" \
  --set-env-vars "TB_QUEUE_TYPE=in-memory" \
  --set-env-vars "HTTP_BIND_ADDRESS=0.0.0.0" \
  --set-env-vars "HTTP_BIND_PORT=8080" \
  --set-env-vars "MQTT_BIND_ADDRESS=0.0.0.0" \
  --set-env-vars "MQTT_BIND_PORT=1883" \
  --min-instances 1 \
  --max-instances 3

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 ThingsBoard URL: $SERVICE_URL"
echo "📱 ThingsBoard API: $SERVICE_URL/api"
echo ""
echo "🔑 Default Admin Login:"
echo "   Email: admin@thingsboard.local"
echo "   Password: admin"
echo "   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!"
echo ""
echo "📋 Next Steps:"
echo "   1. Open $SERVICE_URL in your browser"
echo "   2. Login and change admin password"
echo "   3. Create your device (e.g., INC-001)"
echo "   4. Copy device access token"
echo "   5. Update Pi configuration:"
echo "      - thingsboard_host: ${SERVICE_URL#https://}"
echo "      - mqtt_port: Use WebSocket (port 80/443)"
echo "   6. Update dashboard .env.production:"
echo "      REACT_APP_TB_API_URL=$SERVICE_URL/api"
echo ""
echo "⚠️  Note: MQTT over TCP (port 1883) is not available on Cloud Run."
echo "   Use MQTT over WebSocket or deploy an MQTT gateway VM."
echo ""
