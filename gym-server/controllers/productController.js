const Product = require('../models/Product');

const seedProductData = [
  {
    name: 'Protein Powder',
    category: 'Supplements',
    description: 'High-quality whey protein for muscle recovery and growth.',
    price: 45,
    stock: 30,
  },
  {
    name: 'Gym Jersey',
    category: 'Apparel',
    description: 'Breathable training jersey for gym and sports.',
    price: 25,
    stock: 20,
  },
  {
    name: 'Training Pants',
    category: 'Apparel',
    description: 'Comfortable gym pants for workouts and daily use.',
    price: 30,
    stock: 18,
  },
  {
    name: 'Accessories Pack',
    category: 'Accessories',
    description: 'Set of gym gloves, wrist wraps, and resistance bands.',
    price: 35,
    stock: 15,
  },
  {
    name: 'Water Bottle',
    category: 'Accessories',
    description: 'Reusable gym water bottle with measurement markers.',
    price: 12,
    stock: 40,
  },
];

const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sellProduct = async (req, res) => {
  try {
    const quantity = parseInt(req.body.quantity || 1, 10);
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }
    product.stock -= quantity;
    product.soldCount += quantity;
    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const seedProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.create(seedProductData);
      console.log('Seeded default products');
    }
  } catch (error) {
    console.error('Product seed failed:', error.message);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  sellProduct,
  seedProducts,
};
