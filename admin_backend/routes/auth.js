const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const {
  findAdminByEmail,
  updateAdmin,
  createSetupToken,
  findSetupToken,
  markTokenAsUsed
} = require('../utils/db');

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find admin by email
    const admin = findAdminByEmail(email);
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if account is active
    if (admin.status !== 'active') {
      return res.status(403).json({ error: 'Account not activated. Please complete password setup.' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Update last login
    updateAdmin(admin.id, { lastLoginAt: new Date().toISOString() });
    
    // Return user data (without password)
    const { password: _, ...adminData } = admin;
    
    res.json({
      success: true,
      token,
      admin: adminData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify setup token
router.post('/verify-setup-token', async (req, res) => {
  try {
    const { token, email } = req.body;
    
    if (!token || !email) {
      return res.status(400).json({ error: 'Token and email are required' });
    }
    
    // Find setup token
    const setupToken = findSetupToken(token, email);
    
    if (!setupToken) {
      return res.status(404).json({ error: 'Invalid or expired setup link' });
    }
    
    // Check if token is expired (24 hours)
    const createdAt = new Date(setupToken.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 24) {
      return res.status(410).json({ error: 'Setup link has expired' });
    }
    
    // Find admin
    const admin = findAdminByEmail(email);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    if (admin.status === 'active') {
      return res.status(400).json({ error: 'Account already activated' });
    }
    
    // Return admin data (without password)
    const { password: _, ...adminData } = admin;
    
    res.json({
      success: true,
      admin: adminData
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

// Set password (complete account setup)
router.post('/setup-password', async (req, res) => {
  try {
    const { token, email, password } = req.body;
    
    if (!token || !email || !password) {
      return res.status(400).json({ error: 'Token, email, and password are required' });
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Find and verify setup token
    const setupToken = findSetupToken(token, email);
    
    if (!setupToken) {
      return res.status(404).json({ error: 'Invalid or expired setup link' });
    }
    
    // Check if token is expired
    const createdAt = new Date(setupToken.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 24) {
      return res.status(410).json({ error: 'Setup link has expired' });
    }
    
    // Find admin
    const admin = findAdminByEmail(email);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    if (admin.status === 'active') {
      return res.status(400).json({ error: 'Account already activated' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update admin
    updateAdmin(admin.id, {
      password: hashedPassword,
      status: 'active',
      activatedAt: new Date().toISOString()
    });
    
    // Mark token as used
    markTokenAsUsed(token);
    
    res.json({
      success: true,
      message: 'Password set successfully. You can now login.'
    });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({ error: 'Password setup failed' });
  }
});

// Verify current token (check if logged in)
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = findAdminByEmail(decoded.email);
    
    if (!admin || admin.status !== 'active') {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    const { password: _, ...adminData } = admin;
    
    res.json({
      success: true,
      admin: adminData
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
