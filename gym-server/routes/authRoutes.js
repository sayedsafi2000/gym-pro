const express = require('express');
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
const router = express.Router();

router.post('/login', loginAdmin);
// Public registration disabled — admins are created by super_admin via /auth/admins
// router.post('/register', registerAdmin);
router.get('/me', protect, getMe);

// Admin management (super_admin only)
router.get('/admins', protect, requireRole('super_admin'), getAdmins);
router.post('/admins', protect, requireRole('super_admin'), createAdmin);
router.put('/admins/:id', protect, requireRole('super_admin'), updateAdmin);
router.delete('/admins/:id', protect, requireRole('super_admin'), deleteAdmin);

module.exports = router;
