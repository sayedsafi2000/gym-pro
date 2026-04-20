import React, { useEffect, useState } from 'react';
import { Check, X, Package as PackageIcon } from 'lucide-react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import FormField from '../components/ui/FormField';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { cn } from '../components/ui/cn';

const DEFAULT_FORM = {
  name: '',
  duration: '',
  priceGents: '',
  priceLadies: '',
  description: '',
  category: 'regular',
  benefits: [],
  isLifetime: true,
  admissionFee: '0',
  includesAdmission: false,
  freeMonths: '0',
};

const formatDuration = (days) => {
  if (days >= 365) return `${Math.round(days / 365)} year${days >= 730 ? 's' : ''}`;
  if (days >= 30) return `${Math.round(days / 30)} month${days >= 60 ? 's' : ''}`;
  return `${days} days`;
};

const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [benefitInput, setBenefitInput] = useState('');
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState(DEFAULT_FORM);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      setPackages(res.data.data);
    } catch (err) {
      showError('Failed to load packages.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingPkg(null);
    setFormData(DEFAULT_FORM);
    setBenefitInput('');
    setShowModal(true);
  };

  const openEdit = (pkg) => {
    setEditingPkg(pkg);
    setFormData({
      name: pkg.name,
      duration: String(pkg.duration || ''),
      priceGents: String(pkg.priceGents),
      priceLadies: String(pkg.priceLadies),
      description: pkg.description || '',
      category: pkg.category || 'regular',
      benefits: pkg.benefits || [],
      isLifetime: pkg.isLifetime || false,
      admissionFee: String(pkg.admissionFee || 0),
      includesAdmission: pkg.includesAdmission || false,
      freeMonths: String(pkg.freeMonths || 0),
    });
    setBenefitInput('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        duration: Number(formData.duration),
        priceGents: Number(formData.priceGents),
        priceLadies: Number(formData.priceLadies),
        admissionFee: Number(formData.admissionFee),
        freeMonths: Number(formData.freeMonths),
      };
      if (editingPkg) {
        await api.put(`/packages/${editingPkg._id}`, data);
        showSuccess('Package updated');
      } else {
        await api.post('/packages', data);
        showSuccess('Package added');
      }
      setShowModal(false);
      fetchPackages();
    } catch (err) {
      showError('Failed to save package.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (id) => {
    try {
      await api.delete(`/packages/${id}`);
      showSuccess('Package deleted');
      fetchPackages();
    } catch (err) {
      showError('Failed to delete package.');
    } finally {
      setDeletingId(null);
    }
  };

  const addBenefit = () => {
    const val = benefitInput.trim();
    if (val && !formData.benefits.includes(val)) {
      setFormData({ ...formData, benefits: [...formData.benefits, val] });
    }
    setBenefitInput('');
  };

  const removeBenefit = (idx) => {
    setFormData({ ...formData, benefits: formData.benefits.filter((_, i) => i !== idx) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Membership
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Packages
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Create and manage membership packages with pricing and benefits.
            </p>
          </div>
          <Button variant="primary" onClick={openAdd}>
            + Add Package
          </Button>
        </div>
      </Card>

      {packages.length === 0 ? (
        <EmptyState
          icon={<PackageIcon className="w-5 h-5" />}
          title="No packages yet"
          description="Create your first membership package to start enrolling members."
          action={
            <Button variant="primary" onClick={openAdd}>
              + Add Package
            </Button>
          }
        />
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg._id} padding="md" className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <Badge variant={pkg.category === 'special' ? 'warning' : 'neutral'}>
                  {pkg.category === 'special' ? 'Special Offer' : 'Regular'}
                </Badge>
                <span className="text-xs text-slate-400">
                  {pkg.isLifetime ? 'Lifetime' : formatDuration(pkg.duration)}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {pkg.name}
              </h3>
              {pkg.description && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {pkg.description}
                </p>
              )}

              <div className="mt-4">
                {(pkg.priceGents ?? pkg.price) === (pkg.priceLadies ?? pkg.price) ? (
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    ৳{(pkg.priceGents ?? pkg.price ?? 0).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    ♂ ৳{(pkg.priceGents ?? 0).toLocaleString()}
                    <span className="mx-2 text-slate-300">|</span>♀ ৳
                    {(pkg.priceLadies ?? 0).toLocaleString()}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-slate-400">
                  {pkg.isLifetime ? 'No expiry' : `${pkg.duration} days`}
                  {pkg.freeMonths > 0 &&
                    ` · ${pkg.freeMonths} month${pkg.freeMonths > 1 ? 's' : ''} free`}
                </p>
              </div>

              {!pkg.includesAdmission && (pkg.admissionFee || 0) > 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  + ৳{(pkg.admissionFee || 0).toLocaleString()} admission fee
                </p>
              )}
              {pkg.includesAdmission && (
                <p className="mt-1 text-xs text-accent-600 dark:text-accent-400">
                  Admission fee included
                </p>
              )}

              {pkg.benefits && pkg.benefits.length > 0 && (
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  {pkg.benefits.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <Check className="mt-0.5 w-3.5 h-3.5 shrink-0 text-accent-500" />
                      {b}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-4">
                <Button variant="secondary" size="sm" fullWidth onClick={() => openEdit(pkg)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeletingId(pkg._id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {editingPkg ? 'Edit Package' : 'Add Package'}
          </h3>

          <FormField label="Package Name" required>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Super Saver Plus"
            />
          </FormField>

          <FormField label="Category">
            <div className="flex gap-2">
              {['regular', 'special'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={cn(
                    'flex-1 rounded-control px-3 py-2 text-sm font-medium transition',
                    formData.category === cat
                      ? 'bg-brand-600 text-white dark:bg-brand-500'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  {cat === 'special' ? 'Special Offer' : 'Regular'}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Description">
            <Textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Lifetime Membership + 6 Months Free"
            />
          </FormField>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isLifetime || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isLifetime: e.target.checked,
                  duration: e.target.checked ? '' : formData.duration,
                })
              }
              className="h-4 w-4 rounded border-slate-300 accent-brand-600 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Lifetime package (no expiry)
            </span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price — Gents (৳)" required>
              <Input
                type="number"
                required
                min="0"
                value={formData.priceGents}
                onChange={(e) => setFormData({ ...formData, priceGents: e.target.value })}
              />
            </FormField>
            <FormField label="Price — Ladies (৳)" required>
              <Input
                type="number"
                required
                min="0"
                value={formData.priceLadies}
                onChange={(e) => setFormData({ ...formData, priceLadies: e.target.value })}
              />
            </FormField>
          </div>

          {!formData.isLifetime && (
            <FormField
              label="Duration (days)"
              required
              hint={formData.duration ? formatDuration(Number(formData.duration)) : null}
            >
              <Input
                type="number"
                required
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4 items-end">
            <FormField label="Admission Fee (৳)">
              <Input
                type="number"
                min="0"
                value={formData.admissionFee}
                onChange={(e) => setFormData({ ...formData, admissionFee: e.target.value })}
              />
            </FormField>
            <label className="flex items-center gap-2 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includesAdmission || false}
                onChange={(e) =>
                  setFormData({ ...formData, includesAdmission: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 accent-accent-600 dark:border-slate-600 dark:bg-slate-800"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Admission included in price
              </span>
            </label>
          </div>

          <FormField label="Free Months Included">
            <Input
              type="number"
              min="0"
              value={formData.freeMonths}
              onChange={(e) => setFormData({ ...formData, freeMonths: e.target.value })}
              placeholder="0"
            />
          </FormField>

          <FormField label="Benefits">
            <div className="flex gap-2">
              <Input
                type="text"
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addBenefit();
                  }
                }}
                placeholder="Type a benefit and press Enter"
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={addBenefit}>
                Add
              </Button>
            </div>
            {formData.benefits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.benefits.map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-control bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {b}
                    <button
                      type="button"
                      onClick={() => removeBenefit(i)}
                      className="ml-0.5 text-slate-400 hover:text-slate-700"
                      aria-label="Remove benefit"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingPkg ? 'Update Package' : 'Add Package'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deletingId}
        title="Delete Package"
        message="Are you sure you want to delete this package? Members using it won't be affected."
        onConfirm={() => confirmDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default Packages;
