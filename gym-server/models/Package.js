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
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
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

module.exports = mongoose.model('Package', packageSchema);
