import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { getErrorMessage } from '../services/errorHandler';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { cn } from '../components/ui/cn';

const PERMISSION_LABELS = {
  canViewAnalytics: 'View Analytics',
  canManagePackages: 'Manage Packages',
  canManageDevices: 'Manage Devices',
  canManageStore: 'Manage Store',
  canDeleteMembers: 'Delete Members',
  canViewIncome: 'View Income',
};

const EMPTY_PERMS = Object.fromEntries(
  Object.keys(PERMISSION_LABELS).map((k) => [k, false]),
);

const ManageAdmins = () => {
  const { showSuccess, showError } = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'admin',
    permissions: EMPTY_PERMS,
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/auth/admins');
      setAdmins(res.data.data);
    } catch (err) {
      showError('Failed to load admins.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingAdmin(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'admin',
      permissions: EMPTY_PERMS,
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
      permissions: admin.permissions || EMPTY_PERMS,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingAdmin) {
        const data = {
          name: formData.name,
          role: formData.role,
          permissions: formData.permissions,
        };
        await api.put(`/auth/admins/${editingAdmin._id}`, data);
        showSuccess('Admin updated');
      } else {
        await api.post('/auth/admins', formData);
        showSuccess('Admin created');
      }
      setShowModal(false);
      fetchAdmins();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to save admin.'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (id) => {
    try {
      await api.delete(`/auth/admins/${id}`);
      showSuccess('Admin deleted');
      fetchAdmins();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to delete admin.'));
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
              Access Control
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Manage Admins
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Create admin accounts and control their permissions.
            </p>
          </div>
          <Button variant="primary" onClick={openAdd}>
            + Add Admin
          </Button>
        </div>
      </Card>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map((admin) => (
          <Card key={admin._id} padding="md">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {admin.name || admin.email}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{admin.email}</p>
              </div>
              <Badge variant={admin.role === 'super_admin' ? 'brand' : 'neutral'}>
                {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </Badge>
            </div>

            {admin.role === 'admin' && (
              <div className="mt-3 flex flex-wrap gap-1">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <Badge
                    key={key}
                    variant={admin.permissions?.[key] ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button variant="secondary" size="sm" fullWidth onClick={() => openEdit(admin)}>
                Edit
              </Button>
              {admin.role !== 'super_admin' && (
                <Button variant="danger" size="sm" onClick={() => setDeletingId(admin._id)}>
                  Delete
                </Button>
              )}
            </div>
          </Card>
        ))}
      </section>

      <Modal open={showModal} onClose={() => setShowModal(false)} size="md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {editingAdmin ? 'Edit Admin' : 'Add Admin'}
          </h3>

          <FormField label="Name">
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Admin name"
            />
          </FormField>

          <FormField label="Email" required>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!editingAdmin}
              autoComplete="email"
            />
          </FormField>

          {!editingAdmin && (
            <FormField label="Password (min 8 chars)" required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-control p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>
          )}

          <FormField label="Role">
            <div className="flex gap-2">
              {['admin', 'super_admin'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: r })}
                  className={cn(
                    'flex-1 rounded-control px-3 py-2 text-sm font-medium transition',
                    formData.role === r
                      ? 'bg-brand-600 text-white dark:bg-brand-500'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  {r === 'super_admin' ? 'Super Admin' : 'Admin'}
                </button>
              ))}
            </div>
          </FormField>

          {formData.role === 'admin' && (
            <FormField label="Permissions">
              <div className="space-y-2">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions[key] || false}
                      onChange={() => togglePermission(key)}
                      className="h-4 w-4 rounded border-slate-300 accent-brand-600 dark:border-slate-600 dark:bg-slate-800"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </FormField>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingAdmin ? 'Update' : 'Create Admin'}
            </Button>
          </div>
        </form>
      </Modal>

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
