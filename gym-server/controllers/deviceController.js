const Device = require('../models/Device');
const Member = require('../models/Member');
const ZktecoService = require('../services/zktecoService');

// @desc    Get all devices
// @route   GET /api/devices
exports.getDevices = async (req, res) => {
  try {
    const devices = await Device.find().sort({ createdAt: -1 });
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single device
// @route   GET /api/devices/:id
exports.getDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a device
// @route   POST /api/devices
exports.createDevice = async (req, res) => {
  try {
    const { name, ip, port } = req.body;

    if (!name || !ip) {
      return res.status(400).json({
        success: false,
        message: 'Name and IP are required',
      });
    }

    const device = await Device.create({
      name,
      ip,
      port: port || 4370,
    });

    res.status(201).json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a device
// @route   PUT /api/devices/:id
exports.updateDevice = async (req, res) => {
  try {
    const { name, ip, port, isActive } = req.body;

    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    if (name !== undefined) device.name = name;
    if (ip !== undefined) device.ip = ip;
    if (port !== undefined) device.port = port;
    if (isActive !== undefined) device.isActive = isActive;

    await device.save();
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a device
// @route   DELETE /api/devices/:id
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    res.json({ success: true, message: 'Device removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check device connection status
// @route   GET /api/devices/:id/status
exports.getDeviceStatus = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const zk = new ZktecoService(device.ip, device.port);
    try {
      const info = await zk.getInfo();
      res.json({
        success: true,
        data: {
          online: true,
          info,
          lastSyncAt: device.lastSyncAt,
          lastSyncStatus: device.lastSyncStatus,
        },
      });
    } catch (connError) {
      res.json({
        success: true,
        data: {
          online: false,
          error: connError.message,
          lastSyncAt: device.lastSyncAt,
          lastSyncStatus: device.lastSyncStatus,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register a member on the device (assign deviceUserId)
// @route   POST /api/devices/:id/register-user
exports.registerUser = async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'memberId is required',
      });
    }

    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // If member already has a deviceUserId, use it; otherwise generate one
    let uid = member.deviceUserId;
    if (!uid) {
      // Find the highest deviceUserId in use and increment
      const maxMember = await Member.findOne({ deviceUserId: { $ne: null } })
        .sort({ deviceUserId: -1 })
        .select('deviceUserId');
      uid = maxMember ? maxMember.deviceUserId + 1 : 1;
    }

    const zk = new ZktecoService(device.ip, device.port);
    await zk.setUser(uid, member.name, '', 0);

    // Update member with deviceUserId
    member.deviceUserId = uid;
    await member.save();

    res.json({
      success: true,
      data: {
        memberId: member._id,
        memberName: member.name,
        deviceUserId: uid,
        deviceName: device.name,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List users registered on device
// @route   GET /api/devices/:id/users
exports.getDeviceUsers = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const zk = new ZktecoService(device.ip, device.port);
    const users = await zk.getUsers();

    // Enrich with member info where possible
    const deviceUserIds = users.map((u) => u.uid);
    const members = await Member.find({
      deviceUserId: { $in: deviceUserIds },
    }).select('_id name memberId deviceUserId');

    const memberMap = new Map(
      members.map((m) => [m.deviceUserId, m])
    );

    const enrichedUsers = users.map((u) => {
      const member = memberMap.get(u.uid);
      return {
        ...u,
        member: member
          ? { _id: member._id, name: member.name, memberId: member.memberId }
          : null,
      };
    });

    res.json({ success: true, data: enrichedUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Link a device user to a member (no device call needed)
// @route   POST /api/devices/:id/link-user
exports.linkUser = async (req, res) => {
  try {
    const { memberId, deviceUserId } = req.body;
    if (!memberId || deviceUserId == null) {
      return res.status(400).json({
        success: false,
        message: 'memberId and deviceUserId are required',
      });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check if another member already has this deviceUserId
    const existing = await Member.findOne({
      deviceUserId,
      _id: { $ne: memberId },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Device User ID ${deviceUserId} is already linked to ${existing.name} (${existing.memberId})`,
      });
    }

    member.deviceUserId = deviceUserId;
    await member.save();

    // Backfill any attendance records that were stored with null memberId for this deviceUserId
    const Attendance = require('../models/Attendance');
    await Attendance.updateMany(
      { deviceUserId, memberId: null },
      { $set: { memberId: member._id } }
    );

    res.json({
      success: true,
      data: {
        memberId: member._id,
        memberName: member.name,
        memberMemberId: member.memberId,
        deviceUserId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
