const Product = require('../models/Product');
const Sale = require('../models/Sale');

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
    const filter = {};
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
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
    const note = req.body.note || '';
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

    // Record the sale
    await Sale.create({
      productId: product._id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      totalAmount: quantity * product.price,
      note,
    });

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const restockProduct = async (req, res) => {
  try {
    const quantity = parseInt(req.body.quantity, 10);
    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    product.stock += quantity;
    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getSaleHistory = async (req, res) => {
  try {
    const filter = {};
    if (req.query.productId) {
      filter.productId = req.query.productId;
    }
    const limit = parseInt(req.query.limit, 10) || 50;
    const sales = await Sale.find(filter)
      .sort({ soldAt: -1 })
      .limit(limit);
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStoreStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const products = await Product.find();
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock < 10).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    // Today's sales from Sale collection
    const todaySalesAgg = await Sale.aggregate([
      { $match: { soldAt: { $gte: startOfDay } } },
      {
        $group: {
          _id: null,
          count: { $sum: '$quantity' },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const todaySalesCount = todaySalesAgg.length > 0 ? todaySalesAgg[0].count : 0;
    const todaySalesRevenue = todaySalesAgg.length > 0 ? todaySalesAgg[0].revenue : 0;

    // Total revenue from Sale collection
    const totalRevenueAgg = await Sale.aggregate([
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].revenue : 0;

    res.json({
      success: true,
      data: {
        totalProducts,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
        todaySalesCount,
        todaySalesRevenue,
        totalRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSaleReceipt = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const receipt = {
      receiptId: `SL-${sale._id.toString().slice(-8).toUpperCase()}`,
      gym: {
        name: process.env.GYM_NAME || 'GymPro Fitness',
        address: process.env.GYM_ADDRESS || 'Dhaka, Bangladesh',
        phone: process.env.GYM_PHONE || '+880 1XXXXXXXXX',
      },
      product: {
        name: sale.productName,
      },
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      totalAmount: sale.totalAmount,
      note: sale.note,
      soldAt: sale.soldAt,
      generatedAt: new Date(),
    };

    res.json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
  restockProduct,
  getSaleHistory,
  getStoreStats,
  getSaleReceipt,
  seedProducts,
};
