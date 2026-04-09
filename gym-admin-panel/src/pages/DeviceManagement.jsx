import React, { useEffect, useState } from 'react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

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
    } catch (error) {
      console.error('Error fetching devices:', error);
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
        api.get('/members'),
      ]);
      setDeviceUsers(usersRes.data.data);
      setMembers(membersRes.data.data);
    } catch (error) {
      console.error('Error fetching device users:', error);
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
      handleViewUsers(deviceId); // Refresh the users list
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to link user');
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
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save device');
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
    } catch (error) {
      console.error('Error deleting device:', error);
    } finally {
      setDeletingDeviceId(null);
    }
  };

  const handleToggleActive = async (device) => {
    try {
      await api.put(`/devices/${device._id}`, { isActive: !device.isActive });
      fetchDevices();
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const handleCheckStatus = async (deviceId) => {
    setCheckingStatusId(deviceId);
    try {
      const res = await api.get(`/devices/${deviceId}/status`);
      setDeviceStatuses((prev) => ({ ...prev, [deviceId]: res.data.data }));
    } catch (error) {
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
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncingDeviceId(null);
    }
  };

  const getStatusBadge = (device) => {
    const liveStatus = deviceStatuses[device._id];

    if (liveStatus) {
      return liveStatus.online ? (
        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-green-200 bg-green-50 text-green-700">
          Online
        </span>
      ) : (
        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-red-200 bg-red-50 text-red-700">
          Offline
        </span>
      );
    }

    if (device.lastSyncStatus === 'never') {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-slate-200 bg-slate-50 text-slate-600">
          Never Synced
        </span>
      );
    }

    return device.lastSyncStatus === 'success' ? (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-green-200 bg-green-50 text-green-700">
        Last Sync OK
      </span>
    ) : (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-red-200 bg-red-50 text-red-700">
        Sync Failed
      </span>
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="bg-white border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Configuration</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-3">Device Management</h1>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
              Manage ZKTeco fingerprint devices connected to your gym.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingDevice(null);
              setFormData({ name: '', ip: '', port: '4370' });
              setError('');
              setSuccess('');
            }}
            className="rounded-[5px] bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {showForm ? 'Cancel' : '+ Add Device'}
          </button>
        </div>
      </section>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[5px] text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-[5px] text-sm">
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <section className="bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {editingDevice ? 'Edit Device' : 'Add New Device'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Device Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Entrance"
                className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">IP Address</label>
              <input
                type="text"
                required
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                placeholder="e.g., 192.168.1.201"
                className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-[5px] bg-slate-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingDevice ? 'Update Device' : 'Add Device'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Device Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.length === 0 ? (
          <div className="col-span-2 bg-white border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
            No devices configured. Add a device to start tracking attendance.
          </div>
        ) : (
          devices.map((device) => (
            <div key={device._id} className="bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{device.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {device.ip}:{device.port}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(device)}
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-[5px] border ${
                      device.isActive
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {device.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <div className="flex justify-between">
                  <span>Last Sync</span>
                  <span>{timeAgo(device.lastSyncAt)}</span>
                </div>
                {device.lastError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-[5px] px-3 py-2">
                    {device.lastError}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleViewUsers(device._id)}
                  className={`rounded-[5px] border px-3 py-1.5 text-xs font-medium transition ${
                    viewingUsersDeviceId === device._id
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {viewingUsersDeviceId === device._id ? 'Hide Users' : 'View Users'}
                </button>
                <button
                  onClick={() => handleCheckStatus(device._id)}
                  disabled={checkingStatusId === device._id}
                  className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {checkingStatusId === device._id ? 'Checking...' : 'Check Status'}
                </button>
                <button
                  onClick={() => handleSync(device._id)}
                  disabled={syncingDeviceId === device._id}
                  className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {syncingDeviceId === device._id ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={() => handleToggleActive(device)}
                  className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {device.isActive ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleEdit(device)}
                  className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingDeviceId(device._id)}
                  className="rounded-[5px] border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>

              {/* Device Users Panel */}
              {viewingUsersDeviceId === device._id && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">Users on Device</h4>
                  {loadingUsers ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                      Loading users from device...
                    </div>
                  ) : deviceUsers.length === 0 ? (
                    <p className="text-sm text-slate-500">No users found on this device.</p>
                  ) : (
                    <div className="space-y-2">
                      {deviceUsers.map((u) => (
                        <div key={u.uid} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-[5px] px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-slate-500">UID: {u.uid}</span>
                            <span className="text-sm text-slate-800">{u.name || 'Unnamed'}</span>
                          </div>
                          {u.member ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-[5px] border border-green-200 bg-green-50 text-green-700">
                              {u.member.name} ({u.member.memberId})
                            </span>
                          ) : linkingUid === u.uid ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={linkMemberId}
                                onChange={(e) => setLinkMemberId(e.target.value)}
                                className="rounded-[5px] border border-slate-200 px-2 py-1 text-xs"
                              >
                                <option value="">Select member...</option>
                                {members
                                  .filter((m) => m.deviceUserId == null)
                                  .map((m) => (
                                    <option key={m._id} value={m._id}>
                                      {m.name} ({m.memberId})
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => handleLinkUser(device._id, u.uid)}
                                disabled={!linkMemberId}
                                className="rounded-[5px] bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                Link
                              </button>
                              <button
                                onClick={() => { setLinkingUid(null); setLinkMemberId(''); }}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setLinkingUid(u.uid); setLinkMemberId(''); }}
                              className="inline-flex px-2 py-1 text-xs font-semibold rounded-[5px] border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition"
                            >
                              Unlinked - Click to Link
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <ConfirmModal
        open={!!deletingDeviceId}
        title="Delete Device"
        message={`Are you sure you want to delete ${devices.find(d => d._id === deletingDeviceId)?.name || 'this device'}?`}
        onConfirm={() => confirmDeleteDevice(deletingDeviceId)}
        onCancel={() => setDeletingDeviceId(null)}
      />
    </div>
  );
};

export default DeviceManagement;
