const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const Device = require('../models/Device');
const { syncDevice, syncAllDevices } = require('../services/attendanceSyncService');

// @desc    Get attendance logs with filters
// @route   GET /api/attendance
exports.getAttendances = async (req, res) => {
  try {
    const { startDate, endDate, memberId, type, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    if (memberId) filter.memberId = memberId;
    if (type) filter.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = Attendance.find(filter)
      .populate('memberId', 'name memberId phone')
      .populate('deviceId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const [attendances, total] = await Promise.all([
      query,
      Attendance.countDocuments(filter),
    ]);

    // If search param provided, filter populated results by member name/memberId
    let filtered = attendances;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = attendances.filter((a) => {
        if (!a.memberId) return false;
        return (
          a.memberId.name.toLowerCase().includes(searchLower) ||
          a.memberId.memberId.toLowerCase().includes(searchLower)
        );
      });
    }

    res.json({
      success: true,
      data: filtered,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get today's attendance summary
// @route   GET /api/attendance/today
exports.getTodayAttendance = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayLogs = await Attendance.find({
      timestamp: { $gte: startOfDay },
    })
      .populate('memberId', 'name memberId phone')
      .populate('deviceId', 'name')
      .sort({ timestamp: -1 });

    const checkIns = todayLogs.filter((l) => l.type === 'check-in').length;
    const checkOuts = todayLogs.filter((l) => l.type === 'check-out').length;

    // Currently present: members whose last scan today is a check-in
    const latestByMember = new Map();
    for (const log of todayLogs) {
      const key = log.deviceUserId.toString();
      if (!latestByMember.has(key)) {
        latestByMember.set(key, log);
      }
    }
    const currentlyPresent = [...latestByMember.values()].filter(
      (l) => l.type === 'check-in'
    );

    res.json({
      success: true,
      data: {
        totalCheckIns: checkIns,
        totalCheckOuts: checkOuts,
        currentlyPresent: currentlyPresent.length,
        presentMembers: currentlyPresent,
        recentLogs: todayLogs.slice(0, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance history for a member
// @route   GET /api/attendance/member/:memberId
exports.getMemberAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const filter = { memberId: req.params.memberId };

    const [attendances, total] = await Promise.all([
      Attendance.find(filter)
        .populate('deviceId', 'name')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Attendance.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: attendances,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance stats (avg visits, peak hours)
// @route   GET /api/attendance/stats
exports.getAttendanceStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Daily check-in counts for last 30 days
    const dailyCounts = await Attendance.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
          type: 'check-in',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Peak hours
    const peakHours = await Attendance.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
          type: 'check-in',
        },
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Average daily visits
    const totalCheckIns = dailyCounts.reduce((sum, d) => sum + d.count, 0);
    const daysWithData = dailyCounts.length || 1;
    const avgDailyVisits = Math.round(totalCheckIns / daysWithData);

    res.json({
      success: true,
      data: {
        dailyCounts,
        peakHours,
        avgDailyVisits,
        totalCheckIns,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Manually trigger sync for all active devices
// @route   POST /api/attendance/sync
exports.triggerSync = async (req, res) => {
  try {
    await syncAllDevices();
    res.json({ success: true, message: 'Sync completed for all active devices' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Manually trigger sync for one device
// @route   POST /api/attendance/sync/:deviceId
exports.triggerDeviceSync = async (req, res) => {
  try {
    const device = await Device.findById(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    await syncDevice(device);
    const updated = await Device.findById(device._id);

    res.json({
      success: true,
      message: `Sync completed for ${device.name}`,
      data: {
        lastSyncAt: updated.lastSyncAt,
        lastSyncStatus: updated.lastSyncStatus,
        lastError: updated.lastError,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance calendar for a member (grouped by day)
// @route   GET /api/attendance/member/:memberId/calendar?year=2026&month=4
exports.getMemberAttendanceCalendar = async (req, res) => {
  try {
    const { memberId } = req.params;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;

    const member = await Member.findById(memberId).select('joinDate expiryDate');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const result = await Attendance.aggregate([
      {
        $match: {
          memberId: new mongoose.Types.ObjectId(memberId),
          timestamp: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          logs: { $push: { type: '$type', timestamp: '$timestamp' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const days = {};
    for (const entry of result) {
      days[entry._id] = entry.logs;
    }

    res.json({
      success: true,
      data: {
        year,
        month,
        joinDate: member.joinDate,
        expiryDate: member.expiryDate,
        days,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance stats for a member
// @route   GET /api/attendance/member/:memberId/stats
exports.getMemberAttendanceStats = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findById(memberId).select('joinDate expiryDate');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const memberObjId = new mongoose.Types.ObjectId(memberId);

    // Unique visit days (all time)
    const visitDays = await Attendance.aggregate([
      { $match: { memberId: memberObjId, type: 'check-in' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } } },
    ]);
    const totalVisits = visitDays.length;

    // This month visits
    const thisMonthDays = await Attendance.aggregate([
      {
        $match: {
          memberId: memberObjId,
          type: 'check-in',
          timestamp: { $gte: startOfThisMonth },
        },
      },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } } },
    ]);
    const thisMonthVisits = thisMonthDays.length;

    // Average per week
    const membershipStart = new Date(member.joinDate);
    const membershipEnd = member.expiryDate < now ? new Date(member.expiryDate) : now;
    const membershipDaysElapsed = Math.max(1, Math.ceil((membershipEnd - membershipStart) / (1000 * 60 * 60 * 24)));
    const membershipWeeks = Math.max(1, membershipDaysElapsed / 7);
    const avgPerWeek = Math.round((totalVisits / membershipWeeks) * 10) / 10;

    // Attendance rate
    const attendanceRate = Math.round((totalVisits / membershipDaysElapsed) * 1000) / 10;

    // Average session duration (pair check-in/check-out per day)
    const allRecords = await Attendance.find({ memberId: memberObjId })
      .select('type timestamp')
      .sort({ timestamp: 1 });

    const dayMap = {};
    for (const rec of allRecords) {
      const dayKey = rec.timestamp.toISOString().split('T')[0];
      if (!dayMap[dayKey]) dayMap[dayKey] = [];
      dayMap[dayKey].push(rec);
    }

    let totalDuration = 0;
    let sessionCount = 0;
    for (const logs of Object.values(dayMap)) {
      const checkIns = logs.filter((l) => l.type === 'check-in').sort((a, b) => a.timestamp - b.timestamp);
      const checkOuts = logs.filter((l) => l.type === 'check-out').sort((a, b) => a.timestamp - b.timestamp);
      const pairs = Math.min(checkIns.length, checkOuts.length);
      for (let i = 0; i < pairs; i++) {
        const duration = checkOuts[i].timestamp - checkIns[i].timestamp;
        if (duration > 0 && duration < 12 * 60 * 60 * 1000) {
          totalDuration += duration;
          sessionCount++;
        }
      }
    }
    const avgSessionMinutes = sessionCount > 0 ? Math.round(totalDuration / sessionCount / 60000) : null;

    // Current streak
    const sortedVisitDates = visitDays.map((d) => d._id).sort().reverse();
    let currentStreak = 0;
    if (sortedVisitDates.length > 0) {
      currentStreak = 1;
      for (let i = 1; i < sortedVisitDates.length; i++) {
        const curr = new Date(sortedVisitDates[i - 1]);
        const prev = new Date(sortedVisitDates[i]);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Last visit
    const lastVisitRecord = await Attendance.findOne({
      memberId: memberObjId,
      type: 'check-in',
    }).sort({ timestamp: -1 });
    const lastVisit = lastVisitRecord ? lastVisitRecord.timestamp : null;

    // Weekly trend (last 12 weeks)
    const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
    const weeklyData = await Attendance.aggregate([
      {
        $match: {
          memberId: memberObjId,
          type: 'check-in',
          timestamp: { $gte: twelveWeeksAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$timestamp' },
            week: { $isoWeek: '$timestamp' },
          },
          visits: {
            $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          },
          firstDay: { $min: '$timestamp' },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    const weeklyTrend = weeklyData.map((w) => ({
      week: new Date(w.firstDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visits: w.visits.length,
    }));

    res.json({
      success: true,
      data: {
        totalVisits,
        thisMonthVisits,
        avgPerWeek,
        avgSessionMinutes,
        currentStreak,
        attendanceRate,
        lastVisit,
        weeklyTrend,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
