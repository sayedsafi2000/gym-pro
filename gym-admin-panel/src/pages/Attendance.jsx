import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';

const Attendance = () => {
  const { showSuccess, showError } = useToast();
  const [attendances, setAttendances] = useState([]);
  const [todayStats, setTodayStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: '',
    search: '',
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showManualModal, setShowManualModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStatus, setMemberStatus] = useState(null);
  const [manualType, setManualType] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters.startDate, filters.endDate, filters.type, pagination.page]);

  const fetchData = async () => {
    try {
      const params = {
        page: pagination.page,
        limit: 20,
      };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;

      const [attendanceRes, todayRes] = await Promise.all([
        api.get('/attendance', { params }),
        api.get('/attendance/today'),
      ]);

      setAttendances(attendanceRes.data.data);
      setPagination(attendanceRes.data.pagination);
      setTodayStats(todayRes.data.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      showError('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/attendance/sync');
      await fetchData();
      showSuccess('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
      showError('Device sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleMemberSearch = async (query) => {
    setMemberSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    try {
      const res = await api.get(`/members?search=${query}`);
      setSearchResults(res.data.data.slice(0, 8));
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleSelectMember = async (member) => {
    setSelectedMember(member);
    setSearchResults([]);
    setMemberSearch(member.name);
    try {
      const res = await api.get(`/attendance/member/${member._id}/status`);
      const status = res.data.data;
      setMemberStatus(status);
      setManualType(status.checkedIn ? 'check-out' : 'check-in');
    } catch (error) {
      setMemberStatus(null);
      setManualType('check-in');
    }
  };

  const handleManualSubmit = async () => {
    if (!selectedMember) return;
    setSubmittingManual(true);
    try {
      await api.post('/attendance/manual', {
        memberId: selectedMember._id,
        type: manualType,
      });
      showSuccess(`${selectedMember.name} ${manualType === 'check-in' ? 'checked in' : 'checked out'}`);
      setShowManualModal(false);
      setSelectedMember(null);
      setMemberSearch('');
      setMemberStatus(null);
      fetchData();
    } catch (error) {
      showError('Failed to record attendance.');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchData();
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
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Tracking</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-3">Attendance</h1>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
              Fingerprint-based attendance logs from ZKTeco devices.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowManualModal(true); setSelectedMember(null); setMemberSearch(''); setMemberStatus(null); }}
              className="rounded-[5px] bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
            >
              + Manual Check-in
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      </section>

      {/* Today's Summary */}
      {todayStats && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Check-ins Today</p>
            <p className="mt-4 text-4xl font-semibold text-green-600">{todayStats.totalCheckIns}</p>
          </div>
          <div className="bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Currently Present</p>
            <p className="mt-4 text-4xl font-semibold text-blue-600">{todayStats.currentlyPresent}</p>
          </div>
          <div className="bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Check-outs Today</p>
            <p className="mt-4 text-4xl font-semibold text-slate-600">{todayStats.totalCheckOuts}</p>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="bg-white border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="rounded-[5px] border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="rounded-[5px] border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="rounded-[5px] border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="check-in">Check-in</option>
              <option value="check-out">Check-out</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Search</label>
            <input
              type="text"
              placeholder="Member name or ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="rounded-[5px] border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-[5px] bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Filter
          </button>
        </form>
      </section>

      {/* Attendance Table */}
      <section className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Member</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Member ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Time</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Device</th>
              </tr>
            </thead>
            <tbody>
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                attendances.map((record) => (
                  <tr key={record._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {record.memberId?.name || (
                        <span className="text-yellow-600">Unmapped (Device ID: {record.deviceUserId})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {record.memberId?.memberId || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border ${
                          record.type === 'check-in'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        {record.type === 'check-in' ? 'Check-in' : 'Check-out'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {record.source === 'manual' ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border border-slate-200 bg-slate-50 text-slate-600">Manual</span>
                      ) : (
                        record.deviceId?.name || '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} records)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page <= 1}
                className="rounded-[5px] border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.pages}
                className="rounded-[5px] border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowManualModal(false)} />
          <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-md w-full mx-4 p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Manual Check-in</h3>

            {/* Search */}
            <div className="relative mb-4">
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Search Member</label>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => handleMemberSearch(e.target.value)}
                placeholder="Type member name, phone, or ID..."
                className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-[5px] shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((m) => (
                    <button
                      key={m._id}
                      onClick={() => handleSelectMember(m)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <span className="font-medium text-slate-900">{m.name}</span>
                      <span className="text-slate-500 ml-2">{m.memberId} | {m.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected member status */}
            {selectedMember && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3">
                  <p className="text-sm font-semibold text-slate-900">{selectedMember.name}</p>
                  <p className="text-xs text-slate-500">{selectedMember.memberId} | {selectedMember.phone}</p>
                  {memberStatus && (
                    <p className="text-xs mt-1">
                      {memberStatus.checkedIn ? (
                        <span className="text-green-700">Currently checked in (since {new Date(memberStatus.lastRecord.timestamp).toLocaleTimeString()})</span>
                      ) : memberStatus.lastRecord ? (
                        <span className="text-slate-500">Last: {memberStatus.lastRecord.type} at {new Date(memberStatus.lastRecord.timestamp).toLocaleTimeString()}</span>
                      ) : (
                        <span className="text-slate-400">No attendance today</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Type selector */}
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Action</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setManualType('check-in')}
                      className={`flex-1 rounded-[5px] px-3 py-2 text-sm font-medium transition ${
                        manualType === 'check-in' ? 'bg-green-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Check In
                    </button>
                    <button
                      onClick={() => setManualType('check-out')}
                      className={`flex-1 rounded-[5px] px-3 py-2 text-sm font-medium transition ${
                        manualType === 'check-out' ? 'bg-red-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Check Out
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowManualModal(false)}
                    className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManualSubmit}
                    disabled={submittingManual}
                    className="rounded-[5px] bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {submittingManual ? 'Recording...' : `Confirm ${manualType === 'check-in' ? 'Check In' : 'Check Out'}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
