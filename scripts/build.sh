#!/bin/bash
# Build all Docker images for Incubator Monitoring System

set -e

echo "🔨 Building Docker images for Incubator Monitoring System..."
echo "============================================================"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Build React Dashboard
echo ""
echo "📦 Building React Dashboard..."
docker build -t incubator-dashboard:latest \
  -t gcr.io/${GCP_PROJECT_ID}/incubator-dashboard:latest \
  ./react_dashboard

# Build Admin Backend
echo ""
echo "📦 Building Admin Backend..."
docker build -t incubator-admin-backend:latest \
  -t gcr.io/${GCP_PROJECT_ID}/incubator-admin-backend:latest \
  ./admin_backend

# Build Parent Backend
echo ""
echo "📦 Building Parent Backend..."
docker build -t incubator-parent-backend:latest \
  -t gcr.io/${GCP_PROJECT_ID}/incubator-parent-backend:latest \
  ./parent_backend

echo ""
echo "✅ All images built successfully!"
echo ""
echo "Local images:"
echo "  - incubator-dashboard:latest"
echo "  - incubator-admin-backend:latest"
echo "  - incubator-parent-backend:latest"
echo ""
echo "GCR images (if GCP_PROJECT_ID set):"
echo "  - gcr.io/${GCP_PROJECT_ID}/incubator-dashboard:latest"
echo "  - gcr.io/${GCP_PROJECT_ID}/incubator-admin-backend:latest"
echo "  - gcr.io/${GCP_PROJECT_ID}/incubator-parent-backend:latest"
echo ""
echo "Next steps:"
echo "  1. Test locally: docker-compose up -d"
echo "  2. Push to GCR: ./scripts/push-to-gcr.sh"
echo "  3. Deploy to GCP: ./scripts/deploy-gcp.sh"
