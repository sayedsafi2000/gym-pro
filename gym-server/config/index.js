// Centralised env parsing. Read env once at boot so the rest of the code
// imports structured config instead of scattering process.env.* calls.
// Also surfaces misconfigurations (missing JWT_SECRET) at startup instead
// of at first request.

require('dotenv').config();

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),

  db: {
    uri: process.env.MONGO_URI,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS
      || 'http://localhost,http://localhost:80,http://localhost:5173,http://127.0.0.1,http://127.0.0.1:5173')
      .split(',').map((s) => s.trim()).filter(Boolean),
  },

  gym: {
    name: process.env.GYM_NAME || 'GymPro Fitness',
    address: process.env.GYM_ADDRESS || 'Dhaka, Bangladesh',
    phone: process.env.GYM_PHONE || '+880 1XXXXXXXXX',
  },

  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL || '',
    password: process.env.SEED_ADMIN_PASSWORD || '',
  },

  zkteco: {
    ip: process.env.ZKTECO_DEVICE_IP || '',
    port: toInt(process.env.ZKTECO_DEVICE_PORT, 4370),
    pollIntervalMs: toInt(process.env.ATTENDANCE_POLL_INTERVAL_MS, 60000),
  },
};

// Fail fast on boot if the secrets needed for auth aren't set. Callers can
// still read process.env directly for one-off scripts; the central config
// only concerns itself with what the running server depends on.
const assertValid = () => {
  requireEnv('JWT_SECRET');
  requireEnv('MONGO_URI');
};

module.exports = config;
module.exports.assertValid = assertValid;
