const Payment = require('../models/Payment');
const Member = require('../models/Member');
const Package = require('../models/Package');

const calculateDiscountValue = (amount, discountAmount, discountType) => {
  if (!discountAmount || discountAmount <= 0) return 0;
  if (discountType === 'percentage') {
    return (amount * discountAmount) / 100;
  }
  return discountAmount;
};

const recalculateMemberFinancials = async (memberId) => {
  const member = await Member.findById(memberId).populate('packageId', 'price');
  if (!member) return null;

  const payments = await Payment.find({ memberId });
  const packagePrice = member.packageId?.price || 0;
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.finalAmount || 0), 0);
  const totalDiscount = payments.reduce(
    (sum, payment) => sum + Math.max(0, (payment.originalAmount || 0) - (payment.finalAmount || 0)),
    0
  );

  const totalAmount = Math.max(0, packagePrice - totalDiscount);
  const dueAmount = Math.max(0, totalAmount - totalPaid);

  await Member.findByIdAndUpdate(memberId, {
    totalAmount,
    paidAmount: totalPaid,
    dueAmount
  });

  return { totalAmount, paidAmount: totalPaid, dueAmount };
};

// @desc    Get all payments
// @route   GET /api/payments
const getPayments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.memberId) filter.memberId = req.query.memberId;

    const payments = await Payment.find(filter)
      .populate('memberId', 'name memberId phone totalAmount paidAmount dueAmount')
      .populate('packageId', 'name price duration')
      .sort({ date: -1 });
    console.log('Fetched payments:', payments.length);
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('memberId', 'name memberId phone totalAmount paidAmount dueAmount')
      .populate('packageId', 'name price duration');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a payment
// @route   POST /api/payments
const createPayment = async (req, res) => {
  try {
    const {
      memberId,
      packageId,
      originalAmount,
      discountAmount = 0,
      discountType = 'fixed',
      paymentMethod,
      date,
      note,
      paymentType
    } = req.body;

    // Validate required fields
    if (!memberId || !packageId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Member, package, and payment method are required'
      });
    }

    // Get member and package
    const member = await Member.findById(memberId);
    const package = await Package.findById(packageId);

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (!package) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const parsedOriginalAmount = parseFloat(originalAmount);
    const parsedDiscountAmount = parseFloat(discountAmount) || 0;
    const discountValue = calculateDiscountValue(
      parsedOriginalAmount,
      parsedDiscountAmount,
      discountType
    );
    let finalAmount = parsedOriginalAmount - discountValue;

    // Ensure final amount is not negative
    finalAmount = Math.max(0, finalAmount);
    const settledAmount = finalAmount + discountValue;

    // Check if this payment settlement (cash + discount) exceeds due amount
    if (settledAmount > member.dueAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment settlement (${settledAmount}) exceeds due amount (${member.dueAmount})`
      });
    }

    // Create payment
    const payment = await Payment.create({
      memberId,
      packageId,
      originalAmount: parsedOriginalAmount,
      discountAmount: parsedDiscountAmount,
      discountType,
      finalAmount,
      paymentMethod,
      date: date ? new Date(date) : new Date(),
      note: note || '',
      paymentType: paymentType || 'partial'
    });

    await recalculateMemberFinancials(memberId);

    await payment.populate([
      { path: 'memberId', select: 'name memberId phone totalAmount paidAmount dueAmount' },
      { path: 'packageId', select: 'name price duration' }
    ]);

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a payment (for applying discounts)
// @route   PATCH /api/payments/:id
const updatePayment = async (req, res) => {
  try {
    const {
      discountAmount,
      discountType,
      note
    } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const nextDiscountAmount = parseFloat(discountAmount) || 0;
    const oldDiscountValue = calculateDiscountValue(
      payment.originalAmount,
      payment.discountAmount || 0,
      payment.discountType || 'fixed'
    );
    const newDiscountValue = calculateDiscountValue(
      payment.originalAmount,
      nextDiscountAmount,
      discountType || payment.discountType || 'fixed'
    );
    let finalAmount = payment.originalAmount - newDiscountValue;

    finalAmount = Math.max(0, finalAmount);

    // Update payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        discountAmount: nextDiscountAmount,
        discountType: discountType || 'fixed',
        finalAmount,
        note: note !== undefined ? note : payment.note
      },
      { new: true }
    ).populate('memberId', 'name memberId phone totalAmount paidAmount dueAmount')
     .populate('packageId', 'name price duration');

    // Reconcile member totals from source-of-truth payments
    if (finalAmount !== payment.finalAmount || newDiscountValue !== oldDiscountValue) {
      await recalculateMemberFinancials(payment.memberId);
    }

    res.json({ success: true, data: updatedPayment });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a payment
// @route   DELETE /api/payments/:id
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // In this app flow, deleting a payment is treated as record cleanup.
    // So we remove the payment entry without changing member ledger values.
    await Payment.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete payments
// @route   POST /api/payments/bulk-delete
const bulkDeletePayments = async (req, res) => {
  try {
    const { paymentIds } = req.body;
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'paymentIds array is required' });
    }

    const payments = await Payment.find({ _id: { $in: paymentIds } });
    if (!payments.length) {
      return res.status(404).json({ success: false, message: 'No payments found to delete' });
    }

    await Payment.deleteMany({ _id: { $in: paymentIds } });

    res.json({
      success: true,
      message: `${payments.length} payment(s) deleted successfully`,
      deletedCount: payments.length
    });
  } catch (error) {
    console.error('Error bulk deleting payments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate receipt
// @route   GET /api/payments/:id/receipt
const generateReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('memberId', 'name memberId phone')
      .populate('packageId', 'name price duration description benefits');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const receipt = {
      receiptId: `RCP-${payment._id.toString().slice(-8).toUpperCase()}`,
      gym: {
        name: process.env.GYM_NAME || 'GymPro Fitness',
        address: process.env.GYM_ADDRESS || 'Dhaka, Bangladesh',
        phone: process.env.GYM_PHONE || '+880 1XXXXXXXXX',
      },
      member: {
        name: payment.memberId.name,
        memberId: payment.memberId.memberId,
        phone: payment.memberId.phone
      },
      package: {
        name: payment.packageId.name,
        price: payment.packageId.price,
        duration: payment.packageId.duration,
        description: payment.packageId.description,
        benefits: payment.packageId.benefits
      },
      payment: {
        originalAmount: payment.originalAmount,
        discountAmount: payment.discountAmount,
        discountType: payment.discountType,
        finalAmount: payment.finalAmount,
        paymentMethod: payment.paymentMethod,
        paymentType: payment.paymentType,
        date: payment.date,
        note: payment.note,
      },
      generatedAt: new Date()
    };

    res.json({ success: true, data: receipt });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  bulkDeletePayments,
  generateReceipt
};