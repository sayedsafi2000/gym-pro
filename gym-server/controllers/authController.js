const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config');

const generateToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
      return res.json({
        success: true,
        data: {
          token: generateToken(admin._id),
          admin: {
            _id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            permissions: admin.permissions,
          },
        },
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }

    const admin = await Admin.create({ email, password });

    return res.status(201).json({
      success: true,
      data: {
        token: generateToken(admin._id),
        admin: {
          _id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          permissions: admin.permissions,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Super admin creates a new admin with custom permissions
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, name, role, permissions } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin with this email already exists' });
    }

    const admin = await Admin.create({
      email,
      password,
      name: name || '',
      role: role || 'admin',
      permissions: permissions || {},
    });

    res.status(201).json({
      success: true,
      data: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all admins (super admin only)
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update admin permissions (super admin only)
exports.updateAdmin = async (req, res) => {
  try {
    const { name, role, permissions } = req.body;
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Don't let anyone demote themselves
    if (admin._id.toString() === req.admin._id.toString() && role && role !== admin.role) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });
    }

    if (name !== undefined) admin.name = name;
    if (role !== undefined) admin.role = role;
    if (permissions !== undefined) admin.permissions = permissions;

    await admin.save();

    res.json({
      success: true,
      data: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete admin (super admin only, can't delete self)
exports.deleteAdmin = async (req, res) => {
  try {
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, message: 'Admin deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current admin profile
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.admin._id,
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role,
      permissions: req.admin.permissions,
    },
  });
};

const SUPER_ADMIN_PERMISSIONS = {
  canViewAnalytics: true,
  canManagePackages: true,
  canManageDevices: true,
  canManageStore: true,
  canDeleteMembers: true,
  canViewIncome: true,
};

exports.seedAdmin = async () => {
  const { email, password } = config.seedAdmin;

  if (!email || !password) {
    if (config.env === 'production') {
      console.error('[seedAdmin] SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD required in production. Skipping seed.');
      return;
    }
    console.warn('[seedAdmin] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD unset — skipping seed. Set them in .env to bootstrap the super admin.');
    return;
  }

  try {
    const existingAdmin = await Admin.findOne({ email });
    if (!existingAdmin) {
      await Admin.create({
        email,
        password,
        name: 'Super Admin',
        role: 'super_admin',
        permissions: SUPER_ADMIN_PERMISSIONS,
      });
      console.log(`Seeded default admin: ${email} (super_admin) — change this password immediately.`);
    } else if (existingAdmin.role !== 'super_admin') {
      existingAdmin.role = 'super_admin';
      existingAdmin.permissions = SUPER_ADMIN_PERMISSIONS;
      await existingAdmin.save();
      console.log(`Upgraded ${email} to super_admin`);
    }
  } catch (error) {
    console.error('Admin seed failed:', error.message);
  }
};
