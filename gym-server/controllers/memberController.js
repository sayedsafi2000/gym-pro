const Member = require('../models/Member');
const Package = require('../models/Package');
const Payment = require('../models/Payment');

// @desc    Get all members (with optional filters)
// @route   GET /api/members
const getMembers = async (req, res) => {
  try {
    const { status, search } = req.query;
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    let query = {};

    // Search by name or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by status
    if (status === 'active') {
      query.expiryDate = { $gt: threeDaysLater };
    } else if (status === 'expired') {
      query.expiryDate = { $lt: now };
    } else if (status === 'expiring') {
      query.expiryDate = { $gte: now, $lte: threeDaysLater };
    }

    const members = await Member.find(query)
      .populate('packageId', 'name duration price')
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
    const { name, phone, address, gender, joinDate, packageId, paymentType, initialPayment } = req.body;

    // Get package to calculate expiry date and total amount
    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const join = joinDate ? new Date(joinDate) : new Date();
    const expiry = new Date(join.getTime() + pkg.duration * 24 * 60 * 60 * 1000);

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

    const member = await Member.create({
      memberId,
      name,
      phone,
      address,
      gender,
      joinDate: join,
      expiryDate: expiry,
      packageId,
      totalAmount: pkg.price,
      paidAmount,
      dueAmount,
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
    } else {
      console.log('No payment created:', { paymentType, paidAmount });
    }

    const populated = await member.populate('packageId', 'name duration price');
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

module.exports = { getMembers, getMember, createMember, updateMember, deleteMember };
