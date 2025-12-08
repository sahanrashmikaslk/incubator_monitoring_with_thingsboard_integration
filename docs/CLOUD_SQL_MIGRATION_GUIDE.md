# Cloud SQL PostgreSQL Migration Guide

## Problem Solved

**Issue**: Admin and parent accounts vanish after Cloud Run deployments/restarts because backends currently use:

- **Admin Backend**: File-based JSON storage (data/admins.json) - gets reset on container restart
- **Parent Backend**: Local SQLite database - gets reset on container restart

**Solution**: Migrate both backends to Cloud SQL PostgreSQL for persistent, production-grade storage.

---

## Step 1: Create Cloud SQL PostgreSQL Instance

```powershell
# Set project
gcloud config set project neonatal-incubator-monitoring

# Create Cloud SQL PostgreSQL 15 instance
gcloud sql instances create incubator-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --database-flags=max_connections=100 \
  --availability-type=zonal \
  --no-assign-ip

# Expected output: Creating instance... (takes 5-10 minutes)
```

**Configuration Explained**:

- `db-f1-micro`: 614MB RAM, shared-core (FREE TIER eligible for ~$9/month)
- `--no-assign-ip`: Private IP only (more secure, connects via Cloud SQL Proxy)
- `--availability-type=zonal`: Single zone (multi-zone costs more)
- `--backup-start-time=03:00`: Automated daily backups at 3 AM

---

## Step 2: Set Database Password

```powershell
# Set postgres user password
gcloud sql users set-password postgres \
  --instance=incubator-db \
  --password="YOUR_SECURE_PASSWORD_HERE"

# Store in Secret Manager
echo "YOUR_SECURE_PASSWORD_HERE" | gcloud secrets create incubator-db-password --data-file=-
```

---

## Step 3: Create Databases

```powershell
# Create admin database
gcloud sql databases create admin_db --instance=incubator-db

# Create parent database
gcloud sql databases create parent_db --instance=incubator-db
```

---

## Step 4: Get Connection Details

```powershell
# Get connection name (format: PROJECT:REGION:INSTANCE)
gcloud sql instances describe incubator-db --format="value(connectionName)"

# Expected output: neonatal-incubator-monitoring:us-central1:incubator-db
```

**Save this connection name** - you'll need it for Cloud Run configuration.

---

## Step 5: Update Admin Backend (Already uses PostgreSQL!)

Admin backend already has `pg` package. We just need to update the database module.

### Create: `admin_backend/utils/db-postgres.js`

```javascript
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

// Cloud SQL connection via Unix socket
const isProduction = process.env.NODE_ENV === "production";
const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME; // PROJECT:REGION:INSTANCE

const pool = new Pool(
  isProduction && connectionName
    ? {
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "admin_db",
        host: `/cloudsql/${connectionName}`, // Unix socket for Cloud Run
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        // Local development
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "admin_db",
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5432,
        max: 10,
      }
);

// Initialize schema
async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS setup_tokens (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        admin_id TEXT,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT,
        severity TEXT DEFAULT 'info',
        source TEXT DEFAULT 'system',
        fingerprint TEXT,
        metadata JSONB,
        read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        last_triggered_at TIMESTAMP,
        count INTEGER DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_fingerprint ON notifications(fingerprint);
      CREATE INDEX IF NOT EXISTS idx_setup_tokens_token ON setup_tokens(token);
    `);

    console.log("✅ Database schema initialized");
  } finally {
    client.release();
  }
}

// Initialize default admin
async function initializeDefaultAdmin() {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT COUNT(*) FROM admins");
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      console.log("🔧 No admins found, creating default admin...");

      const hashedPassword = await bcrypt.hash(
        process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
        10
      );

      const defaultAdmin = {
        id: generateId(),
        email: process.env.DEFAULT_ADMIN_EMAIL || "admin@demo.com",
        name: process.env.DEFAULT_ADMIN_NAME || "System Administrator",
        password: hashedPassword,
        role: "admin",
        status: "active",
        createdBy: "system",
      };

      await client.query(
        "INSERT INTO admins (id, email, name, password, role, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          defaultAdmin.id,
          defaultAdmin.email,
          defaultAdmin.name,
          defaultAdmin.password,
          defaultAdmin.role,
          defaultAdmin.status,
          defaultAdmin.createdBy,
        ]
      );

      console.log(`✅ Default admin created: ${defaultAdmin.email}`);
      console.log(
        `   Password: ${process.env.DEFAULT_ADMIN_PASSWORD || "admin123"}`
      );
    }
  } finally {
    client.release();
  }
}

function generateId(prefix = "admin") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 11)}`;
}

async function findAdminByEmail(email) {
  const result = await pool.query(
    "SELECT * FROM admins WHERE LOWER(email) = LOWER($1)",
    [email]
  );
  return result.rows[0] || null;
}

async function findAdminById(id) {
  const result = await pool.query("SELECT * FROM admins WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function createAdmin(adminData) {
  const existing = await findAdminByEmail(adminData.email);
  if (existing) return null;

  const newAdmin = {
    id: generateId(),
    ...adminData,
    role: "admin",
    status: "pending",
  };

  await pool.query(
    "INSERT INTO admins (id, email, name, password, role, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      newAdmin.id,
      newAdmin.email,
      newAdmin.name,
      newAdmin.password,
      newAdmin.role,
      newAdmin.status,
      newAdmin.createdBy,
    ]
  );

  return newAdmin;
}

async function updateAdmin(id, updates) {
  const result = await pool.query(
    "UPDATE admins SET email = COALESCE($2, email), name = COALESCE($3, name), password = COALESCE($4, password), status = COALESCE($5, status), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
    [id, updates.email, updates.name, updates.password, updates.status]
  );

  if (result.rowCount === 0) {
    throw new Error("Admin not found");
  }

  return result.rows[0];
}

async function deleteAdmin(id) {
  const result = await pool.query("DELETE FROM admins WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    throw new Error("Admin not found");
  }
  return true;
}

async function getAllAdmins() {
  const result = await pool.query(
    "SELECT * FROM admins ORDER BY created_at DESC"
  );
  return result.rows;
}

async function createSetupToken(tokenData) {
  const newToken = {
    id: generateId(),
    ...tokenData,
  };

  await pool.query(
    "INSERT INTO setup_tokens (id, token, email, admin_id, created_by) VALUES ($1, $2, $3, $4, $5)",
    [
      newToken.id,
      newToken.token,
      newToken.email,
      newToken.adminId,
      newToken.createdBy,
    ]
  );

  return newToken;
}

async function findSetupToken(token, email) {
  const result = await pool.query(
    "SELECT * FROM setup_tokens WHERE token = $1 AND email = $2 AND used = FALSE",
    [token, email]
  );
  return result.rows[0] || null;
}

async function markTokenAsUsed(token) {
  await pool.query(
    "UPDATE setup_tokens SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE token = $1",
    [token]
  );
}

async function cleanExpiredTokens() {
  const result = await pool.query(
    "DELETE FROM setup_tokens WHERE created_at < NOW() - INTERVAL '24 hours' RETURNING id"
  );
  if (result.rowCount > 0) {
    console.log(`🧹 Cleaned ${result.rowCount} expired setup tokens`);
  }
}

async function getAdminNotifications() {
  const result = await pool.query(
    "SELECT * FROM notifications ORDER BY updated_at DESC, created_at DESC"
  );
  return result.rows;
}

async function createAdminNotification(notificationData = {}) {
  const now = new Date().toISOString();
  const fingerprint = notificationData.fingerprint
    ? String(notificationData.fingerprint).trim()
    : null;

  if (fingerprint) {
    const existing = await pool.query(
      "SELECT * FROM notifications WHERE fingerprint = $1",
      [fingerprint]
    );

    if (existing.rows.length > 0) {
      const updated = await pool.query(
        "UPDATE notifications SET title = $2, message = $3, severity = $4, source = $5, metadata = $6, read = FALSE, read_at = NULL, updated_at = $7, last_triggered_at = $8, count = count + 1 WHERE fingerprint = $1 RETURNING *",
        [
          fingerprint,
          notificationData.title || existing.rows[0].title,
          notificationData.message || existing.rows[0].message,
          notificationData.severity || existing.rows[0].severity,
          notificationData.source || existing.rows[0].source,
          JSON.stringify(
            notificationData.metadata !== undefined
              ? notificationData.metadata
              : existing.rows[0].metadata
          ),
          now,
          notificationData.occurredAt || now,
        ]
      );
      return updated.rows[0];
    }
  }

  const newNotification = {
    id: generateId("notif"),
    title: notificationData.title || "System notification",
    message: notificationData.message || "",
    severity: notificationData.severity || "info",
    source: notificationData.source || "system",
    fingerprint,
    metadata:
      notificationData.metadata !== undefined
        ? notificationData.metadata
        : null,
  };

  const result = await pool.query(
    "INSERT INTO notifications (id, title, message, severity, source, fingerprint, metadata, last_triggered_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [
      newNotification.id,
      newNotification.title,
      newNotification.message,
      newNotification.severity,
      newNotification.source,
      newNotification.fingerprint,
      JSON.stringify(newNotification.metadata),
      notificationData.occurredAt || now,
    ]
  );

  // Keep only latest 100 notifications
  await pool.query(
    "DELETE FROM notifications WHERE id NOT IN (SELECT id FROM notifications ORDER BY created_at DESC LIMIT 100)"
  );

  return result.rows[0];
}

async function markAdminNotificationsRead(ids = []) {
  if (Array.isArray(ids) && ids.length > 0) {
    await pool.query(
      "UPDATE notifications SET read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ANY($1::text[])",
      [ids]
    );
  } else {
    await pool.query(
      "UPDATE notifications SET read = TRUE, read_at = CURRENT_TIMESTAMP"
    );
  }

  const result = await pool.query(
    "SELECT * FROM notifications ORDER BY updated_at DESC"
  );
  return result.rows;
}

// Initialize schema and default admin on startup
(async () => {
  try {
    await initializeSchema();
    await initializeDefaultAdmin();
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    process.exit(1);
  }
})();

module.exports = {
  pool,
  initializeDefaultAdmin,
  findAdminByEmail,
  findAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAllAdmins,
  createSetupToken,
  findSetupToken,
  markTokenAsUsed,
  cleanExpiredTokens,
  getAdminNotifications,
  createAdminNotification,
  markAdminNotificationsRead,
  generateId,
};
```

### Update `admin_backend/server.js`:

Change line 7:

```javascript
// OLD:
const { initializeDefaultAdmin } = require("./utils/db");

// NEW:
const { initializeDefaultAdmin } = require("./utils/db-postgres");
```

### Update `admin_backend/routes/auth.js` and `admin_backend/routes/admin.js`:

Change all imports:

```javascript
// OLD:
const db = require("../utils/db");

// NEW:
const db = require("../utils/db-postgres");
```

**IMPORTANT**: Make all database calls async/await since PostgreSQL operations are asynchronous:

```javascript
// OLD:
const admin = db.findAdminByEmail(email);

// NEW:
const admin = await db.findAdminByEmail(email);
```

---

## Step 6: Update Parent Backend (SQLite → PostgreSQL)

### Update `parent_backend/package.json`:

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "helmet": "^7.0.0",
    "jsonwebtoken": "^9.0.2",
    "nanoid": "^5.1.6"
  }
}
```

### Create: `parent_backend/src/db-postgres.js`

```javascript
import { Pool } from "pg";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";
const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME;

const pool = new Pool(
  isProduction && connectionName
    ? {
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "parent_db",
        host: `/cloudsql/${connectionName}`,
        max: 10,
        idleTimeoutMillis: 30000,
      }
    : {
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "parent_db",
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5432,
        max: 10,
      }
);

// Initialize schema
async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS parents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        baby_id TEXT,
        relationship TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS parent_invites (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        baby_id TEXT NOT NULL,
        created_by TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        baby_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_type TEXT NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS camera_access (
        id TEXT PRIMARY KEY,
        parent_id TEXT NOT NULL,
        baby_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        UNIQUE(parent_id, baby_id)
      );

      CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
      CREATE INDEX IF NOT EXISTS idx_parents_baby_id ON parents(baby_id);
      CREATE INDEX IF NOT EXISTS idx_messages_baby_id ON messages(baby_id);
      CREATE INDEX IF NOT EXISTS idx_camera_access_parent ON camera_access(parent_id);
      CREATE INDEX IF NOT EXISTS idx_invites_token ON parent_invites(token);
    `);

    console.log("✅ Parent database schema initialized");
  } finally {
    client.release();
  }
}

// Parent operations
export async function createParent(parentData) {
  const result = await pool.query(
    "INSERT INTO parents (id, name, email, password, phone, baby_id, relationship) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [
      parentData.id,
      parentData.name,
      parentData.email,
      parentData.password,
      parentData.phone,
      parentData.babyId,
      parentData.relationship,
    ]
  );
  return result.rows[0];
}

export async function findParentByEmail(email) {
  const result = await pool.query(
    "SELECT * FROM parents WHERE LOWER(email) = LOWER($1)",
    [email]
  );
  return result.rows[0] || null;
}

export async function findParentById(id) {
  const result = await pool.query("SELECT * FROM parents WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function getParentsByBabyId(babyId) {
  const result = await pool.query("SELECT * FROM parents WHERE baby_id = $1", [
    babyId,
  ]);
  return result.rows;
}

export async function updateParent(id, updates) {
  const result = await pool.query(
    "UPDATE parents SET name = COALESCE($2, name), phone = COALESCE($3, phone), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
    [id, updates.name, updates.phone]
  );
  return result.rows[0];
}

// Invite operations
export async function createInvite(inviteData) {
  const result = await pool.query(
    "INSERT INTO parent_invites (id, token, email, baby_id, created_by, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [
      inviteData.id,
      inviteData.token,
      inviteData.email,
      inviteData.babyId,
      inviteData.createdBy,
      inviteData.expiresAt,
    ]
  );
  return result.rows[0];
}

export async function findInviteByToken(token) {
  const result = await pool.query(
    "SELECT * FROM parent_invites WHERE token = $1 AND used = FALSE AND expires_at > NOW()",
    [token]
  );
  return result.rows[0] || null;
}

export async function markInviteUsed(token) {
  await pool.query(
    "UPDATE parent_invites SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE token = $1",
    [token]
  );
}

// Message operations
export async function createMessage(messageData) {
  const result = await pool.query(
    "INSERT INTO messages (id, baby_id, sender_id, sender_type, message) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [
      messageData.id,
      messageData.babyId,
      messageData.senderId,
      messageData.senderType,
      messageData.message,
    ]
  );
  return result.rows[0];
}

export async function getMessagesByBabyId(babyId) {
  const result = await pool.query(
    "SELECT * FROM messages WHERE baby_id = $1 ORDER BY created_at DESC",
    [babyId]
  );
  return result.rows;
}

export async function markMessagesRead(messageIds) {
  await pool.query(
    "UPDATE messages SET read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ANY($1::text[])",
    [messageIds]
  );
}

// Camera access operations
export async function createCameraRequest(requestData) {
  const result = await pool.query(
    "INSERT INTO camera_access (id, parent_id, baby_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT (parent_id, baby_id) DO UPDATE SET status = $4, requested_at = CURRENT_TIMESTAMP RETURNING *",
    [
      requestData.id,
      requestData.parentId,
      requestData.babyId,
      requestData.status || "pending",
    ]
  );
  return result.rows[0];
}

export async function getCameraAccessByParentId(parentId) {
  const result = await pool.query(
    "SELECT * FROM camera_access WHERE parent_id = $1",
    [parentId]
  );
  return result.rows[0] || null;
}

export async function updateCameraAccess(parentId, babyId, status) {
  const result = await pool.query(
    "UPDATE camera_access SET status = $3, updated_at = CURRENT_TIMESTAMP WHERE parent_id = $1 AND baby_id = $2 RETURNING *",
    [parentId, babyId, status]
  );
  return result.rows[0];
}

export async function getCameraAccessQueue() {
  const result = await pool.query(
    "SELECT ca.*, p.name as parent_name, p.email FROM camera_access ca JOIN parents p ON ca.parent_id = p.id ORDER BY ca.requested_at DESC"
  );
  return result.rows;
}

// Initialize on module load
(async () => {
  try {
    await initializeSchema();
  } catch (error) {
    console.error("❌ Parent database initialization error:", error);
    process.exit(1);
  }
})();

export { pool };
```

### Update `parent_backend/src/server.js`:

Change imports:

```javascript
// OLD:
import * as db from "./db.js";

// NEW:
import * as db from "./db-postgres.js";
```

---

## Step 7: Configure Environment Variables

### Admin Backend `.env`:

```env
NODE_ENV=production
PORT=8891

# Cloud SQL Connection
CLOUD_SQL_CONNECTION_NAME=neonatal-incubator-monitoring:us-central1:incubator-db
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DB_NAME=admin_db

# Default Admin
DEFAULT_ADMIN_EMAIL=admin@nicu.lk
DEFAULT_ADMIN_PASSWORD=ChangeMe2025!
DEFAULT_ADMIN_NAME=System Administrator

# CORS
CORS_ORIGIN=https://incubator-dashboard-571778410429.us-central1.run.app

# JWT
JWT_SECRET=your-jwt-secret-key-here
```

### Parent Backend `.env`:

```env
NODE_ENV=production
PORT=8890

# Cloud SQL Connection
CLOUD_SQL_CONNECTION_NAME=neonatal-incubator-monitoring:us-central1:incubator-db
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DB_NAME=parent_db

# Clinician API Key
CLINICIAN_API_KEY=clinician-api-key-12345

# JWT
JWT_SECRET=your-jwt-secret-key-here
```

---

## Step 8: Store Secrets in Secret Manager

```powershell
# Store DB password (already done in Step 2)

# Update admin backend secrets
gcloud secrets create admin-db-connection --data-file=- <<< "neonatal-incubator-monitoring:us-central1:incubator-db"

# Update parent backend secrets
gcloud secrets create parent-db-connection --data-file=- <<< "neonatal-incubator-monitoring:us-central1:incubator-db"

# Create JWT secret
$randomJWT = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
echo $randomJWT | gcloud secrets create jwt-secret --data-file=-
```

---

## Step 9: Update Cloud Run Configurations

### Admin Backend:

```powershell
gcloud run services update incubator-admin-backend \
  --region=us-central1 \
  --add-cloudsql-instances=neonatal-incubator-monitoring:us-central1:incubator-db \
  --set-env-vars="NODE_ENV=production,DB_NAME=admin_db,DB_USER=postgres,CLOUD_SQL_CONNECTION_NAME=neonatal-incubator-monitoring:us-central1:incubator-db" \
  --set-secrets="DB_PASSWORD=incubator-db-password:latest,JWT_SECRET=jwt-secret:latest,CORS_ORIGIN=admin-cors-origin:latest"
```

### Parent Backend:

```powershell
gcloud run services update incubator-parent-backend \
  --region=us-central1 \
  --add-cloudsql-instances=neonatal-incubator-monitoring:us-central1:incubator-db \
  --set-env-vars="NODE_ENV=production,DB_NAME=parent_db,DB_USER=postgres,CLOUD_SQL_CONNECTION_NAME=neonatal-incubator-monitoring:us-central1:incubator-db" \
  --set-secrets="DB_PASSWORD=incubator-db-password:latest,JWT_SECRET=jwt-secret:latest,CLINICIAN_API_KEY=parent-clinician-key:latest"
```

---

## Step 10: Deploy Updated Backends

```powershell
# Navigate to admin backend
cd incubator_monitoring_with_thingsboard_integration/admin_backend

# Deploy
gcloud run deploy incubator-admin-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8891

# Navigate to parent backend
cd ../parent_backend

# Deploy
gcloud run deploy incubator-parent-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8890
```

---

## Step 11: Verify Data Persistence

### Test Admin Accounts:

```powershell
# Create a test admin
$response = Invoke-RestMethod -Uri "https://incubator-admin-backend-571778410429.us-central1.run.app/api/admin/admins" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"test@nicu.lk","name":"Test Doctor"}'

# Restart the service
gcloud run services update incubator-admin-backend --region=us-central1 --clear-env-vars=TEMP

# Check if admin still exists
Invoke-RestMethod -Uri "https://incubator-admin-backend-571778410429.us-central1.run.app/api/admin/admins"
```

### Test Parent Accounts:

```powershell
# Create test parent invite and register

# Restart service
gcloud run services update incubator-parent-backend --region=us-central1 --clear-env-vars=TEMP

# Verify parent still exists
```

---

## Cost Estimation

**Cloud SQL PostgreSQL (db-f1-micro)**:

- Instance: ~$7.67/month (single zone, shared-core)
- Storage (10GB SSD): ~$1.70/month
- Backups (automated): ~$0.08/GB/month
- **Total**: ~$10-12/month

**Free tier alternatives** (not recommended for production):

- Cloud Firestore: Free up to 1GB, 50K reads/day
- Supabase (managed Postgres): Free tier with 500MB

---

## Rollback Plan

If migration fails, revert to file-based storage:

```powershell
# In admin_backend/server.js
const { initializeDefaultAdmin } = require('./utils/db'); # Original file-based

# In parent_backend/src/server.js
import * as db from './db.js'; # Original SQLite

# Redeploy without Cloud SQL connection
gcloud run deploy incubator-admin-backend --source . --region us-central1 --no-add-cloudsql-instances
gcloud run deploy incubator-parent-backend --source . --region us-central1 --no-add-cloudsql-instances
```

---

## Benefits After Migration

✅ **Data Persistence**: User accounts survive Cloud Run restarts/deployments
✅ **Automatic Backups**: Daily snapshots at 3 AM
✅ **Scalability**: Supports up to 100 concurrent connections
✅ **Security**: Private IP, encrypted connections via Cloud SQL Proxy
✅ **Production-Ready**: ACID compliance, transactions, relational integrity
✅ **Easy Management**: GCP Console UI for database admin

---

## Next Steps

1. Run Step 1-3 to create Cloud SQL instance
2. Update code files (Steps 5-6)
3. Configure secrets (Steps 7-8)
4. Deploy (Steps 9-10)
5. Test persistence (Step 11)

**Estimated setup time**: 30-45 minutes

Let me know when you're ready to start!
