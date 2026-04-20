// Zod schemas for request bodies. Keep them lenient where the client already
// sends extra UI fields (e.g. packageId + paymentType for Member update) —
// the whitelist in the controller handles the final filter. These schemas
// are the first-line shape guard: reject obviously malformed payloads early.

const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
const phone = z.string().trim().min(6, 'Phone is too short').max(20, 'Phone is too long');
const gender = z.enum(['Male', 'Female', 'Other']);
const paymentType = z.enum(['full', 'partial', 'monthly', 'monthly_renewal']);
const paymentMethod = z.string().trim().min(1).default('Cash');

const login = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Password required'),
});

const createMember = z.object({
  name: z.string().trim().min(1, 'Name required'),
  phone,
  emergencyPhone: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default(''),
  gender,
  joinDate: z.coerce.date().optional(),
  packageId: objectId,
  paymentType: paymentType.optional(),
  initialPayment: z.coerce.number().nonnegative().optional(),
  paymentMethod: paymentMethod.optional(),
  installmentMonths: z.coerce.number().int().positive().optional(),
}).passthrough();

const renewSubscription = z.object({
  memberId: objectId,
  packageId: objectId,
  paymentType: paymentType.optional(),
  initialPayment: z.coerce.number().nonnegative().optional(),
  paymentMethod: paymentMethod.optional(),
}).passthrough();

const monthlyRenew = z.object({
  memberId: objectId,
  paymentMethod: paymentMethod.optional(),
}).passthrough();

const updateGymConfig = z.object({
  monthlyFeeGents: z.coerce.number().nonnegative().optional(),
  monthlyFeeLadies: z.coerce.number().nonnegative().optional(),
  monthlyAccessDays: z.coerce.number().int().positive().optional(),
}).passthrough();

module.exports = {
  login,
  createMember,
  renewSubscription,
  monthlyRenew,
  updateGymConfig,
};
