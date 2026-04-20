import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getErrorMessage } from '../services/errorHandler';
import ConfirmModal from '../components/ConfirmModal';
import Alert from '../components/Alert';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import FormField from '../components/ui/FormField';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const DeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({ name: '', ip: '', port: '4370' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncingDeviceId, setSyncingDeviceId] = useState(null);
  const [checkingStatusId, setCheckingStatusId] = useState(null);
  const [deviceStatuses, setDeviceStatuses] = useState({});
  const [viewingUsersDeviceId, setViewingUsersDeviceId] = useState(null);
  const [deviceUsers, setDeviceUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [members, setMembers] = useState([]);
  const [linkingUid, setLinkingUid] = useState(null);
  const [linkMemberId, setLinkMemberId] = useState('');
  const [deletingDeviceId, setDeletingDeviceId] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.data);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUsers = async (deviceId) => {
    if (viewingUsersDeviceId === deviceId) {
      setViewingUsersDeviceId(null);
      return;
    }
    setViewingUsersDeviceId(deviceId);
    setLoadingUsers(true);
    setLinkingUid(null);
    try {
      const [usersRes, membersRes] = await Promise.all([
        api.get(`/devices/${deviceId}/users`),
        api.get('/members?limit=500'),
      ]);
      setDeviceUsers(usersRes.data.data);
      setMembers(membersRes.data.data);
    } catch (err) {
      console.error('Error fetching device users:', err);
      setError('Failed to fetch device users. Is the device online?');
      setViewingUsersDeviceId(null);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLinkUser = async (deviceId, deviceUserId) => {
    if (!linkMemberId) return;
    try {
      await api.post(`/devices/${deviceId}/link-user`, {
        memberId: linkMemberId,
        deviceUserId,
      });
      setLinkingUid(null);
      setLinkMemberId('');
      setSuccess('User linked to member successfully');
      handleViewUsers(deviceId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to link user'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (editingDevice) {
        await api.put(`/devices/${editingDevice._id}`, formData);
        setSuccess('Device updated successfully');
      } else {
        await api.post('/devices', formData);
        setSuccess('Device added successfully');
      }
      setShowForm(false);
      setEditingDevice(null);
      setFormData({ name: '', ip: '', port: '4370' });
      fetchDevices();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save device'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setFormData({ name: device.name, ip: device.ip, port: String(device.port) });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const confirmDeleteDevice = async (id) => {
    try {
      await api.delete(`/devices/${id}`);
      fetchDevices();
    } catch (err) {
      console.error('Error deleting device:', err);
    } finally {
      setDeletingDeviceId(null);
    }
  };

  const handleToggleActive = async (device) => {
    try {
      await api.put(`/devices/${device._id}`, { isActive: !device.isActive });
      fetchDevices();
    } catch (err) {
      console.error('Error toggling device:', err);
    }
  };

  const handleCheckStatus = async (deviceId) => {
    setCheckingStatusId(deviceId);
    try {
      const res = await api.get(`/devices/${deviceId}/status`);
      setDeviceStatuses((prev) => ({ ...prev, [deviceId]: res.data.data }));
    } catch (err) {
      setDeviceStatuses((prev) => ({
        ...prev,
        [deviceId]: { online: false, error: 'Connection check failed' },
      }));
    } finally {
      setCheckingStatusId(null);
    }
  };

  const handleSync = async (deviceId) => {
    setSyncingDeviceId(deviceId);
    try {
      await api.post(`/attendance/sync/${deviceId}`);
      fetchDevices();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncingDeviceId(null);
    }
  };

  const getStatusBadge = (device) => {
    const liveStatus = deviceStatuses[device._id];

    if (liveStatus) {
      return (
        <Badge variant={liveStatus.online ? 'success' : 'danger'}>
          {liveStatus.online ? 'Online' : 'Offline'}
        </Badge>
      );
    }

    if (device.lastSyncStatus === 'never') {
      return <Badge variant="neutral">Never Synced</Badge>;
    }

    return (
      <Badge variant={device.lastSyncStatus === 'success' ? 'success' : 'danger'}>
        {device.lastSyncStatus === 'success' ? 'Last Sync OK' : 'Sync Failed'}
      </Badge>
    );
  };

  const timeAgo = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Configuration
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Device Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Manage ZKTeco fingerprint devices connected to your gym.
            </p>
          </div>
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            onClick={() => {
              setShowForm(!showForm);
              setEditingDevice(null);
              setFormData({ name: '', ip: '', port: '4370' });
              setError('');
              setSuccess('');
            }}
          >
            {showForm ? 'Cancel' : '+ Add Device'}
          </Button>
        </div>
      </Card>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {showForm && (
        <Card padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {editingDevice ? 'Edit Device' : 'Add New Device'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Device Name" required>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Entrance"
              />
            </FormField>
            <FormField label="IP Address" required>
              <Input
                type="text"
                required
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                placeholder="e.g., 192.168.1.201"
              />
            </FormField>
            <FormField label="Port">
              <Input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
              />
            </FormField>
            <div className="sm:col-span-3">
              <Button type="submit" variant="primary" loading={submitting}>
                {editingDevice ? 'Update Device' : 'Add Device'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.length === 0 ? (
          <div className="col-span-2">
            <EmptyState
              title="No devices configured"
              description="Add a device to start tracking attendance."
            />
          </div>
        ) : (
          devices.map((device) => (
            <Card key={device._id} padding="md">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {device.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {device.ip}:{device.port}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(device)}
                  <Badge variant={device.isActive ? 'success' : 'neutral'}>
                    {device.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              <div className="mb-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Last Sync</span>
                  <span>{timeAgo(device.lastSyncAt)}</span>
                </div>
                {device.lastError && (
                  <div className="rounded-control border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-400">
                    {device.lastError}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={viewingUsersDeviceId === device._id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleViewUsers(device._id)}
                >
                  {viewingUsersDeviceId === device._id ? 'Hide Users' : 'View Users'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCheckStatus(device._id)}
                  loading={checkingStatusId === device._id}
                >
                  Check Status
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSync(device._id)}
                  loading={syncingDeviceId === device._id}
                >
                  Sync Now
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleToggleActive(device)}>
                  {device.isActive ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleEdit(device)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeletingDeviceId(device._id)}
                >
                  Delete
                </Button>
              </div>

              {viewingUsersDeviceId === device._id && (
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Users on Device
                  </h4>
                  {loadingUsers ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Spinner size="sm" />
                      Loading users from device...
                    </div>
                  ) : deviceUsers.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No users found on this device.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {deviceUsers.map((u) => (
                        <div
                          key={u.uid}
                          className="flex items-center justify-between rounded-control border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                              UID: {u.uid}
                            </span>
                            <span className="text-sm text-slate-800 dark:text-slate-200">
                              {u.name || 'Unnamed'}
                            </span>
                          </div>
                          {u.member ? (
                            <Badge variant="success">
                              {u.member.name} ({u.member.memberId})
                            </Badge>
                          ) : linkingUid === u.uid ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={linkMemberId}
                                onChange={(e) => setLinkMemberId(e.target.value)}
                                className="py-1 text-xs"
                              >
                                <option value="">Select member...</option>
                                {members
                                  .filter((m) => m.deviceUserId == null)
                                  .map((m) => (
                                    <option key={m._id} value={m._id}>
                                      {m.name} ({m.memberId})
                                    </option>
                                  ))}
                              </Select>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleLinkUser(device._id, u.uid)}
                                disabled={!linkMemberId}
                              >
                                Link
                              </Button>
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkingUid(null);
                                  setLinkMemberId('');
                                }}
                                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setLinkingUid(u.uid);
                                setLinkMemberId('');
                              }}
                            >
                              <Badge variant="warning">Unlinked — Click to Link</Badge>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </section>

      <ConfirmModal
        open={!!deletingDeviceId}
        title="Delete Device"
        message={`Are you sure you want to delete ${
          devices.find((d) => d._id === deletingDeviceId)?.name || 'this device'
        }?`}
        onConfirm={() => confirmDeleteDevice(deletingDeviceId)}
        onCancel={() => setDeletingDeviceId(null)}
      />
    </div>
  );
};

export default DeviceManagement;
