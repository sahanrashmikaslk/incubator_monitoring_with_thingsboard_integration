const jwt = require('jsonwebtoken');
const { findAdminById } = require('./db');

// Verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    req.admin = findAdminById(decoded.id);
    
    if (!req.admin) {
      return res.status(401).json({ error: 'Admin not found' });
    }
    
    if (req.admin.status !== 'active') {
      return res.status(403).json({ error: 'Account not active' });
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = {
  verifyToken
};
