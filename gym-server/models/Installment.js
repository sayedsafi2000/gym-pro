const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    monthlyAmount: {
      type: Number,
      required: true,
    },
    totalInstallments: {
      type: Number,
      required: true,
      min: 1,
    },
    paidInstallments: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue'],
      default: 'active',
    },
    schedule: [
      {
        month: { type: Number, required: true },
        amount: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        paidDate: { type: Date, default: null },
        paymentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Payment',
          default: null,
        },
        status: {
          type: String,
          enum: ['pending', 'paid', 'overdue'],
          default: 'pending',
        },
      },
    ],
  },
  { timestamps: true }
);

installmentSchema.index({ memberId: 1 });
installmentSchema.index({ status: 1 });

module.exports = mongoose.model('Installment', installmentSchema);
