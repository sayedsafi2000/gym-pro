import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { getErrorMessage } from '../../services/errorHandler';
import useToast from '../../hooks/useToast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import FormField from '../ui/FormField';
import { cn } from '../ui/cn';

const PAYMENT_TYPES = [
  { key: 'full', label: 'Full' },
  { key: 'partial', label: 'Partial' },
  { key: 'due', label: 'Due' },
];
const METHODS = ['Cash', 'bKash', 'Nagad', 'Bank Transfer'];

const getEffectivePrice = (pkg, gender) => {
  if (!pkg) return 0;
  const base = gender === 'Female' ? pkg.priceLadies : pkg.priceGents;
  return pkg.includesAdmission ? base : base + (pkg.admissionFee || 0);
};

const RenewMembershipModal = ({ open, onClose, member, onSuccess }) => {
  const { showError, showSuccess } = useToast();
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({
    packageId: '',
    paymentType: 'due',
    initialPayment: '',
    paymentMethod: 'Cash',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !member) return;
    (async () => {
      try {
        const res = await api.get('/packages');
        setPackages(res.data.data);
        setForm({
          packageId: member.packageId?._id || '',
          paymentType: 'due',
          initialPayment: '',
          paymentMethod: 'Cash',
        });
      } catch (err) {
        showError(getErrorMessage(err, 'Failed to load packages.'));
        onClose?.();
      }
    })();
  }, [open, member, showError, onClose]);

  const selectedPkg = packages.find((p) => p._id === form.packageId);
  const total = getEffectivePrice(selectedPkg, member?.gender);

  const handleSubmit = async () => {
    if (!form.packageId) {
      showError('Select a package');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/subscriptions/renew', {
        memberId: member._id,
        packageId: form.packageId,
        paymentType: form.paymentType,
        initialPayment:
          form.paymentType === 'partial' ? parseFloat(form.initialPayment) : undefined,
        paymentMethod: form.paymentMethod,
      });
      showSuccess('Membership renewed successfully');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to renew membership.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !member) return null;

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Renew Membership
        </h3>

        <FormField label="Package" required>
          <Select
            value={form.packageId}
            onChange={(e) => setForm((f) => ({ ...f, packageId: e.target.value }))}
          >
            <option value="">Select Package</option>
            {packages.map((pkg) => (
              <option key={pkg._id} value={pkg._id}>
                {pkg.name} — ৳{getEffectivePrice(pkg, member.gender)} (
                {pkg.isLifetime ? 'Lifetime' : `${pkg.duration} days`})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Payment Type">
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_TYPES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, paymentType: key }))}
                className={cn(
                  'rounded-control px-3 py-2 text-xs font-medium transition',
                  form.paymentType === key
                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </FormField>

        {form.paymentType === 'partial' && (
          <FormField label="Payment Amount (৳)">
            <Input
              type="number"
              min="1"
              value={form.initialPayment}
              onChange={(e) => setForm((f) => ({ ...f, initialPayment: e.target.value }))}
              placeholder="Enter amount"
            />
          </FormField>
        )}

        {form.paymentType !== 'due' && (
          <FormField label="Payment Method">
            <Select
              value={form.paymentMethod}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {form.packageId && (
          <div className="space-y-1 rounded-control bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Total</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                ৳{total}
              </span>
            </div>
            {form.paymentType === 'full' && (
              <div className="flex justify-between text-accent-700 dark:text-accent-300">
                <span>Paying now</span>
                <span className="font-semibold">৳{total}</span>
              </div>
            )}
            {form.paymentType === 'partial' && form.initialPayment && (
              <>
                <div className="flex justify-between text-accent-700 dark:text-accent-300">
                  <span>Paying now</span>
                  <span className="font-semibold">৳{form.initialPayment}</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Due</span>
                  <span className="font-semibold">
                    ৳{total - parseFloat(form.initialPayment || 0)}
                  </span>
                </div>
              </>
            )}
            {form.paymentType === 'due' && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Due</span>
                <span className="font-semibold">৳{total}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!form.packageId}
          >
            Renew Membership
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RenewMembershipModal;
