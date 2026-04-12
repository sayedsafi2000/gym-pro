const express = require('express');
const router = express.Router();
const {
  getMemberInstallment,
  payInstallment,
  getOverdueInstallments,
} = require('../controllers/installmentController');

router.get('/overdue', getOverdueInstallments);
router.get('/member/:memberId', getMemberInstallment);
router.post('/:id/pay', payInstallment);

module.exports = router;
