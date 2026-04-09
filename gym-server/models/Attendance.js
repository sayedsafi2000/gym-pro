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
      required: [true, 'Device user ID is required'],
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: [true, 'Device ID is required'],
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
    rawLog: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Deduplication: compound unique index
attendanceSchema.index(
  { deviceId: 1, deviceUserId: 1, timestamp: 1 },
  { unique: true }
);

// Query performance indexes
attendanceSchema.index({ memberId: 1, timestamp: -1 });
attendanceSchema.index({ timestamp: -1 });
attendanceSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
