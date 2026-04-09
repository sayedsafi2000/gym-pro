const express = require('express');
const router = express.Router();
const {
  getAttendances,
  getTodayAttendance,
  getMemberAttendance,
  getMemberAttendanceCalendar,
  getMemberAttendanceStats,
  getMemberCurrentStatus,
  getAttendanceStats,
  triggerSync,
  triggerDeviceSync,
  createManualAttendance,
} = require('../controllers/attendanceController');

router.get('/', getAttendances);
router.get('/today', getTodayAttendance);
router.get('/stats', getAttendanceStats);
router.post('/sync', triggerSync);
router.post('/sync/:deviceId', triggerDeviceSync);
router.post('/manual', createManualAttendance);
router.get('/member/:memberId/calendar', getMemberAttendanceCalendar);
router.get('/member/:memberId/stats', getMemberAttendanceStats);
router.get('/member/:memberId/status', getMemberCurrentStatus);
router.get('/member/:memberId', getMemberAttendance);

module.exports = router;
