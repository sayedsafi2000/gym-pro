const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { seedProducts } = require('./controllers/productController');
const { seedAdmin } = require('./controllers/authController');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ message: '🏋️ Gym Management API is running...' });
});

const protect = require('./middleware/authMiddleware');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', protect, require('./routes/dashboardRoutes'));
app.use('/api/members', protect, require('./routes/memberRoutes'));
app.use('/api/packages', protect, require('./routes/packageRoutes'));
app.use('/api/payments', protect, require('./routes/paymentRoutes'));
app.use('/api/products', protect, require('./routes/productRoutes'));

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    await seedProducts();
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Server startup failed:', error.message);
  });
