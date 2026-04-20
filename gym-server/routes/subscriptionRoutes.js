const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const schemas = require('../schemas');
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
router.post('/renew', validate(schemas.renewSubscription), renewSubscription);
router.post('/monthly-renew', validate(schemas.monthlyRenew), monthlyRenew);
router.post('/:id/expire', requireRole('super_admin'), expireSubscription);
router.post('/:id/activate', requireRole('super_admin'), activateSubscription);
router.get('/config', getGymConfig);
router.put('/config', requireRole('super_admin'), validate(schemas.updateGymConfig), updateGymConfig);

module.exports = router;
