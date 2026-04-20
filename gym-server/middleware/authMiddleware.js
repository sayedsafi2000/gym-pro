const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    req.admin = await Admin.findById(decoded.id).select('-password');
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Admin account not found' });
    }
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.admin) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (!roles.includes(req.admin.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

const requirePermission = (permission) => (req, res, next) => {
  if (!req.admin) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (req.admin.role === 'super_admin') return next();
  if (req.admin.permissions && req.admin.permissions[permission]) return next();
  return res.status(403).json({ success: false, message: 'Permission denied' });
};

module.exports = protect;
module.exports.protect = protect;
module.exports.requireRole = requireRole;
module.exports.requirePermission = requirePermission;
