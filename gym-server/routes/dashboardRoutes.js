const express = require('express');
const { getDashboardStats, getDashboardAlerts } = require('../controllers/dashboardController');
const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/alerts', getDashboardAlerts);

module.exports = router;
