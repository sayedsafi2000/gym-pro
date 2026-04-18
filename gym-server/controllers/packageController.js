const Package = require('../models/Package');

// @desc    Get all packages
// @route   GET /api/packages
const getPackages = async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: -1 });
    res.json({ success: true, data: packages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a package
// @route   POST /api/packages
const createPackage = async (req, res) => {
  try {
    const { name, duration, priceGents, priceLadies, description, benefits, category, isLifetime, admissionFee, includesAdmission, freeMonths } = req.body;
    const pkg = await Package.create({
      name,
      duration: isLifetime ? 0 : duration,
      priceGents,
      priceLadies: priceLadies ?? priceGents,
      description,
      benefits,
      category,
      isLifetime,
      admissionFee: admissionFee || 0,
      includesAdmission: includesAdmission || false,
      freeMonths: freeMonths || 0,
    });
    res.status(201).json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a package
// @route   PUT /api/packages/:id
const updatePackage = async (req, res) => {
  try {
    if (req.body.priceLadies === undefined && req.body.priceGents !== undefined) {
      req.body.priceLadies = req.body.priceGents;
    }
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    res.json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a package
// @route   DELETE /api/packages/:id
const deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Seed default packages on first run
const seedPackages = async () => {
  try {
    const count = await Package.countDocuments();
    if (count > 0) return;

    await Package.create([
      {
        name: 'Lifetime Membership',
        category: 'regular',
        isLifetime: true,
        duration: 0,
        priceGents: 4000,
        priceLadies: 4000,
        admissionFee: 0,
        includesAdmission: true,
        freeMonths: 1,
        description: 'Lifetime gym membership with 1 month free access',
        benefits: ['1 Month Free Access', 'Lifetime Membership'],
      },
      {
        name: 'Super Saver',
        category: 'special',
        isLifetime: true,
        duration: 0,
        priceGents: 3000,
        priceLadies: 3000,
        admissionFee: 0,
        includesAdmission: true,
        freeMonths: 2,
        description: 'Lifetime Membership + 2 Months Free',
        benefits: ['Lifetime Membership', '2 Months Free Access'],
      },
      {
        name: 'Super Saver Plus',
        category: 'special',
        isLifetime: true,
        duration: 0,
        priceGents: 6000,
        priceLadies: 6000,
        admissionFee: 0,
        includesAdmission: true,
        freeMonths: 6,
        description: 'Lifetime Membership + 6 Months Free',
        benefits: ['Lifetime Membership', '6 Months Free Access'],
      },
      {
        name: 'Ultra Super Saver',
        category: 'special',
        isLifetime: true,
        duration: 0,
        priceGents: 10500,
        priceLadies: 10500,
        admissionFee: 0,
        includesAdmission: true,
        freeMonths: 12,
        description: 'Lifetime Membership + 12 Months Free',
        benefits: ['Lifetime Membership', '12 Months Free Access'],
      },
      {
        name: 'Premium Package',
        category: 'special',
        isLifetime: true,
        duration: 0,
        priceGents: 12500,
        priceLadies: 12500,
        admissionFee: 0,
        includesAdmission: true,
        freeMonths: 12,
        description: 'Lifetime Membership + 12 Months Free with premium benefits',
        benefits: [
          'Lifetime Membership',
          '12 Months Free Access',
          'Free Initial Personal Trainer Assessment',
          'Personalized Nutritional Guidance Plan',
          'Priority Access to Classes & Facilities',
          'Complimentary Gym Merchandise',
        ],
      },
    ]);

    console.log('Seeded 5 default packages');
  } catch (error) {
    console.error('Package seed failed:', error.message);
  }
};

module.exports = { getPackages, createPackage, updatePackage, deletePackage, seedPackages };
