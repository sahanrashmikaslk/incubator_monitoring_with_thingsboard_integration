import pkg from 'pg';
const { Pool } = pkg;

// Get configuration from environment variables
const isProduction = process.env.NODE_ENV === 'production';
const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
const DB_NAME = process.env.DB_NAME || 'parent_db';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;

// Create connection pool
const pool = new Pool(
  isProduction && connectionName
    ? {
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        host: `/cloudsql/${connectionName}`,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        host: 'localhost',
        port: 5432,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
);

// Test connection on startup
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
});

// Schema initialization
async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create babies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS babies (
        baby_id TEXT PRIMARY KEY,
        baby_name TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create parents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS parents (
        id SERIAL PRIMARY KEY,
        baby_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE
      )
    `);

    // Create invitations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        code TEXT PRIMARY KEY,
        baby_id TEXT NOT NULL,
        baby_name TEXT,
        caregiver_role TEXT DEFAULT 'parent',
        expires_at TIMESTAMPTZ NOT NULL,
        pin_code_hash TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        claimed_at TIMESTAMPTZ,
        claimed_parent_id INTEGER,
        FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE,
        FOREIGN KEY (claimed_parent_id) REFERENCES parents(id) ON DELETE SET NULL
      )
    `);

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        baby_id TEXT NOT NULL,
        sender_type TEXT NOT NULL,
        sender_name TEXT,
        sender_id INTEGER,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE
      )
    `);

    // Create camera_access table
    await client.query(`
      CREATE TABLE IF NOT EXISTS camera_access (
        id SERIAL PRIMARY KEY,
        baby_id TEXT NOT NULL,
        parent_id INTEGER NOT NULL,
        parent_name TEXT,
        status TEXT NOT NULL DEFAULT 'revoked',
        pending_request BOOLEAN NOT NULL DEFAULT FALSE,
        requested_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (baby_id) REFERENCES babies(baby_id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
        UNIQUE (baby_id, parent_id)
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_baby_id_created
        ON messages (baby_id, created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invitations_status
        ON invitations (status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_camera_access_pending
        ON camera_access (pending_request, requested_at DESC)
    `);

    await client.query('COMMIT');
    console.log('📊 Parent database schema initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Repository functions
export const repository = {
  async upsertBaby(babyId, babyName, metadata = null) {
    const result = await pool.query(
      `INSERT INTO babies (baby_id, baby_name, metadata)
       VALUES ($1, $2, $3)
       ON CONFLICT(baby_id) DO UPDATE SET
         baby_name = EXCLUDED.baby_name,
         metadata = EXCLUDED.metadata
       RETURNING *`,
      [babyId, babyName, metadata ? JSON.stringify(metadata) : null]
    );
    return result.rows[0];
  },

  async getBaby(babyId) {
    const result = await pool.query(
      'SELECT * FROM babies WHERE baby_id = $1',
      [babyId]
    );
    return result.rows[0];
  },

  async createInvitation({ code, babyId, babyName, caregiverRole, expiresAt, pinCodeHash }) {
    const result = await pool.query(
      `INSERT INTO invitations (code, baby_id, baby_name, caregiver_role, expires_at, pin_code_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [code, babyId, babyName || null, caregiverRole || 'parent', expiresAt, pinCodeHash || null]
    );
    return result.rows[0];
  },

  async getInvitation(code) {
    const result = await pool.query(
      'SELECT * FROM invitations WHERE code = $1',
      [code]
    );
    return result.rows[0];
  },

  async markInvitationClaimed(code, parentId) {
    const result = await pool.query(
      `UPDATE invitations
       SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP, claimed_parent_id = $2
       WHERE code = $1
       RETURNING *`,
      [code, parentId]
    );
    return result.rows[0];
  },

  async expireInvitation(code) {
    const result = await pool.query(
      `UPDATE invitations
       SET status = 'expired'
       WHERE code = $1
       RETURNING *`,
      [code]
    );
    return result.rows[0];
  },

  async createParent({ babyId, name, phone, passwordHash }) {
    const result = await pool.query(
      `INSERT INTO parents (baby_id, name, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [babyId, name, phone, passwordHash]
    );

    const parentId = result.rows[0].id;
    await this.ensureCameraAccessRow({ babyId, parentId, parentName: name });
    return parentId;
  },

  async getParentByPhone(phone) {
    const result = await pool.query(
      'SELECT * FROM parents WHERE phone = $1',
      [phone]
    );
    return result.rows[0];
  },

  async getParentById(id) {
    const result = await pool.query(
      'SELECT * FROM parents WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async listParentsForBaby(babyId) {
    const result = await pool.query(
      `SELECT id, name, phone, created_at
       FROM parents
       WHERE baby_id = $1
       ORDER BY created_at DESC`,
      [babyId]
    );
    return result.rows;
  },

  async createMessage({ babyId, senderType, senderName, senderId, content }) {
    const result = await pool.query(
      `INSERT INTO messages (baby_id, sender_type, sender_name, sender_id, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [babyId, senderType, senderName || null, senderId || null, content]
    );
    return result.rows[0].id;
  },

  async listMessagesForBaby({ babyId, limit = 50, offset = 0 }) {
    const result = await pool.query(
      `SELECT id, baby_id, sender_type, sender_name, sender_id, content, created_at
       FROM messages
       WHERE baby_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [babyId, limit, offset]
    );
    return result.rows;
  },

  async ensureCameraAccessRow({ babyId, parentId, parentName }) {
    await pool.query(
      `INSERT INTO camera_access (baby_id, parent_id, parent_name, status, pending_request, requested_at)
       VALUES ($1, $2, $3, 'revoked', FALSE, NULL)
       ON CONFLICT (baby_id, parent_id) DO NOTHING`,
      [babyId, parentId, parentName || null]
    );
  },

  async getCameraAccessForParent(parentId) {
    const result = await pool.query(
      `SELECT p.id AS parent_id,
              p.name AS parent_name,
              p.phone,
              p.baby_id,
              COALESCE(ca.status, 'revoked') AS status,
              COALESCE(ca.pending_request, FALSE) AS pending_request,
              ca.requested_at,
              ca.updated_at
       FROM parents p
       LEFT JOIN camera_access ca ON ca.parent_id = p.id AND ca.baby_id = p.baby_id
       WHERE p.id = $1`,
      [parentId]
    );
    return result.rows[0] || null;
  },

  async recordCameraAccessRequest({ babyId, parentId, parentName }) {
    await this.ensureCameraAccessRow({ babyId, parentId, parentName });
    
    const existingResult = await pool.query(
      'SELECT * FROM camera_access WHERE baby_id = $1 AND parent_id = $2',
      [babyId, parentId]
    );
    const existing = existingResult.rows[0];
    
    if (existing && existing.pending_request) {
      return { ...existing, already_pending: true };
    }

    const now = new Date().toISOString();
    await pool.query(
      `UPDATE camera_access
       SET pending_request = TRUE,
           requested_at = $3,
           parent_name = COALESCE($4, parent_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE baby_id = $1 AND parent_id = $2`,
      [babyId, parentId, now, parentName || null]
    );

    const updatedResult = await pool.query(
      'SELECT * FROM camera_access WHERE baby_id = $1 AND parent_id = $2',
      [babyId, parentId]
    );
    const updated = updatedResult.rows[0];
    return updated ? { ...updated, already_pending: false } : null;
  },

  async updateCameraAccessStatus({ babyId, parentId, parentName, status }) {
    const normalizedStatus = status === 'granted' ? 'granted' : 'revoked';
    await this.ensureCameraAccessRow({ babyId, parentId, parentName });
    
    await pool.query(
      `UPDATE camera_access
       SET status = $3,
           pending_request = FALSE,
           requested_at = NULL,
           parent_name = COALESCE($4, parent_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE baby_id = $1 AND parent_id = $2`,
      [babyId, parentId, normalizedStatus, parentName || null]
    );

    const updatedResult = await pool.query(
      'SELECT * FROM camera_access WHERE baby_id = $1 AND parent_id = $2',
      [babyId, parentId]
    );
    const updated = updatedResult.rows[0];
    return updated ? { ...updated, already_pending: false } : null;
  },

  async listCameraAccessQueue() {
    const result = await pool.query(
      `SELECT p.id AS parent_id,
              p.name AS parent_name,
              p.phone,
              p.baby_id,
              COALESCE(ca.status, 'revoked') AS status,
              COALESCE(ca.pending_request, FALSE) AS pending_request,
              ca.requested_at,
              ca.updated_at,
              p.created_at AS parent_created_at
       FROM parents p
       LEFT JOIN camera_access ca ON ca.parent_id = p.id AND ca.baby_id = p.baby_id
       ORDER BY COALESCE(ca.pending_request, FALSE) DESC,
                COALESCE(ca.requested_at, p.created_at) DESC`
    );
    
    return result.rows.map(item => ({
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

// Auto-initialize on module load
(async () => {
  try {
    console.log('🔄 Initializing PostgreSQL parent database...');
    console.log('   Connection:', connectionName || 'localhost:5432');
    console.log('   Database:', DB_NAME);
    await initializeSchema();
    console.log('✅ PostgreSQL parent database ready');
  } catch (error) {
    console.error('❌ Failed to initialize parent database:', error.message);
    console.error('   Continuing anyway - database may not be ready');
  }
})();

export default pool;
