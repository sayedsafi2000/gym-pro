const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  sellProduct,
  restockProduct,
  getSaleHistory,
  getStoreStats,
  getSaleReceipt,
} = require('../controllers/productController');

router.route('/').get(getProducts).post(createProduct);
router.get('/stats', getStoreStats);
router.get('/sales', getSaleHistory);
router.get('/sales/:saleId/receipt', getSaleReceipt);
router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);
router.post('/:id/sell', sellProduct);
router.post('/:id/restock', restockProduct);

module.exports = router;
