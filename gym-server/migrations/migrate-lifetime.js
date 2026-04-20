/**
 * Migration: Set lifetime membership fields on existing members.
 *
 * - Members with lifetime packages (expiryDate: null) get:
 *   hasLifetimeMembership: true, freeMonthsEndDate, expiryDate set to free months end
 * - Existing subscriptions get type: 'package'
 * - Remove "Monthly Prepaid" from packages
 * - Seed GymConfig if not exists
 *
 * Run: node migrate-lifetime.js
 * Safe to re-run (idempotent).
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Member = require('../models/Member');
const Package = require('../models/Package');
const Subscription = require('../models/Subscription');
const GymConfig = require('../models/GymConfig');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gymdb';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Update lifetime members
  const members = await Member.find().populate('packageId');
  let lifetimeUpdated = 0;

  for (const member of members) {
    if (member.hasLifetimeMembership) continue; // already migrated

    const pkg = member.packageId;
    if (pkg && pkg.isLifetime) {
      const freeMonths = pkg.freeMonths || 0;
      const joinDate = member.joinDate || member.createdAt;
      const freeEnd = new Date(joinDate.getTime() + freeMonths * 30 * 24 * 60 * 60 * 1000);

      member.hasLifetimeMembership = true;
      member.lifetimePackageId = pkg._id;
      member.freeMonthsEndDate = freeEnd;

      // Replace null expiryDate with free months end
      if (!member.expiryDate) {
        member.expiryDate = freeEnd;
      }

      await member.save();
      lifetimeUpdated++;
    }
  }
  console.log(`Lifetime members updated: ${lifetimeUpdated}`);

  // 2. Add type: 'package' to all existing subscriptions without type
  const subResult = await Subscription.updateMany(
    { type: { $exists: false } },
    { $set: { type: 'package' } }
  );
  // Also update subscriptions that have type but it's null/undefined
  const subResult2 = await Subscription.updateMany(
    { type: null },
    { $set: { type: 'package' } }
  );
  console.log(`Subscriptions tagged as 'package': ${subResult.modifiedCount + subResult2.modifiedCount}`);

  // 3. Remove "Monthly Prepaid" from packages
  const delResult = await Package.deleteMany({ name: 'Monthly Prepaid' });
  console.log(`Monthly Prepaid packages removed: ${delResult.deletedCount}`);

  // 4. Seed GymConfig
  const configExists = await GymConfig.countDocuments();
  if (configExists === 0) {
    await GymConfig.create({});
    console.log('Seeded GymConfig');
  } else {
    console.log('GymConfig already exists');
  }

  console.log('\nMigration complete!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
