import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import Pagination from '../components/Pagination';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import FormField from '../components/ui/FormField';
import Spinner from '../components/ui/Spinner';
import StatCard from '../components/ui/StatCard';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { cn } from '../components/ui/cn';

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
      const params = { page: pagination.page, limit: 20 };
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
    } catch (err) {
      console.error('Error fetching attendance:', err);
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
    } catch (err) {
      console.error('Sync failed:', err);
      showError('Device sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleMemberSearch = async (query) => {
    setMemberSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/members?search=${query}`);
      setSearchResults(res.data.data.slice(0, 8));
    } catch (err) {
      console.error('Search error:', err);
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
    } catch (err) {
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
      showSuccess(
        `${selectedMember.name} ${manualType === 'check-in' ? 'checked in' : 'checked out'}`,
      );
      setShowManualModal(false);
      setSelectedMember(null);
      setMemberSearch('');
      setMemberStatus(null);
      fetchData();
    } catch (err) {
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
              Tracking
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Attendance
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Fingerprint-based attendance logs from ZKTeco devices.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setShowManualModal(true);
                setSelectedMember(null);
                setMemberSearch('');
                setMemberStatus(null);
              }}
            >
              + Manual Check-in
            </Button>
            <Button variant="secondary" onClick={handleSync} loading={syncing}>
              Sync Now
            </Button>
          </div>
        </div>
      </Card>

      {todayStats && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Check-ins Today" value={todayStats.totalCheckIns} accent="success" />
          <StatCard
            label="Currently Present"
            value={todayStats.currentlyPresent}
            accent="brand"
          />
          <StatCard
            label="Check-outs Today"
            value={todayStats.totalCheckOuts}
            accent="neutral"
          />
        </section>
      )}

      <Card padding="md">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div className="w-40">
            <FormField label="Start Date">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </FormField>
          </div>
          <div className="w-40">
            <FormField label="End Date">
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </FormField>
          </div>
          <div className="w-40">
            <FormField label="Type">
              <Select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All</option>
                <option value="check-in">Check-in</option>
                <option value="check-out">Check-out</option>
              </Select>
            </FormField>
          </div>
          <div className="flex-1 min-w-[200px]">
            <FormField label="Search">
              <Input
                type="text"
                placeholder="Member name or ID..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </FormField>
          </div>
          <Button type="submit" variant="primary">
            Filter
          </Button>
        </form>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Heading>Member</Table.Heading>
              <Table.Heading>Member ID</Table.Heading>
              <Table.Heading>Type</Table.Heading>
              <Table.Heading>Time</Table.Heading>
              <Table.Heading>Device</Table.Heading>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {attendances.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan="5" align="center">
                  <div className="py-6 text-slate-500 dark:text-slate-400">
                    No attendance records found.
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : (
              attendances.map((record) => (
                <Table.Row key={record._id} interactive>
                  <Table.Cell className="font-medium text-slate-900 dark:text-slate-100">
                    {record.memberId?.name || (
                      <span className="text-amber-600 dark:text-amber-400">
                        Unmapped (Device ID: {record.deviceUserId})
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell>{record.memberId?.memberId || '-'}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={record.type === 'check-in' ? 'success' : 'danger'}>
                      {record.type === 'check-in' ? 'Check-in' : 'Check-out'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{new Date(record.timestamp).toLocaleString()}</Table.Cell>
                  <Table.Cell>
                    {record.source === 'manual' ? (
                      <Badge variant="neutral" size="sm">
                        Manual
                      </Badge>
                    ) : (
                      record.deviceId?.name || '-'
                    )}
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>

        {(pagination.totalPages ?? pagination.pages ?? 1) > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 dark:border-slate-800">
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
              {pagination.total} records
            </p>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages ?? pagination.pages ?? 1}
              onChange={(p) => setPagination({ ...pagination, page: p })}
            />
          </div>
        )}
      </Card>

      <Modal open={showManualModal} onClose={() => setShowManualModal(false)} size="md">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Manual Check-in
          </h3>

          <div className="relative">
            <FormField label="Search Member">
              <Input
                type="text"
                value={memberSearch}
                onChange={(e) => handleMemberSearch(e.target.value)}
                placeholder="Type member name, phone, or ID..."
              />
            </FormField>
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-control border border-slate-200 bg-white shadow-card-lg dark:border-slate-700 dark:bg-slate-900">
                {searchResults.map((m) => (
                  <button
                    key={m._id}
                    onClick={() => handleSelectMember(m)}
                    className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {m.name}
                    </span>
                    <span className="ml-2 text-slate-500 dark:text-slate-400">
                      {m.memberId} | {m.phone}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedMember && (
            <>
              <div className="rounded-control border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedMember.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedMember.memberId} | {selectedMember.phone}
                </p>
                {memberStatus && (
                  <p className="mt-1 text-xs">
                    {memberStatus.checkedIn ? (
                      <span className="text-accent-700 dark:text-accent-300">
                        Currently checked in (since{' '}
                        {new Date(memberStatus.lastRecord.timestamp).toLocaleTimeString()})
                      </span>
                    ) : memberStatus.lastRecord ? (
                      <span className="text-slate-500 dark:text-slate-400">
                        Last: {memberStatus.lastRecord.type} at{' '}
                        {new Date(memberStatus.lastRecord.timestamp).toLocaleTimeString()}
                      </span>
                    ) : (
                      <span className="text-slate-400">No attendance today</span>
                    )}
                  </p>
                )}
              </div>

              <FormField label="Action">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setManualType('check-in')}
                    className={cn(
                      'flex-1 rounded-control px-3 py-2 text-sm font-medium transition',
                      manualType === 'check-in'
                        ? 'bg-accent-600 text-white dark:bg-accent-500'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    Check In
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('check-out')}
                    className={cn(
                      'flex-1 rounded-control px-3 py-2 text-sm font-medium transition',
                      manualType === 'check-out'
                        ? 'bg-red-600 text-white'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    Check Out
                  </button>
                </div>
              </FormField>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowManualModal(false)}
                  disabled={submittingManual}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleManualSubmit} loading={submittingManual}>
                  Confirm {manualType === 'check-in' ? 'Check In' : 'Check Out'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Attendance;
