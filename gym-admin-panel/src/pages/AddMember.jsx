import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import useForm from '../hooks/useForm';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Alert from '../components/Alert';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import FormField from '../components/ui/FormField';
import { cn } from '../components/ui/cn';

const getEffectivePrice = (pkg, gender) => {
  if (!pkg) return 0;
  const base = gender === 'Female' ? pkg.priceLadies : pkg.priceGents;
  return pkg.includesAdmission ? base : base + (pkg.admissionFee || 0);
};

const PAYMENT_OPTIONS = [
  { key: 'full', title: 'Full Payment', desc: 'Pay complete amount now', accent: 'accent' },
  { key: 'partial', title: 'Partial Payment', desc: 'Pay part of the amount', accent: 'brand' },
  { key: 'due', title: 'Due Payment', desc: 'Pay later', accent: 'amber' },
  { key: 'monthly', title: 'Monthly Installment', desc: 'Pay in equal monthly installments', accent: 'purple' },
];

const PAYMENT_STYLES = {
  accent: 'peer-checked:border-accent-500 peer-checked:bg-accent-50 dark:peer-checked:bg-accent-900/30',
  brand: 'peer-checked:border-brand-500 peer-checked:bg-brand-50 dark:peer-checked:bg-brand-900/30',
  amber: 'peer-checked:border-amber-500 peer-checked:bg-amber-50 dark:peer-checked:bg-amber-900/30',
  purple: 'peer-checked:border-purple-500 peer-checked:bg-purple-50 dark:peer-checked:bg-purple-900/30',
};

const AddMember = () => {
  const {
    formData,
    handleChange,
    errors,
    setError,
    clearError,
    hasErrors,
  } = useForm({
    memberId: '',
    name: '',
    phone: '',
    emergencyPhone: '',
    address: '',
    gender: '',
    joinDate: new Date().toISOString().slice(0, 10),
    packageId: '',
    paymentType: 'full',
    initialPayment: '',
    installmentMonths: '',
  });
  const [packages, setPackages] = useState([]);
  const [lastMemberId, setLastMemberId] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchPackages();
    fetchLastMemberId();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      setPackages(res.data.data);
    } catch (err) {
      console.error('Error fetching packages:', err);
    }
  };

  const fetchLastMemberId = async () => {
    try {
      const res = await api.get('/members/last-id');
      setLastMemberId(res.data.data?.lastMemberId || null);
    } catch (err) {
      console.error('Error fetching last member ID:', err);
    }
  };

  const selectedPkg = packages.find((p) => p._id === formData.packageId);
  const total = getEffectivePrice(selectedPkg, formData.gender);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Inline validation
    let valid = true;
    if (!formData.memberId.trim()) {
      setError('memberId', 'Member ID is required');
      valid = false;
    } else {
      clearError('memberId');
    }
    if (formData.paymentType === 'partial') {
      const paymentAmount = parseFloat(formData.initialPayment) || 0;
      if (paymentAmount <= 0) {
        setError('initialPayment', 'Enter a valid payment amount greater than 0');
        valid = false;
      } else if (paymentAmount >= total) {
        setError('initialPayment', 'For full payment, select "Full Payment" instead');
        valid = false;
      } else {
        clearError('initialPayment');
      }
    }
    if (!valid) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        initialPayment:
          formData.paymentType === 'partial' ? parseFloat(formData.initialPayment) : undefined,
        installmentMonths:
          formData.paymentType === 'monthly'
            ? formData.installmentMonths ||
              Math.ceil((selectedPkg?.duration || 0) / 30)
            : undefined,
      };

      const res = await api.post('/members', submitData);
      const isPending = res.data.data?.status === 'pending';
      showSuccess(
        isPending
          ? 'Member created — pending super admin approval'
          : 'Member created successfully',
      );
      navigate('/members');
    } catch (err) {
      showError('Error creating member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card padding="lg">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Add New Member
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Register a new gym member</p>
      </Card>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Member ID"
                required
                error={errors.memberId}
                hint={lastMemberId ? `Last used: ${lastMemberId}` : undefined}
              >
                <Input
                  type="text"
                  name="memberId"
                  value={formData.memberId}
                  onChange={handleChange}
                  placeholder={lastMemberId ? `e.g. ${lastMemberId}` : 'Enter Member ID'}
                  required
                />
              </FormField>

              <FormField label="Full Name" required error={errors.name}>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                />
              </FormField>

              <FormField label="Phone Number" required error={errors.phone}>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                />
              </FormField>

              <FormField label="Emergency Phone" error={errors.emergencyPhone}>
                <Input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  placeholder="Emergency contact number (optional)"
                />
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Address" error={errors.address}>
                  <Textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter address (optional)"
                  />
                </FormField>
              </div>

              <FormField label="Gender" required error={errors.gender}>
                <Select name="gender" value={formData.gender} onChange={handleChange} required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Select>
              </FormField>
            </div>
          </section>

          {/* Membership */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Membership Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Join Date" required error={errors.joinDate}>
                <Input
                  type="date"
                  name="joinDate"
                  value={formData.joinDate}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <div>
                <FormField label="Package" required error={errors.packageId}>
                  {packages.length === 0 ? (
                    <Alert type="warning">
                      No packages available.{' '}
                      <a href="/packages" className="font-medium underline">
                        Create a package first
                      </a>{' '}
                      before adding members.
                    </Alert>
                  ) : (
                    <Select
                      name="packageId"
                      value={formData.packageId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Package</option>
                      {packages.map((pkg) => (
                        <option key={pkg._id} value={pkg._id}>
                          {pkg.name} — ৳{getEffectivePrice(pkg, formData.gender)} (
                          {pkg.isLifetime ? 'Lifetime' : `${pkg.duration} days`})
                        </option>
                      ))}
                    </Select>
                  )}
                </FormField>

                {selectedPkg && (
                  <div className="mt-3 rounded-control border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedPkg.name}
                      </h4>
                      {selectedPkg.category === 'special' && (
                        <Badge variant="warning">Special Offer</Badge>
                      )}
                    </div>
                    {selectedPkg.description && (
                      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                        {selectedPkg.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400">
                      <span>৳{total.toLocaleString()}</span>
                      <span>
                        {selectedPkg.isLifetime ? 'Lifetime' : `${selectedPkg.duration} days`}
                      </span>
                      {!selectedPkg.includesAdmission && selectedPkg.admissionFee > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          incl. ৳{selectedPkg.admissionFee} admission
                        </span>
                      )}
                    </div>
                    {selectedPkg.benefits && selectedPkg.benefits.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 dark:border-slate-700">
                        {selectedPkg.benefits.map((b, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
                          >
                            <Check className="w-3 h-3 shrink-0 text-accent-500" />
                            {b}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Payment Options */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Payment Options
            </h2>
            <div className="space-y-4">
              <FormField label="Payment Type" required>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <label key={opt.key} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        value={opt.key}
                        checked={formData.paymentType === opt.key}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div
                        className={cn(
                          'rounded-control border-2 border-slate-200 p-4 transition',
                          'hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900',
                          PAYMENT_STYLES[opt.accent],
                        )}
                      >
                        <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {opt.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {opt.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </FormField>

              {formData.paymentType === 'partial' && (
                <FormField
                  label="Initial Payment Amount"
                  required
                  error={errors.initialPayment}
                  hint={
                    selectedPkg ? `Maximum amount: ৳${total}` : null
                  }
                >
                  <Input
                    type="number"
                    name="initialPayment"
                    value={formData.initialPayment}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    max={total || undefined}
                    placeholder="Enter payment amount"
                    error={Boolean(errors.initialPayment)}
                    required
                  />
                </FormField>
              )}

              {formData.paymentType === 'monthly' && selectedPkg && (() => {
                const months =
                  parseInt(formData.installmentMonths, 10) ||
                  Math.ceil(selectedPkg.duration / 30) ||
                  1;
                const monthlyAmt = Math.ceil(total / months);
                return (
                  <div className="rounded-control border border-purple-200 bg-purple-50 p-4 space-y-3 dark:border-purple-800/60 dark:bg-purple-900/30">
                    <FormField label="Number of Months">
                      <Input
                        type="number"
                        name="installmentMonths"
                        value={
                          formData.installmentMonths ||
                          Math.ceil(selectedPkg.duration / 30)
                        }
                        onChange={handleChange}
                        min="2"
                        max="24"
                      />
                    </FormField>
                    <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>Total Amount</span>
                        <span className="font-semibold">৳{total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Payment</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-300">
                          ৳{monthlyAmt.toLocaleString()}/month
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>First Payment (today)</span>
                        <span className="font-semibold text-accent-700 dark:text-accent-300">
                          ৳{monthlyAmt.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Preview */}
          {selectedPkg && (
            <div className="rounded-card border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Membership Preview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-control bg-white p-4 dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Member ID:</span>
                  <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                    {formData.memberId.trim() || (
                      <span className="italic text-slate-400 dark:text-slate-500">Not set</span>
                    )}
                  </span>
                </div>
                <div className="rounded-control bg-white p-4 dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">
                    {selectedPkg.isLifetime ? 'Free Months End:' : 'Expiry Date:'}
                  </span>
                  <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                    {formData.joinDate
                      ? (() => {
                          const join = new Date(formData.joinDate);
                          if (selectedPkg.isLifetime) {
                            const freeEnd = new Date(
                              join.getTime() +
                                (selectedPkg.freeMonths || 0) * 30 * 24 * 60 * 60 * 1000,
                            );
                            return `${freeEnd.toLocaleDateString()} (${selectedPkg.freeMonths} months free, then monthly)`;
                          }
                          return new Date(
                            join.getTime() + selectedPkg.duration * 24 * 60 * 60 * 1000,
                          ).toLocaleDateString();
                        })()
                      : 'Select join date and package'}
                  </span>
                </div>
                <div className="rounded-control bg-white p-4 dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Total Amount:</span>
                  <span className="ml-2 font-semibold text-accent-600 dark:text-accent-400">
                    ৳{total.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-control bg-white p-4 dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Payment Status:</span>
                  <span
                    className={cn(
                      'ml-2 font-semibold',
                      formData.paymentType === 'full' && 'text-accent-600 dark:text-accent-400',
                      formData.paymentType === 'partial' && 'text-brand-600 dark:text-brand-400',
                      formData.paymentType === 'due' && 'text-amber-600 dark:text-amber-400',
                      formData.paymentType === 'monthly' &&
                        'text-purple-600 dark:text-purple-400',
                    )}
                  >
                    {formData.paymentType === 'full' && `Paid: ৳${total}`}
                    {formData.paymentType === 'partial' &&
                      `Paid: ৳${formData.initialPayment || 0}, Due: ৳${
                        total - (parseFloat(formData.initialPayment) || 0)
                      }`}
                    {formData.paymentType === 'due' && `Due: ৳${total}`}
                    {formData.paymentType === 'monthly' && 'Monthly installments'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <Button variant="secondary" onClick={() => navigate('/members')}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={hasErrors || packages.length === 0}
            >
              {loading ? 'Creating Member…' : 'Create Member'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddMember;
