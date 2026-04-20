import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import { Link, useSearchParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import { isSuperAdmin } from '../utils/auth';

const MembersList = () => {
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [deletingId, setDeletingId] = useState(null);
  const [tab, setTab] = useState(searchParams.get('tab') || 'all');
  const [pendingMembers, setPendingMembers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchMembers();
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchPending();
    }
  }, []);

  useEffect(() => {
    if (tab === 'pending' && isSuperAdmin()) {
      fetchPending();
    }
  }, [tab]);

  const fetchMembers = async () => {
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/members', { params });
      setMembers(res.data.data);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching members:', error);
      showError('Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    setPendingLoading(true);
    try {
      const res = await api.get('/members/pending');
      setPendingMembers(res.data.data);
    } catch (error) {
      console.error('Error fetching pending members:', error);
      showError('Failed to load pending members.');
    } finally {
      setPendingLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/members/${id}/approve`);
      showSuccess('Member approved');
      setPendingMembers((prev) => prev.filter((m) => m._id !== id));
      fetchMembers();
    } catch (error) {
      console.error('Error approving member:', error);
      showError('Failed to approve member.');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.delete(`/members/${id}/reject`);
      showSuccess('Member rejected');
      setPendingMembers((prev) => prev.filter((m) => m._id !== id));
    } catch (error) {
      console.error('Error rejecting member:', error);
      showError('Failed to reject member.');
    } finally {
      setRejectingId(null);
    }
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams);
    if (newTab === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    setSearchParams(params, { replace: true });
  };

  const getStatusColor = (expiryDate) => {
    if (!expiryDate) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/60';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const threeDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (expiry < now) return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/60';
    if (expiry <= threeDaysLater) return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/60';
    return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/60';
  };

  const getStatusText = (expiryDate) => {
    if (!expiryDate) return 'Lifetime';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const threeDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (expiry < now) return 'Expired';
    if (expiry <= threeDaysLater) return 'Expiring Soon';
    return 'Active';
  };

  const confirmDelete = async (id) => {
    try {
      await api.delete(`/members/${id}`);
      showSuccess('Member deleted');
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      showError('Failed to delete member.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-200 p-8 shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-1 dark:text-slate-100">Members</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">View and manage your member list with clear controls.</p>
          </div>
          <Link
            to="/members/add"
            className="inline-flex items-center justify-center rounded-[5px] border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Add Member
          </Link>
        </div>

        {isSuperAdmin() && (
          <div className="flex gap-1 mt-6 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => switchTab('all')}
              className={`px-4 py-2.5 text-sm font-medium transition -mb-px ${
                tab === 'all'
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All Members
            </button>
            <button
              onClick={() => switchTab('pending')}
              className={`px-4 py-2.5 text-sm font-medium transition -mb-px flex items-center gap-2 ${
                tab === 'pending'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pending Approval
              {pendingMembers.length > 0 && tab !== 'pending' && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 dark:text-orange-300">
                  {pendingMembers.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {tab === 'pending' && isSuperAdmin() ? (
        <div className="bg-white border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
            </div>
          ) : pendingMembers.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-slate-900 mb-2 dark:text-slate-100">No pending approvals</h3>
              <p className="text-slate-500 dark:text-slate-400">All member requests have been reviewed.</p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white border border-slate-200 rounded-[5px] dark:bg-slate-900 dark:border-slate-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-100 dark:bg-slate-800/60">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Package</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Join Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Added By</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 dark:divide-slate-700 dark:bg-slate-900">
                    {pendingMembers.map((member) => (
                      <tr key={member._id} className="hover:bg-slate-50 transition-colors duration-200 dark:hover:bg-slate-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link to={`/members/${member._id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600 dark:text-blue-400 transition-colors dark:text-slate-100">
                            {member.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{member.phone}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-slate-100">{member.packageId?.name || 'N/A'}</div>
                          {member.packageId?.priceGents != null && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">৳{member.gender === 'Female' ? member.packageId.priceLadies : member.packageId.priceGents}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {member.addedBy?.name || member.addedBy?.email || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleApprove(member._id)}
                              className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-[5px] transition-colors duration-200"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingId(member._id)}
                              className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-[5px] transition-colors duration-200"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
      <div className="bg-white border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">Search Members</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, phone, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-4 pr-4 py-3 border border-slate-300 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition duration-200 dark:border-slate-600"
              />
            </div>
          </div>
          <div className="md:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition duration-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="expiring">Expiring Soon</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden bg-white border border-slate-200 rounded-[5px] dark:bg-slate-900 dark:border-slate-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-100 dark:bg-slate-800/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    Member ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    Package
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    Payment Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    Expiry
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    Fingerprint
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider sticky right-0 bg-slate-100 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] dark:bg-slate-800 dark:text-slate-400 dark:shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.5)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 dark:divide-slate-700 dark:bg-slate-900">
                {members.map((member) => (
                  <tr key={member._id} className="hover:bg-slate-50 transition-colors duration-200 dark:hover:bg-slate-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {member.memberId ? member.memberId.slice(-1) : member.name?.charAt(0).toUpperCase() || '-'}
                        </div>
                        <Link to={`/members/${member._id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600 dark:text-blue-400 transition-colors dark:text-slate-100">
                          {member.memberId || 'N/A'}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/members/${member._id}`} className="text-sm text-slate-900 hover:text-blue-600 dark:text-blue-400 hover:underline transition-colors dark:text-slate-100">
                        {member.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{member.phone}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-slate-100">{member.packageId?.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">৳{member.gender === 'Female' ? member.packageId?.priceLadies : member.packageId?.priceGents}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm text-slate-900 dark:text-slate-100">
                          Paid: <span className="font-semibold text-green-600 dark:text-green-400">৳{member.paidAmount || 0}</span>
                        </div>
                        <div className="text-sm text-slate-900 dark:text-slate-100">
                          Due: <span className={`font-semibold ${member.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ৳{member.dueAmount || 0}
                          </span>
                        </div>
                        <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-[5px] border ${
                          member.dueAmount === 0 ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800/60 dark:bg-green-900/30 dark:text-green-300' :
                          member.dueAmount === member.totalAmount ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300' :
                          'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800/60 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {member.dueAmount === 0 ? 'Paid' :
                           member.dueAmount === member.totalAmount ? 'Unpaid' : 'Partial'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-900 dark:text-slate-100">{member.expiryDate ? new Date(member.expiryDate).toLocaleDateString() : 'Lifetime'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.status === 'pending' ? (
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-orange-200 dark:border-orange-800/60 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                          Pending Approval
                        </span>
                      ) : (
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border ${getStatusColor(member.expiryDate)}`}>
                          {getStatusText(member.expiryDate)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.deviceUserId != null ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-[5px] border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" title={`Device User ID: ${member.deviceUserId}`}>
                          Registered
                        </span>
                      ) : (
                        <Link
                          to={`/members/${member._id}/edit`}
                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-[5px] border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors dark:bg-slate-950 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
                        >
                          Not Set
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] dark:bg-slate-900 dark:shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.5)]">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/members/${member._id}/edit`}
                          className="text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-[5px] transition-colors duration-200 dark:bg-slate-800 dark:text-slate-300"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeletingId(member._id)}
                          className="text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-[5px] transition-colors duration-200 dark:bg-slate-800 dark:text-slate-300"
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
          <div className="px-4 border-t border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>

        {members.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 mb-2 dark:text-slate-100">No members found</h3>
            <p className="text-slate-500 dark:text-slate-400">Get started by adding your first member.</p>
          </div>
        )}
      </div>

      )}

      <ConfirmModal
        open={!!deletingId}
        title="Delete Member"
        message={`Are you sure you want to delete ${members.find(m => m._id === deletingId)?.name || 'this member'}? This removes all their records.`}
        onConfirm={() => confirmDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmModal
        open={!!rejectingId}
        title="Reject Member"
        message={`Are you sure you want to reject ${pendingMembers.find((m) => m._id === rejectingId)?.name || 'this member'}? This will permanently delete their request.`}
        confirmLabel="Reject"
        onConfirm={() => handleReject(rejectingId)}
        onCancel={() => setRejectingId(null)}
      />
    </div>
  );
};

export default MembersList;