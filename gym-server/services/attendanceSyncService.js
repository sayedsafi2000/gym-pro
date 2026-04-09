const Device = require('../models/Device');
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const ZktecoService = require('./zktecoService');

const POLL_INTERVAL = parseInt(process.env.ATTENDANCE_POLL_INTERVAL_MS, 10) || 60000;
const MIN_SCAN_INTERVAL_MS = 60000; // Ignore scans within 60s of previous

let intervalId = null;
const syncingDevices = new Set(); // Guard against overlapping syncs

async function determineType(deviceUserId, deviceId, timestamp) {
  const startOfDay = new Date(timestamp);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(timestamp);
  endOfDay.setHours(23, 59, 59, 999);

  const lastRecord = await Attendance.findOne({
    deviceUserId,
    deviceId,
    timestamp: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ timestamp: -1 });

  if (!lastRecord) return 'check-in';
  return lastRecord.type === 'check-in' ? 'check-out' : 'check-in';
}

async function shouldSkipScan(deviceUserId, deviceId, timestamp) {
  const minTime = new Date(timestamp.getTime() - MIN_SCAN_INTERVAL_MS);
  const existing = await Attendance.findOne({
    deviceUserId,
    deviceId,
    timestamp: { $gte: minTime, $lt: timestamp },
  });
  return !!existing;
}

async function syncDevice(device) {
  const deviceKey = device._id.toString();
  if (syncingDevices.has(deviceKey)) {
    console.log(`[Sync] Skipping ${device.name} — sync already in progress`);
    return;
  }

  syncingDevices.add(deviceKey);

  try {
    const zk = new ZktecoService(device.ip, device.port);
    const logs = await zk.getAttendances();

    if (logs.length === 0) {
      device.lastSyncAt = new Date();
      device.lastSyncStatus = 'success';
      device.lastError = '';
      await device.save();
      return;
    }

    // Build member map for resolving deviceUserId -> memberId
    const uniqueUserIds = [...new Set(logs.map((l) => l.deviceUserId))];
    const members = await Member.find({
      deviceUserId: { $in: uniqueUserIds },
    }).select('_id deviceUserId');
    const memberMap = new Map(
      members.map((m) => [m.deviceUserId, m._id])
    );

    // Process logs sequentially (check-in/out depends on order)
    // Sort by timestamp ascending for correct toggle logic
    const sortedLogs = logs.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const operations = [];

    for (const log of sortedLogs) {
      // Skip scans too close together
      const skip = await shouldSkipScan(
        log.deviceUserId,
        device._id,
        log.timestamp
      );
      if (skip) continue;

      const type = await determineType(
        log.deviceUserId,
        device._id,
        log.timestamp
      );
      const memberId = memberMap.get(log.deviceUserId) || null;

      operations.push({
        updateOne: {
          filter: {
            deviceId: device._id,
            deviceUserId: log.deviceUserId,
            timestamp: log.timestamp,
          },
          update: {
            $setOnInsert: {
              memberId,
              type,
              rawLog: log.raw,
            },
          },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      await Attendance.bulkWrite(operations, { ordered: false });
    }

    device.lastSyncAt = new Date();
    device.lastSyncStatus = 'success';
    device.lastError = '';
    await device.save();

    console.log(
      `[Sync] ${device.name}: processed ${operations.length} records`
    );
  } catch (error) {
    console.error(`[Sync] ${device.name} failed:`, error.message);
    device.lastSyncStatus = 'failed';
    device.lastError = error.message;
    await device.save();
  } finally {
    syncingDevices.delete(deviceKey);
  }
}

async function syncAllDevices() {
  try {
    const devices = await Device.find({ isActive: true });
    for (const device of devices) {
      await syncDevice(device);
    }
  } catch (error) {
    console.error('[Sync] Error fetching devices:', error.message);
  }
}

async function seedDefaultDevice() {
  const ip = process.env.ZKTECO_DEVICE_IP;
  if (!ip) return;

  const existing = await Device.findOne({ ip });
  if (existing) return;

  await Device.create({
    name: 'Main Entrance',
    ip,
    port: parseInt(process.env.ZKTECO_DEVICE_PORT, 10) || 4370,
    isActive: true,
  });
  console.log(`[Sync] Seeded default device at ${ip}`);
}

function start() {
  seedDefaultDevice().catch((err) =>
    console.error('[Sync] Seed error:', err.message)
  );

  console.log(
    `[Sync] Attendance polling started (interval: ${POLL_INTERVAL}ms)`
  );
  syncAllDevices(); // Initial sync on startup
  intervalId = setInterval(syncAllDevices, POLL_INTERVAL);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Sync] Attendance polling stopped');
  }
}

module.exports = { start, stop, syncDevice, syncAllDevices };
