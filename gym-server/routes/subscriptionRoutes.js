const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/authMiddleware');
const {
  getMemberSubscriptions,
  getActiveSubscription,
  renewSubscription,
  expireSubscription,
  activateSubscription,
} = require('../controllers/subscriptionController');

router.get('/member/:memberId', getMemberSubscriptions);
router.get('/member/:memberId/active', getActiveSubscription);
router.post('/renew', renewSubscription);
router.post('/:id/expire', requireRole('super_admin'), expireSubscription);
router.post('/:id/activate', requireRole('super_admin'), activateSubscription);

module.exports = router;
