import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import ReceiptModal from '../components/ReceiptModal';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    memberId: '',
    packageId: '',
    originalAmount: '',
    discountAmount: '',
    discountType: 'fixed',
    paymentMethod: 'Cash',
    date: '',
    note: '',
    paymentType: 'partial'
  });
  const [packages, setPackages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const { showSuccess, showError } = useToast();

  const getPackageFromPayment = (payment) => {
    if (payment?.packageId && typeof payment.packageId === 'object') {
      return payment.packageId;
    }

    const packageId =
      payment?.packageId ||
      payment?.package?._id ||
      payment?.package ||
      payment?.packageRef;

    if (!packageId) return null;
    return packages.find((pkg) => pkg._id === packageId) || null;
  };

  const getPackageLabel = (payment) => {
    const resolvedPackage = getPackageFromPayment(payment);
    return (
      resolvedPackage?.name ||
      payment?.packageName ||
      payment?.package?.name ||
      'N/A'
    );
  };

  const getPaymentMethodLabel = (payment) => {
    return (
      payment?.paymentMethod ||
      payment?.method ||
      payment?.payment_mode ||
      payment?.paymentTypeLabel ||
      'N/A'
    );
  };

  const selectedPackage = packages.find((pkg) => pkg._id === formData.packageId);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, membersRes, packagesRes] = await Promise.all([
        api.get('/payments'),
        api.get('/members'),
        api.get('/packages'),
      ]);
      setPayments(paymentsRes.data.data);
      setSelectedPaymentIds([]);
      setMembers(membersRes.data.data);
      setPackages(packagesRes.data.data);
      console.log('Payments data:', paymentsRes.data.data);
      console.log('Members data:', membersRes.data.data);
      setError('');
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.response?.data?.message || 'Failed to load data. Please check your authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Basic validation
      if (!formData.memberId.trim()) {
        throw new Error('Please select a member');
      }
      if (!formData.packageId.trim()) {
        throw new Error('Please select a package');
      }
      if (!formData.originalAmount || parseFloat(formData.originalAmount) <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
      }
      if (!formData.paymentMethod) {
        throw new Error('Please select a payment method');
      }

      // Calculate final amount after discount
      let finalAmount = parseFloat(formData.originalAmount);
      const discountAmount = parseFloat(formData.discountAmount) || 0;

      if (discountAmount > 0) {
        if (formData.discountType === 'percentage') {
          finalAmount = finalAmount - (finalAmount * discountAmount / 100);
        } else {
          finalAmount = finalAmount - discountAmount;
        }
      }

      finalAmount = Math.max(0, finalAmount);

      if (selectedMember && finalAmount > selectedMember.dueAmount) {
        throw new Error(`Payment amount (${finalAmount}) cannot exceed due amount of ৳${selectedMember.dueAmount}`);
      }

      const submitData = {
        ...formData,
        originalAmount: parseFloat(formData.originalAmount),
        discountAmount: discountAmount,
        finalAmount,
      };

      await api.post('/payments', submitData);
      setSuccess('Payment recorded successfully!');
      setFormData({
        memberId: '',
        packageId: '',
        originalAmount: '',
        discountAmount: '',
        discountType: 'fixed',
        paymentMethod: 'Cash',
        date: '',
        note: '',
        paymentType: 'partial'
      });
      setSelectedMember(null);
      setShowForm(false);
      fetchData(); // Refresh the payments list
      showSuccess('Payment recorded');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating payment:', error);
      showError('Failed to create payment.');
      setError(error.response?.data?.message || error.message || 'Error creating payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const generateReceipt = async (payment) => {
    try {
      const res = await api.get(`/payments/${payment._id}/receipt`);
      setReceiptData(res.data.data);
      setShowReceipt(true);
    } catch (error) {
      console.error('Error generating receipt:', error);
      showError('Failed to generate receipt.');
    }
  };

  const confirmDeletePayment = async (paymentId) => {
    try {
      setError('');
      setSuccess('');
      await api.delete(`/payments/${paymentId}`);
      setSuccess('Payment deleted successfully.');
      fetchData();
      showSuccess('Payment deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting payment:', error);
      showError('Failed to delete payment.');
      setError(error.response?.data?.message || 'Failed to delete payment.');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const toggleSelectPayment = (paymentId) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const toggleSelectAllPayments = () => {
    if (selectedPaymentIds.length === payments.length) {
      setSelectedPaymentIds([]);
      return;
    }
    setSelectedPaymentIds(payments.map((payment) => payment._id));
  };

  const confirmBulkDeletePayments = async () => {
    try {
      setError('');
      setSuccess('');
      await api.post('/payments/bulk-delete', { paymentIds: selectedPaymentIds });
      setSuccess(`${selectedPaymentIds.length} payment(s) deleted successfully.`);
      setSelectedPaymentIds([]);
      fetchData();
      showSuccess('Payments deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error bulk deleting payments:', error);
      showError('Failed to delete payments.');
      setError(error.response?.data?.message || 'Failed to bulk delete payments.');
    } finally {
      setConfirmBulkDelete(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-48">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500 mt-2">Record payments and generate clean receipts.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError('');
            setSuccess('');
          }}
          className="rounded-[5px] border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          {showForm ? 'Cancel' : 'Add Payment'}
        </button>
      </div>

      {success && !showForm && (
        <div className="bg-green-50 border border-green-200 rounded-[5px] p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[5px] p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[5px] text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-[5px] text-green-700 text-sm">
              {success}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Member *</label>
              <select
                value={formData.memberId}
                onChange={(e) => {
                  const memberId = e.target.value;
                  const member = members.find(m => m._id === memberId);
                  const memberPackageId =
                    typeof member?.packageId === 'object'
                      ? member?.packageId?._id
                      : member?.packageId || '';
                  const memberDue = member?.dueAmount || 0;
                  const packagePrice =
                    typeof member?.packageId === 'object' ? member?.packageId?.price || 0 : 0;
                  const baseAmount = memberDue > 0 ? memberDue : packagePrice;
                  const defaultAmount = baseAmount > 0 ? Math.max(1, Math.ceil(baseAmount * 0.5)) : 0;

                  setFormData({
                    ...formData,
                    memberId,
                    packageId: memberPackageId,
                    originalAmount: defaultAmount > 0 ? String(defaultAmount) : '',
                    paymentType: 'partial',
                  });
                  setSelectedMember(member);
                }}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
                required
              >
                <option value="">Select Member</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.memberId}) - Due: ৳{member.dueAmount || 0}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Package *</label>
              <select
                value={formData.packageId}
                onChange={(e) => {
                  const packageId = e.target.value;
                  const pkg = packages.find((p) => p._id === packageId);
                  const packagePrice = pkg?.price || 0;
                  const memberDue = selectedMember?.dueAmount || 0;
                  const capAmount = memberDue > 0
                    ? Math.min(memberDue, packagePrice || memberDue)
                    : packagePrice;
                  const suggestedAmount = capAmount > 0 ? Math.max(1, Math.ceil(capAmount * 0.5)) : 0;

                  setFormData({
                    ...formData,
                    packageId,
                    originalAmount: suggestedAmount > 0 ? String(suggestedAmount) : formData.originalAmount,
                    paymentType: 'partial',
                  });
                }}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
                required
              >
                <option value="">Select Package</option>
                {packages.map((pkg) => (
                  <option key={pkg._id} value={pkg._id}>
                    {pkg.name} - ৳{pkg.price}
                  </option>
                ))}
              </select>
              {selectedPackage && (
                <p className="mt-2 text-xs text-slate-500">
                  Suggested amount: $
                  {selectedMember?.dueAmount > 0
                    ? Math.max(1, Math.ceil(Math.min(selectedMember.dueAmount, selectedPackage.price) * 0.5))
                    : Math.max(1, Math.ceil(selectedPackage.price * 0.5))}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Original Amount *</label>
              <input
                type="number"
                placeholder="Original Amount"
                value={formData.originalAmount}
                onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
                min="0.01"
                step="0.01"
                required
              />
              {selectedMember?.dueAmount > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, originalAmount: String(selectedMember.dueAmount), paymentType: 'full' })
                    }
                    className="rounded-[5px] border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                  >
                    Pay Full Due (৳{selectedMember.dueAmount})
                  </button>
                  {selectedPackage?.price > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          originalAmount: String(Math.max(1, Math.ceil(Math.min(selectedMember.dueAmount, selectedPackage.price) * 0.5))),
                          paymentType: 'partial',
                        })
                      }
                      className="rounded-[5px] border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
                    >
                      Pay 50% (৳{Math.max(1, Math.ceil(Math.min(selectedMember.dueAmount, selectedPackage.price) * 0.5))})
                    </button>
                  )}
                  {selectedPackage?.price > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          originalAmount: String(Math.min(selectedMember.dueAmount, selectedPackage.price)),
                          paymentType: selectedMember.dueAmount <= selectedPackage.price ? 'full' : 'partial',
                        })
                      }
                      className="rounded-[5px] border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Set to Package Price (৳{Math.min(selectedMember.dueAmount, selectedPackage.price)})
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Discount Amount</label>
              <input
                type="number"
                placeholder="Discount Amount"
                value={formData.discountAmount}
                onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Discount Type</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              >
                <option value="fixed">Fixed Amount (BDT)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
                required
              >
                <option value="Cash">Cash</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Type</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              >
                <option value="partial">Partial Payment</option>
                <option value="full">Full Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
            <textarea
              placeholder="Optional note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows="3"
              className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200 resize-none"
            />
          </div>

          {selectedMember && (
            <div className="mt-6 p-4 bg-slate-50 rounded-[5px] border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Payment Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="ml-2 font-semibold text-slate-900">৳{selectedMember.totalAmount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500">Paid Amount:</span>
                  <span className="ml-2 font-semibold text-green-600">৳{selectedMember.paidAmount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500">Due Amount:</span>
                  <span className={`ml-2 font-semibold ${selectedMember.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ৳{selectedMember.dueAmount || 0}
                  </span>
                </div>
              </div>
              {selectedMember.dueAmount > 0 && (
                <p className="mt-3 text-xs text-slate-600">
                  Maximum payment allowed: ৳{selectedMember.dueAmount}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !formData.memberId || !formData.packageId || !formData.originalAmount}
            className="mt-6 rounded-[5px] bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {submitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving Payment...
              </div>
            ) : (
              'Save Payment'
            )}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {selectedPaymentIds.length > 0
              ? `${selectedPaymentIds.length} selected`
              : 'Select payments to bulk delete'}
          </p>
          <button
              type="button"
              onClick={() => { if (selectedPaymentIds.length) setConfirmBulkDelete(true); }}
              disabled={!selectedPaymentIds.length}
              className="rounded-[5px] border border-red-300 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Selected
            </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={payments.length > 0 && selectedPaymentIds.length === payments.length}
                    onChange={toggleSelectAllPayments}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Package</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    <p className="text-sm font-medium text-slate-500">No payments found</p>
                    <p className="text-xs text-slate-400 mt-1">Record a payment to get started.</p>
                  </td>
                </tr>
              ) : payments.map((payment) => (
                <tr key={payment._id} className="hover:bg-slate-50 transition duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedPaymentIds.includes(payment._id)}
                      onChange={() => toggleSelectPayment(payment._id)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    <div>
                      <div>{payment.memberId?.name || 'Unknown'} ({payment.memberId?.memberId || 'N/A'})</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Paid: ৳{payment.memberId?.paidAmount || 0} / Due: ৳{payment.memberId?.dueAmount || 0}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {getPackageLabel(payment)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    <div>
                      <div className="font-semibold">৳{payment.finalAmount || payment.amount || 0}</div>
                      {payment.discountAmount > 0 && payment.originalAmount && (
                        <div className="text-xs text-slate-500">
                          Original: ৳{payment.originalAmount} (-{payment.discountType === 'percentage' ? `${payment.discountAmount}%` : `৳${payment.discountAmount}`})
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {getPaymentMethodLabel(payment)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-[5px] ${
                      payment.paymentType === 'full'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {payment.paymentType === 'full' ? 'Full' : 'Partial'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => generateReceipt(payment)}
                        className="rounded-[5px] border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Receipt
                      </button>
                      <button
                        onClick={() => setDeletingPaymentId(payment._id)}
                        className="rounded-[5px] border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deletingPaymentId}
        title="Delete Payment"
        message="Are you sure you want to delete this payment record?"
        onConfirm={() => confirmDeletePayment(deletingPaymentId)}
        onCancel={() => setDeletingPaymentId(null)}
      />
      <ConfirmModal
        open={confirmBulkDelete}
        title="Delete Selected Payments"
        message={`Delete ${selectedPaymentIds.length} selected payment(s)? This cannot be undone.`}
        onConfirm={() => confirmBulkDeletePayments()}
        onCancel={() => setConfirmBulkDelete(false)}
      />
      <ReceiptModal
        open={showReceipt}
        onClose={() => { setShowReceipt(false); setReceiptData(null); }}
        type="payment"
        data={receiptData}
      />
    </div>
  );
};

export default Payments;