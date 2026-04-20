const Installment = require('../models/Installment');
const Payment = require('../models/Payment');
const Member = require('../models/Member');
const { PACKAGE_SUMMARY } = require('../utils/populateSelects');

// @desc    Get installment plan for a member
// @route   GET /api/installments/member/:memberId
exports.getMemberInstallment = async (req, res) => {
  try {
    const installment = await Installment.findOne({ memberId: req.params.memberId })
      .populate('packageId', PACKAGE_SUMMARY)
      .sort({ createdAt: -1 });

    if (!installment) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: installment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Pay an installment month
// @route   POST /api/installments/:id/pay
exports.payInstallment = async (req, res) => {
  try {
    const { monthNumber, paymentMethod } = req.body;
    const installment = await Installment.findById(req.params.id);

    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment plan not found' });
    }

    const monthEntry = installment.schedule.find((s) => s.month === monthNumber);
    if (!monthEntry) {
      return res.status(400).json({ success: false, message: 'Invalid month number' });
    }
    if (monthEntry.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This installment is already paid' });
    }

    // Create payment record
    const payment = await Payment.create({
      memberId: installment.memberId,
      packageId: installment.packageId,
      originalAmount: monthEntry.amount,
      finalAmount: monthEntry.amount,
      paymentMethod: paymentMethod || 'Cash',
      paymentType: 'monthly',
      date: new Date(),
      note: `Monthly installment ${monthNumber} of ${installment.totalInstallments}`,
    });

    // Update installment schedule
    monthEntry.status = 'paid';
    monthEntry.paidDate = new Date();
    monthEntry.paymentId = payment._id;
    installment.paidInstallments += 1;

    if (installment.paidInstallments >= installment.totalInstallments) {
      installment.status = 'completed';
    }

    await installment.save();

    // Update member financials
    const member = await Member.findById(installment.memberId);
    if (member) {
      member.paidAmount += monthEntry.amount;
      member.dueAmount = Math.max(0, member.dueAmount - monthEntry.amount);
      await member.save();
    }

    res.json({ success: true, data: installment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all installments with overdue status
// @route   GET /api/installments/overdue
exports.getOverdueInstallments = async (req, res) => {
  try {
    const now = new Date();

    // Update overdue statuses
    await Installment.updateMany(
      { status: 'active', 'schedule.status': 'pending', 'schedule.dueDate': { $lt: now } },
      { $set: { 'schedule.$[elem].status': 'overdue' } },
      { arrayFilters: [{ 'elem.status': 'pending', 'elem.dueDate': { $lt: now } }] }
    );

    // Mark installment plans as overdue if any month is overdue
    const overdueInstallments = await Installment.find({
      status: 'active',
      'schedule.status': 'overdue',
    })
      .populate('memberId', 'name memberId phone')
      .populate('packageId', PACKAGE_SUMMARY);

    res.json({ success: true, data: overdueInstallments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
