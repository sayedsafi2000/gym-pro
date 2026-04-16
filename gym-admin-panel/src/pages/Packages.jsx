import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';

const CATEGORY_STYLES = {
  regular: 'border-slate-200 bg-slate-50 text-slate-600',
  special: 'border-orange-200 bg-orange-50 text-orange-700',
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

  const defaultForm = {
    name: '', duration: '', priceGents: '', priceLadies: '', description: '',
    category: 'regular', benefits: [], isLifetime: false,
    admissionFee: '0', includesAdmission: false, freeMonths: '0',
  };

  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      setPackages(res.data.data);
    } catch (error) {
      showError('Failed to load packages.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingPkg(null);
    setFormData(defaultForm);
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
    } catch (error) {
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
    } catch (error) {
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

  const formatDuration = (days) => {
    if (days >= 365) return `${Math.round(days / 365)} year${days >= 730 ? 's' : ''}`;
    if (days >= 30) return `${Math.round(days / 30)} month${days >= 60 ? 's' : ''}`;
    return `${days} days`;
  };

  const formatPrice = (pkg) => {
    if (pkg.priceGents === pkg.priceLadies) {
      return `৳${pkg.priceGents.toLocaleString()}`;
    }
    return `৳${pkg.priceGents.toLocaleString()} / ৳${pkg.priceLadies.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Membership</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-3">Packages</h1>
            <p className="mt-2 text-sm text-slate-500">Create and manage membership packages with pricing and benefits.</p>
          </div>
          <button
            onClick={openAdd}
            className="rounded-[5px] bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
          >
            + Add Package
          </button>
        </div>
      </section>

      {/* Package Cards */}
      {packages.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No packages yet</p>
          <p className="text-xs text-slate-500 mt-1">Create your first membership package to start enrolling members.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg._id} className="bg-white border border-slate-200 p-6 shadow-sm flex flex-col">
              {/* Category + Duration */}
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${CATEGORY_STYLES[pkg.category] || CATEGORY_STYLES.regular}`}>
                  {pkg.category === 'special' ? 'Special Offer' : 'Regular'}
                </span>
                <span className="text-xs text-slate-400">{pkg.isLifetime ? 'Lifetime' : formatDuration(pkg.duration)}</span>
              </div>

              {/* Name + Description */}
              <h3 className="text-lg font-semibold text-slate-900">{pkg.name}</h3>
              {pkg.description && (
                <p className="text-xs text-slate-500 mt-1">{pkg.description}</p>
              )}

              {/* Price */}
              <div className="mt-4">
                {(pkg.priceGents ?? pkg.price) === (pkg.priceLadies ?? pkg.price) ? (
                  <p className="text-2xl font-semibold text-slate-900">৳{(pkg.priceGents ?? pkg.price ?? 0).toLocaleString()}</p>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-xl font-semibold text-slate-900">
                      ♂ ৳{(pkg.priceGents ?? 0).toLocaleString()}
                      <span className="text-slate-300 mx-2">|</span>
                      ♀ ৳{(pkg.priceLadies ?? 0).toLocaleString()}
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {pkg.isLifetime ? 'No expiry' : `${pkg.duration} days`}
                  {pkg.freeMonths > 0 && ` · ${pkg.freeMonths} month${pkg.freeMonths > 1 ? 's' : ''} free`}
                </p>
              </div>

              {/* Admission fee info */}
              {!pkg.includesAdmission && (pkg.admissionFee || 0) > 0 && (
                <p className="text-xs text-amber-600 mt-1">+ ৳{(pkg.admissionFee || 0).toLocaleString()} admission fee</p>
              )}
              {pkg.includesAdmission && (
                <p className="text-xs text-green-600 mt-1">Admission fee included</p>
              )}

              {/* Benefits */}
              {pkg.benefits && pkg.benefits.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                  {pkg.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {b}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-4">
                <button
                  onClick={() => openEdit(pkg)}
                  className="flex-1 rounded-[5px] border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingId(pkg._id)}
                  className="rounded-[5px] border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-lg w-full mx-4 p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingPkg ? 'Edit Package' : 'Add Package'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Package Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Super Saver Plus"
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Category</label>
                <div className="flex gap-2">
                  {['regular', 'special'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`flex-1 rounded-[5px] px-3 py-2 text-sm font-medium transition ${
                        formData.category === cat
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat === 'special' ? 'Special Offer' : 'Regular'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Lifetime Membership + 6 Months Free"
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent resize-none"
                />
              </div>

              {/* Lifetime Toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isLifetime || false}
                    onChange={(e) => setFormData({ ...formData, isLifetime: e.target.checked, duration: e.target.checked ? '' : formData.duration })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm text-slate-700">Lifetime package (no expiry)</span>
              </div>

              {/* Prices: Gents + Ladies */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Price - Gents (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.priceGents}
                    onChange={(e) => setFormData({ ...formData, priceGents: e.target.value })}
                    className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Price - Ladies (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.priceLadies}
                    onChange={(e) => setFormData({ ...formData, priceLadies: e.target.value })}
                    className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Duration (if not lifetime) */}
              {!formData.isLifetime && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Duration (days)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                  />
                  {formData.duration && (
                    <p className="text-xs text-slate-400 mt-1">{formatDuration(Number(formData.duration))}</p>
                  )}
                </div>
              )}

              {/* Admission Fee + Includes Toggle */}
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Admission Fee (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.admissionFee}
                    onChange={(e) => setFormData({ ...formData, admissionFee: e.target.value })}
                    className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includesAdmission || false}
                      onChange={(e) => setFormData({ ...formData, includesAdmission: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                  <span className="text-xs text-slate-600">Admission included in price</span>
                </div>
              </div>

              {/* Free Months */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Free Months Included</label>
                <input
                  type="number"
                  min="0"
                  value={formData.freeMonths}
                  onChange={(e) => setFormData({ ...formData, freeMonths: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Benefits</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBenefit(); } }}
                    placeholder="Type a benefit and press Enter"
                    className="flex-1 rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="rounded-[5px] border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                  >
                    Add
                  </button>
                </div>
                {formData.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.benefits.map((b, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-[5px]"
                      >
                        {b}
                        <button
                          type="button"
                          onClick={() => removeBenefit(i)}
                          className="text-slate-400 hover:text-slate-700 ml-0.5"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-[5px] bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPkg ? 'Update Package' : 'Add Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
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
