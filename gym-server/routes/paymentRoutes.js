const express = require('express');
const router = express.Router();
const {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  bulkDeletePayments,
  generateReceipt
} = require('../controllers/paymentController');

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.route('/bulk-delete')
  .post(bulkDeletePayments);

router.route('/:id')
  .get(getPayment)
  .patch(updatePayment)
  .delete(deletePayment);

router.route('/:id/receipt')
  .get(generateReceipt);

module.exports = router;