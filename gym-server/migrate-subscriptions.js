/**
 * Migration script: Create Subscription records from existing Member data.
 *
 * Run once: node migrate-subscriptions.js
 *
 * Safe to re-run — skips members that already have subscriptions.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Member = require('./models/Member');
const Subscription = require('./models/Subscription');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gymdb';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const members = await Member.find({});
  console.log(`Found ${members.length} members to migrate`);

  let created = 0;
  let skipped = 0;

  for (const member of members) {
    // Check if subscription already exists for this member
    const existing = await Subscription.findOne({ memberId: member._id });
    if (existing) {
      skipped++;
      continue;
    }

    // Determine subscription status
    let status = 'active';
    if (member.expiryDate && member.expiryDate < new Date()) {
      status = 'expired';
    }

    const isLifetime = !member.expiryDate;

    await Subscription.create({
      memberId: member._id,
      packageId: member.packageId,
      startDate: member.joinDate || member.createdAt,
      endDate: member.expiryDate || null,
      isLifetime,
      status,
      totalAmount: member.totalAmount || 0,
      paidAmount: member.paidAmount || 0,
      dueAmount: member.dueAmount || 0,
      createdBy: member.addedBy || null,
    });

    created++;
  }

  // Also link existing payments to subscriptions where possible
  const Payment = require('./models/Payment');
  const payments = await Payment.find({ subscriptionId: null });
  let linked = 0;

  for (const payment of payments) {
    const sub = await Subscription.findOne({ memberId: payment.memberId }).sort({ createdAt: -1 });
    if (sub) {
      payment.subscriptionId = sub._id;
      await payment.save();
      linked++;
    }
  }

  // Link installments to subscriptions
  const Installment = require('./models/Installment');
  const installments = await Installment.find({ subscriptionId: null });
  let linkedInst = 0;

  for (const inst of installments) {
    const sub = await Subscription.findOne({ memberId: inst.memberId }).sort({ createdAt: -1 });
    if (sub) {
      inst.subscriptionId = sub._id;
      await inst.save();
      linkedInst++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Subscriptions created: ${created}`);
  console.log(`  Members skipped (already migrated): ${skipped}`);
  console.log(`  Payments linked to subscriptions: ${linked}`);
  console.log(`  Installments linked to subscriptions: ${linkedInst}`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
