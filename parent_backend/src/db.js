import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'parent_portal.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS babies (
    baby_id TEXT PRIMARY KEY,
    baby_name TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS parents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE
  );

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

  CREATE INDEX IF NOT EXISTS idx_messages_baby_id_created
    ON messages (baby_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_invitations_status
    ON invitations (status);

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

  CREATE INDEX IF NOT EXISTS idx_camera_access_pending
    ON camera_access (pending_request, requested_at DESC);
`);

try {
  db.prepare('SELECT pin_code_hash FROM invitations LIMIT 1');
} catch (error) {
  db.exec('ALTER TABLE invitations ADD COLUMN pin_code_hash TEXT');
}

const statements = {
  upsertBaby: db.prepare(`
    INSERT INTO babies (baby_id, baby_name, metadata)
    VALUES (@baby_id, @baby_name, @metadata)
    ON CONFLICT(baby_id) DO UPDATE SET
      baby_name = excluded.baby_name,
      metadata = excluded.metadata
  `),
  getBaby: db.prepare('SELECT * FROM babies WHERE baby_id = ?'),
  createInvitation: db.prepare(`
    INSERT INTO invitations (code, baby_id, baby_name, caregiver_role, expires_at, pin_code_hash, status)
    VALUES (@code, @baby_id, @baby_name, @caregiver_role, @expires_at, @pin_code_hash, 'pending')
  `),
  getInvitation: db.prepare('SELECT * FROM invitations WHERE code = ?'),
  markInvitationClaimed: db.prepare(`
    UPDATE invitations
    SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP, claimed_parent_id = @parentId
    WHERE code = @code
  `),
  expireInvitation: db.prepare(`
    UPDATE invitations
    SET status = 'expired'
    WHERE code = ?
  `),
  createParent: db.prepare(`
    INSERT INTO parents (baby_id, name, phone, password_hash)
    VALUES (@baby_id, @name, @phone, @password_hash)
  `),
  getParentByPhone: db.prepare('SELECT * FROM parents WHERE phone = ?'),
  getParentById: db.prepare('SELECT * FROM parents WHERE id = ?'),
  listParentsForBaby: db.prepare(`
    SELECT id, name, phone, created_at
    FROM parents
    WHERE baby_id = ?
    ORDER BY created_at DESC
  `),
  createMessage: db.prepare(`
    INSERT INTO messages (baby_id, sender_type, sender_name, sender_id, content)
    VALUES (@baby_id, @sender_type, @sender_name, @sender_id, @content)
  `),
  listMessagesForBaby: db.prepare(`
    SELECT id, baby_id, sender_type, sender_name, sender_id, content, created_at
    FROM messages
    WHERE baby_id = @babyId
    ORDER BY created_at DESC
    LIMIT @limit OFFSET @offset
  `),
  insertCameraAccess: db.prepare(`
    INSERT OR IGNORE INTO camera_access (baby_id, parent_id, parent_name, status, pending_request, requested_at)
    VALUES (@baby_id, @parent_id, @parent_name, @status, @pending_request, @requested_at)
  `),
  setCameraAccessPending: db.prepare(`
    UPDATE camera_access
    SET pending_request = 1,
        requested_at = @requested_at,
        parent_name = COALESCE(@parent_name, parent_name),
        updated_at = CURRENT_TIMESTAMP
    WHERE baby_id = @baby_id AND parent_id = @parent_id
  `),
  updateCameraAccessStatus: db.prepare(`
    UPDATE camera_access
    SET status = @status,
        pending_request = 0,
        requested_at = NULL,
        parent_name = COALESCE(@parent_name, parent_name),
        updated_at = CURRENT_TIMESTAMP
    WHERE baby_id = @baby_id AND parent_id = @parent_id
  `),
  getCameraAccessByParent: db.prepare(`
    SELECT p.id AS parent_id,
           p.name AS parent_name,
           p.phone,
           p.baby_id,
           COALESCE(ca.status, 'revoked') AS status,
           COALESCE(ca.pending_request, 0) AS pending_request,
           ca.requested_at,
           ca.updated_at
    FROM parents p
    LEFT JOIN camera_access ca ON ca.parent_id = p.id AND ca.baby_id = p.baby_id
    WHERE p.id = ?
  `),
  getCameraAccessPair: db.prepare(`
    SELECT id,
           baby_id,
           parent_id,
           parent_name,
           status,
           pending_request,
           requested_at,
           updated_at
    FROM camera_access
    WHERE baby_id = @baby_id AND parent_id = @parent_id
  `),
  listCameraAccessQueue: db.prepare(`
    SELECT p.id AS parent_id,
           p.name AS parent_name,
           p.phone,
           p.baby_id,
           COALESCE(ca.status, 'revoked') AS status,
           COALESCE(ca.pending_request, 0) AS pending_request,
           ca.requested_at,
           ca.updated_at,
           p.created_at AS parent_created_at
    FROM parents p
    LEFT JOIN camera_access ca ON ca.parent_id = p.id AND ca.baby_id = p.baby_id
    ORDER BY COALESCE(ca.pending_request, 0) DESC,
             COALESCE(ca.requested_at, p.created_at) DESC
  `)
};

export const repository = {
  upsertBaby(babyId, babyName, metadata = null) {
    statements.upsertBaby.run({
      baby_id: babyId,
      baby_name: babyName,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
  },

  getBaby(babyId) {
    return statements.getBaby.get(babyId);
  },

  createInvitation({ code, babyId, babyName, caregiverRole, expiresAt, pinCodeHash }) {
    statements.createInvitation.run({
      code,
      baby_id: babyId,
      baby_name: babyName || null,
      caregiver_role: caregiverRole || 'parent',
      expires_at: expiresAt,
      pin_code_hash: pinCodeHash || null
    });
  },

  getInvitation(code) {
    return statements.getInvitation.get(code);
  },

  markInvitationClaimed(code, parentId) {
    statements.markInvitationClaimed.run({ code, parentId });
  },

  expireInvitation(code) {
    statements.expireInvitation.run(code);
  },

  createParent({ babyId, name, phone, passwordHash }) {
    const result = statements.createParent.run({
      baby_id: babyId,
      name,
      phone,
      password_hash: passwordHash
    });

    const parentId = result.lastInsertRowid;
    this.ensureCameraAccessRow({ babyId, parentId, parentName: name });
    return parentId;
  },

  getParentByPhone(phone) {
    return statements.getParentByPhone.get(phone);
  },

  getParentById(id) {
    return statements.getParentById.get(id);
  },

  listParentsForBaby(babyId) {
    return statements.listParentsForBaby.all(babyId);
  },

  createMessage({ babyId, senderType, senderName, senderId, content }) {
    const result = statements.createMessage.run({
      baby_id: babyId,
      sender_type: senderType,
      sender_name: senderName || null,
      sender_id: senderId || null,
      content
    });
    return result.lastInsertRowid;
  },

  listMessagesForBaby({ babyId, limit = 50, offset = 0 }) {
    return statements.listMessagesForBaby.all({ babyId, limit, offset });
  },

  ensureCameraAccessRow({ babyId, parentId, parentName }) {
    statements.insertCameraAccess.run({
      baby_id: babyId,
      parent_id: parentId,
      parent_name: parentName || null,
      status: 'revoked',
      pending_request: 0,
      requested_at: null
    });
  },

  getCameraAccessForParent(parentId) {
    return statements.getCameraAccessByParent.get(parentId) || null;
  },

  recordCameraAccessRequest({ babyId, parentId, parentName }) {
    this.ensureCameraAccessRow({ babyId, parentId, parentName });
    const existing = statements.getCameraAccessPair.get({ baby_id: babyId, parent_id: parentId });
    if (existing && existing.pending_request) {
      return { ...existing, already_pending: true };
    }

    const now = new Date().toISOString();
    statements.setCameraAccessPending.run({
      baby_id: babyId,
      parent_id: parentId,
      parent_name: parentName || null,
      requested_at: now
    });

    const updated = statements.getCameraAccessPair.get({ baby_id: babyId, parent_id: parentId });
    return updated ? { ...updated, already_pending: false } : null;
  },

  updateCameraAccessStatus({ babyId, parentId, parentName, status }) {
    const normalizedStatus = status === 'granted' ? 'granted' : 'revoked';
    this.ensureCameraAccessRow({ babyId, parentId, parentName });
    statements.updateCameraAccessStatus.run({
      baby_id: babyId,
      parent_id: parentId,
      parent_name: parentName || null,
      status: normalizedStatus
    });

    const updated = statements.getCameraAccessPair.get({ baby_id: babyId, parent_id: parentId });
    return updated ? { ...updated, already_pending: false } : null;
  },

  listCameraAccessQueue() {
    return statements.listCameraAccessQueue.all().map(item => ({
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
  }
};

export default db;
