import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Attendance = () => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/attendance/sync');
      await fetchData();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
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
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
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
                      {record.deviceId?.name || '-'}
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
    </div>
  );
};

export default Attendance;
