import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import useToast from '../hooks/useToast';
import AttendanceCalendar from '../components/AttendanceCalendar';
import ReceiptModal from '../components/ReceiptModal';

const MemberDetails = () => {
  const { id } = useParams();
  const { showError } = useToast();
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

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (member) {
      fetchCalendar();
    }
  }, [calendarMonth, member]);

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

  const getStatusColor = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    if (expiry < now) return 'border-red-200 bg-red-50 text-red-700';
    if (expiry <= threeDaysLater) return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    return 'border-green-200 bg-green-50 text-green-700';
  };

  const getStatusText = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
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
  const joinDate = new Date(member.joinDate);
  const expiryDate = new Date(member.expiryDate);
  const totalDays = Math.max(1, Math.ceil((expiryDate - joinDate) / (1000 * 60 * 60 * 24)));
  const elapsed = Math.ceil((new Date() - joinDate) / (1000 * 60 * 60 * 24));
  const progressPct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
  const daysRemaining = Math.max(0, totalDays - elapsed);

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
            </div>
            {stats?.lastVisit && (
              <p className="mt-2 text-sm text-slate-500">
                Last visit: {timeAgo(stats.lastVisit)} ({new Date(stats.lastVisit).toLocaleDateString()})
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
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
              <p className="text-sm font-medium text-slate-900 mt-0.5">{expiryDate.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Package</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {member.packageId?.name} ({member.packageId?.duration}d)
              </p>
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
                    <td className="px-6 py-3 text-slate-900">{p.packageId?.name || '-'}</td>
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
                          : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                      }`}>
                        {p.paymentType === 'full' ? 'Full' : 'Partial'}
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
