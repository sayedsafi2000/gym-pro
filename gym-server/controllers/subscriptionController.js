const Subscription = require('../models/Subscription');
const GymConfig = require('../models/GymConfig');
const { PACKAGE_FULL } = require('../utils/populateSelects');
const subscriptionService = require('../services/subscriptionService');

// @desc    Get member's subscription history
// @route   GET /api/subscriptions/member/:memberId
const getMemberSubscriptions = async (req, res) => {
  try {
    await subscriptionService.sweepExpired(req.params.memberId);
    const subscriptions = await Subscription.find({ memberId: req.params.memberId })
      .populate('packageId', PACKAGE_FULL)
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
    await subscriptionService.sweepExpired(req.params.memberId);
    const subscription = await Subscription.findOne({
      memberId: req.params.memberId,
      status: 'active',
    })
      .populate('packageId', PACKAGE_FULL)
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
    const subscription = await subscriptionService.renew({
      memberId,
      packageId,
      paymentType,
      initialPayment,
      paymentMethod,
      adminId: req.admin?._id,
    });
    const populated = await subscription.populate('packageId', PACKAGE_FULL);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(error.status || 400).json({ success: false, message: error.message });
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
    await subscriptionService.syncMember(subscription.memberId);

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
    await subscriptionService.syncMember(subscription.memberId);

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Monthly renewal for lifetime members (or walk-in monthly)
// @route   POST /api/subscriptions/monthly-renew
const monthlyRenew = async (req, res) => {
  try {
    const { memberId, paymentMethod } = req.body;
    const subscription = await subscriptionService.monthlyRenew({
      memberId,
      paymentMethod,
      adminId: req.admin?._id,
    });
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    res.status(error.status || 400).json({ success: false, message: error.message });
  }
};

// @desc    Get gym config (monthly fees etc.)
// @route   GET /api/subscriptions/config
const getGymConfig = async (req, res) => {
  try {
    let config = await GymConfig.findOne();
    if (!config) config = await GymConfig.create({});
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update gym config
// @route   PUT /api/subscriptions/config
const updateGymConfig = async (req, res) => {
  try {
    let config = await GymConfig.findOne();
    if (!config) {
      config = await GymConfig.create(req.body);
    } else {
      Object.assign(config, req.body);
      await config.save();
    }
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMemberSubscriptions,
  getActiveSubscription,
  renewSubscription,
  expireSubscription,
  activateSubscription,
  monthlyRenew,
  getGymConfig,
  updateGymConfig,
  // Re-exports kept for backward compatibility with any external importer.
  syncMemberFields: subscriptionService.syncMember,
  recalculateSubscriptionFinancials: subscriptionService.recalcFinancials,
};
