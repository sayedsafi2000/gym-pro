import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';

const PERMISSION_LABELS = {
  canViewAnalytics: 'View Analytics',
  canManagePackages: 'Manage Packages',
  canManageDevices: 'Manage Devices',
  canManageStore: 'Manage Store',
  canDeleteMembers: 'Delete Members',
  canViewIncome: 'View Income',
};

const ManageAdmins = () => {
  const { showSuccess, showError } = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', role: 'admin',
    permissions: {
      canViewAnalytics: false,
      canManagePackages: false,
      canManageDevices: false,
      canManageStore: false,
      canDeleteMembers: false,
      canViewIncome: false,
    },
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/auth/admins');
      setAdmins(res.data.data);
    } catch (error) {
      showError('Failed to load admins.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingAdmin(null);
    setFormData({
      email: '', password: '', name: '', role: 'admin',
      permissions: {
        canViewAnalytics: false, canManagePackages: false, canManageDevices: false,
        canManageStore: false, canDeleteMembers: false, canViewIncome: false,
      },
    });
    setShowModal(true);
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email,
      password: '',
      name: admin.name || '',
      role: admin.role,
      permissions: admin.permissions || {},
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingAdmin) {
        const data = { name: formData.name, role: formData.role, permissions: formData.permissions };
        await api.put(`/auth/admins/${editingAdmin._id}`, data);
        showSuccess('Admin updated');
      } else {
        await api.post('/auth/admins', formData);
        showSuccess('Admin created');
      }
      setShowModal(false);
      fetchAdmins();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (id) => {
    try {
      await api.delete(`/auth/admins/${id}`);
      showSuccess('Admin deleted');
      fetchAdmins();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete admin.');
    } finally {
      setDeletingId(null);
    }
  };

  const togglePermission = (perm) => {
    setFormData({
      ...formData,
      permissions: { ...formData.permissions, [perm]: !formData.permissions[perm] },
    });
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
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Access Control</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-3">Manage Admins</h1>
            <p className="mt-2 text-sm text-slate-500">Create admin accounts and control their permissions.</p>
          </div>
          <button
            onClick={openAdd}
            className="rounded-[5px] bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
          >
            + Add Admin
          </button>
        </div>
      </section>

      {/* Admin Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map((admin) => (
          <div key={admin._id} className="bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{admin.name || admin.email}</h3>
                <p className="text-xs text-slate-500">{admin.email}</p>
              </div>
              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${
                admin.role === 'super_admin'
                  ? 'border-purple-200 bg-purple-50 text-purple-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}>
                {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>

            {/* Permissions */}
            {admin.role === 'admin' && (
              <div className="flex flex-wrap gap-1 mt-3">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <span
                    key={key}
                    className={`text-[10px] px-1.5 py-0.5 rounded-[5px] border ${
                      admin.permissions?.[key]
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-slate-100 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => openEdit(admin)}
                className="flex-1 rounded-[5px] border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Edit
              </button>
              {admin.role !== 'super_admin' && (
                <button
                  onClick={() => setDeletingId(admin._id)}
                  className="rounded-[5px] border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-md w-full mx-4 p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingAdmin ? 'Edit Admin' : 'Add Admin'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Admin name"
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingAdmin}
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent disabled:bg-slate-100"
                />
              </div>
              {!editingAdmin && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Role</label>
                <div className="flex gap-2">
                  {['admin', 'super_admin'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r })}
                      className={`flex-1 rounded-[5px] px-3 py-2 text-sm font-medium transition ${
                        formData.role === r ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {r === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </button>
                  ))}
                </div>
              </div>

              {formData.role === 'admin' && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Permissions</label>
                  <div className="space-y-2">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions[key] || false}
                          onChange={() => togglePermission(key)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                        />
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
                  {submitting ? 'Saving...' : editingAdmin ? 'Update' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deletingId}
        title="Delete Admin"
        message="Are you sure you want to delete this admin account?"
        onConfirm={() => confirmDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default ManageAdmins;
