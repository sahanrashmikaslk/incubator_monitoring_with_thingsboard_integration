const { Client } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// PostgreSQL connection configuration
const isProduction = process.env.NODE_ENV === 'production';
const connectionConfig = isProduction ? {
  // Cloud SQL connection via Unix socket
  host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
  user: process.env.DB_USER || 'incubator_app',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'incubator_system',
} : {
  // Local PostgreSQL for development
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'incubator_app',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'incubator_system',
};

// Create a connection pool
let client = null;

async function getClient() {
  if (!client) {
    client = new Client(connectionConfig);
    await client.connect();
    console.log(`📊 Connected to PostgreSQL database: ${connectionConfig.database}`);
    await initializeDatabase();
  }
  return client;
}

async function initializeDatabase() {
  const db = await getClient();
  
  // Create all tables
  await db.query(`
    -- Admins table
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP
    );

    -- Babies table
    CREATE TABLE IF NOT EXISTS babies (
      baby_id TEXT PRIMARY KEY,
      baby_name TEXT,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Parents table
    CREATE TABLE IF NOT EXISTS parents (
      id SERIAL PRIMARY KEY,
      baby_id TEXT NOT NULL REFERENCES babies(baby_id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Invitations table
    CREATE TABLE IF NOT EXISTS invitations (
      code TEXT PRIMARY KEY,
      baby_id TEXT NOT NULL REFERENCES babies(baby_id) ON DELETE CASCADE,
      baby_name TEXT,
      caregiver_role TEXT,
      expires_at TIMESTAMP NOT NULL,
      pin_code_hash TEXT,
      status TEXT DEFAULT 'pending',
      claimed_at TIMESTAMP,
      claimed_parent_id INTEGER REFERENCES parents(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      baby_id TEXT NOT NULL REFERENCES babies(baby_id) ON DELETE CASCADE,
      sender_type TEXT NOT NULL,
      sender_name TEXT,
      sender_id TEXT,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Camera access table
    CREATE TABLE IF NOT EXISTS camera_access (
      id SERIAL PRIMARY KEY,
      baby_id TEXT NOT NULL REFERENCES babies(baby_id) ON DELETE CASCADE,
      parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
      parent_name TEXT,
      status TEXT DEFAULT 'pending',
      pending_request BOOLEAN DEFAULT FALSE,
      requested_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Notifications table (unified for both admin and parent notifications)
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      baby_id TEXT REFERENCES babies(baby_id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      fingerprint TEXT UNIQUE
    );

    -- Setup tokens table
    CREATE TABLE IF NOT EXISTS setup_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at TIMESTAMP,
      used BOOLEAN DEFAULT FALSE,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_parents_baby_id ON parents(baby_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_baby_id ON invitations(baby_id);
    CREATE INDEX IF NOT EXISTS idx_messages_baby_id ON messages(baby_id);
    CREATE INDEX IF NOT EXISTS idx_camera_access_baby_id ON camera_access(baby_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_baby_id ON notifications(baby_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
  `);

  // Create default admin if not exists
  const adminCheck = await db.query('SELECT id FROM admins WHERE email = $1', ['admin@incubator.local']);
  if (adminCheck.rows.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminId = crypto.randomUUID();
    await db.query(
      'INSERT INTO admins (id, email, password_hash, name, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [adminId, 'admin@incubator.local', hashedPassword, 'Default Admin', 'admin', 'active']
    );
    console.log('✅ Created default admin: admin@incubator.local / admin123');
  }

  console.log('✅ PostgreSQL unified database initialized successfully');
}

// Admin operations
const admins = {
  async findById(id) {
    const db = await getClient();
    const result = await db.query('SELECT * FROM admins WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByEmail(email) {
    const db = await getClient();
    const result = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
    return result.rows[0];
  },

  async create(data) {
    const db = await getClient();
    const id = crypto.randomUUID();
    const hashedPassword = data.password_hash || await bcrypt.hash(data.password || '', 10);
    
    try {
      const result = await db.query(
        'INSERT INTO admins (id, email, password_hash, name, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [id, data.email, hashedPassword, data.name, data.role || 'admin', data.status || 'pending']
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') return null; // Duplicate email
      throw error;
    }
  },

  async getAll() {
    const db = await getClient();
    const result = await db.query('SELECT * FROM admins ORDER BY created_at DESC');
    return result.rows;
  },

  async update(id, updates) {
    const db = await getClient();
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    values.push(id);
    const result = await db.query(
      `UPDATE admins SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    const db = await getClient();
    const result = await db.query('DELETE FROM admins WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  async verifyPassword(id, password) {
    const admin = await this.findById(id);
    if (!admin) return false;
    return bcrypt.compare(password, admin.password_hash);
  }
};

// Setup tokens operations
const setupTokens = {
  async create(data) {
    const db = await getClient();
    const expiresAt = data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await db.query(
      'INSERT INTO setup_tokens (token, email, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [data.token, data.email, expiresAt]
    );
    return result.rows[0];
  },

  async findByToken(token) {
    const db = await getClient();
    const result = await db.query('SELECT * FROM setup_tokens WHERE token = $1', [token]);
    return result.rows[0];
  },

  async markUsed(token) {
    const db = await getClient();
    await db.query(
      'UPDATE setup_tokens SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    );
  },

  async cleanupExpired() {
    const db = await getClient();
    await db.query('DELETE FROM setup_tokens WHERE expires_at < CURRENT_TIMESTAMP AND used = FALSE');
  }
};

// Repository operations (parent/baby operations)
const repository = {
  async createBaby(babyId, babyName, metadata = null) {
    const db = await getClient();
    const result = await db.query(
      'INSERT INTO babies (baby_id, baby_name, metadata) VALUES ($1, $2, $3) RETURNING *',
      [babyId, babyName, JSON.stringify(metadata)]
    );
    return result.rows[0];
  },

  async findBabyById(babyId) {
    const db = await getClient();
    const result = await db.query('SELECT * FROM babies WHERE baby_id = $1', [babyId]);
    return result.rows[0];
  },

  async createParent(babyId, name, phone, password) {
    const db = await getClient();
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO parents (baby_id, name, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      [babyId, name, phone, hashedPassword]
    );
    return result.rows[0];
  },

  async findParentById(id) {
    const db = await getClient();
    const result = await db.query('SELECT * FROM parents WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findParentByPhone(phone) {
    const db = await getClient();
    const result = await db.query('SELECT * FROM parents WHERE phone = $1', [phone]);
    return result.rows[0];
  },

  async getParentsByBabyId(babyId) {
    const db = await getClient();
    const result = await db.query('SELECT * FROM parents WHERE baby_id = $1', [babyId]);
    return result.rows;
  },

  async verifyParentPassword(id, password) {
    const parent = await this.findParentById(id);
    if (!parent) return false;
    return bcrypt.compare(password, parent.password_hash);
  },

  async createInvitation(code, babyId, babyName, caregiverRole, pinCode) {
    const db = await getClient();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const pinCodeHash = pinCode ? await bcrypt.hash(pinCode, 10) : null;
    
    const result = await db.query(
      'INSERT INTO invitations (code, baby_id, baby_name, caregiver_role, expires_at, pin_code_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [code, babyId, babyName, caregiverRole, expiresAt, pinCodeHash]
    );
    return result.rows[0];
  },

  async findInvitationByCode(code) {
    const db = await getClient();
    const result = await db.query('SELECT * FROM invitations WHERE code = $1', [code]);
    return result.rows[0];
  },

  async claimInvitation(code, parentId) {
    const db = await getClient();
    const result = await db.query(
      'UPDATE invitations SET status = $1, claimed_at = CURRENT_TIMESTAMP, claimed_parent_id = $2 WHERE code = $3 RETURNING *',
      ['claimed', parentId, code]
    );
    return result.rows[0];
  },

  async createMessage(babyId, senderType, senderName, senderId, content) {
    const db = await getClient();
    const result = await db.query(
      'INSERT INTO messages (baby_id, sender_type, sender_name, sender_id, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [babyId, senderType, senderName, senderId, content]
    );
    return result.rows[0];
  },

  async getMessagesByBabyId(babyId, limit = 50) {
    const db = await getClient();
    const result = await db.query(
      'SELECT * FROM messages WHERE baby_id = $1 ORDER BY created_at DESC LIMIT $2',
      [babyId, limit]
    );
    return result.rows;
  },

  async createCameraAccess(babyId, parentId, parentName) {
    const db = await getClient();
    const result = await db.query(
      'INSERT INTO camera_access (baby_id, parent_id, parent_name, status, pending_request) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [babyId, parentId, parentName, 'pending', true]
    );
    return result.rows[0];
  },

  async getCameraAccessByBabyId(babyId) {
    const db = await getClient();
    const result = await db.query('SELECT * FROM camera_access WHERE baby_id = $1', [babyId]);
    return result.rows;
  },

  async updateCameraAccessStatus(id, status) {
    const db = await getClient();
    const result = await db.query(
      'UPDATE camera_access SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  },

  // Notification operations for parent notifications (with baby_id)
  async createNotification(babyId, type, severity, title, message, data = null) {
    const db = await getClient();
    const fingerprint = crypto.createHash('sha256')
      .update(`${babyId}-${type}-${title}-${message}`)
      .digest('hex');

    try {
      const result = await db.query(
        'INSERT INTO notifications (baby_id, type, severity, title, message, data, fingerprint) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [babyId, type, severity, title, message, data, fingerprint]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        // Duplicate fingerprint - return existing notification
        const result = await db.query('SELECT * FROM notifications WHERE fingerprint = $1', [fingerprint]);
        return result.rows[0];
      }
      throw error;
    }
  },

  async getNotificationsByBabyId(babyId, limit = 50) {
    const db = await getClient();
    const result = await db.query(
      'SELECT * FROM notifications WHERE baby_id = $1 ORDER BY created_at DESC LIMIT $2',
      [babyId, limit]
    );
    return result.rows;
  },

  async getUnreadNotificationsByBabyId(babyId) {
    const db = await getClient();
    const result = await db.query(
      'SELECT * FROM notifications WHERE baby_id = $1 AND is_read = FALSE ORDER BY created_at DESC',
      [babyId]
    );
    return result.rows;
  },

  async markNotificationAsRead(id) {
    const db = await getClient();
    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async markAllNotificationsAsRead(babyId) {
    const db = await getClient();
    await db.query(
      'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE baby_id = $1 AND is_read = FALSE',
      [babyId]
    );
  }
};

// Admin notifications (baby_id = NULL)
const adminNotifications = {
  async create(type, severity, title, message, data = null) {
    const db = await getClient();
    const fingerprint = crypto.createHash('sha256')
      .update(`admin-${type}-${title}-${message}`)
      .digest('hex');

    try {
      const result = await db.query(
        'INSERT INTO notifications (baby_id, type, severity, title, message, data, fingerprint) VALUES (NULL, $1, $2, $3, $4, $5, $6) RETURNING *',
        [type, severity, title, message, data, fingerprint]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        const result = await db.query('SELECT * FROM notifications WHERE fingerprint = $1', [fingerprint]);
        return result.rows[0];
      }
      throw error;
    }
  },

  async getAll(limit = 100) {
    const db = await getClient();
    const result = await db.query(
      'SELECT * FROM notifications WHERE baby_id IS NULL ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  },

  async getUnread() {
    const db = await getClient();
    const result = await db.query(
      'SELECT * FROM notifications WHERE baby_id IS NULL AND is_read = FALSE ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async markAsRead(id) {
    const db = await getClient();
    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async markAllAsRead() {
    const db = await getClient();
    await db.query(
      'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE baby_id IS NULL AND is_read = FALSE'
    );
  },

  async delete(id) {
    const db = await getClient();
    await db.query('DELETE FROM notifications WHERE id = $1', [id]);
  }
};

module.exports = {
  getClient,
  admins,
  setupTokens,
  repository,
  adminNotifications
};
