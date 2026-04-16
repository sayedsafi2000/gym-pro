const Subscription = require('../models/Subscription');
const Member = require('../models/Member');
const Package = require('../models/Package');

// Sync subscription data back to Member for backward compatibility
const syncMemberFields = async (memberId) => {
  const activeSub = await Subscription.findOne({ memberId, status: 'active' })
    .sort({ createdAt: -1 });

  if (activeSub) {
    await Member.findByIdAndUpdate(memberId, {
      packageId: activeSub.packageId,
      joinDate: activeSub.startDate,
      expiryDate: activeSub.endDate,
      totalAmount: activeSub.totalAmount,
      paidAmount: activeSub.paidAmount,
      dueAmount: activeSub.dueAmount,
    });
  }
  return activeSub;
};

// Recalculate subscription financials from payments
const recalculateSubscriptionFinancials = async (subscriptionId) => {
  const Payment = require('../models/Payment');
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;

  const payments = await Payment.find({ subscriptionId });
  const totalPaid = payments.reduce((sum, p) => sum + (p.finalAmount || 0), 0);
  const totalDiscount = payments.reduce(
    (sum, p) => sum + Math.max(0, (p.originalAmount || 0) - (p.finalAmount || 0)),
    0
  );

  sub.paidAmount = totalPaid;
  sub.dueAmount = Math.max(0, sub.totalAmount - totalDiscount - totalPaid);
  await sub.save();

  // Sync back to member for backward compat
  await syncMemberFields(sub.memberId);

  return sub;
};

// @desc    Get member's subscription history
// @route   GET /api/subscriptions/member/:memberId
const getMemberSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ memberId: req.params.memberId })
      .populate('packageId', 'name duration priceGents priceLadies admissionFee includesAdmission freeMonths description benefits category isLifetime')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get active subscription for a member
// @route   GET /api/subscriptions/member/:memberId/active
const getActiveSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      memberId: req.params.memberId,
      status: 'active',
    })
      .populate('packageId', 'name duration priceGents priceLadies admissionFee includesAdmission freeMonths description benefits category isLifetime')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Renew subscription (creates new, expires old)
// @route   POST /api/subscriptions/renew
const renewSubscription = async (req, res) => {
  try {
    const { memberId, packageId, paymentType, initialPayment, paymentMethod } = req.body;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    // Expire any current active subscription
    const activeSub = await Subscription.findOne({ memberId, status: 'active' });
    if (activeSub) {
      await activeSub.cancel();
    }

    // Calculate pricing
    const totalPrice = pkg.getTotalForGender(member.gender);
    const startDate = new Date();
    const endDate = pkg.isLifetime ? null : new Date(startDate.getTime() + pkg.duration * 24 * 60 * 60 * 1000);

    let paidAmount = 0;
    let dueAmount = totalPrice;

    if (paymentType === 'full') {
      paidAmount = totalPrice;
      dueAmount = 0;
    } else if (paymentType === 'partial' && initialPayment) {
      paidAmount = parseFloat(initialPayment);
      dueAmount = totalPrice - paidAmount;
    }

    // Create new subscription
    const subscription = await Subscription.create({
      memberId,
      packageId,
      startDate,
      endDate,
      isLifetime: pkg.isLifetime || false,
      status: 'active',
      totalAmount: totalPrice,
      paidAmount,
      dueAmount,
      createdBy: req.admin?._id,
    });

    // Create payment record if payment made
    if (paidAmount > 0) {
      const Payment = require('../models/Payment');
      await Payment.create({
        memberId,
        packageId,
        subscriptionId: subscription._id,
        originalAmount: paidAmount,
        discountAmount: 0,
        discountType: 'fixed',
        finalAmount: paidAmount,
        paymentMethod: paymentMethod || 'Cash',
        date: startDate,
        note: `Renewal payment for ${pkg.name}`,
        paymentType: paymentType === 'full' ? 'full' : 'partial',
      });
    }

    // Sync to member for backward compat
    await syncMemberFields(memberId);

    const populated = await subscription.populate(
      'packageId',
      'name duration priceGents priceLadies admissionFee includesAdmission freeMonths description benefits category isLifetime'
    );

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Admin manually expire a subscription
// @route   POST /api/subscriptions/:id/expire
const expireSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    await subscription.expire();
    await syncMemberFields(subscription.memberId);

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin manually activate a subscription
// @route   POST /api/subscriptions/:id/activate
const activateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Check no other active subscription exists
    const existing = await Subscription.findOne({
      memberId: subscription.memberId,
      status: 'active',
      _id: { $ne: subscription._id },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Member already has an active subscription. Cancel it first.',
      });
    }

    subscription.status = 'active';
    await subscription.save();
    await syncMemberFields(subscription.memberId);

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMemberSubscriptions,
  getActiveSubscription,
  renewSubscription,
  expireSubscription,
  activateSubscription,
  syncMemberFields,
  recalculateSubscriptionFinancials,
};
