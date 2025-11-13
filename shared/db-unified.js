const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Create shared data directory
const dataDir = path.join(__dirname, '../shared_data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'incubator_system.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`📊 Using unified database at: ${dbPath}`);

// Create all tables in single database
db.exec(`
  -- Admins table
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
  );

  -- Babies table
  CREATE TABLE IF NOT EXISTS babies (
    baby_id TEXT PRIMARY KEY,
    baby_name TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Parents table
  CREATE TABLE IF NOT EXISTS parents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE
  );

  -- Invitations table
  CREATE TABLE IF NOT EXISTS invitations (
    code TEXT PRIMARY KEY,
    baby_id TEXT NOT NULL,
    baby_name TEXT,
    caregiver_role TEXT DEFAULT 'parent',
    expires_at DATETIME NOT NULL,
    pin_code_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    claimed_at DATETIME,
    claimed_parent_id INTEGER,
    FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE,
    FOREIGN KEY (claimed_parent_id) REFERENCES parents(id) ON DELETE SET NULL
  );

  -- Messages table
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    sender_name TEXT,
    sender_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE
  );

  -- Camera access table
  CREATE TABLE IF NOT EXISTS camera_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id TEXT NOT NULL,
    parent_id INTEGER NOT NULL,
    parent_name TEXT,
    status TEXT NOT NULL DEFAULT 'revoked',
    pending_request INTEGER NOT NULL DEFAULT 0,
    requested_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
    UNIQUE (baby_id, parent_id)
  );

  -- Notifications table (for both web & mobile)
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id TEXT,
    type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    fingerprint TEXT UNIQUE,
    FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE
  );

  -- Setup tokens table
  CREATE TABLE IF NOT EXISTS setup_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_messages_baby_id ON messages (baby_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations (status);
  CREATE INDEX IF NOT EXISTS idx_camera_access_pending ON camera_access (pending_request, requested_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_baby_id ON notifications (baby_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (baby_id, is_read, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_setup_tokens_used ON setup_tokens (used, expires_at);
`);

// Create default admin if none exists
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
if (adminCount.count === 0) {
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  const adminId = crypto.randomBytes(16).toString('hex');
  db.prepare(`
    INSERT INTO admins (id, email, password_hash, name, role, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin@incubator.local', defaultPassword, 'Default Admin', 'admin', 'active');
  console.log('✅ Created default admin: admin@incubator.local / admin123');
}

console.log('✅ Unified database initialized successfully');

// Helper function to generate IDs
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// ==================== ADMIN OPERATIONS ====================
const admins = {
  findById(id) {
    return db.prepare('SELECT * FROM admins WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  },

  create({ email, password, name, role = 'admin' }) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const id = generateId();
    db.prepare(`
      INSERT INTO admins (id, email, password_hash, name, role, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(id, email, passwordHash, name, role);
    return { id, email, name, role };
  },

  getAll() {
    return db.prepare('SELECT id, email, name, role, status, created_at, last_login_at FROM admins ORDER BY created_at DESC').all();
  },

  update(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.email) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.role) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.status) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.lastLoginAt) { fields.push('last_login_at = ?'); values.push(updates.lastLoginAt); }
    
    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE admins SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
  },

  delete(id) {
    db.prepare('DELETE FROM admins WHERE id = ?').run(id);
  },

  verifyPassword(admin, password) {
    return bcrypt.compareSync(password, admin.password_hash);
  }
};

// ==================== SETUP TOKENS ====================
const setupTokens = {
  create(email, expiresInHours = 24) {
    const token = generateId();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO setup_tokens (token, email, expires_at)
      VALUES (?, ?, ?)
    `).run(token, email, expiresAt);
    return { token, email, expiresAt };
  },

  findByToken(token) {
    return db.prepare('SELECT * FROM setup_tokens WHERE token = ?').get(token);
  },

  markUsed(token) {
    db.prepare('UPDATE setup_tokens SET used = 1, used_at = ? WHERE token = ?')
      .run(new Date().toISOString(), token);
  },

  cleanupExpired() {
    const result = db.prepare('DELETE FROM setup_tokens WHERE expires_at < ?')
      .run(new Date().toISOString());
    return result.changes;
  }
};

// ==================== PARENT/BABY OPERATIONS ====================
const repository = {
  // Baby operations
  upsertBaby(babyId, babyName, metadata = null) {
    db.prepare(`
      INSERT INTO babies (baby_id, baby_name, metadata)
      VALUES (?, ?, ?)
      ON CONFLICT(baby_id) DO UPDATE SET
        baby_name = excluded.baby_name,
        metadata = excluded.metadata
    `).run(babyId, babyName, metadata ? JSON.stringify(metadata) : null);
  },

  getBaby(babyId) {
    return db.prepare('SELECT * FROM babies WHERE baby_id = ?').get(babyId);
  },

  // Parent operations
  createParent({ babyId, name, phone, passwordHash }) {
    const result = db.prepare(`
      INSERT INTO parents (baby_id, name, phone, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(babyId, name, phone, passwordHash);
    
    const parentId = result.lastInsertRowid;
    this.ensureCameraAccessRow({ babyId, parentId, parentName: name });
    return parentId;
  },

  getParentByPhone(phone) {
    return db.prepare('SELECT * FROM parents WHERE phone = ?').get(phone);
  },

  getParentById(id) {
    return db.prepare('SELECT * FROM parents WHERE id = ?').get(id);
  },

  listParentsForBaby(babyId) {
    return db.prepare('SELECT id, name, phone, created_at FROM parents WHERE baby_id = ? ORDER BY created_at DESC').all(babyId);
  },

  // Invitation operations
  createInvitation({ code, babyId, babyName, caregiverRole, expiresAt, pinCodeHash }) {
    db.prepare(`
      INSERT INTO invitations (code, baby_id, baby_name, caregiver_role, expires_at, pin_code_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(code, babyId, babyName || null, caregiverRole || 'parent', expiresAt, pinCodeHash || null);
  },

  getInvitation(code) {
    return db.prepare('SELECT * FROM invitations WHERE code = ?').get(code);
  },

  markInvitationClaimed(code, parentId) {
    db.prepare(`
      UPDATE invitations
      SET status = 'claimed', claimed_at = ?, claimed_parent_id = ?
      WHERE code = ?
    `).run(new Date().toISOString(), parentId, code);
  },

  expireInvitation(code) {
    db.prepare("UPDATE invitations SET status = 'expired' WHERE code = ?").run(code);
  },

  // Message operations
  createMessage({ babyId, senderType, senderName, senderId, content }) {
    const result = db.prepare(`
      INSERT INTO messages (baby_id, sender_type, sender_name, sender_id, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(babyId, senderType, senderName || null, senderId || null, content);
    return result.lastInsertRowid;
  },

  listMessagesForBaby({ babyId, limit = 50, offset = 0 }) {
    return db.prepare(`
      SELECT * FROM messages
      WHERE baby_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(babyId, limit, offset);
  },

  // Camera access operations
  ensureCameraAccessRow({ babyId, parentId, parentName }) {
    db.prepare(`
      INSERT OR IGNORE INTO camera_access (baby_id, parent_id, parent_name, status, pending_request)
      VALUES (?, ?, ?, 'revoked', 0)
    `).run(babyId, parentId, parentName || null);
  },

  getCameraAccessForParent(parentId) {
    return db.prepare(`
      SELECT p.id AS parent_id, p.name AS parent_name, p.phone, p.baby_id,
             COALESCE(ca.status, 'revoked') AS status,
             COALESCE(ca.pending_request, 0) AS pending_request,
             ca.requested_at, ca.updated_at
      FROM parents p
      LEFT JOIN camera_access ca ON ca.parent_id = p.id AND ca.baby_id = p.baby_id
      WHERE p.id = ?
    `).get(parentId);
  },

  recordCameraAccessRequest({ babyId, parentId, parentName }) {
    this.ensureCameraAccessRow({ babyId, parentId, parentName });
    
    const existing = db.prepare('SELECT * FROM camera_access WHERE baby_id = ? AND parent_id = ?').get(babyId, parentId);
    if (existing?.pending_request) {
      return { ...existing, already_pending: true };
    }

    db.prepare(`
      UPDATE camera_access
      SET pending_request = 1, requested_at = ?, parent_name = COALESCE(?, parent_name), updated_at = ?
      WHERE baby_id = ? AND parent_id = ?
    `).run(new Date().toISOString(), parentName || null, new Date().toISOString(), babyId, parentId);

    const updated = db.prepare('SELECT * FROM camera_access WHERE baby_id = ? AND parent_id = ?').get(babyId, parentId);
    return updated ? { ...updated, already_pending: false } : null;
  },

  updateCameraAccessStatus({ babyId, parentId, parentName, status }) {
    const normalizedStatus = status === 'granted' ? 'granted' : 'revoked';
    this.ensureCameraAccessRow({ babyId, parentId, parentName });
    
    db.prepare(`
      UPDATE camera_access
      SET status = ?, pending_request = 0, requested_at = NULL,
          parent_name = COALESCE(?, parent_name), updated_at = ?
      WHERE baby_id = ? AND parent_id = ?
    `).run(normalizedStatus, parentName || null, new Date().toISOString(), babyId, parentId);

    const updated = db.prepare('SELECT * FROM camera_access WHERE baby_id = ? AND parent_id = ?').get(babyId, parentId);
    return updated ? { ...updated, already_pending: false } : null;
  },

  listCameraAccessQueue() {
    return db.prepare(`
      SELECT p.id AS parent_id, p.name AS parent_name, p.phone, p.baby_id,
             COALESCE(ca.status, 'revoked') AS status,
             COALESCE(ca.pending_request, 0) AS pending_request,
             ca.requested_at, ca.updated_at, p.created_at AS parent_created_at
      FROM parents p
      LEFT JOIN camera_access ca ON ca.parent_id = p.id AND ca.baby_id = p.baby_id
      ORDER BY COALESCE(ca.pending_request, 0) DESC,
               COALESCE(ca.requested_at, p.created_at) DESC
    `).all().map(item => ({
      parentId: item.parent_id,
      parentName: item.parent_name,
      phone: item.phone,
      babyId: item.baby_id,
      status: item.status,
      pendingRequest: Boolean(item.pending_request),
      requestedAt: item.requested_at,
      updatedAt: item.updated_at,
      parentCreatedAt: item.parent_created_at
    }));
  },

  // Notification operations
  createNotification({ babyId, type, severity = 'info', title, message, data = null }) {
    const fingerprint = crypto.createHash('sha256')
      .update(`${type}-${title}-${message}`)
      .digest('hex');

    try {
      const result = db.prepare(`
        INSERT INTO notifications (baby_id, type, severity, title, message, data, fingerprint)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(babyId, type, severity, title, message, data ? JSON.stringify(data) : null, fingerprint);
      return result.lastInsertRowid;
    } catch (error) {
      // Duplicate fingerprint - notification already exists
      return null;
    }
  },

  listNotifications({ babyId, limit = 50, offset = 0 }) {
    return db.prepare(`
      SELECT * FROM notifications
      WHERE baby_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(babyId, limit, offset).map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null,
      isRead: Boolean(row.is_read)
    }));
  },

  listUnreadNotifications(babyId) {
    return db.prepare(`
      SELECT * FROM notifications
      WHERE baby_id = ? AND is_read = 0
      ORDER BY created_at DESC
    `).all(babyId).map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null,
      isRead: false
    }));
  },

  markNotificationRead(id) {
    db.prepare('UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  },

  markAllNotificationsRead(babyId) {
    db.prepare('UPDATE notifications SET is_read = 1, read_at = ? WHERE baby_id = ?')
      .run(new Date().toISOString(), babyId);
  }
};

// ==================== ADMIN NOTIFICATIONS ====================
const adminNotifications = {
  create({ type, title, message, severity = 'info', data = null }) {
    const fingerprint = crypto.createHash('sha256')
      .update(`${type}-${title}-${message}`)
      .digest('hex');

    try {
      const result = db.prepare(`
        INSERT INTO notifications (baby_id, type, severity, title, message, data, fingerprint)
        VALUES (NULL, ?, ?, ?, ?, ?, ?)
      `).run(type, severity, title, message, data ? JSON.stringify(data) : null, fingerprint);
      return result.lastInsertRowid;
    } catch (error) {
      return null;
    }
  },

  getAll(limit = 100) {
    return db.prepare(`
      SELECT * FROM notifications
      WHERE baby_id IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit).map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null,
      isRead: Boolean(row.is_read)
    }));
  },

  getUnread() {
    return db.prepare(`
      SELECT * FROM notifications
      WHERE baby_id IS NULL AND is_read = 0
      ORDER BY created_at DESC
    `).all().map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null,
      isRead: false
    }));
  },

  markAsRead(id) {
    db.prepare('UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  },

  markAllAsRead() {
    const result = db.prepare('UPDATE notifications SET is_read = 1, read_at = ? WHERE baby_id IS NULL AND is_read = 0')
      .run(new Date().toISOString());
    return result.changes;
  },

  delete(id) {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
  }
};

module.exports = {
  db,
  admins,
  setupTokens,
  repository,
  adminNotifications
};
