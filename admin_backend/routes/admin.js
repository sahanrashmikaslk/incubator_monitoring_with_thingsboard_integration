const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../utils/auth');
const {
  createAdmin,
  getAllAdmins,
  findAdminById,
  updateAdmin,
  deleteAdmin,
  createSetupToken
} = require('../utils/db');

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(verifyToken);

// Create new admin
router.post('/create', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Create admin (with pending status)
    const adminData = {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password: '', // Will be set during setup
      role: 'admin', // Always admin role
      status: 'pending',
      createdBy: req.admin.email
    };
    
    const newAdmin = createAdmin(adminData);
    
    if (!newAdmin) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Generate setup token
    const setupToken = uuidv4();
    createSetupToken({
      token: setupToken,
      email: newAdmin.email,
      createdBy: req.admin.email
    });
    
    // Generate setup link
    const setupLink = `${process.env.CORS_ORIGIN}/setup-password?token=${setupToken}&email=${encodeURIComponent(newAdmin.email)}`;
    
    // Return admin data (without password)
    const { password: _, ...adminResponse } = newAdmin;
    
    res.json({
      success: true,
      admin: adminResponse,
      setupToken,
      setupLink
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// List all admins
router.get('/list', async (req, res) => {
  try {
    const admins = getAllAdmins();
    
    // Remove passwords from response
    const adminsWithoutPasswords = admins.map(admin => {
      const { password, ...adminData } = admin;
      return adminData;
    });
    
    res.json({
      success: true,
      admins: adminsWithoutPasswords,
      count: adminsWithoutPasswords.length
    });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ error: 'Failed to list admins' });
  }
});

// Get admin by ID
router.get('/:id', async (req, res) => {
  try {
    const admin = findAdminById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Remove password from response
    const { password, ...adminData } = admin;
    
    res.json({
      success: true,
      admin: adminData
    });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ error: 'Failed to get admin' });
  }
});

// Update admin
router.put('/:id', async (req, res) => {
  try {
    const { name, status } = req.body;
    
    const admin = findAdminById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Prevent self-deactivation
    if (req.params.id === req.admin.id && status === 'inactive') {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }
    
    const updates = {};
    if (name) updates.name = name.trim();
    if (status && ['active', 'inactive', 'pending'].includes(status)) {
      updates.status = status;
    }
    
    const updatedAdmin = updateAdmin(req.params.id, updates);
    
    if (!updatedAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Remove password from response
    const { password, ...adminData } = updatedAdmin;
    
    res.json({
      success: true,
      admin: adminData
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Failed to update admin' });
  }
});

// Delete admin
router.delete('/:id', async (req, res) => {
  try {
    const admin = findAdminById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Prevent self-deletion
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Prevent deleting the last admin
    const allAdmins = getAllAdmins();
    if (allAdmins.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin account' });
    }
    
    const deleted = deleteAdmin(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// Get current admin info
router.get('/me', async (req, res) => {
  try {
    const { password, ...adminData } = req.admin;
    
    res.json({
      success: true,
      admin: adminData
    });
  } catch (error) {
    console.error('Get current admin error:', error);
    res.status(500).json({ error: 'Failed to get admin info' });
  }
});

module.exports = router;
