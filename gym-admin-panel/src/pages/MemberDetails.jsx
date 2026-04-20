import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Check } from 'lucide-react';
import api from '../services/api';
import { getErrorMessage } from '../services/errorHandler';
import useToast from '../hooks/useToast';
import AttendanceCalendar from '../components/AttendanceCalendar';
import ReceiptModal from '../components/ReceiptModal';
import RenewMembershipModal from '../components/member/RenewMembershipModal';
import MonthlyPaymentModal from '../components/member/MonthlyPaymentModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

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

const getMembershipStatus = (expiryDate) => {
  if (!expiryDate) return { label: 'Lifetime', variant: 'info' };
  const now = new Date();
  const expiry = new Date(expiryDate);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (expiry < now) return { label: 'Expired', variant: 'danger' };
  if (expiry <= sevenDaysLater) return { label: 'Expiring Soon', variant: 'warning' };
  return { label: 'Active', variant: 'success' };
};

const getPaymentTypeBadge = (type) => {
  if (type === 'full') return { label: 'Full', variant: 'success' };
  if (type === 'monthly' || type === 'monthly_renewal') return { label: 'Monthly', variant: 'brand' };
  return { label: 'Partial', variant: 'warning' };
};

const getSubscriptionBadge = (status) => {
  if (status === 'active') return { label: 'Active', variant: 'success' };
  if (status === 'cancelled') return { label: 'Cancelled', variant: 'neutral' };
  return { label: 'Expired', variant: 'danger' };
};

const getInstallmentBadge = (status) => {
  if (status === 'completed') return { label: 'Completed', variant: 'success' };
  if (status === 'overdue') return { label: 'Overdue', variant: 'danger' };
  return { label: 'Active', variant: 'info' };
};

const getScheduleBadge = (status) => {
  if (status === 'paid') return { label: 'Paid', variant: 'success' };
  if (status === 'overdue') return { label: 'Overdue', variant: 'danger' };
  return { label: 'Pending', variant: 'warning' };
};

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
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

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
      showError(getErrorMessage(error, 'Failed to record attendance.'));
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
        `/attendance/member/${id}/calendar?year=${calendarMonth.year}&month=${calendarMonth.month}`,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Member not found</h2>
        <Link to="/members" className="mt-2 inline-block text-sm text-brand-600 hover:underline dark:text-brand-400">
          Back to Members
        </Link>
      </div>
    );
  }

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
    if (progressPct >= 90) return 'bg-amber-500';
    return 'bg-accent-500';
  };

  const status = getMembershipStatus(member.expiryDate);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-control border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">
        <p className="font-medium">{label}</p>
        <p className="text-accent-400">{payload[0].value} visits</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Link
              to="/members"
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition dark:text-slate-400"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Members
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {member.name}
              </h1>
              <Badge variant="neutral">{member.memberId}</Badge>
              <Badge variant={status.variant}>{status.label}</Badge>
              {member.hasLifetimeMembership && <Badge variant="info">Lifetime Member</Badge>}
            </div>
            {stats?.lastVisit && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Last visit: {timeAgo(stats.lastVisit)} (
                {new Date(stats.lastVisit).toLocaleDateString()})
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {member.expiryDate && new Date(member.expiryDate) < new Date() ? (
              member.hasLifetimeMembership ? (
                <Button variant="success" onClick={() => setShowMonthlyModal(true)}>
                  Pay Monthly
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setShowRenewModal(true)}>
                  Renew Membership
                </Button>
              )
            ) : (
              <Button
                variant={memberStatus?.checkedIn ? 'danger' : 'success'}
                onClick={handleManualCheckin}
                loading={checkingIn}
              >
                {memberStatus?.checkedIn ? 'Check Out' : 'Check In'}
              </Button>
            )}
            <Button variant="secondary" to={`/members/${id}/edit`}>
              Edit Member
            </Button>
            <Button variant="secondary" to="/payments">
              Record Payment
            </Button>
            {!member.deviceUserId && (
              <Button variant="warning" to={`/members/${id}/edit`}>
                Register Fingerprint
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Info + Financial */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="md" className="lg:col-span-2">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Personal Information
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <InfoField label="Phone" value={member.phone} />
            <InfoField label="Emergency Phone" value={member.emergencyPhone || '-'} />
            <InfoField label="Gender" value={member.gender} />
            <InfoField label="Address" value={member.address || '-'} />
            <InfoField label="Join Date" value={joinDate.toLocaleDateString()} />
            <InfoField
              label="Expiry Date"
              value={
                member.expiryDate
                  ? new Date(member.expiryDate).toLocaleDateString()
                  : 'Lifetime (No Expiry)'
              }
            />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Package</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                {member.packageId?.name} ({member.packageId?.duration}d)
              </p>
              {member.packageId?.description && (
                <p className="mt-0.5 text-xs text-slate-400">{member.packageId.description}</p>
              )}
              {member.packageId?.benefits && member.packageId.benefits.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {member.packageId.benefits.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
                    >
                      <Check className="w-3 h-3 shrink-0 text-accent-500" />
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fingerprint</p>
              <p className="mt-0.5 text-sm font-medium">
                {member.deviceUserId ? (
                  <span className="text-accent-700 dark:text-accent-300">
                    Registered (ID: {member.deviceUserId})
                  </span>
                ) : (
                  <span className="text-slate-400">Not registered</span>
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Financial
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                ৳{member.totalAmount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Paid</span>
              <span className="text-sm font-semibold text-accent-600 dark:text-accent-400">
                ৳{member.paidAmount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Due</span>
              <span
                className={`text-sm font-semibold ${
                  member.dueAmount > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-accent-600 dark:text-accent-400'
                }`}
              >
                ৳{member.dueAmount}
              </span>
            </div>
          </div>

          {member.expiryDate && (
            <div className="mt-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Membership Progress
              </h2>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${progressColor()}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {elapsed} of {totalDays} days
                </span>
                <span
                  className={
                    daysRemaining === 0 ? 'font-semibold text-red-600 dark:text-red-400' : ''
                  }
                >
                  {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                </span>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Attendance Stats */}
      {stats && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <AttendanceStat label="Total Visits" value={stats.totalVisits} />
          <AttendanceStat label="This Month" value={stats.thisMonthVisits} color="brand" />
          <AttendanceStat label="Avg / Week" value={stats.avgPerWeek} />
          <AttendanceStat label="Avg Session" value={formatDuration(stats.avgSessionMinutes)} />
          <AttendanceStat label="Streak" value={`${stats.currentStreak}d`} color="warning" />
          <AttendanceStat label="Attendance" value={`${stats.attendanceRate}%`} color="success" />
        </section>
      )}

      {/* Calendar + Chart */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
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

        <Card padding="md" className="lg:col-span-2">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Weekly Visit Trend
          </h3>
          {stats?.weeklyTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.weeklyTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid, #e2e8f0)"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  stroke="var(--chart-axis, #94a3b8)"
                  tick={{ fontSize: 11, fill: 'var(--chart-tick, #64748b)' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--chart-axis, #94a3b8)"
                  tick={{ fontSize: 11, fill: 'var(--chart-tick, #64748b)' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                />
                <Bar dataKey="visits" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              No visit data yet
            </div>
          )}
        </Card>
      </section>

      {/* Installment Plan */}
      {installment && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Installment Plan
            </h3>
            <Badge variant={getInstallmentBadge(installment.status).variant}>
              {getInstallmentBadge(installment.status).label}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-6 bg-slate-50 px-6 py-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
            <span>Total: ৳{installment.totalAmount?.toLocaleString()}</span>
            <span>Monthly: ৳{installment.monthlyAmount?.toLocaleString()}</span>
            <span>
              Paid: {installment.paidInstallments}/{installment.totalInstallments} months
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 text-left">Month</th>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Due Date</th>
                  <th className="px-6 py-3 text-left">Paid Date</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {installment.schedule?.map((s) => {
                  const badge = getScheduleBadge(s.status);
                  return (
                    <tr
                      key={s.month}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">
                        Month {s.month}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        ৳{s.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {new Date(s.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {s.paidDate ? new Date(s.paidDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Payment History */}
      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Payment History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Package</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Discount</th>
                <th className="px-6 py-3 text-left">Final</th>
                <th className="px-6 py-3 text-left">Method</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No payments recorded.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const badge = getPaymentTypeBadge(p.paymentType);
                  return (
                    <tr
                      key={p._id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {new Date(p.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-slate-900 dark:text-slate-100">
                        {p.paymentType === 'monthly_renewal' || p.paymentType === 'monthly'
                          ? 'Monthly Access'
                          : p.packageId?.name || '-'}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        ৳{p.originalAmount}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {p.discountAmount > 0
                          ? `${p.discountAmount}${p.discountType === 'percentage' ? '%' : '৳'}`
                          : '-'}
                      </td>
                      <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        ৳{p.finalAmount}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {p.paymentMethod}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewReceipt(p._id)}
                        >
                          Receipt
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Subscription History */}
      {subscriptions.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Subscription History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 text-left">Package</th>
                  <th className="px-6 py-3 text-left">Start</th>
                  <th className="px-6 py-3 text-left">End</th>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Paid</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
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
                  const badge = getSubscriptionBadge(effectiveStatus);
                  return (
                    <tr
                      key={sub._id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {packageLabel}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {new Date(sub.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'Lifetime'}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        ৳{sub.totalAmount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        ৳{sub.paidAmount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <MonthlyPaymentModal
        open={showMonthlyModal}
        onClose={() => setShowMonthlyModal(false)}
        member={member}
        onSuccess={() => {
          fetchData();
          fetchStatus();
        }}
      />

      <RenewMembershipModal
        open={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        member={member}
        onSuccess={() => {
          fetchData();
          fetchStatus();
        }}
      />

      <ReceiptModal
        open={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          setReceiptData(null);
        }}
        type="payment"
        data={receiptData}
      />
    </div>
  );
};

const InfoField = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
  </div>
);

const STAT_COLORS = {
  neutral: 'text-slate-900 dark:text-slate-100',
  brand: 'text-brand-600 dark:text-brand-400',
  success: 'text-accent-600 dark:text-accent-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

const AttendanceStat = ({ label, value, color = 'neutral' }) => (
  <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    <p className={`mt-2 text-3xl font-semibold tabular-nums ${STAT_COLORS[color]}`}>{value}</p>
  </div>
);

export default MemberDetails;
