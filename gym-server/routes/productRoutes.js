const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  sellProduct,
} = require('../controllers/productController');

router.route('/').get(getProducts).post(createProduct);
router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);
router.route('/:id/sell').post(sellProduct);

module.exports = router;
