const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    soldCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Prevent duplicate products within same category
productSchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
