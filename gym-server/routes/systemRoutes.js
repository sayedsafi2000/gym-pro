const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/authMiddleware');
const {
  getVersion,
  requestUpdate,
  getUpdateStatus,
  getWatcherHealth,
} = require('../controllers/systemController');

// Version + status + watcher health are readable by any authenticated admin
// (they show the update button/status in the UI). Only triggering the update
// is gated to super_admin.
router.get('/version', getVersion);
router.get('/update-status', getUpdateStatus);
router.get('/watcher-health', getWatcherHealth);
router.post('/update', requireRole('super_admin'), requestUpdate);

module.exports = router;
