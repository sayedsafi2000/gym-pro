const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
    deviceUserId: {
      type: Number,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
    },
    timestamp: {
      type: Date,
      required: [true, 'Timestamp is required'],
    },
    type: {
      type: String,
      enum: ['check-in', 'check-out'],
      required: [true, 'Attendance type is required'],
    },
    source: {
      type: String,
      enum: ['device', 'manual'],
      default: 'device',
    },
    rawLog: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Deduplication for device entries
attendanceSchema.index(
  { deviceId: 1, deviceUserId: 1, timestamp: 1 },
  { unique: true, sparse: true }
);

// Query performance indexes
attendanceSchema.index({ memberId: 1, timestamp: -1 });
attendanceSchema.index({ timestamp: -1 });
attendanceSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
