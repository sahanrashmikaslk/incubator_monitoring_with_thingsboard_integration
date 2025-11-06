const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const SETUP_TOKENS_FILE = path.join(DATA_DIR, 'setup_tokens.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read admins from file
function readAdmins() {
  ensureDataDir();
  if (!fs.existsSync(ADMINS_FILE)) {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  const data = fs.readFileSync(ADMINS_FILE, 'utf8');
  return JSON.parse(data);
}

// Write admins to file
function writeAdmins(admins) {
  ensureDataDir();
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
}

// Read setup tokens from file
function readSetupTokens() {
  ensureDataDir();
  if (!fs.existsSync(SETUP_TOKENS_FILE)) {
    fs.writeFileSync(SETUP_TOKENS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  const data = fs.readFileSync(SETUP_TOKENS_FILE, 'utf8');
  return JSON.parse(data);
}

// Write setup tokens to file
function writeSetupTokens(tokens) {
  ensureDataDir();
  fs.writeFileSync(SETUP_TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

// Notifications storage helpers
function readNotifications() {
  ensureDataDir();
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeNotifications(notifications) {
  ensureDataDir();
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
}

// Initialize default admin if no admins exist
async function initializeDefaultAdmin() {
  const admins = readAdmins();
  
  if (admins.length === 0) {
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
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    };
    
    admins.push(defaultAdmin);
    writeAdmins(admins);
    
    console.log(`✅ Default admin created: ${defaultAdmin.email}`);
    console.log(`   Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'}`);
  }
}

// Generate unique ID
function generateId(prefix = 'admin') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Find admin by email
function findAdminByEmail(email) {
  const admins = readAdmins();
  return admins.find(admin => admin.email.toLowerCase() === email.toLowerCase());
}

// Find admin by ID
function findAdminById(id) {
  const admins = readAdmins();
  return admins.find(admin => admin.id === id);
}

// Create admin
function createAdmin(adminData) {
  const admins = readAdmins();
  
  // Check if email already exists
  if (findAdminByEmail(adminData.email)) {
    return null;
  }
  
  const newAdmin = {
    id: generateId(),
    ...adminData,
    role: 'admin',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  admins.push(newAdmin);
  writeAdmins(admins);
  
  return newAdmin;
}

// Update admin
function updateAdmin(id, updates) {
  const admins = readAdmins();
  const index = admins.findIndex(admin => admin.id === id);
  
  if (index === -1) {
    throw new Error('Admin not found');
  }
  
  admins[index] = {
    ...admins[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  writeAdmins(admins);
  return admins[index];
}

// Delete admin
function deleteAdmin(id) {
  const admins = readAdmins();
  const filteredAdmins = admins.filter(admin => admin.id !== id);
  
  if (admins.length === filteredAdmins.length) {
    throw new Error('Admin not found');
  }
  
  writeAdmins(filteredAdmins);
  return true;
}

// Get all admins
function getAllAdmins() {
  return readAdmins();
}

// Setup token operations
function createSetupToken(tokenData) {
  const tokens = readSetupTokens();
  
  const newToken = {
    ...tokenData,
    id: generateId(),
    createdAt: new Date().toISOString()
  };
  
  tokens.push(newToken);
  writeSetupTokens(tokens);
  
  return newToken;
}

function findSetupToken(token, email) {
  const tokens = readSetupTokens();
  return tokens.find(t => t.token === token && t.email === email && !t.used);
}

function markTokenAsUsed(token) {
  const tokens = readSetupTokens();
  const index = tokens.findIndex(t => t.token === token);
  
  if (index !== -1) {
    tokens[index].used = true;
    tokens[index].usedAt = new Date().toISOString();
    writeSetupTokens(tokens);
  }
}

function cleanExpiredTokens() {
  const tokens = readSetupTokens();
  const now = new Date();
  const expiryHours = 24;
  
  const validTokens = tokens.filter(token => {
    const createdAt = new Date(token.createdAt);
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    return hoursSinceCreation < expiryHours;
  });
  
  if (validTokens.length !== tokens.length) {
    writeSetupTokens(validTokens);
    console.log(`🧹 Cleaned ${tokens.length - validTokens.length} expired setup tokens`);
  }
}



function getAdminNotifications() {
  const notifications = readNotifications();
  return notifications
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

function createAdminNotification(notificationData = {}) {
  const notifications = readNotifications();
  const now = new Date().toISOString();
  const fingerprint = notificationData.fingerprint
    ? String(notificationData.fingerprint).trim()
    : null;

  let existing = null;
  if (fingerprint) {
    existing = notifications.find((entry) => entry.fingerprint === fingerprint);
  }

  if (existing) {
    existing.title = notificationData.title || existing.title;
    existing.message = notificationData.message || existing.message;
    existing.severity = notificationData.severity || existing.severity || 'info';
    existing.source = notificationData.source || existing.source || 'system';
    existing.metadata = (
      notificationData.metadata !== undefined ? notificationData.metadata : existing.metadata || null
    );
    existing.read = false;
    existing.readAt = null;
    existing.updatedAt = now;
    existing.lastTriggeredAt = notificationData.occurredAt || now;
    existing.count = typeof existing.count === 'number' ? existing.count + 1 : 2;

    writeNotifications(notifications);
    return existing;
  }

  const newNotification = {
    id: generateId('notif'),
    title: notificationData.title || 'System notification',
    message: notificationData.message || '',
    severity: notificationData.severity || 'info',
    source: notificationData.source || 'system',
    fingerprint,
    metadata: notificationData.metadata !== undefined ? notificationData.metadata : null,
    read: false,
    readAt: null,
    createdAt: now,
    updatedAt: now,
    lastTriggeredAt: notificationData.occurredAt || now,
    count: 1
  };

  notifications.unshift(newNotification);
  if (notifications.length > 100) {
    notifications.length = 100;
  }
  writeNotifications(notifications);
  return newNotification;
}

function markAdminNotificationsRead(ids = []) {
  const notifications = readNotifications();
  const targetIds = Array.isArray(ids) && ids.length > 0 ? new Set(ids) : null;
  if (targetIds && targetIds.size === 0) {
    return notifications;
  }

  const now = new Date().toISOString();
  let changed = false;

  const updated = notifications.map((notification) => {
    const shouldMark = targetIds ? targetIds.has(notification.id) : true;
    if (shouldMark && !notification.read) {
      changed = true;
      return {
        ...notification,
        read: true,
        readAt: now
      };
    }
    return notification;
  });

  if (changed) {
    writeNotifications(updated);
    return updated;
  }

  return notifications;
}
module.exports = {
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
  generateId
};
