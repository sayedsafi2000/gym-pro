const Member = require('../models/Member');
const Payment = require('../models/Payment');

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Get all members
    const allMembers = await Member.countDocuments();

    // Get active members (expiry > 3 days from now)
    const activeMembers = await Member.countDocuments({
      expiryDate: { $gt: threeDaysLater },
    });

    // Get expired members (expiry < now)
    const expiredMembers = await Member.countDocuments({
      expiryDate: { $lt: now },
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
          total: { $sum: '$amount' },
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
          total: { $sum: '$amount' },
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
          total: { $sum: '$amount' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

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

    res.json({
      success: true,
      data: {
        summary: {
          totalMembers: allMembers,
          activeMembers,
          expiredMembers,
          expiringMembers,
          todayIncome,
          monthlyIncome,
          totalDueAmount,
          totalPaidAmount,
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
