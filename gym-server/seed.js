const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const Admin = require('./models/Admin');
const Package = require('./models/Package');
const Member = require('./models/Member');
const Payment = require('./models/Payment');
const Device = require('./models/Device');
const Attendance = require('./models/Attendance');

dotenv.config();

// Helpers
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000);

const PAYMENT_METHODS = ['Cash', 'bKash', 'Nagad', 'Bank Transfer'];

const MEMBER_DATA = [
  { name: 'Rahim Uddin', phone: '01712345678', gender: 'Male', address: 'Mirpur, Dhaka' },
  { name: 'Karim Hossain', phone: '01812345679', gender: 'Male', address: 'Dhanmondi, Dhaka' },
  { name: 'Fatema Begum', phone: '01912345680', gender: 'Female', address: 'Gulshan, Dhaka' },
  { name: 'Arif Rahman', phone: '01612345681', gender: 'Male', address: 'Uttara, Dhaka' },
  { name: 'Nusrat Jahan', phone: '01512345682', gender: 'Female', address: 'Banani, Dhaka' },
  { name: 'Sakib Hasan', phone: '01712345683', gender: 'Male', address: 'Mohammadpur, Dhaka' },
  { name: 'Tania Akter', phone: '01812345684', gender: 'Female', address: 'Khilgaon, Dhaka' },
  { name: 'Mahmudul Haque', phone: '01912345685', gender: 'Male', address: 'Motijheel, Dhaka' },
  { name: 'Sumaiya Islam', phone: '01612345686', gender: 'Female', address: 'Bashundhara, Dhaka' },
  { name: 'Tanvir Ahmed', phone: '01512345687', gender: 'Male', address: 'Tejgaon, Dhaka' },
  { name: 'Rabeya Khatun', phone: '01712345688', gender: 'Female', address: 'Rampura, Dhaka' },
  { name: 'Imran Khan', phone: '01812345689', gender: 'Male', address: 'Malibagh, Dhaka' },
  { name: 'Sharmin Sultana', phone: '01912345690', gender: 'Female', address: 'Shantinagar, Dhaka' },
  { name: 'Zahid Hasan', phone: '01612345691', gender: 'Male', address: 'Farmgate, Dhaka' },
  { name: 'Mithila Rani', phone: '01512345692', gender: 'Female', address: 'Shahbag, Dhaka' },
  { name: 'Rafiq Islam', phone: '01712345693', gender: 'Male', address: 'Lalbagh, Dhaka' },
  { name: 'Anika Tabassum', phone: '01812345694', gender: 'Female', address: 'Wari, Dhaka' },
  { name: 'Hasan Ali', phone: '01912345695', gender: 'Male', address: 'Jatrabari, Dhaka' },
  { name: 'Priya Das', phone: '01612345696', gender: 'Female', address: 'Badda, Dhaka' },
  { name: 'Mizanur Rahman', phone: '01512345697', gender: 'Male', address: 'Paltan, Dhaka' },
];

async function seed() {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    Admin.deleteMany({}),
    Package.deleteMany({}),
    Member.deleteMany({}),
    Payment.deleteMany({}),
    Device.deleteMany({}),
    Attendance.deleteMany({}),
  ]);

  // Drop the stale non-sparse deviceUserId index and recreate as sparse
  try {
    await Member.collection.dropIndex('deviceUserId_1');
  } catch (e) {
    // Index may not exist yet
  }
  try {
    await Attendance.collection.dropIndexes();
  } catch (e) {
    // Ignore
  }
  await Member.syncIndexes();
  await Attendance.syncIndexes();

  // 1. Admin
  console.log('Seeding admin...');
  await Admin.create({
    email: 'admin@gym.com',
    password: 'admin1234',
  });

  // 2. Packages
  console.log('Seeding packages...');
  const packages = await Package.insertMany([
    { name: 'Monthly Basic', duration: 30, priceGents: 1500, priceLadies: 1500 },
    { name: 'Monthly Premium', duration: 30, priceGents: 2500, priceLadies: 2500 },
    { name: 'Quarterly Basic', duration: 90, priceGents: 4000, priceLadies: 4000 },
    { name: 'Quarterly Premium', duration: 90, priceGents: 6500, priceLadies: 6500 },
    { name: 'Half Yearly', duration: 180, priceGents: 8000, priceLadies: 8000 },
    { name: 'Annual', duration: 365, priceGents: 14000, priceLadies: 14000 },
  ]);

  // 3. Devices
  console.log('Seeding devices...');
  const devices = await Device.insertMany([
    {
      name: 'Main Entrance',
      ip: '192.168.1.201',
      port: 4370,
      serialNumber: 'ZK-MAIN-001',
      isActive: true,
      lastSyncAt: hoursAgo(1),
      lastSyncStatus: 'success',
    },
    {
      name: 'Back Door',
      ip: '192.168.1.202',
      port: 4370,
      serialNumber: 'ZK-BACK-002',
      isActive: true,
      lastSyncAt: hoursAgo(2),
      lastSyncStatus: 'success',
    },
  ]);

  const mainDevice = devices[0];

  // 4. Members
  console.log('Seeding members...');
  const members = [];
  for (let i = 0; i < MEMBER_DATA.length; i++) {
    const data = MEMBER_DATA[i];
    const pkg = packages[i % packages.length];
    const joinDaysAgo = randomBetween(5, 120);
    const joinDate = daysAgo(joinDaysAgo);
    const expiryDate = new Date(joinDate.getTime() + pkg.duration * 24 * 60 * 60 * 1000);

    // Payment scenarios
    let paidAmount, dueAmount, paymentType;
    const roll = Math.random();
    if (roll < 0.5) {
      // Full payment
      paidAmount = pkg.priceGents;
      dueAmount = 0;
      paymentType = 'full';
    } else if (roll < 0.8) {
      // Partial payment
      paidAmount = Math.round(pkg.priceGents * (randomBetween(30, 70) / 100));
      dueAmount = pkg.priceGents - paidAmount;
      paymentType = 'partial';
    } else {
      // Unpaid
      paidAmount = 0;
      dueAmount = pkg.priceGents;
      paymentType = 'due';
    }

    // First 12 members have fingerprints registered
    const memberData = {
      memberId: `GYM-${String(i + 1).padStart(3, '0')}`,
      name: data.name,
      phone: data.phone,
      address: data.address,
      gender: data.gender,
      joinDate,
      expiryDate,
      packageId: pkg._id,
      totalAmount: pkg.priceGents,
      paidAmount,
      dueAmount,
    };

    if (i < 12) {
      memberData.deviceUserId = i + 1;
    }

    const member = await Member.create(memberData);

    members.push({ member, pkg, paymentType, paidAmount });
  }

  // 5. Payments
  console.log('Seeding payments...');
  const paymentDocs = [];
  for (const { member, pkg, paymentType, paidAmount } of members) {
    if (paidAmount <= 0) continue;

    const discountRoll = Math.random();
    let discountAmount = 0;
    let discountType = 'fixed';
    if (discountRoll < 0.2) {
      discountAmount = randomBetween(100, 500);
      discountType = 'fixed';
    } else if (discountRoll < 0.3) {
      discountAmount = randomBetween(5, 15);
      discountType = 'percentage';
    }

    const actualDiscount = discountType === 'percentage'
      ? Math.round(paidAmount * discountAmount / 100)
      : Math.min(discountAmount, paidAmount);

    paymentDocs.push({
      memberId: member._id,
      packageId: pkg._id,
      originalAmount: paidAmount + actualDiscount,
      discountAmount,
      discountType,
      finalAmount: paidAmount,
      paymentMethod: randomFrom(PAYMENT_METHODS),
      date: member.joinDate,
      note: `Initial ${paymentType} payment for membership`,
      paymentType: paymentType === 'full' ? 'full' : 'partial',
    });
  }
  await Payment.insertMany(paymentDocs);

  // 6. Attendance records (last 14 days for members with deviceUserId)
  console.log('Seeding attendance records...');
  const attendanceDocs = [];
  const registeredMembers = members.filter((m) => m.member.deviceUserId != null);

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const date = daysAgo(dayOffset);

    for (const { member } of registeredMembers) {
      // 80% chance the member visited on any given day
      if (Math.random() > 0.8) continue;

      // Check-in: between 6am-10am
      const checkInHour = randomBetween(6, 10);
      const checkInMin = randomBetween(0, 59);
      const checkIn = new Date(date);
      checkIn.setHours(checkInHour, checkInMin, 0, 0);

      // Don't create future attendance
      if (checkIn > new Date()) continue;

      attendanceDocs.push({
        memberId: member._id,
        deviceUserId: member.deviceUserId,
        deviceId: mainDevice._id,
        timestamp: checkIn,
        type: 'check-in',
        rawLog: { deviceUserId: member.deviceUserId, recordTime: checkIn.toISOString() },
      });

      // 70% chance they also checked out
      if (Math.random() < 0.7) {
        const durationHours = randomBetween(1, 3);
        const checkOut = new Date(checkIn.getTime() + durationHours * 60 * 60 * 1000 + randomBetween(0, 30) * 60 * 1000);

        if (checkOut > new Date()) continue;

        attendanceDocs.push({
          memberId: member._id,
          deviceUserId: member.deviceUserId,
          deviceId: mainDevice._id,
          timestamp: checkOut,
          type: 'check-out',
          rawLog: { deviceUserId: member.deviceUserId, recordTime: checkOut.toISOString() },
        });
      }
    }
  }

  // Add a few today's check-ins (members currently "present")
  const now = new Date();
  if (now.getHours() >= 6) {
    for (let i = 0; i < Math.min(5, registeredMembers.length); i++) {
      const { member } = registeredMembers[i];
      const checkIn = new Date(now);
      checkIn.setHours(randomBetween(6, Math.min(now.getHours(), 10)), randomBetween(0, 59), 0, 0);

      if (checkIn < now) {
        attendanceDocs.push({
          memberId: member._id,
          deviceUserId: member.deviceUserId,
          deviceId: mainDevice._id,
          timestamp: checkIn,
          type: 'check-in',
          rawLog: { deviceUserId: member.deviceUserId, recordTime: checkIn.toISOString() },
        });
      }
    }
  }

  // Also add 2 unlinked device users (enrolled on device but not linked to any member)
  for (let uid = 50; uid <= 51; uid++) {
    for (let dayOffset = 3; dayOffset >= 0; dayOffset--) {
      const date = daysAgo(dayOffset);
      const checkIn = new Date(date);
      checkIn.setHours(randomBetween(7, 9), randomBetween(0, 59), 0, 0);

      if (checkIn > new Date()) continue;

      attendanceDocs.push({
        memberId: null, // Unlinked!
        deviceUserId: uid,
        deviceId: mainDevice._id,
        timestamp: checkIn,
        type: 'check-in',
        rawLog: { deviceUserId: uid, recordTime: checkIn.toISOString() },
      });
    }
  }

  await Attendance.insertMany(attendanceDocs);

  // Summary
  const counts = {
    admins: await Admin.countDocuments(),
    packages: await Package.countDocuments(),
    members: await Member.countDocuments(),
    payments: await Payment.countDocuments(),
    devices: await Device.countDocuments(),
    attendance: await Attendance.countDocuments(),
  };

  console.log('\nSeed complete!');
  console.log('─────────────────────────────');
  console.log(`  Admins:      ${counts.admins}`);
  console.log(`  Packages:    ${counts.packages}`);
  console.log(`  Members:     ${counts.members} (${registeredMembers.length} with fingerprints)`);
  console.log(`  Payments:    ${counts.payments}`);
  console.log(`  Devices:     ${counts.devices}`);
  console.log(`  Attendance:  ${counts.attendance}`);
  console.log('─────────────────────────────');
  console.log('\nLogin: admin@gym.com / admin1234');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
