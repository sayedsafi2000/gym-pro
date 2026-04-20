const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    emergencyPhone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Gender is required'],
    },
    deviceUserId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    joinDate: {
      type: Date,
      required: [true, 'Join date is required'],
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: [true, 'Package is required'],
    },
    // Lifetime membership tracking
    hasLifetimeMembership: {
      type: Boolean,
      default: false,
    },
    lifetimePackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      default: null,
    },
    freeMonthsEndDate: {
      type: Date,
      default: null,
    },
    // Payment tracking fields
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
      default: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      min: [0, 'Paid amount cannot be negative'],
      default: 0,
    },
    dueAmount: {
      type: Number,
      required: true,
      min: [0, 'Due amount cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved'],
      default: 'approved',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Member', memberSchema);
