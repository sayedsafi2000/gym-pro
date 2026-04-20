import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { getErrorMessage } from '../services/errorHandler';
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
import Spinner from '../components/ui/Spinner';
import { cn } from '../components/ui/cn';

const PAYMENT_OPTIONS = [
  { key: 'full', title: 'Pay Full Due', desc: (due) => `Pay remaining ৳${due || 0}`, accent: 'accent' },
  { key: 'partial', title: 'Partial Payment', desc: () => 'Pay part of due amount', accent: 'brand' },
  { key: 'none', title: 'No Payment', desc: () => 'Update info only', accent: 'neutral' },
];

const PAYMENT_STYLES = {
  accent: 'peer-checked:border-accent-500 peer-checked:bg-accent-50 dark:peer-checked:bg-accent-900/30',
  brand: 'peer-checked:border-brand-500 peer-checked:bg-brand-50 dark:peer-checked:bg-brand-900/30',
  neutral: 'peer-checked:border-slate-500 peer-checked:bg-slate-100 dark:peer-checked:bg-slate-800',
};

const EditMember = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    formData,
    setFormData,
    handleChange,
    errors,
    setError,
    clearError,
    hasErrors,
  } = useForm({
    name: '',
    phone: '',
    emergencyPhone: '',
    address: '',
    gender: '',
    joinDate: '',
    packageId: '',
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
    paymentType: 'none',
    additionalPayment: '',
  });
  const [packages, setPackages] = useState([]);
  const [devices, setDevices] = useState([]);
  const [fingerprint, setFingerprint] = useState({ deviceUserId: null, registered: false });
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [fpMessage, setFpMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchPackages();
    fetchMember();
    fetchDevices();
  }, [id]);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      setPackages(res.data.data);
    } catch (err) {
      console.error('Error fetching packages:', err);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedDeviceId(res.data.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const fetchMember = async () => {
    try {
      const res = await api.get(`/members/${id}`);
      const member = res.data.data;

      const joinDate = new Date(member.joinDate);
      const formattedDate = joinDate.toISOString().split('T')[0];

      setFingerprint({
        deviceUserId: member.deviceUserId,
        registered: member.deviceUserId != null,
      });

      setFormData({
        name: member.name,
        phone: member.phone,
        address: member.address || '',
        emergencyPhone: member.emergencyPhone || '',
        gender: member.gender,
        joinDate: formattedDate,
        packageId: member.packageId._id,
        totalAmount: member.totalAmount || 0,
        paidAmount: member.paidAmount || 0,
        dueAmount: member.dueAmount || 0,
        paymentType: 'none',
        additionalPayment: '',
      });
    } catch (err) {
      showError('Error loading member. Redirecting to members list.');
      navigate('/members');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if ((formData.paymentType === 'partial' || formData.paymentType === 'full') && formData.additionalPayment) {
      const paymentAmount = parseFloat(formData.additionalPayment) || 0;
      if (paymentAmount <= 0) {
        setError('additionalPayment', 'Enter a valid payment amount greater than 0');
        return;
      }
      if (paymentAmount > formData.dueAmount) {
        setError('additionalPayment', `Payment cannot exceed due amount of ৳${formData.dueAmount}`);
        return;
      }
      clearError('additionalPayment');
    }

    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        additionalPayment:
          formData.paymentType === 'partial' || formData.paymentType === 'full'
            ? parseFloat(formData.additionalPayment)
            : undefined,
      };

      await api.put(`/members/${id}`, submitData);
      showSuccess('Member updated successfully');
      navigate('/members');
    } catch (err) {
      showError('Error updating member. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const registerFingerprint = async () => {
    if (!selectedDeviceId) return;
    setRegistering(true);
    setFpMessage({ type: '', text: '' });
    try {
      const res = await api.post(`/devices/${selectedDeviceId}/register-user`, {
        memberId: id,
      });
      setFingerprint({
        deviceUserId: res.data.data.deviceUserId,
        registered: true,
      });
      setFpMessage({
        type: 'success',
        text: `Registered as Device User #${res.data.data.deviceUserId} on ${res.data.data.deviceName}. Now have the member enroll their fingerprint at the device.`,
      });
    } catch (err) {
      setFpMessage({
        type: 'error',
        text: getErrorMessage(err, 'Failed to register on device. Is the device online?'),
      });
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectedPkg = packages.find((p) => p._id === formData.packageId);
  const pkgPrice = selectedPkg
    ? formData.gender === 'Female'
      ? selectedPkg.priceLadies
      : selectedPkg.priceGents
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card padding="lg">
        <Link
          to="/members"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition dark:text-slate-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Members
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Edit Member
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Update member information</p>
      </Card>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Full Name" required>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField label="Phone Number" required>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField label="Emergency Phone">
                <Input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Address">
                  <Textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                  />
                </FormField>
              </div>
              <FormField label="Gender" required>
                <Select name="gender" value={formData.gender} onChange={handleChange} required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Select>
              </FormField>
            </div>
          </section>

          {/* Fingerprint */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Fingerprint Registration
            </h2>

            {fpMessage.text && (
              <div className="mb-4">
                <Alert type={fpMessage.type === 'success' ? 'success' : 'error'}>
                  {fpMessage.text}
                </Alert>
              </div>
            )}

            {fingerprint.registered ? (
              <div className="rounded-control border border-accent-200 bg-accent-50 p-5 dark:border-accent-800/60 dark:bg-accent-900/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-accent-800 dark:text-accent-200">
                      Fingerprint Registered
                    </p>
                    <p className="mt-1 text-xs text-accent-600 dark:text-accent-300">
                      Device User ID: {fingerprint.deviceUserId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Member can scan fingerprint at the device for attendance.
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-control border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No Fingerprint Registered
                </p>
                <p className="mt-1 mb-4 text-xs text-slate-500 dark:text-slate-400">
                  Select a device and click register. Then have the member enroll their
                  fingerprint at the device.
                </p>
                {devices.length > 0 ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <FormField label="Device">
                        <Select
                          value={selectedDeviceId}
                          onChange={(e) => setSelectedDeviceId(e.target.value)}
                        >
                          {devices.map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.name} ({d.ip})
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={registerFingerprint}
                      loading={registering}
                    >
                      Register Fingerprint
                    </Button>
                  </div>
                ) : (
                  <Alert type="warning">
                    No devices configured. Add a device in the Device Management page first.
                  </Alert>
                )}
              </div>
            )}
          </section>

          {/* Membership */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Membership Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Join Date" required>
                <Input
                  type="date"
                  name="joinDate"
                  value={formData.joinDate}
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField label="Package" required>
                <Select
                  name="packageId"
                  value={formData.packageId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Package</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} — ৳
                      {formData.gender === 'Female' ? pkg.priceLadies : pkg.priceGents} (
                      {pkg.isLifetime ? 'Lifetime' : `${pkg.duration} days`})
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </section>

          {/* Payment */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Payment Options
            </h2>
            <div className="space-y-4">
              <FormField label="Add Payment">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <label key={opt.key} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        value={opt.key}
                        checked={
                          opt.key === 'none'
                            ? !formData.paymentType || formData.paymentType === 'none'
                            : formData.paymentType === opt.key
                        }
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
                          {opt.desc(formData.dueAmount)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </FormField>

              {(formData.paymentType === 'partial' || formData.paymentType === 'full') && (
                <FormField
                  label="Payment Amount"
                  required
                  error={errors.additionalPayment}
                  hint={`Maximum amount: ৳${formData.dueAmount || 0}`}
                >
                  <Input
                    type="number"
                    name="additionalPayment"
                    value={formData.additionalPayment || ''}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    max={formData.dueAmount || 0}
                    placeholder="Enter payment amount"
                    required
                    error={Boolean(errors.additionalPayment)}
                  />
                </FormField>
              )}
            </div>
          </section>

          {formData.packageId && (
            <div className="rounded-card border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Membership Preview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-control bg-white p-4 dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Expiry Date:</span>
                  <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                    {formData.joinDate && selectedPkg
                      ? new Date(
                          new Date(formData.joinDate).getTime() +
                            selectedPkg.duration * 24 * 60 * 60 * 1000,
                        ).toLocaleDateString()
                      : 'Select join date and package'}
                  </span>
                </div>
                <div className="rounded-control bg-white p-4 dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Package Price:</span>
                  <span className="ml-2 font-semibold text-accent-600 dark:text-accent-400">
                    ৳{pkgPrice}
                  </span>
                </div>
                <div className="rounded-control bg-white p-4 dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Paid Amount:</span>
                  <span className="ml-2 font-semibold text-brand-600 dark:text-brand-400">
                    ৳{formData.paidAmount || 0}
                  </span>
                </div>
                <div className="rounded-control bg-white p-4 dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Due Amount:</span>
                  <span
                    className={cn(
                      'ml-2 font-semibold',
                      formData.dueAmount > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-accent-600 dark:text-accent-400',
                    )}
                  >
                    ৳{formData.dueAmount || 0}
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
              loading={submitting}
              disabled={hasErrors}
            >
              {submitting ? 'Updating Member…' : 'Update Member'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditMember;
