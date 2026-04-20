const Payment = require('../models/Payment');
const Member = require('../models/Member');
const Package = require('../models/Package');
const Subscription = require('../models/Subscription');
const paginate = require('../utils/paginate');
const { PACKAGE_SUMMARY, PACKAGE_RECEIPT, PACKAGE_PRICING } = require('../utils/populateSelects');
const config = require('../config');

const calculateDiscountValue = (amount, discountAmount, discountType) => {
  if (!discountAmount || discountAmount <= 0) return 0;
  if (discountType === 'percentage') {
    return (amount * discountAmount) / 100;
  }
  return discountAmount;
};

const recalculateMemberFinancials = async (memberId) => {
  const member = await Member.findById(memberId).populate('packageId', PACKAGE_PRICING);
  if (!member) return null;

  const payments = await Payment.find({ memberId });
  const pkg = member.packageId;
  const packagePrice = pkg ? pkg.getTotalForGender(member.gender) : 0;
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

    // When caller scopes to a single member (nested list on MemberDetails) return full set.
    // Otherwise paginate for the global Payments page.
    const isScoped = !!req.query.memberId;
    if (isScoped) {
      const payments = await Payment.find(filter)
        .populate('memberId', 'name memberId phone totalAmount paidAmount dueAmount')
        .populate('packageId', PACKAGE_SUMMARY)
        .sort({ date: -1 });
      return res.json({ success: true, data: payments });
    }

    const result = await paginate(Payment, {
      filter,
      page: req.query.page,
      limit: req.query.limit,
      sort: { date: -1 },
      populate: [
        { path: 'memberId', select: 'name memberId phone totalAmount paidAmount dueAmount' },
        { path: 'packageId', select: PACKAGE_SUMMARY },
      ],
    });

    res.json({ success: true, data: result.data, pagination: result.pagination });
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
      .populate('packageId', PACKAGE_SUMMARY);

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

    // Find active subscription for this member
    const activeSub = await Subscription.findOne({ memberId, status: 'active' }).sort({ createdAt: -1 });

    // Create payment
    const payment = await Payment.create({
      memberId,
      packageId,
      subscriptionId: activeSub?._id || null,
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

    // Also update subscription financials if linked
    if (activeSub) {
      const subPayments = await Payment.find({ subscriptionId: activeSub._id });
      const subPaid = subPayments.reduce((sum, p) => sum + (p.finalAmount || 0), 0);
      activeSub.paidAmount = subPaid;
      activeSub.dueAmount = Math.max(0, activeSub.totalAmount - subPaid);
      await activeSub.save();
    }

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
     .populate('packageId', PACKAGE_SUMMARY);

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

    const memberId = payment.memberId;
    await Payment.findByIdAndDelete(req.params.id);
    await recalculateMemberFinancials(memberId);

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

    // Collect unique member IDs before deletion
    const affectedMemberIds = [...new Set(payments.map(p => p.memberId.toString()))];

    await Payment.deleteMany({ _id: { $in: paymentIds } });

    // Recalculate financials for all affected members
    await Promise.all(affectedMemberIds.map(id => recalculateMemberFinancials(id)));

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
      .populate('packageId', PACKAGE_RECEIPT);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Monthly renewals are not sales of the original package. Substitute a synthetic
    // "Monthly Access" entry so the receipt matches what the member actually paid for.
    const isMonthly = ['monthly', 'monthly_renewal'].includes(payment.paymentType);
    let pkgBlock;
    if (isMonthly) {
      const GymConfig = require('../models/GymConfig');
      const config = await GymConfig.findOne();
      const accessDays = config?.monthlyAccessDays || 30;
      pkgBlock = {
        name: 'Monthly Access',
        duration: accessDays,
        description: 'Monthly gym access renewal',
        benefits: [],
        isLifetime: false,
      };
    } else if (payment.packageId) {
      pkgBlock = {
        name: payment.packageId.name,
        priceGents: payment.packageId.priceGents,
        priceLadies: payment.packageId.priceLadies,
        duration: payment.packageId.duration,
        description: payment.packageId.description,
        benefits: payment.packageId.benefits,
        isLifetime: payment.packageId.isLifetime,
        freeMonths: payment.packageId.freeMonths,
      };
    } else {
      pkgBlock = { name: '-', duration: 0, description: '', benefits: [] };
    }

    const receipt = {
      receiptId: `RCP-${payment._id.toString().slice(-8).toUpperCase()}`,
      gym: config.gym,
      member: {
        name: payment.memberId.name,
        memberId: payment.memberId.memberId,
        phone: payment.memberId.phone
      },
      package: pkgBlock,
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