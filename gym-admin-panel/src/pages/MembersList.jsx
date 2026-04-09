import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import { Link } from 'react-router-dom';

const MembersList = () => {
  const { showSuccess, showError } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, [search, statusFilter]);

  const fetchMembers = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/members', { params });
      setMembers(res.data.data);
    } catch (error) {
      console.error('Error fetching members:', error);
      showError('Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    if (expiry < now) return 'bg-red-100 text-red-800 border-red-200';
    if (expiry <= threeDaysLater) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusText = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

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
      <div className="bg-white border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-1">Members</h1>
            <p className="text-sm text-slate-500">View and manage your member list with clear controls.</p>
          </div>
          <Link
            to="/members/add"
            className="inline-flex items-center justify-center rounded-[5px] border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Add Member
          </Link>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Search Members</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, phone, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-4 pr-4 py-3 border border-slate-300 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition duration-200"
              />
            </div>
          </div>
          <div className="md:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition duration-200"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="expiring">Expiring Soon</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden bg-white border border-slate-200 rounded-[5px]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Member ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Fingerprint
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {members.map((member) => (
                  <tr key={member._id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
                          {member.memberId ? member.memberId.slice(-1) : member.name?.charAt(0).toUpperCase() || '-'}
                        </div>
                        <Link to={`/members/${member._id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                          {member.memberId || 'N/A'}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/members/${member._id}`} className="text-sm text-slate-900 hover:text-blue-600 hover:underline transition-colors">
                        {member.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">{member.phone}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{member.packageId?.name}</div>
                      <div className="text-xs text-slate-500">৳{member.packageId?.price}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm text-slate-900">
                          Paid: <span className="font-semibold text-green-600">৳{member.paidAmount || 0}</span>
                        </div>
                        <div className="text-sm text-slate-900">
                          Due: <span className={`font-semibold ${member.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ৳{member.dueAmount || 0}
                          </span>
                        </div>
                        <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-[5px] border ${
                          member.dueAmount === 0 ? 'border-green-200 bg-green-50 text-green-700' :
                          member.dueAmount === member.totalAmount ? 'border-red-200 bg-red-50 text-red-700' :
                          'border-yellow-200 bg-yellow-50 text-yellow-700'
                        }`}>
                          {member.dueAmount === 0 ? 'Paid' :
                           member.dueAmount === member.totalAmount ? 'Unpaid' : 'Partial'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-900">{new Date(member.expiryDate).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border ${getStatusColor(member.expiryDate)}`}>
                        {getStatusText(member.expiryDate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.deviceUserId != null ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-[5px] border border-green-200 bg-green-50 text-green-700" title={`Device User ID: ${member.deviceUserId}`}>
                          Registered
                        </span>
                      ) : (
                        <Link
                          to={`/members/${member._id}/edit`}
                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-[5px] border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          Not Set
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/members/${member._id}/edit`}
                          className="text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-[5px] transition-colors duration-200"
                        >
                          Edit
                        </Link>
                        {deletingId === member._id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-600">Delete?</span>
                            <button onClick={() => confirmDelete(member._id)} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-[5px]">Yes</button>
                            <button onClick={() => setDeletingId(null)} className="text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-[5px]">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(member._id)}
                            className="text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-[5px] transition-colors duration-200"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {members.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 mb-2">No members found</h3>
            <p className="text-slate-500">Get started by adding your first member.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersList;