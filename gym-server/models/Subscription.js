const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member is required'],
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      default: null,
    },
    type: {
      type: String,
      enum: ['package', 'monthly'],
      default: 'package',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      default: null, // null = lifetime (no expiry)
    },
    isLifetime: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    // Financial tracking (source of truth)
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    dueAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

// Only one active subscription per member
subscriptionSchema.index({ memberId: 1, status: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });

// Check if subscription is currently valid
subscriptionSchema.methods.isActive = function () {
  if (this.status !== 'active') return false;
  if (this.isLifetime) return true;
  return this.endDate && this.endDate >= new Date();
};

// Expire this subscription (immutable — creates history)
subscriptionSchema.methods.expire = async function () {
  if (this.status === 'active') {
    this.status = 'expired';
    await this.save();
  }
  return this;
};

// Cancel this subscription (for upgrades/admin override)
subscriptionSchema.methods.cancel = async function () {
  if (this.status === 'active') {
    this.status = 'cancelled';
    await this.save();
  }
  return this;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
