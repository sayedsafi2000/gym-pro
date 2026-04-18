const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
    },
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
      default: 0,
    },
    isLifetime: {
      type: Boolean,
      default: false,
    },
    priceGents: {
      type: Number,
      required: [true, 'Price (Gents) is required'],
      min: [0, 'Price cannot be negative'],
    },
    priceLadies: {
      type: Number,
      required: [true, 'Price (Ladies) is required'],
      min: [0, 'Price cannot be negative'],
    },
    admissionFee: {
      type: Number,
      default: 0,
      min: [0, 'Admission fee cannot be negative'],
    },
    includesAdmission: {
      type: Boolean,
      default: false,
    },
    freeMonths: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    benefits: [{
      type: String,
      trim: true,
    }],
    category: {
      type: String,
      enum: ['regular', 'special'],
      default: 'regular',
    },
  },
  { timestamps: true }
);

// Helper: get price for a given gender
packageSchema.methods.getPriceForGender = function (gender) {
  return gender === 'Female' ? this.priceLadies : this.priceGents;
};

// Helper: get total cost including admission fee if not bundled
packageSchema.methods.getTotalForGender = function (gender) {
  const base = this.getPriceForGender(gender);
  return this.includesAdmission ? base : base + this.admissionFee;
};

module.exports = mongoose.model('Package', packageSchema);
