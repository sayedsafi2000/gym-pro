const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/authMiddleware');
const {
  getMemberSubscriptions,
  getActiveSubscription,
  renewSubscription,
  expireSubscription,
  activateSubscription,
  monthlyRenew,
  getGymConfig,
  updateGymConfig,
} = require('../controllers/subscriptionController');

router.get('/member/:memberId', getMemberSubscriptions);
router.get('/member/:memberId/active', getActiveSubscription);
router.post('/renew', renewSubscription);
router.post('/monthly-renew', monthlyRenew);
router.post('/:id/expire', requireRole('super_admin'), expireSubscription);
router.post('/:id/activate', requireRole('super_admin'), activateSubscription);
router.get('/config', getGymConfig);
router.put('/config', requireRole('super_admin'), updateGymConfig);

module.exports = router;
