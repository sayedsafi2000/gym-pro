import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getErrorMessage } from '../services/errorHandler';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import ReceiptModal from '../components/ReceiptModal';
import Pagination from '../components/Pagination';
import Alert from '../components/Alert';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import FormField from '../components/ui/FormField';
import Spinner from '../components/ui/Spinner';
import Table from '../components/ui/Table';

const INITIAL_FORM = {
  memberId: '',
  packageId: '',
  originalAmount: '',
  discountAmount: '',
  discountType: 'fixed',
  paymentMethod: 'Cash',
  date: new Date().toISOString().slice(0, 10),
  note: '',
  paymentType: 'full',
};

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [packages, setPackages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;
  const { showSuccess, showError } = useToast();

  const getPackageFromPayment = (payment) => {
    if (payment?.packageId && typeof payment.packageId === 'object') {
      return payment.packageId;
    }
    const packageId =
      payment?.packageId || payment?.package?._id || payment?.package || payment?.packageRef;
    if (!packageId) return null;
    return packages.find((pkg) => pkg._id === packageId) || null;
  };

  const getPackageLabel = (payment) => {
    const resolvedPackage = getPackageFromPayment(payment);
    return (
      resolvedPackage?.name || payment?.packageName || payment?.package?.name || 'N/A'
    );
  };

  const getPaymentMethodLabel = (payment) =>
    payment?.paymentMethod ||
    payment?.method ||
    payment?.payment_mode ||
    payment?.paymentTypeLabel ||
    'N/A';

  const selectedPackage = packages.find((pkg) => pkg._id === formData.packageId);

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    try {
      const [paymentsRes, membersRes, packagesRes] = await Promise.all([
        api.get(`/payments?page=${page}&limit=${LIMIT}`),
        api.get('/members?limit=500'),
        api.get('/packages'),
      ]);
      setPayments(paymentsRes.data.data);
      setTotalPages(paymentsRes.data.pagination?.totalPages || 1);
      setSelectedPaymentIds([]);
      setMembers(membersRes.data.data);
      setPackages(packagesRes.data.data);
      setError('');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(
        getErrorMessage(err, 'Failed to load data. Please check your authentication.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!formData.memberId.trim()) throw new Error('Please select a member');
      if (!formData.packageId.trim()) throw new Error('Please select a package');
      if (!formData.originalAmount || parseFloat(formData.originalAmount) <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
      }
      if (!formData.paymentMethod) throw new Error('Please select a payment method');

      let finalAmount = parseFloat(formData.originalAmount);
      const discountAmount = parseFloat(formData.discountAmount) || 0;

      if (discountAmount > 0) {
        if (formData.discountType === 'percentage') {
          finalAmount -= (finalAmount * discountAmount) / 100;
        } else {
          finalAmount -= discountAmount;
        }
      }
      finalAmount = Math.max(0, finalAmount);

      if (selectedMember && finalAmount > selectedMember.dueAmount) {
        throw new Error(
          `Payment amount (${finalAmount}) cannot exceed due amount of ৳${selectedMember.dueAmount}`,
        );
      }

      await api.post('/payments', {
        ...formData,
        originalAmount: parseFloat(formData.originalAmount),
        discountAmount,
        finalAmount,
      });
      setFormData(INITIAL_FORM);
      setSelectedMember(null);
      setShowForm(false);
      fetchData();
      showSuccess('Payment recorded');
    } catch (err) {
      console.error('Error creating payment:', err);
      setError(getErrorMessage(err, 'Error creating payment. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const generateReceipt = async (payment) => {
    try {
      const res = await api.get(`/payments/${payment._id}/receipt`);
      setReceiptData(res.data.data);
      setShowReceipt(true);
    } catch (err) {
      console.error('Error generating receipt:', err);
      showError('Failed to generate receipt.');
    }
  };

  const confirmDeletePayment = async (paymentId) => {
    try {
      await api.delete(`/payments/${paymentId}`);
      fetchData();
      showSuccess('Payment deleted');
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError(getErrorMessage(err, 'Failed to delete payment.'));
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const toggleSelectPayment = (paymentId) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId],
    );
  };

  const toggleSelectAllPayments = () => {
    if (selectedPaymentIds.length === payments.length) {
      setSelectedPaymentIds([]);
      return;
    }
    setSelectedPaymentIds(payments.map((p) => p._id));
  };

  const confirmBulkDeletePayments = async () => {
    try {
      await api.post('/payments/bulk-delete', { paymentIds: selectedPaymentIds });
      setSelectedPaymentIds([]);
      fetchData();
      showSuccess('Payments deleted');
    } catch (err) {
      console.error('Error bulk deleting payments:', err);
      setError(getErrorMessage(err, 'Failed to bulk delete payments.'));
    } finally {
      setConfirmBulkDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Payments
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Record payments and generate clean receipts.
            </p>
          </div>
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            onClick={() => {
              setShowForm(!showForm);
              setError('');
            }}
          >
            {showForm ? 'Cancel' : 'Add Payment'}
          </Button>
        </div>
      </Card>

      {error && !showForm && <Alert type="error">{error}</Alert>}

      {showForm && (
        <Card padding="md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert type="error">{error}</Alert>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Member" required>
                <Select
                  value={formData.memberId}
                  onChange={(e) => {
                    const memberId = e.target.value;
                    const member = members.find((m) => m._id === memberId);
                    const memberPackageId =
                      typeof member?.packageId === 'object'
                        ? member?.packageId?._id
                        : member?.packageId || '';
                    const memberDue = member?.dueAmount || 0;
                    const pkgObj =
                      typeof member?.packageId === 'object' ? member?.packageId : null;
                    const packagePrice = pkgObj
                      ? (member?.gender === 'Female' ? pkgObj.priceLadies : pkgObj.priceGents) ||
                        0
                      : 0;
                    const baseAmount = memberDue > 0 ? memberDue : packagePrice;
                    const defaultAmount =
                      baseAmount > 0 ? Math.max(1, Math.ceil(baseAmount * 0.5)) : 0;

                    setFormData({
                      ...formData,
                      memberId,
                      packageId: memberPackageId,
                      originalAmount: defaultAmount > 0 ? String(defaultAmount) : '',
                      paymentType: 'partial',
                    });
                    setSelectedMember(member);
                  }}
                  required
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} ({member.memberId}) - Due: ৳{member.dueAmount || 0}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Package" required>
                <Select
                  value={formData.packageId}
                  onChange={(e) => {
                    const packageId = e.target.value;
                    const pkg = packages.find((p) => p._id === packageId);
                    const packagePrice = pkg
                      ? (selectedMember?.gender === 'Female'
                          ? pkg.priceLadies
                          : pkg.priceGents) || 0
                      : 0;
                    const memberDue = selectedMember?.dueAmount || 0;
                    const capAmount =
                      memberDue > 0
                        ? Math.min(memberDue, packagePrice || memberDue)
                        : packagePrice;
                    const suggestedAmount =
                      capAmount > 0 ? Math.max(1, Math.ceil(capAmount * 0.5)) : 0;

                    setFormData({
                      ...formData,
                      packageId,
                      originalAmount:
                        suggestedAmount > 0 ? String(suggestedAmount) : formData.originalAmount,
                      paymentType: 'partial',
                    });
                  }}
                  required
                >
                  <option value="">Select Package</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} - ৳
                      {selectedMember?.gender === 'Female' ? pkg.priceLadies : pkg.priceGents}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Original Amount"
                required
                hint={
                  selectedPackage
                    ? `Suggested: ৳${
                        selectedMember?.dueAmount > 0
                          ? Math.max(
                              1,
                              Math.ceil(
                                Math.min(
                                  selectedMember.dueAmount,
                                  selectedMember?.gender === 'Female'
                                    ? selectedPackage.priceLadies
                                    : selectedPackage.priceGents,
                                ) * 0.5,
                              ),
                            )
                          : Math.max(
                              1,
                              Math.ceil(
                                (selectedMember?.gender === 'Female'
                                  ? selectedPackage.priceLadies
                                  : selectedPackage.priceGents) * 0.5,
                              ),
                            )
                      }`
                    : null
                }
              >
                <Input
                  type="number"
                  placeholder="Original Amount"
                  value={formData.originalAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, originalAmount: e.target.value })
                  }
                  min="0.01"
                  step="0.01"
                  required
                />
              </FormField>

              <FormField label="Discount Amount">
                <Input
                  type="number"
                  placeholder="Discount Amount"
                  value={formData.discountAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, discountAmount: e.target.value })
                  }
                  min="0"
                  step="0.01"
                />
              </FormField>

              <FormField label="Discount Type">
                <Select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value })
                  }
                >
                  <option value="fixed">Fixed Amount (BDT)</option>
                  <option value="percentage">Percentage (%)</option>
                </Select>
              </FormField>

              <FormField label="Payment Method" required>
                <Select
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentMethod: e.target.value })
                  }
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </Select>
              </FormField>

              <FormField label="Payment Type">
                <Select
                  value={formData.paymentType}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentType: e.target.value })
                  }
                >
                  <option value="partial">Partial Payment</option>
                  <option value="full">Full Payment</option>
                </Select>
              </FormField>

              <FormField label="Date">
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </FormField>
            </div>

            {/* Quick-fill buttons */}
            {selectedMember?.dueAmount > 0 &&
              (() => {
                const pkgPrice = selectedPackage
                  ? selectedMember?.gender === 'Female'
                    ? selectedPackage.priceLadies
                    : selectedPackage.priceGents
                  : 0;
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Quick fill:
                    </span>
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          originalAmount: String(selectedMember.dueAmount),
                          paymentType: 'full',
                        })
                      }
                    >
                      Pay Full Due (৳{selectedMember.dueAmount})
                    </Button>
                    {pkgPrice > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            originalAmount: String(
                              Math.max(
                                1,
                                Math.ceil(
                                  Math.min(selectedMember.dueAmount, pkgPrice) * 0.5,
                                ),
                              ),
                            ),
                            paymentType: 'partial',
                          })
                        }
                      >
                        Pay 50% (৳
                        {Math.max(
                          1,
                          Math.ceil(Math.min(selectedMember.dueAmount, pkgPrice) * 0.5),
                        )}
                        )
                      </Button>
                    )}
                    {pkgPrice > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            originalAmount: String(
                              Math.min(selectedMember.dueAmount, pkgPrice),
                            ),
                            paymentType:
                              selectedMember.dueAmount <= pkgPrice ? 'full' : 'partial',
                          })
                        }
                      >
                        Package Price (৳{Math.min(selectedMember.dueAmount, pkgPrice)})
                      </Button>
                    )}
                  </div>
                );
              })()}

            {/* Final amount preview */}
            {(() => {
              const orig = parseFloat(formData.originalAmount) || 0;
              const disc = parseFloat(formData.discountAmount) || 0;
              if (!orig) return null;
              const final =
                formData.discountType === 'percentage'
                  ? Math.max(0, orig * (1 - disc / 100))
                  : Math.max(0, orig - disc);
              const showDiscount = disc > 0;
              return (
                <div className="rounded-control border border-accent-200 bg-accent-50 px-4 py-2 text-sm dark:border-accent-800 dark:bg-accent-900/30">
                  <span className="text-slate-600 dark:text-slate-400">Final Amount: </span>
                  <span className="font-semibold text-accent-700 dark:text-accent-300">
                    ৳{final.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  {showDiscount && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      (৳{orig.toLocaleString()} −{' '}
                      {formData.discountType === 'percentage'
                        ? `${disc}%`
                        : `৳${disc.toLocaleString()}`}
                      )
                    </span>
                  )}
                </div>
              );
            })()}

            <FormField label="Note">
              <Textarea
                placeholder="Optional note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
              />
            </FormField>

            {selectedMember && (
              <div className="rounded-control border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Payment Status
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Total:</span>
                    <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">
                      ৳{selectedMember.totalAmount || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Paid:</span>
                    <span className="ml-2 font-semibold text-accent-600 dark:text-accent-400">
                      ৳{selectedMember.paidAmount || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Due:</span>
                    <span
                      className={`ml-2 font-semibold ${
                        selectedMember.dueAmount > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-accent-600 dark:text-accent-400'
                      }`}
                    >
                      ৳{selectedMember.dueAmount || 0}
                    </span>
                  </div>
                </div>
                {selectedMember.dueAmount > 0 && (
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                    Maximum payment allowed: ৳{selectedMember.dueAmount}
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={
                !formData.memberId || !formData.packageId || !formData.originalAmount
              }
            >
              {submitting ? 'Saving Payment…' : 'Save Payment'}
            </Button>
          </form>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {selectedPaymentIds.length > 0
              ? `${selectedPaymentIds.length} selected`
              : 'Select payments to bulk delete'}
          </p>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              if (selectedPaymentIds.length) setConfirmBulkDelete(true);
            }}
            disabled={!selectedPaymentIds.length}
          >
            Delete Selected
          </Button>
        </div>

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Heading>
                <input
                  type="checkbox"
                  checked={
                    payments.length > 0 && selectedPaymentIds.length === payments.length
                  }
                  onChange={toggleSelectAllPayments}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-600 dark:border-slate-600 dark:bg-slate-800"
                  aria-label="Select all"
                />
              </Table.Heading>
              <Table.Heading>Member</Table.Heading>
              <Table.Heading>Package</Table.Heading>
              <Table.Heading>Amount</Table.Heading>
              <Table.Heading>Method</Table.Heading>
              <Table.Heading>Type</Table.Heading>
              <Table.Heading>Date</Table.Heading>
              <Table.Heading>Actions</Table.Heading>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {payments.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan="8" align="center">
                  <div className="py-6">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      No payments found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Record a payment to get started.
                    </p>
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : (
              payments.map((payment) => (
                <Table.Row key={payment._id} interactive>
                  <Table.Cell>
                    <input
                      type="checkbox"
                      checked={selectedPaymentIds.includes(payment._id)}
                      onChange={() => toggleSelectPayment(payment._id)}
                      className="h-4 w-4 rounded border-slate-300 accent-brand-600 dark:border-slate-600 dark:bg-slate-800"
                      aria-label="Select payment"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {payment.memberId?.name || 'Unknown'} (
                      {payment.memberId?.memberId || 'N/A'})
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Paid: ৳{payment.memberId?.paidAmount || 0} / Due: ৳
                      {payment.memberId?.dueAmount || 0}
                    </div>
                  </Table.Cell>
                  <Table.Cell>{getPackageLabel(payment)}</Table.Cell>
                  <Table.Cell>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      ৳{payment.finalAmount || payment.amount || 0}
                    </div>
                    {payment.discountAmount > 0 && payment.originalAmount && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Original: ৳{payment.originalAmount} (-
                        {payment.discountType === 'percentage'
                          ? `${payment.discountAmount}%`
                          : `৳${payment.discountAmount}`}
                        )
                      </div>
                    )}
                  </Table.Cell>
                  <Table.Cell>{getPaymentMethodLabel(payment)}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={payment.paymentType === 'full' ? 'success' : 'brand'}>
                      {payment.paymentType === 'full' ? 'Full' : 'Partial'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{new Date(payment.date).toLocaleDateString()}</Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => generateReceipt(payment)}
                      >
                        Receipt
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeletingPaymentId(payment._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>

        <div className="border-t border-slate-200 px-4 dark:border-slate-800">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </Card>

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
        onClose={() => {
          setShowReceipt(false);
          setReceiptData(null);
        }}
        type="payment"
        data={receiptData}
      />
    </div>
  );
};

export default Payments;
