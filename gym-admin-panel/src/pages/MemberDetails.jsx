import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import useToast from '../hooks/useToast';
import AttendanceCalendar from '../components/AttendanceCalendar';
import ReceiptModal from '../components/ReceiptModal';

const MemberDetails = () => {
  const { id } = useParams();
  const { showError, showSuccess } = useToast();
  const [member, setMember] = useState(null);
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [memberStatus, setMemberStatus] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [installment, setInstallment] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewData, setRenewData] = useState({ packageId: '', paymentType: 'due', initialPayment: '', paymentMethod: 'Cash' });
  const [renewPackages, setRenewPackages] = useState([]);
  const [renewing, setRenewing] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [monthlyMethod, setMonthlyMethod] = useState('Cash');
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [payingMonthly, setPayingMonthly] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStatus();
  }, [id]);

  useEffect(() => {
    if (member) {
      fetchCalendar();
    }
  }, [calendarMonth, member]);

  const fetchStatus = async () => {
    try {
      const res = await api.get(`/attendance/member/${id}/status`);
      setMemberStatus(res.data.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleManualCheckin = async () => {
    setCheckingIn(true);
    try {
      const type = memberStatus?.checkedIn ? 'check-out' : 'check-in';
      await api.post('/attendance/manual', { memberId: id, type });
      showSuccess(`${member.name} ${type === 'check-in' ? 'checked in' : 'checked out'}`);
      fetchData();
      fetchStatus();
      fetchCalendar();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to record attendance.';
      showError(msg);
    } finally {
      setCheckingIn(false);
    }
  };

  const fetchData = async () => {
    try {
      const [memberRes, statsRes, paymentsRes] = await Promise.all([
        api.get(`/members/${id}`),
        api.get(`/attendance/member/${id}/stats`),
        api.get(`/payments?memberId=${id}`),
      ]);
      setMember(memberRes.data.data);
      setStats(statsRes.data.data);
      setPayments(paymentsRes.data.data);
    } catch (error) {
      console.error('Error fetching member details:', error);
      showError('Failed to load member details.');
    } finally {
      setLoading(false);
    }

    // Fetch installment plan + subscription history
    try {
      const [installRes, subsRes] = await Promise.all([
        api.get(`/installments/member/${id}`).catch(() => ({ data: { data: null } })),
        api.get(`/subscriptions/member/${id}`).catch(() => ({ data: { data: [] } })),
      ]);
      setInstallment(installRes.data.data);
      setSubscriptions(subsRes.data.data || []);
    } catch (e) {
      // Non-critical
    }
  };

  const fetchCalendar = async () => {
    try {
      const res = await api.get(
        `/attendance/member/${id}/calendar?year=${calendarMonth.year}&month=${calendarMonth.month}`
      );
      setCalendarData(res.data.data);
    } catch (error) {
      console.error('Error fetching calendar:', error);
      showError('Failed to load calendar data.');
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/payments/${paymentId}/receipt`);
      setReceiptData(res.data.data);
      setShowReceipt(true);
    } catch (error) {
      console.error('Error loading receipt:', error);
    }
  };

  const openRenewModal = async () => {
    try {
      const res = await api.get('/packages');
      setRenewPackages(res.data.data);
      setRenewData({ packageId: member.packageId?._id || '', paymentType: 'due', initialPayment: '', paymentMethod: 'Cash' });
      setShowRenewModal(true);
    } catch (error) {
      showError('Failed to load packages.');
    }
  };

  const handleRenew = async () => {
    if (!renewData.packageId) { showError('Select a package'); return; }
    setRenewing(true);
    try {
      await api.post('/subscriptions/renew', {
        memberId: id,
        packageId: renewData.packageId,
        paymentType: renewData.paymentType,
        initialPayment: renewData.paymentType === 'partial' ? parseFloat(renewData.initialPayment) : undefined,
        paymentMethod: renewData.paymentMethod,
      });
      showSuccess('Membership renewed successfully');
      setShowRenewModal(false);
      fetchData();
      fetchStatus();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to renew membership.');
    } finally {
      setRenewing(false);
    }
  };

  const openMonthlyModal = async () => {
    try {
      const res = await api.get('/subscriptions/config');
      const config = res.data.data;
      const fee = member.gender === 'Female' ? config.monthlyFeeLadies : config.monthlyFeeGents;
      setMonthlyFee(fee);
      setMonthlyMethod('Cash');
      setShowMonthlyModal(true);
    } catch (error) {
      showError('Failed to load monthly fee config.');
    }
  };

  const handleMonthlyPayment = async () => {
    setPayingMonthly(true);
    try {
      await api.post('/subscriptions/monthly-renew', {
        memberId: id,
        paymentMethod: monthlyMethod,
      });
      showSuccess('Monthly access renewed for 30 days');
      setShowMonthlyModal(false);
      fetchData();
      fetchStatus();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to process monthly payment.');
    } finally {
      setPayingMonthly(false);
    }
  };

  const getEffectivePrice = (pkg) => {
    if (!pkg) return 0;
    const base = member?.gender === 'Female' ? pkg.priceLadies : pkg.priceGents;
    return pkg.includesAdmission ? base : base + (pkg.admissionFee || 0);
  };

  const getStatusColor = (expiryDate) => {
    if (!expiryDate) return 'border-blue-200 bg-blue-50 text-blue-700';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const threeDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (expiry < now) return 'border-red-200 bg-red-50 text-red-700';
    if (expiry <= threeDaysLater) return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    return 'border-green-200 bg-green-50 text-green-700';
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

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const timeAgo = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900">Member not found</h2>
        <Link to="/members" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          Back to Members
        </Link>
      </div>
    );
  }

  // Membership progress
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const joinDate = new Date(member.joinDate);
  const expiryDate = member.expiryDate ? new Date(member.expiryDate) : null;
  const pkgFreeMonths = member.packageId?.freeMonths ?? member.lifetimePackageId?.freeMonths ?? 0;
  const pkgDuration = member.packageId?.duration ?? 0;
  const dateDiffDays = expiryDate ? Math.round((expiryDate - joinDate) / MS_PER_DAY) : 0;
  const fallbackDays = pkgFreeMonths > 0 ? pkgFreeMonths * 30 : pkgDuration;
  const totalDays = Math.max(1, dateDiffDays > 0 ? dateDiffDays : fallbackDays || 1);
  const rawElapsed = Math.round((new Date() - joinDate) / MS_PER_DAY);
  const elapsed = Math.max(0, Math.min(totalDays, rawElapsed));
  const progressPct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
  const isExpired = expiryDate && expiryDate < new Date();
  const daysRemaining = isExpired ? 0 : Math.max(0, totalDays - elapsed);

  const progressColor = () => {
    if (progressPct >= 100) return 'bg-red-500';
    if (progressPct >= 90) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 text-white text-xs rounded-[5px] px-3 py-2 border border-slate-700">
        <p className="font-medium">{label}</p>
        <p className="text-green-400">{payload[0].value} visits</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Link to="/members" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              &larr; Back to Members
            </Link>
            <div className="flex items-center gap-3 mt-2">
              <h1 className="text-3xl font-semibold text-slate-900">{member.name}</h1>
              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-slate-300 bg-slate-100 text-slate-700">
                {member.memberId}
              </span>
              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border ${getStatusColor(member.expiryDate)}`}>
                {getStatusText(member.expiryDate)}
              </span>
              {member.hasLifetimeMembership && (
                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-blue-200 bg-blue-50 text-blue-700">
                  Lifetime Member
                </span>
              )}
            </div>
            {stats?.lastVisit && (
              <p className="mt-2 text-sm text-slate-500">
                Last visit: {timeAgo(stats.lastVisit)} ({new Date(stats.lastVisit).toLocaleDateString()})
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {member.expiryDate && new Date(member.expiryDate) < new Date() ? (
              member.hasLifetimeMembership ? (
                <button
                  onClick={openMonthlyModal}
                  className="rounded-[5px] px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition"
                >
                  Pay Monthly
                </button>
              ) : (
                <button
                  onClick={openRenewModal}
                  className="rounded-[5px] px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  Renew Membership
                </button>
              )
            ) : (
              <button
                onClick={handleManualCheckin}
                disabled={checkingIn}
                className={`rounded-[5px] px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                  memberStatus?.checkedIn
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {checkingIn ? 'Recording...' : memberStatus?.checkedIn ? 'Check Out' : 'Check In'}
              </button>
            )}
            <Link
              to={`/members/${id}/edit`}
              className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Edit Member
            </Link>
            <Link
              to="/payments"
              className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Record Payment
            </Link>
            {!member.deviceUserId && (
              <Link
                to={`/members/${id}/edit`}
                className="rounded-[5px] border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition"
              >
                Register Fingerprint
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Member Info + Financial */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm text-slate-500 uppercase tracking-wide mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{member.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Emergency Phone</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{member.emergencyPhone || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Gender</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{member.gender}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Address</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{member.address || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Join Date</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{joinDate.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Expiry Date</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{member.expiryDate ? new Date(member.expiryDate).toLocaleDateString() : 'Lifetime (No Expiry)'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Package</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {member.packageId?.name} ({member.packageId?.duration}d)
              </p>
              {member.packageId?.description && (
                <p className="text-xs text-slate-400 mt-0.5">{member.packageId.description}</p>
              )}
              {member.packageId?.benefits && member.packageId.benefits.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {member.packageId.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs text-slate-500">
                      <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Fingerprint</p>
              <p className="text-sm font-medium mt-0.5">
                {member.deviceUserId ? (
                  <span className="text-green-700">Registered (ID: {member.deviceUserId})</span>
                ) : (
                  <span className="text-slate-400">Not registered</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Financial + Progress */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm text-slate-500 uppercase tracking-wide mb-4">Financial</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Total</span>
              <span className="text-sm font-semibold text-slate-900">৳{member.totalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Paid</span>
              <span className="text-sm font-semibold text-green-600">৳{member.paidAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Due</span>
              <span className={`text-sm font-semibold ${member.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ৳{member.dueAmount}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {member.expiryDate && (
          <div className="mt-6">
            <h2 className="text-sm text-slate-500 uppercase tracking-wide mb-2">Membership Progress</h2>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${progressColor()} transition-all duration-500`}
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{elapsed} of {totalDays} days</span>
              <span className={daysRemaining === 0 ? 'text-red-600 font-semibold' : ''}>
                {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
              </span>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* Attendance Stats */}
      {stats && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Visits</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalVisits}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">This Month</p>
            <p className="mt-2 text-3xl font-semibold text-blue-600">{stats.thisMonthVisits}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Avg / Week</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.avgPerWeek}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Session</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatDuration(stats.avgSessionMinutes)}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Streak</p>
            <p className="mt-2 text-3xl font-semibold text-orange-600">{stats.currentStreak}d</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Attendance</p>
            <p className="mt-2 text-3xl font-semibold text-green-600">{stats.attendanceRate}%</p>
          </div>
        </section>
      )}

      {/* Calendar + Chart */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          {calendarData && (
            <AttendanceCalendar
              calendarData={calendarData}
              year={calendarMonth.year}
              month={calendarMonth.month}
              joinDate={calendarData.joinDate}
              expiryDate={calendarData.expiryDate}
              onMonthChange={setCalendarMonth}
            />
          )}
        </div>

        {/* Weekly trend chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm text-slate-500 uppercase tracking-wide mb-4">Weekly Visit Trend</h3>
          {stats?.weeklyTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="week"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="visits" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-slate-400">
              No visit data yet
            </div>
          )}
        </div>
      </section>

      {/* Installment Schedule */}
      {installment && (
        <section className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm text-slate-500 uppercase tracking-wide">Installment Plan</h3>
            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${
              installment.status === 'completed' ? 'border-green-200 bg-green-50 text-green-700' :
              installment.status === 'overdue' ? 'border-red-200 bg-red-50 text-red-700' :
              'border-blue-200 bg-blue-50 text-blue-700'
            }`}>
              {installment.status === 'completed' ? 'Completed' : installment.status === 'overdue' ? 'Overdue' : 'Active'}
            </span>
          </div>
          <div className="px-6 py-3 bg-slate-50 text-xs text-slate-600 flex gap-6">
            <span>Total: ৳{installment.totalAmount?.toLocaleString()}</span>
            <span>Monthly: ৳{installment.monthlyAmount?.toLocaleString()}</span>
            <span>Paid: {installment.paidInstallments}/{installment.totalInstallments} months</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Month</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Due Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Paid Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {installment.schedule?.map((s) => (
                  <tr key={s.month} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">Month {s.month}</td>
                    <td className="px-6 py-3 text-slate-600">৳{s.amount?.toLocaleString()}</td>
                    <td className="px-6 py-3 text-slate-600">{new Date(s.dueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-slate-600">{s.paidDate ? new Date(s.paidDate).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${
                        s.status === 'paid' ? 'border-green-200 bg-green-50 text-green-700' :
                        s.status === 'overdue' ? 'border-red-200 bg-red-50 text-red-700' :
                        'border-yellow-200 bg-yellow-50 text-yellow-700'
                      }`}>
                        {s.status === 'paid' ? 'Paid' : s.status === 'overdue' ? 'Overdue' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Payment History */}
      <section className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm text-slate-500 uppercase tracking-wide">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Package</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Discount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Final</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Method</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">
                    No payments recorded.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-slate-900">
                      {p.paymentType === 'monthly_renewal' || p.paymentType === 'monthly'
                        ? 'Monthly Access'
                        : p.packageId?.name || '-'}
                    </td>
                    <td className="px-6 py-3 text-slate-600">৳{p.originalAmount}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {p.discountAmount > 0
                        ? `${p.discountAmount}${p.discountType === 'percentage' ? '%' : '৳'}`
                        : '-'}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900">৳{p.finalAmount}</td>
                    <td className="px-6 py-3 text-slate-600">{p.paymentMethod}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${
                        p.paymentType === 'full'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : p.paymentType === 'monthly_renewal' || p.paymentType === 'monthly'
                          ? 'border-purple-200 bg-purple-50 text-purple-700'
                          : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                      }`}>
                        {p.paymentType === 'full'
                          ? 'Full'
                          : p.paymentType === 'monthly_renewal' || p.paymentType === 'monthly'
                          ? 'Monthly'
                          : 'Partial'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleViewReceipt(p._id)}
                        className="rounded-[5px] border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Subscription History */}
      {subscriptions.length > 0 && (
        <section className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-sm text-slate-500 uppercase tracking-wide">Subscription History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Package</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Start</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">End</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Paid</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const now = new Date();
                  const effectiveStatus =
                    sub.status === 'cancelled'
                      ? 'cancelled'
                      : sub.isLifetime && !sub.endDate
                      ? 'active'
                      : sub.endDate && new Date(sub.endDate) < now
                      ? 'expired'
                      : sub.status;
                  const packageLabel =
                    sub.type === 'monthly' ? 'Monthly Access' : sub.packageId?.name || '-';
                  return (
                    <tr key={sub._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{packageLabel}</td>
                      <td className="px-6 py-3 text-slate-600">{new Date(sub.startDate).toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-slate-600">{sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'Lifetime'}</td>
                      <td className="px-6 py-3 text-slate-600">৳{sub.totalAmount?.toLocaleString()}</td>
                      <td className="px-6 py-3 text-slate-600">৳{sub.paidAmount?.toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${
                          effectiveStatus === 'active' ? 'border-green-200 bg-green-50 text-green-700' :
                          effectiveStatus === 'cancelled' ? 'border-slate-200 bg-slate-50 text-slate-600' :
                          'border-red-200 bg-red-50 text-red-700'
                        }`}>
                          {effectiveStatus === 'active' ? 'Active' : effectiveStatus === 'cancelled' ? 'Cancelled' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Monthly Payment Modal */}
      {showMonthlyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowMonthlyModal(false)} />
          <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-sm w-full mx-4 p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Access Payment</h3>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-[5px] p-4 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Monthly Fee</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">৳{monthlyFee?.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">30 days access</p>
              </div>

              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Payment Method</label>
                <select
                  value={monthlyMethod}
                  onChange={(e) => setMonthlyMethod(e.target.value)}
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                >
                  {['Cash', 'bKash', 'Nagad', 'Bank Transfer'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {member.freeMonthsEndDate && (
                <p className="text-xs text-slate-500">
                  Free months ended: {new Date(member.freeMonthsEndDate).toLocaleDateString()}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMonthlyModal(false)}
                  className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMonthlyPayment}
                  disabled={payingMonthly}
                  className="rounded-[5px] bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50"
                >
                  {payingMonthly ? 'Processing...' : `Pay ৳${monthlyFee?.toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowRenewModal(false)} />
          <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-md w-full mx-4 p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Renew Membership</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Package</label>
                <select
                  value={renewData.packageId}
                  onChange={(e) => setRenewData({ ...renewData, packageId: e.target.value })}
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                >
                  <option value="">Select Package</option>
                  {renewPackages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} - ৳{getEffectivePrice(pkg)} ({pkg.isLifetime ? 'Lifetime' : `${pkg.duration} days`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Payment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['full', 'partial', 'due'].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setRenewData({ ...renewData, paymentType: pt })}
                      className={`rounded-[5px] px-3 py-2 text-xs font-medium transition ${
                        renewData.paymentType === pt
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pt === 'full' ? 'Full' : pt === 'partial' ? 'Partial' : 'Due'}
                    </button>
                  ))}
                </div>
              </div>

              {renewData.paymentType === 'partial' && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Payment Amount (৳)</label>
                  <input
                    type="number"
                    min="1"
                    value={renewData.initialPayment}
                    onChange={(e) => setRenewData({ ...renewData, initialPayment: e.target.value })}
                    className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>
              )}

              {renewData.paymentType !== 'due' && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Payment Method</label>
                  <select
                    value={renewData.paymentMethod}
                    onChange={(e) => setRenewData({ ...renewData, paymentMethod: e.target.value })}
                    className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                  >
                    {['Cash', 'bKash', 'Nagad', 'Bank Transfer'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {renewData.packageId && (
                <div className="bg-slate-50 rounded-[5px] p-3 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span className="font-semibold text-slate-900">৳{getEffectivePrice(renewPackages.find(p => p._id === renewData.packageId))}</span>
                  </div>
                  {renewData.paymentType === 'full' && (
                    <div className="flex justify-between text-green-700">
                      <span>Paying now</span>
                      <span className="font-semibold">৳{getEffectivePrice(renewPackages.find(p => p._id === renewData.packageId))}</span>
                    </div>
                  )}
                  {renewData.paymentType === 'partial' && renewData.initialPayment && (
                    <>
                      <div className="flex justify-between text-green-700">
                        <span>Paying now</span>
                        <span className="font-semibold">৳{renewData.initialPayment}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Due</span>
                        <span className="font-semibold">৳{getEffectivePrice(renewPackages.find(p => p._id === renewData.packageId)) - parseFloat(renewData.initialPayment || 0)}</span>
                      </div>
                    </>
                  )}
                  {renewData.paymentType === 'due' && (
                    <div className="flex justify-between text-orange-600">
                      <span>Due</span>
                      <span className="font-semibold">৳{getEffectivePrice(renewPackages.find(p => p._id === renewData.packageId))}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenew}
                  disabled={renewing || !renewData.packageId}
                  className="rounded-[5px] bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {renewing ? 'Renewing...' : 'Renew Membership'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal
        open={showReceipt}
        onClose={() => { setShowReceipt(false); setReceiptData(null); }}
        type="payment"
        data={receiptData}
      />
    </div>
  );
};

export default MemberDetails;
