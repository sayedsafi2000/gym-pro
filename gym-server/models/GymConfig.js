const mongoose = require('mongoose');

const gymConfigSchema = new mongoose.Schema(
  {
    monthlyFeeGents: {
      type: Number,
      default: 800,
      min: 0,
    },
    monthlyFeeLadies: {
      type: Number,
      default: 1000,
      min: 0,
    },
    monthlyAccessDays: {
      type: Number,
      default: 30,
      min: 1,
    },
  },
  { timestamps: true }
);

// Get monthly fee by gender
gymConfigSchema.methods.getFeeForGender = function (gender) {
  return gender === 'Female' ? this.monthlyFeeLadies : this.monthlyFeeGents;
};

module.exports = mongoose.model('GymConfig', gymConfigSchema);
