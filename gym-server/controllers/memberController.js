const Member = require('../models/Member');
const Package = require('../models/Package');
const Payment = require('../models/Payment');
const Installment = require('../models/Installment');
const Subscription = require('../models/Subscription');
const paginate = require('../utils/paginate');
const { PACKAGE_FULL } = require('../utils/populateSelects');
const { calcExpiry, reconcileExpiry } = require('../utils/expiry');
const subscriptionService = require('../services/subscriptionService');

// @desc    Get all members (with optional filters)
// @route   GET /api/members
const getMembers = async (req, res) => {
  try {
    const { status, search, page, limit } = req.query;
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Super admin sees all. Regular admin sees approved + their own pending.
    let query = {};
    if (req.admin?.role === 'admin') {
      query.$or = [
        { status: 'approved' },
        { status: { $exists: false } },
        { status: 'pending', addedBy: req.admin._id },
      ];
    }

    // Search by name or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by status (null expiryDate = lifetime = always active)
    if (status === 'active') {
      query.$or = [{ expiryDate: null }, { expiryDate: { $gt: threeDaysLater } }];
    } else if (status === 'expired') {
      query.expiryDate = { $ne: null, $lt: now };
    } else if (status === 'expiring') {
      query.expiryDate = { $ne: null, $gte: now, $lte: threeDaysLater };
    }

    const result = await paginate(Member, {
      filter: query,
      page,
      limit,
      sort: { createdAt: -1 },
      populate: { path: 'packageId', select: PACKAGE_FULL },
    });

    res.json({ success: true, count: result.data.length, data: result.data, pagination: result.pagination });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single member
// @route   GET /api/members/:id
const getMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate(
      'packageId',
      PACKAGE_FULL
    );
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a member
// @route   POST /api/members
const createMember = async (req, res) => {
  try {
    const { memberId, name, phone, emergencyPhone, address, gender, joinDate, packageId, paymentType, initialPayment } = req.body;

    const trimmedMemberId = typeof memberId === 'string' ? memberId.trim() : '';
    if (!trimmedMemberId) {
      return res.status(400).json({ success: false, message: 'Member ID is required' });
    }

    // Get package to calculate expiry date and total amount
    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const join = joinDate ? new Date(joinDate) : new Date();
    const expiry = calcExpiry(pkg, join);

    const totalPrice = pkg.getTotalForGender(gender);
    const { paidAmount, dueAmount } = subscriptionService.computePaymentSplit(
      totalPrice,
      paymentType,
      initialPayment,
    );

    // If admin (not super_admin), set status to pending
    const memberStatus = req.admin?.role === 'admin' ? 'pending' : 'approved';

    const member = await Member.create({
      memberId: trimmedMemberId,
      name,
      phone,
      emergencyPhone: emergencyPhone || '',
      address,
      gender,
      joinDate: join,
      expiryDate: expiry,
      packageId,
      hasLifetimeMembership: pkg.isLifetime || false,
      lifetimePackageId: pkg.isLifetime ? packageId : null,
      freeMonthsEndDate: pkg.isLifetime ? expiry : null,
      totalAmount: totalPrice,
      paidAmount,
      dueAmount,
      status: memberStatus,
      addedBy: req.admin?._id,
    });

    // Create subscription record (source of truth for access)
    // Lifetime subs store endDate:null; free-months window lives on Member
    const subscription = await Subscription.create({
      memberId: member._id,
      packageId,
      startDate: join,
      endDate: pkg.isLifetime ? null : expiry,
      isLifetime: pkg.isLifetime || false,
      status: 'active',
      totalAmount: totalPrice,
      paidAmount,
      dueAmount,
      createdBy: req.admin?._id,
    });

    // Create initial payment record if payment was made
    if ((paymentType === 'full' || paymentType === 'partial') && paidAmount > 0) {
      const paymentMethod = req.body.paymentMethod || 'Cash';
      await Payment.create({
        memberId: member._id,
        packageId: packageId,
        subscriptionId: subscription._id,
        originalAmount: paidAmount,
        discountAmount: 0,
        discountType: 'fixed',
        finalAmount: paidAmount,
        paymentMethod,
        date: join,
        note: `Initial ${paymentType} payment for membership`,
        paymentType: paymentType === 'full' ? 'full' : 'partial'
      });
    } else if (paymentType === 'monthly') {
      // Create installment plan
      const installmentMonths = parseInt(req.body.installmentMonths, 10) || Math.ceil(pkg.duration / 30) || 1;
      const monthlyAmount = Math.ceil(totalPrice / installmentMonths);

      const schedule = [];
      for (let i = 1; i <= installmentMonths; i++) {
        const dueDate = new Date(join);
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        schedule.push({
          month: i,
          amount: i === installmentMonths ? totalPrice - monthlyAmount * (installmentMonths - 1) : monthlyAmount,
          dueDate,
          status: 'pending',
        });
      }

      // Pay first installment immediately
      const firstAmount = schedule[0].amount;
      const paymentMethod = req.body.paymentMethod || 'Cash';
      const payment = await Payment.create({
        memberId: member._id,
        packageId: packageId,
        subscriptionId: subscription._id,
        originalAmount: firstAmount,
        finalAmount: firstAmount,
        paymentMethod,
        date: join,
        note: `Monthly installment 1 of ${installmentMonths}`,
        paymentType: 'monthly',
      });

      schedule[0].status = 'paid';
      schedule[0].paidDate = join;
      schedule[0].paymentId = payment._id;

      await Installment.create({
        memberId: member._id,
        packageId: packageId,
        subscriptionId: subscription._id,
        totalAmount: totalPrice,
        monthlyAmount,
        totalInstallments: installmentMonths,
        paidInstallments: 1,
        schedule,
      });

      // Update member + subscription with first payment. Independent docs —
      // write in parallel to shave a round-trip.
      member.paidAmount = firstAmount;
      member.dueAmount = totalPrice - firstAmount;
      subscription.paidAmount = firstAmount;
      subscription.dueAmount = totalPrice - firstAmount;
      await Promise.all([member.save(), subscription.save()]);
    }

    const populated = await member.populate('packageId', PACKAGE_FULL);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (error && error.code === 11000 && error.keyPattern && error.keyPattern.memberId) {
      return res.status(409).json({ success: false, message: 'Member ID already exists. Please use a different one.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get the most-recently-created member's ID (UI hint)
// @route   GET /api/members/last-id
const getLastMemberId = async (req, res) => {
  try {
    const latest = await Member.findOne().sort({ createdAt: -1 }).select('memberId').lean();
    res.json({ success: true, data: { lastMemberId: latest?.memberId || null } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fields accepted via PUT /api/members/:id. The controller also writes
// derived values (expiryDate, totals) into the same object after validating
// the input — those are kept. Anything else (memberId, addedBy, timestamps,
// lifetime flags, etc.) is stripped to prevent mass-assignment.
const MEMBER_UPDATE_ALLOWED = [
  'name', 'phone', 'emergencyPhone', 'address', 'gender',
  'deviceUserId', 'joinDate', 'expiryDate', 'packageId', 'status',
  'paidAmount', 'dueAmount', 'totalAmount',
];

const pickMemberUpdate = (body) => {
  const out = {};
  for (const key of MEMBER_UPDATE_ALLOWED) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
};

// @desc    Update a member
// @route   PUT /api/members/:id
const updateMember = async (req, res) => {
  try {
    const { packageId, joinDate, paymentType, additionalPayment } = req.body;

    // Handle additional payment
    if ((paymentType === 'full' || paymentType === 'partial') && additionalPayment) {
      const member = await Member.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const paymentAmount = parseFloat(additionalPayment);
      if (paymentAmount > member.dueAmount) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (${paymentAmount}) exceeds due amount (${member.dueAmount})`
        });
      }

      // Create payment record
      const paymentMethod = req.body.paymentMethod || 'Cash';
      await Payment.create({
        memberId: member._id,
        packageId: member.packageId,
        originalAmount: paymentAmount,
        discountAmount: 0,
        discountType: 'fixed',
        finalAmount: paymentAmount,
        paymentMethod,
        date: new Date(),
        note: `Additional ${paymentType} payment`,
        paymentType: paymentType === 'full' ? 'full' : 'partial'
      });

      // Update member payment amounts
      const newPaidAmount = member.paidAmount + paymentAmount;
      const newDueAmount = member.totalAmount - newPaidAmount;

      req.body.paidAmount = newPaidAmount;
      req.body.dueAmount = newDueAmount;

      // Auto-renew if fully paid and membership expired — create NEW subscription
      if (newDueAmount <= 0 && member.expiryDate && member.expiryDate < new Date()) {
        const pkg = await Package.findById(member.packageId);
        if (pkg) {
          // Expire old subscription
          const oldSub = await Subscription.findOne({ memberId: member._id, status: 'active' });
          if (oldSub) await oldSub.expire();

          const newStart = new Date();
          const newEnd = pkg.isLifetime ? null : new Date(newStart.getTime() + pkg.duration * 24 * 60 * 60 * 1000);
          const newTotal = pkg.getTotalForGender(member.gender);

          await Subscription.create({
            memberId: member._id,
            packageId: member.packageId,
            startDate: newStart,
            endDate: newEnd,
            isLifetime: pkg.isLifetime || false,
            status: 'active',
            totalAmount: newTotal,
            paidAmount: newTotal,
            dueAmount: 0,
            createdBy: req.admin?._id,
          });

          req.body.joinDate = newStart;
          req.body.expiryDate = newEnd;
        }
      }
    }

    // Recalculate expiry + totals ONLY when package or joinDate truly changed.
    // Prior bug: form always posts packageId+joinDate; branch fired on every edit
    // and overwrote expiryDate, revoking monthly-renewal extensions on lifetime members.
    if (packageId || joinDate) {
      const member = await Member.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const currentPkgId = member.packageId ? String(member.packageId) : null;
      const incomingPkgId = packageId ? String(packageId) : currentPkgId;
      const pkgChanged = incomingPkgId !== currentPkgId;

      const currentJoinMs = member.joinDate ? new Date(member.joinDate).getTime() : null;
      const incomingJoinMs = joinDate ? new Date(joinDate).getTime() : currentJoinMs;
      const joinChanged = currentJoinMs !== incomingJoinMs;

      if (pkgChanged || joinChanged) {
        const pkg = await Package.findById(incomingPkgId);
        if (!pkg) {
          return res.status(404).json({ success: false, message: 'Package not found' });
        }

        const join = joinDate ? new Date(joinDate) : member.joinDate;
        req.body.expiryDate = reconcileExpiry(member.expiryDate, pkg, join);
        req.body.joinDate = join;

        const memberGender = req.body.gender || member.gender;
        const newTotal = pkg.getTotalForGender(memberGender);
        req.body.totalAmount = newTotal;
        req.body.dueAmount = newTotal - (req.body.paidAmount || member.paidAmount);
      } else {
        // Nothing actually changed — strip the noop fields so findByIdAndUpdate
        // doesn't re-stamp joinDate and cause sync side effects.
        delete req.body.joinDate;
        delete req.body.packageId;
      }
    }

    const update = pickMemberUpdate(req.body);
    const member = await Member.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate('packageId', PACKAGE_FULL);

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, data: member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a member
// @route   DELETE /api/members/:id
const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pending members (super admin only)
// @route   GET /api/members/pending
const getPendingMembers = async (req, res) => {
  try {
    const members = await Member.find({ status: 'pending' })
      .populate('packageId', PACKAGE_FULL)
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve a pending member
// @route   PUT /api/members/:id/approve
const approveMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (member.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Member is not pending' });
    }
    member.status = 'approved';
    await member.save();
    const populated = await member.populate('packageId', PACKAGE_FULL);
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject a pending member
// @route   DELETE /api/members/:id/reject
const rejectMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (member.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Member is not pending' });
    }
    await Member.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Member request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getMembers, getMember, createMember, getLastMemberId, updateMember, deleteMember, getPendingMembers, approveMember, rejectMember };
