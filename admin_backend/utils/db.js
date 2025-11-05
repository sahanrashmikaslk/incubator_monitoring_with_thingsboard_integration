const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const SETUP_TOKENS_FILE = path.join(DATA_DIR, 'setup_tokens.json');

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
function generateId() {
  return `admin_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
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
    throw new Error('Admin with this email already exists');
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
  generateId
};
