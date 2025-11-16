const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Cloud SQL connection via Unix socket
const isProduction = process.env.NODE_ENV === 'production';
const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME; // PROJECT:REGION:INSTANCE

const pool = new Pool(
  isProduction && connectionName
    ? {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'admin_db',
        host: `/cloudsql/${connectionName}`, // Unix socket for Cloud Run
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        // Local development
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'admin_db',
        host: process.env.DB_HOST || 'localhost',
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
        last_login_at TIMESTAMP,
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

      CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_fingerprint ON notifications(fingerprint);
      CREATE INDEX IF NOT EXISTS idx_setup_tokens_token ON setup_tokens(token);
    `);
    
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Schema initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Initialize default admin
async function initializeDefaultAdmin() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT COUNT(*) FROM admins');
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      console.log('🔧 No admins found, creating default admin...');
      
      const hashedPassword = await bcrypt.hash(
        process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
        10
      );
      
      const defaultAdmin = {
        id: generateId(),
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@demo.com',
        name: process.env.DEFAULT_ADMIN_NAME || 'System Administrator',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        createdBy: 'system'
      };
      
      await client.query(
        'INSERT INTO admins (id, email, name, password, role, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [defaultAdmin.id, defaultAdmin.email, defaultAdmin.name, defaultAdmin.password, 
         defaultAdmin.role, defaultAdmin.status, defaultAdmin.createdBy]
      );
      
      console.log(`✅ Default admin created: ${defaultAdmin.email}`);
      console.log(`   Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'}`);
    }
  } catch (error) {
    console.error('❌ Default admin creation error:', error);
    throw error;
  } finally {
    client.release();
  }
}

function generateId(prefix = 'admin') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

async function findAdminByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM admins WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  return result.rows[0] || null;
}

async function findAdminById(id) {
  const result = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function createAdmin(adminData) {
  const existing = await findAdminByEmail(adminData.email);
  if (existing) return null;

  const newAdmin = {
    id: generateId(),
    ...adminData,
    role: 'admin',
    status: 'pending',
  };

  await pool.query(
    'INSERT INTO admins (id, email, name, password, role, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [newAdmin.id, newAdmin.email, newAdmin.name, newAdmin.password, newAdmin.role, newAdmin.status, newAdmin.createdBy || newAdmin.created_by]
  );

  return newAdmin;
}

async function updateAdmin(id, updates) {
  const fields = [];
  const values = [id];
  let paramIndex = 2;

  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.password !== undefined) {
    fields.push(`password = $${paramIndex++}`);
    values.push(updates.password);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.lastLoginAt !== undefined) {
    fields.push(`last_login_at = $${paramIndex++}`);
    values.push(updates.lastLoginAt);
  }

  if (fields.length === 0) {
    const admin = await findAdminById(id);
    if (!admin) throw new Error('Admin not found');
    return admin;
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  const query = `UPDATE admins SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    throw new Error('Admin not found');
  }

  return result.rows[0];
}

async function deleteAdmin(id) {
  const result = await pool.query('DELETE FROM admins WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    throw new Error('Admin not found');
  }
  return true;
}

async function getAllAdmins() {
  const result = await pool.query('SELECT * FROM admins ORDER BY created_at DESC');
  return result.rows;
}

async function createSetupToken(tokenData) {
  const newToken = {
    id: generateId('token'),
    ...tokenData,
  };

  await pool.query(
    'INSERT INTO setup_tokens (id, token, email, admin_id, created_by) VALUES ($1, $2, $3, $4, $5)',
    [newToken.id, newToken.token, newToken.email, newToken.adminId || newToken.admin_id, newToken.createdBy || newToken.created_by]
  );

  return newToken;
}

async function findSetupToken(token, email) {
  const result = await pool.query(
    'SELECT * FROM setup_tokens WHERE token = $1 AND email = $2 AND used = FALSE',
    [token, email]
  );
  return result.rows[0] || null;
}

async function markTokenAsUsed(token) {
  await pool.query(
    'UPDATE setup_tokens SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE token = $1',
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

async function readAdmins() {
  return await getAllAdmins();
}

async function writeAdmins(admins) {
  // Not needed for PostgreSQL - write operations happen via specific functions
  console.warn('writeAdmins() is deprecated with PostgreSQL backend');
}

async function getAdminNotifications() {
  const result = await pool.query(
    'SELECT * FROM notifications ORDER BY updated_at DESC, created_at DESC'
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
      'SELECT * FROM notifications WHERE fingerprint = $1',
      [fingerprint]
    );

    if (existing.rows.length > 0) {
      const updated = await pool.query(
        'UPDATE notifications SET title = $2, message = $3, severity = $4, source = $5, metadata = $6, read = FALSE, read_at = NULL, updated_at = $7, last_triggered_at = $8, count = count + 1 WHERE fingerprint = $1 RETURNING *',
        [
          fingerprint,
          notificationData.title || existing.rows[0].title,
          notificationData.message || existing.rows[0].message,
          notificationData.severity || existing.rows[0].severity,
          notificationData.source || existing.rows[0].source,
          JSON.stringify(notificationData.metadata !== undefined ? notificationData.metadata : existing.rows[0].metadata),
          now,
          notificationData.occurredAt || now,
        ]
      );
      return updated.rows[0];
    }
  }

  const newNotification = {
    id: generateId('notif'),
    title: notificationData.title || 'System notification',
    message: notificationData.message || '',
    severity: notificationData.severity || 'info',
    source: notificationData.source || 'system',
    fingerprint,
    metadata: notificationData.metadata !== undefined ? notificationData.metadata : null,
  };

  const result = await pool.query(
    'INSERT INTO notifications (id, title, message, severity, source, fingerprint, metadata, last_triggered_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
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
    'DELETE FROM notifications WHERE id NOT IN (SELECT id FROM notifications ORDER BY created_at DESC LIMIT 100)'
  );

  return result.rows[0];
}

async function markAdminNotificationsRead(ids = []) {
  if (Array.isArray(ids) && ids.length > 0) {
    await pool.query(
      'UPDATE notifications SET read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ANY($1::text[])',
      [ids]
    );
  } else {
    await pool.query('UPDATE notifications SET read = TRUE, read_at = CURRENT_TIMESTAMP');
  }

  const result = await pool.query('SELECT * FROM notifications ORDER BY updated_at DESC');
  return result.rows;
}

// Initialize schema and default admin on startup
(async () => {
  try {
    console.log('🔄 Initializing PostgreSQL database...');
    console.log(`   Connection: ${connectionName || 'localhost'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'admin_db'}`);
    await initializeSchema();
    await initializeDefaultAdmin();
    console.log('✅ PostgreSQL database ready');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    // Don't exit - let the app start and retry connections
  }
})();

module.exports = {
  pool,
  readAdmins,
  writeAdmins,
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
