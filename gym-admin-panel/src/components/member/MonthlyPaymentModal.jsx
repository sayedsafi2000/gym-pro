import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { getErrorMessage } from '../../services/errorHandler';
import useToast from '../../hooks/useToast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import FormField from '../ui/FormField';

const METHODS = ['Cash', 'bKash', 'Nagad', 'Bank Transfer'];

const MonthlyPaymentModal = ({ open, onClose, member, onSuccess }) => {
  const { showError, showSuccess } = useToast();
  const [method, setMethod] = useState('Cash');
  const [fee, setFee] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !member) return;
    (async () => {
      try {
        const res = await api.get('/subscriptions/config');
        const config = res.data.data;
        setFee(member.gender === 'Female' ? config.monthlyFeeLadies : config.monthlyFeeGents);
        setMethod('Cash');
      } catch (err) {
        showError(getErrorMessage(err, 'Failed to load monthly fee config.'));
        onClose?.();
      }
    })();
  }, [open, member, showError, onClose]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/subscriptions/monthly-renew', {
        memberId: member._id,
        paymentMethod: method,
      });
      showSuccess('Monthly access renewed for 30 days');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to process monthly payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !member) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Monthly Access Payment
        </h3>

        <div className="rounded-control bg-slate-50 p-4 text-center dark:bg-slate-950">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Monthly Fee
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
            ৳{fee?.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">30 days access</p>
        </div>

        <FormField label="Payment Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FormField>

        {member.freeMonthsEndDate && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Free months ended: {new Date(member.freeMonthsEndDate).toLocaleDateString()}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSubmit} loading={submitting}>
            Pay ৳{fee?.toLocaleString()}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MonthlyPaymentModal;
