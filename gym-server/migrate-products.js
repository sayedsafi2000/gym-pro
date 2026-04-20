// One-off migration: normalize Product.category to lowercase and dedupe by (name, category).
// Run: node gym-server/migrate-products.js
// Safe to re-run — idempotent.

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Sale = (() => {
  try { return require('./models/Sale'); } catch { return null; }
})();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gymdb';

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Lowercase categories
  const lowered = await Product.collection.updateMany(
    { category: { $regex: /[A-Z]/ } },
    [{ $set: { category: { $toLower: '$category' } } }]
  );
  console.log(`Normalized category casing on ${lowered.modifiedCount} products`);

  // 2. Dedupe: keep earliest by createdAt per (name, category). Merge stock + soldCount.
  const dupes = await Product.aggregate([
    {
      $group: {
        _id: { name: '$name', category: '$category' },
        ids: { $push: '$_id' },
        count: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        totalSold: { $sum: '$soldCount' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  let removed = 0;
  for (const group of dupes) {
    const sorted = await Product.find({ _id: { $in: group.ids } }).sort({ createdAt: 1 });
    const keeper = sorted[0];
    const extras = sorted.slice(1);

    keeper.stock = group.totalStock;
    keeper.soldCount = group.totalSold;
    await keeper.save();

    // Re-point sales (if any) from extras to keeper
    if (Sale) {
      for (const extra of extras) {
        await Sale.updateMany({ productId: extra._id }, { $set: { productId: keeper._id } });
      }
    }

    await Product.deleteMany({ _id: { $in: extras.map((e) => e._id) } });
    removed += extras.length;
    console.log(`Deduped "${group._id.name}" (${group._id.category}): kept ${keeper._id}, removed ${extras.length}, merged stock=${group.totalStock} sold=${group.totalSold}`);
  }

  console.log(`Removed ${removed} duplicate products`);

  // 3. Ensure unique index
  try {
    await Product.collection.createIndex({ name: 1, category: 1 }, { unique: true });
    console.log('Unique index on {name,category} ensured');
  } catch (e) {
    console.warn('Index creation failed:', e.message);
  }

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
})().catch((e) => {
  console.error('Migration error:', e);
  process.exit(1);
});
