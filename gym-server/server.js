const express = require('express');
const cors = require('cors');
const config = require('./config');
const connectDB = require('./config/db');
const { seedProducts } = require('./controllers/productController');
const { seedAdmin } = require('./controllers/authController');
const { seedPackages } = require('./controllers/packageController');

config.assertValid();

const app = express();

// CORS: whitelist from config. In production nginx serves UI + API
// same-origin so the browser skips CORS entirely; the default list only
// matters in dev (Vite on 5173, direct hits on nginx :80, etc.).
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (config.cors.allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not in ALLOWED_ORIGINS`));
  },
}));
app.use(express.json());
app.use(require('./middleware/requestLogger'));

// Health check route
app.get('/', (req, res) => {
  res.json({ message: '🏋️ Gym Management API is running...' });
});

const protect = require('./middleware/authMiddleware');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', protect, require('./routes/dashboardRoutes'));
app.use('/api/members', protect, require('./routes/memberRoutes'));
app.use('/api/packages', protect, require('./routes/packageRoutes'));
app.use('/api/payments', protect, require('./routes/paymentRoutes'));
app.use('/api/products', protect, require('./routes/productRoutes'));
app.use('/api/attendance', protect, require('./routes/attendanceRoutes'));
app.use('/api/devices', protect, require('./routes/deviceRoutes'));
app.use('/api/installments', protect, require('./routes/installmentRoutes'));
app.use('/api/subscriptions', protect, require('./routes/subscriptionRoutes'));
app.use('/api/system', protect, require('./routes/systemRoutes'));

// 404 + error handler must follow routes.
app.use(notFound);
app.use(errorHandler);

// Safety nets: never crash the process on a stray rejection.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const attendanceSyncService = require('./services/attendanceSyncService');

const PORT = config.port;

connectDB()
  .then(async () => {
    await seedProducts();
    await seedAdmin();
    await seedPackages();
    // Seed GymConfig singleton
    const GymConfig = require('./models/GymConfig');
    const configCount = await GymConfig.countDocuments();
    if (configCount === 0) {
      await GymConfig.create({});
      console.log('Seeded GymConfig (monthly: ৳800/৳1000, 30 days)');
    }
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      attendanceSyncService.start();
    });
  })
  .catch((error) => {
    console.error('Server startup failed:', error.message);
  });
