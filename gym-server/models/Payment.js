const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member is required'],
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: [true, 'Package is required'],
    },
    originalAmount: {
      type: Number,
      required: [true, 'Original amount is required'],
      min: [0, 'Original amount cannot be negative'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    discountType: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed',
    },
    finalAmount: {
      type: Number,
      required: [true, 'Final amount is required'],
      min: [0, 'Final amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'bKash', 'Nagad', 'Bank Transfer'],
      required: [true, 'Payment method is required'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    paymentType: {
      type: String,
      enum: ['full', 'partial', 'monthly'],
      default: 'partial',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
