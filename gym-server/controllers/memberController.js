const Member = require('../models/Member');
const Package = require('../models/Package');
const Payment = require('../models/Payment');
const Installment = require('../models/Installment');

// @desc    Get all members (with optional filters)
// @route   GET /api/members
const getMembers = async (req, res) => {
  try {
    const { status, search } = req.query;
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

    const members = await Member.find(query)
      .populate('packageId', 'name duration price description benefits category isLifetime')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: members.length, data: members });
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
      'name duration price'
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
    const { name, phone, emergencyPhone, address, gender, joinDate, packageId, paymentType, initialPayment } = req.body;

    // Get package to calculate expiry date and total amount
    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const join = joinDate ? new Date(joinDate) : new Date();
    const expiry = pkg.isLifetime ? null : new Date(join.getTime() + pkg.duration * 24 * 60 * 60 * 1000);

    // Generate memberId
    const count = await Member.countDocuments();
    const memberId = `GYM-${String(count + 1).padStart(3, '0')}`;

    // Calculate payment amounts
    let paidAmount = 0;
    let dueAmount = pkg.price;

    if (paymentType === 'full') {
      paidAmount = pkg.price;
      dueAmount = 0;
    } else if (paymentType === 'partial' && initialPayment) {
      paidAmount = parseFloat(initialPayment);
      dueAmount = pkg.price - paidAmount;
    }

    // If admin (not super_admin), set status to pending
    const memberStatus = req.admin?.role === 'admin' ? 'pending' : 'approved';

    const member = await Member.create({
      memberId,
      name,
      phone,
      emergencyPhone: emergencyPhone || '',
      address,
      gender,
      joinDate: join,
      expiryDate: expiry,
      packageId,
      totalAmount: pkg.price,
      paidAmount,
      dueAmount,
      status: memberStatus,
      addedBy: req.admin?._id,
    });

    // Create initial payment record if payment was made
    if ((paymentType === 'full' || paymentType === 'partial') && paidAmount > 0) {
      const paymentMethod = req.body.paymentMethod || 'Cash'; // Default to Cash
      console.log('Creating payment:', { memberId: member._id, amount: paidAmount, paymentType });
      await Payment.create({
        memberId: member._id,
        packageId: packageId,
        originalAmount: paidAmount,
        discountAmount: 0,
        discountType: 'fixed',
        finalAmount: paidAmount,
        paymentMethod,
        date: join,
        note: `Initial ${paymentType} payment for membership`,
        paymentType: paymentType === 'full' ? 'full' : 'partial'
      });
      console.log('Payment created successfully');
    } else if (paymentType === 'monthly') {
      // Create installment plan
      const installmentMonths = parseInt(req.body.installmentMonths, 10) || Math.ceil(pkg.duration / 30) || 1;
      const monthlyAmount = Math.ceil(pkg.price / installmentMonths);

      const schedule = [];
      for (let i = 1; i <= installmentMonths; i++) {
        const dueDate = new Date(join);
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        schedule.push({
          month: i,
          amount: i === installmentMonths ? pkg.price - monthlyAmount * (installmentMonths - 1) : monthlyAmount,
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
        totalAmount: pkg.price,
        monthlyAmount,
        totalInstallments: installmentMonths,
        paidInstallments: 1,
        schedule,
      });

      // Update member with first payment
      member.paidAmount = firstAmount;
      member.dueAmount = pkg.price - firstAmount;
      await member.save();
    } else {
      console.log('No payment created:', { paymentType, paidAmount });
    }

    const populated = await member.populate('packageId', 'name duration price description benefits category isLifetime');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
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

      // Auto-renew if fully paid and membership expired
      if (newDueAmount <= 0 && member.expiryDate && member.expiryDate < new Date()) {
        const pkg = await Package.findById(member.packageId);
        if (pkg) {
          req.body.joinDate = new Date();
          req.body.expiryDate = new Date(Date.now() + pkg.duration * 24 * 60 * 60 * 1000);
        }
      }
    }

    // Recalculate expiry and payment amounts if package or joinDate changes
    if (packageId || joinDate) {
      const member = await Member.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const pkgId = packageId || member.packageId;
      const pkg = await Package.findById(pkgId);
      if (!pkg) {
        return res.status(404).json({ success: false, message: 'Package not found' });
      }

      const join = joinDate ? new Date(joinDate) : member.joinDate;
      req.body.expiryDate = new Date(join.getTime() + pkg.duration * 24 * 60 * 60 * 1000);
      req.body.joinDate = join;

      // Update total amount and recalculate due amount
      req.body.totalAmount = pkg.price;
      req.body.dueAmount = pkg.price - (req.body.paidAmount || member.paidAmount);
    }

    const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('packageId', 'name duration price');

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
      .populate('packageId', 'name duration price')
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
    const populated = await member.populate('packageId', 'name duration price');
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

module.exports = { getMembers, getMember, createMember, updateMember, deleteMember, getPendingMembers, approveMember, rejectMember };
