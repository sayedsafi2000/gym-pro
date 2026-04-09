import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';

const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', duration: '', price: '' });
  const [editingId, setEditingId] = useState(null);
  const [deletingPackageId, setDeletingPackageId] = useState(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      setPackages(res.data.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/packages/${editingId}`, formData);
      } else {
        await api.post('/packages', formData);
      }
      setFormData({ name: '', duration: '', price: '' });
      setShowForm(false);
      setEditingId(null);
      fetchPackages();
      showSuccess(editingId ? 'Package updated' : 'Package added');
    } catch (error) {
      console.error('Error saving package:', error);
      showError('Failed to save package.');
    }
  };

  const handleEdit = (pkg) => {
    setFormData({ name: pkg.name, duration: pkg.duration, price: pkg.price });
    setEditingId(pkg._id);
    setShowForm(true);
  };

  const confirmDeletePackage = async (id) => {
    try {
      await api.delete(`/packages/${id}`);
      showSuccess('Package deleted');
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      showError('Failed to delete package.');
    } finally {
      setDeletingPackageId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-48">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Packages</h1>
          <p className="text-sm text-slate-500 mt-2">Manage your membership packages with clear pricing.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-[5px] border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          {showForm ? 'Close' : editingId ? 'Edit Package' : 'Add Package'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Package name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              required
            />
            <input
              type="number"
              placeholder="Duration (days)"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              required
            />
            <input
              type="number"
              placeholder="Price"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              required
            />
          </div>
          <button type="submit" className="mt-6 rounded-[5px] bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition duration-200">
            {editingId ? 'Update Package' : 'Save Package'}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {packages.map((pkg) => (
                <tr key={pkg._id} className="hover:bg-slate-50 transition duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{pkg.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{pkg.duration} days</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">৳{pkg.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(pkg)} className="rounded-[5px] border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                        Edit
                      </button>
                      <button onClick={() => setDeletingPackageId(pkg._id)} className="rounded-[5px] border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition">
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
        open={!!deletingPackageId}
        title="Delete Package"
        message="Are you sure you want to delete this package? Members using it won't be affected."
        onConfirm={() => confirmDeletePackage(deletingPackageId)}
        onCancel={() => setDeletingPackageId(null)}
      />
    </div>
  );
};

export default Packages;