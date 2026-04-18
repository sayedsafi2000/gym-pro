const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Attendance = require('../models/Attendance');
const Device = require('../models/Device');
const Installment = require('../models/Installment');

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const threeDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get all members
    const allMembers = await Member.countDocuments();

    // Get active members (expiry > 7 days from now OR lifetime with null expiry)
    const activeMembers = await Member.countDocuments({
      $or: [{ expiryDate: null }, { expiryDate: { $gt: threeDaysLater } }],
    });

    // Get expired members (expiry < now, exclude lifetime)
    const expiredMembers = await Member.countDocuments({
      expiryDate: { $ne: null, $lt: now },
    });

    // Lifetime members needing monthly payment
    const needsMonthlyRenewal = await Member.countDocuments({
      hasLifetimeMembership: true,
      expiryDate: { $ne: null, $lt: now },
    });

    // Get today's income
    const todayPayments = await Payment.aggregate([
      {
        $match: {
          date: {
            $gte: startOfDay,
            $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' },
        },
      },
    ]);

    const todayIncome = todayPayments.length > 0 ? todayPayments[0].total : 0;

    // Get monthly income
    const monthlyPayments = await Payment.aggregate([
      {
        $match: {
          date: {
            $gte: startOfMonth,
            $lt: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' },
        },
      },
    ]);

    const monthlyIncome = monthlyPayments.length > 0 ? monthlyPayments[0].total : 0;

    // Get daily income for last 30 days (for chart)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailyIncomeData = await Payment.aggregate([
      {
        $match: {
          date: {
            $gte: thirtyDaysAgo,
            $lt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' },
          },
          total: { $sum: '$finalAmount' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get pending members
    const pendingMembers = await Member.countDocuments({ status: 'pending' });

    // Get member status breakdown
    const expiringMembers = await Member.countDocuments({
      expiryDate: {
        $gte: now,
        $lte: threeDaysLater,
      },
    });

    // Get total due amount
    const dueAmountResult = await Member.aggregate([
      {
        $group: {
          _id: null,
          totalDue: { $sum: '$dueAmount' },
        },
      },
    ]);

    const totalDueAmount = dueAmountResult.length > 0 ? dueAmountResult[0].totalDue : 0;

    // Get total paid amount
    const paidAmountResult = await Member.aggregate([
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$paidAmount' },
        },
      },
    ]);

    const totalPaidAmount = paidAmountResult.length > 0 ? paidAmountResult[0].totalPaid : 0;

    // Product analytics
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10 } });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });

    // Get today's product sales
    const todayProductSales = await Product.aggregate([
      {
        $match: {
          updatedAt: {
            $gte: startOfDay,
            $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$soldCount' },
          totalRevenue: { $sum: { $multiply: ['$soldCount', '$price'] } },
        },
      },
    ]);

    const todayProductSold = todayProductSales.length > 0 ? todayProductSales[0].totalSold : 0;
    const todayProductRevenue = todayProductSales.length > 0 ? todayProductSales[0].totalRevenue : 0;

    // Get monthly product sales
    const monthlyProductSales = await Product.aggregate([
      {
        $match: {
          updatedAt: {
            $gte: startOfMonth,
            $lt: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$soldCount' },
          totalRevenue: { $sum: { $multiply: ['$soldCount', '$price'] } },
        },
      },
    ]);

    const monthlyProductSold = monthlyProductSales.length > 0 ? monthlyProductSales[0].totalSold : 0;
    const monthlyProductRevenue = monthlyProductSales.length > 0 ? monthlyProductSales[0].totalRevenue : 0;

    // Get total product revenue and sales
    const totalProductStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$soldCount' },
          totalRevenue: { $sum: { $multiply: ['$soldCount', '$price'] } },
        },
      },
    ]);

    const totalProductSold = totalProductStats.length > 0 ? totalProductStats[0].totalSold : 0;
    const totalProductRevenue = totalProductStats.length > 0 ? totalProductStats[0].totalRevenue : 0;

    // Attendance stats
    const todayCheckIns = await Attendance.countDocuments({
      timestamp: { $gte: startOfDay },
      type: 'check-in',
    });

    const currentlyPresentResult = await Attendance.aggregate([
      { $match: { timestamp: { $gte: startOfDay } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$deviceUserId', lastType: { $first: '$type' } } },
      { $match: { lastType: 'check-in' } },
      { $count: 'count' },
    ]);

    const currentlyPresent =
      currentlyPresentResult.length > 0 ? currentlyPresentResult[0].count : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalMembers: allMembers,
          activeMembers,
          expiredMembers,
          needsMonthlyRenewal,
          pendingMembers,
          expiringMembers,
          todayIncome,
          monthlyIncome,
          totalDueAmount,
          totalPaidAmount,
          // Product stats
          totalProducts,
          lowStockProducts,
          outOfStockProducts,
          todayProductSold,
          todayProductRevenue,
          monthlyProductSold,
          monthlyProductRevenue,
          totalProductSold,
          totalProductRevenue,
          // Attendance stats
          todayCheckIns,
          currentlyPresent,
        },
        chartData: {
          dailyIncome: dailyIncomeData,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboardAlerts = async (req, res) => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const alerts = [];

    // Expiring memberships
    const expiringCount = await Member.countDocuments({
      expiryDate: { $gte: now, $lte: threeDaysLater },
    });
    if (expiringCount > 0) {
      alerts.push({
        type: 'expiring',
        severity: 'warning',
        count: expiringCount,
        message: `${expiringCount} membership${expiringCount > 1 ? 's' : ''} expiring in 3 days`,
        link: '/members?status=expiring',
      });
    }

    // Expired memberships
    const expiredCount = await Member.countDocuments({
      expiryDate: { $lt: now },
    });
    if (expiredCount > 0) {
      alerts.push({
        type: 'expired',
        severity: 'error',
        count: expiredCount,
        message: `${expiredCount} expired membership${expiredCount > 1 ? 's' : ''} need renewal`,
        link: '/members?status=expired',
      });
    }

    // Overdue payments
    const overdueMembers = await Member.countDocuments({
      dueAmount: { $gt: 0 },
    });
    if (overdueMembers > 0) {
      alerts.push({
        type: 'overdue',
        severity: 'error',
        count: overdueMembers,
        message: `${overdueMembers} member${overdueMembers > 1 ? 's' : ''} with outstanding payments`,
        link: '/payments',
      });
    }

    // Device sync failures
    const failedDevices = await Device.find({ lastSyncStatus: 'failed', isActive: true });
    for (const device of failedDevices) {
      alerts.push({
        type: 'device_offline',
        severity: 'warning',
        count: 1,
        message: `${device.name} device sync failed`,
        link: '/devices',
      });
    }

    // Pending member approvals (super_admin only)
    if (req.admin?.role === 'super_admin') {
      const pendingCount = await Member.countDocuments({ status: 'pending' });
      if (pendingCount > 0) {
        alerts.push({
          type: 'pending_approval',
          severity: 'warning',
          count: pendingCount,
          message: `${pendingCount} member${pendingCount > 1 ? 's' : ''} awaiting approval`,
          link: '/members?tab=pending',
        });
      }
    }

    // Overdue installments
    const overdueInstallments = await Installment.countDocuments({
      status: 'active',
      'schedule.status': 'overdue',
    });
    if (overdueInstallments > 0) {
      alerts.push({
        type: 'installment_overdue',
        severity: 'warning',
        count: overdueInstallments,
        message: `${overdueInstallments} member${overdueInstallments > 1 ? 's' : ''} with overdue installments`,
        link: '/members',
      });
    }

    res.json({ success: true, data: { alerts } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
