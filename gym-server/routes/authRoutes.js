const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const {
  loginAdmin,
  registerAdmin,
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
  getMe,
} = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const schemas = require('../schemas');
const router = express.Router();

// Throttle login attempts to slow brute force. Keyed by IP + email so a
// shared NAT doesn't lock out everyone when one attacker hammers one account.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${(req.body && req.body.email) || ''}`,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
});

router.post('/login', loginLimiter, validate(schemas.login), loginAdmin);
// Public registration disabled — admins are created by super_admin via /auth/admins
// router.post('/register', registerAdmin);
router.get('/me', protect, getMe);

// Admin management (super_admin only)
router.get('/admins', protect, requireRole('super_admin'), getAdmins);
router.post('/admins', protect, requireRole('super_admin'), createAdmin);
router.put('/admins/:id', protect, requireRole('super_admin'), updateAdmin);
router.delete('/admins/:id', protect, requireRole('super_admin'), deleteAdmin);

module.exports = router;
