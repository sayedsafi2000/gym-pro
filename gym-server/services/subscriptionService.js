// SubscriptionService — pure domain logic for subscription lifecycle.
// Controllers should stay HTTP-only (parse request, translate to/from service
// calls, format response). Business rules live here so they stay testable
// and consistent across call sites.

const Subscription = require('../models/Subscription');
const Member = require('../models/Member');
const Package = require('../models/Package');
const Payment = require('../models/Payment');
const GymConfig = require('../models/GymConfig');
const { AppError } = require('../middleware/errorHandler');

const DAY_MS = 24 * 60 * 60 * 1000;

// Thrown when a caller references a member/package/subscription that no
// longer exists. Controllers turn this into a 404.
class NotFoundError extends AppError {
  constructor(what) {
    super(`${what} not found`, 404);
  }
}

// Flip active subs to expired when endDate has passed. Lifetime subs
// (endDate:null) are never expired by time. Scoped by memberId to keep the
// write small per request.
const sweepExpired = (memberId) => Subscription.updateMany(
  { memberId, status: 'active', endDate: { $ne: null, $lt: new Date() } },
  { $set: { status: 'expired' } },
);

// Mirror active-subscription state back onto Member for backward-compatible
// reads. Member fields are effectively a cache of the subscription table.
const syncMember = async (memberId) => {
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

// Rebuild sub.paidAmount / dueAmount from its payments. Discounts reduce
// the headline total rather than the paid side.
const recalcFinancials = async (subscriptionId) => {
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;

  const payments = await Payment.find({ subscriptionId });
  const totalPaid = payments.reduce((sum, p) => sum + (p.finalAmount || 0), 0);
  const totalDiscount = payments.reduce(
    (sum, p) => sum + Math.max(0, (p.originalAmount || 0) - (p.finalAmount || 0)),
    0,
  );

  sub.paidAmount = totalPaid;
  sub.dueAmount = Math.max(0, sub.totalAmount - totalDiscount - totalPaid);
  await sub.save();

  await syncMember(sub.memberId);
  return sub;
};

// Resolve a payment intent into concrete paid/due numbers.
const computePaymentSplit = (total, paymentType, initialPayment) => {
  if (paymentType === 'full') {
    return { paidAmount: total, dueAmount: 0 };
  }
  if (paymentType === 'partial' && initialPayment) {
    const paid = parseFloat(initialPayment);
    return { paidAmount: paid, dueAmount: Math.max(0, total - paid) };
  }
  return { paidAmount: 0, dueAmount: total };
};

// Expire any currently-active subscription and create a fresh one for the
// chosen package. Records the payment if one was made, then syncs Member.
const renew = async ({ memberId, packageId, paymentType, initialPayment, paymentMethod, adminId }) => {
  const [member, pkg] = await Promise.all([
    Member.findById(memberId),
    Package.findById(packageId),
  ]);
  if (!member) throw new NotFoundError('Member');
  if (!pkg) throw new NotFoundError('Package');

  const activeSub = await Subscription.findOne({ memberId, status: 'active' });
  if (activeSub) await activeSub.cancel();

  const totalAmount = pkg.getTotalForGender(member.gender);
  const startDate = new Date();
  const endDate = pkg.isLifetime ? null : new Date(startDate.getTime() + pkg.duration * DAY_MS);
  const { paidAmount, dueAmount } = computePaymentSplit(totalAmount, paymentType, initialPayment);

  const subscription = await Subscription.create({
    memberId,
    packageId,
    startDate,
    endDate,
    isLifetime: !!pkg.isLifetime,
    status: 'active',
    totalAmount,
    paidAmount,
    dueAmount,
    createdBy: adminId,
  });

  if (paidAmount > 0) {
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

  await syncMember(memberId);
  return subscription;
};

// Extend a lifetime member's monthly access window by one access period.
// Intentionally skips syncMember: Member.totalAmount tracks the original
// package sale, not this recurring fee.
const monthlyRenew = async ({ memberId, paymentMethod, adminId }) => {
  const member = await Member.findById(memberId);
  if (!member) throw new NotFoundError('Member');

  let config = await GymConfig.findOne();
  if (!config) config = await GymConfig.create({});

  const fee = config.getFeeForGender(member.gender);
  const accessDays = config.monthlyAccessDays || 30;

  const now = new Date();
  const baseDate = member.expiryDate && member.expiryDate > now ? member.expiryDate : now;
  const newEnd = new Date(baseDate.getTime() + accessDays * DAY_MS);

  const subscription = await Subscription.create({
    memberId: member._id,
    packageId: null,
    type: 'monthly',
    startDate: now,
    endDate: newEnd,
    isLifetime: false,
    status: 'active',
    totalAmount: fee,
    paidAmount: fee,
    dueAmount: 0,
    createdBy: adminId,
  });

  await Payment.create({
    memberId: member._id,
    packageId: member.packageId || member.lifetimePackageId,
    subscriptionId: subscription._id,
    originalAmount: fee,
    discountAmount: 0,
    discountType: 'fixed',
    finalAmount: fee,
    paymentMethod: paymentMethod || 'Cash',
    date: now,
    note: `Monthly access payment (${accessDays} days)`,
    paymentType: 'monthly_renewal',
  });

  await Subscription.updateMany(
    { memberId: member._id, type: 'monthly', status: 'active', _id: { $ne: subscription._id } },
    { status: 'expired' },
  );

  member.expiryDate = newEnd;
  await member.save();

  return subscription;
};

module.exports = {
  NotFoundError,
  sweepExpired,
  syncMember,
  recalcFinancials,
  computePaymentSplit,
  renew,
  monthlyRenew,
};
