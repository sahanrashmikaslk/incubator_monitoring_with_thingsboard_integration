# 🚀 QUICK START - Deploy Admin Backend with Cloud SQL

## ✅ Prerequisites (Already Done)

- Cloud SQL instance: `incubator-db` (RUNNABLE)
- Databases: `admin_db`, `parent_db` (created)
- Password: Stored in Secret Manager
- Code: PostgreSQL module created, routes updated

---

## 🎯 Deploy Admin Backend Now (5 minutes)

```powershell
# Navigate to project root
cd c:\Users\sahan\Desktop\MYProjects\PI_webUI_for_test-monitoring\incubator_monitoring_with_thingsboard_integration

# Step 1: Configure Cloud Run to connect to Cloud SQL
Write-Host "`n⚙️  Configuring Cloud Run...`n" -ForegroundColor Cyan
gcloud run services update incubator-admin-backend `
  --region=us-central1 `
  --add-cloudsql-instances=neonatal-incubator-monitoring:us-central1:incubator-db `
  --update-env-vars="NODE_ENV=production,DB_NAME=admin_db,DB_USER=postgres,CLOUD_SQL_CONNECTION_NAME=neonatal-incubator-monitoring:us-central1:incubator-db" `
  --update-secrets="DB_PASSWORD=incubator-db-password:latest,CORS_ORIGIN=admin-cors-origin:latest"

# Step 2: Deploy updated code
Write-Host "`n🚀 Deploying Admin Backend...`n" -ForegroundColor Yellow
cd admin_backend
gcloud run deploy incubator-admin-backend `
  --source . `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --port 8891

Write-Host "`n✅ ADMIN BACKEND DEPLOYED!`n" -ForegroundColor Green
```

---

## 🧪 Test Data Persistence

```powershell
# 1. Go to dashboard: https://incubator-dashboard-571778410429.us-central1.run.app
# 2. Login with default admin (admin@demo.com / admin123)
# 3. Create a new admin user

# 4. Force restart the backend
gcloud run services update incubator-admin-backend --region=us-central1 --clear-env-vars=TEMP

# 5. Refresh dashboard - new admin should still exist! ✅
```

---

## 📊 Check Database

```powershell
# View admin accounts in Cloud SQL
gcloud sql instances describe incubator-db

# Cloud SQL Console
Start-Process "https://console.cloud.google.com/sql/instances/incubator-db/overview?project=neonatal-incubator-monitoring"
```

---

## ⚠️ If Something Goes Wrong

Rollback to file-based storage:

```powershell
# Revert code change in admin_backend/server.js line 7
# Change: require('./utils/db-postgres')
# To:     require('./utils/db')

# Redeploy
cd admin_backend
gcloud run deploy incubator-admin-backend --source . --region us-central1
```

---

## 📝 Next: Parent Backend

After confirming admin backend works:

1. Review `CLOUD_SQL_MIGRATION_GUIDE.md` Step 6
2. Create `parent_backend/src/db-postgres.js`
3. Update route handlers
4. Deploy parent backend

**Estimated Time**: 30 minutes
