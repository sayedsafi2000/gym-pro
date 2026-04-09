import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import IncomeChart from '../components/IncomeChart';

const Dashboard = () => {
  const { showError } = useToast();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchAlerts();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      showError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/dashboard/alerts');
      setAlerts(response.data.data.alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  const { summary, chartData } = stats || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="bg-white border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Overview</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-3">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
              Real-time gym analytics and member management metrics.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 text-sm text-slate-600">
            <div className="rounded-[5px] border border-slate-200 px-4 py-2">Updated just now</div>
            <div className="rounded-[5px] border border-slate-200 px-4 py-2">Live dashboard</div>
          </div>
        </div>
      </section>

      {/* Attendance Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Check-ins Today</p>
          <p className="mt-4 text-4xl font-semibold text-green-600">{summary?.todayCheckIns || 0}</p>
          <p className="mt-2 text-xs text-slate-500">Fingerprint scans</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Present Now</p>
          <p className="mt-4 text-4xl font-semibold text-blue-600">{summary?.currentlyPresent || 0}</p>
          <p className="mt-2 text-xs text-slate-500">Currently in gym</p>
        </div>
      </section>

      {/* Main Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Members */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Total Members</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{summary?.totalMembers || 0}</p>
        </div>

        {/* Active Members */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Active</p>
          <p className="mt-4 text-4xl font-semibold text-green-600">{summary?.activeMembers || 0}</p>
          <p className="mt-2 text-xs text-slate-500">Valid membership</p>
        </div>

        {/* Expiring Members */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Expiring Soon</p>
          <p className="mt-4 text-4xl font-semibold text-yellow-600">{summary?.expiringMembers || 0}</p>
          <p className="mt-2 text-xs text-slate-500">Next 3 days</p>
        </div>

        {/* Expired Members */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Expired</p>
          <p className="mt-4 text-4xl font-semibold text-red-600">{summary?.expiredMembers || 0}</p>
          <p className="mt-2 text-xs text-slate-500">Action needed</p>
        </div>

        {/* Monthly Income */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">This Month</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">৳{summary?.monthlyIncome || 0}</p>
          <p className="mt-2 text-xs text-slate-500">Total income</p>
        </div>

        {/* Total Due */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Total Due</p>
          <p className="mt-4 text-3xl font-semibold text-red-600">৳{summary?.totalDueAmount || 0}</p>
          <p className="mt-2 text-xs text-slate-500">Outstanding payments</p>
        </div>
      </section>

      {/* Product Analytics Section */}
      <section className="space-y-4">
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Store Analytics</h2>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">Product inventory and sales performance</p>
            <a
              href="/store"
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              Manage Store →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Products */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-[5px]">
              <p className="text-sm text-slate-500 uppercase tracking-wide">Total Products</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.totalProducts || 0}</p>
            </div>

            {/* Low Stock Products */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-[5px]">
              <p className="text-sm text-yellow-600 uppercase tracking-wide">Low Stock</p>
              <p className="mt-2 text-2xl font-semibold text-yellow-700">{summary?.lowStockProducts || 0}</p>
              <p className="mt-1 text-xs text-yellow-600">Under 10 units</p>
            </div>

            {/* Out of Stock */}
            <div className="bg-red-50 border border-red-200 p-4 rounded-[5px]">
              <p className="text-sm text-red-600 uppercase tracking-wide">Out of Stock</p>
              <p className="mt-2 text-2xl font-semibold text-red-700">{summary?.outOfStockProducts || 0}</p>
              <p className="mt-1 text-xs text-red-600">Need restocking</p>
            </div>

            {/* Monthly Product Revenue */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-[5px]">
              <p className="text-sm text-green-600 uppercase tracking-wide">Monthly Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-green-700">৳{summary?.monthlyProductRevenue || 0}</p>
              <p className="mt-1 text-xs text-green-600">Store sales</p>
            </div>
          </div>

          {/* Product Sales Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-[5px]">
              <p className="text-sm text-blue-600 uppercase tracking-wide">Today Sold</p>
              <p className="mt-2 text-xl font-semibold text-blue-700">{summary?.todayProductSold || 0}</p>
              <p className="mt-1 text-xs text-blue-600">Units sold today</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 p-4 rounded-[5px]">
              <p className="text-sm text-purple-600 uppercase tracking-wide">Monthly Sold</p>
              <p className="mt-2 text-xl font-semibold text-purple-700">{summary?.monthlyProductSold || 0}</p>
              <p className="mt-1 text-xs text-purple-600">Units this month</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-[5px]">
              <p className="text-sm text-indigo-600 uppercase tracking-wide">Total Revenue</p>
              <p className="mt-2 text-xl font-semibold text-indigo-700">৳{summary?.totalProductRevenue || 0}</p>
              <p className="mt-1 text-xs text-indigo-600">All time sales</p>
            </div>
          </div>
        </div>
      </section>

      {/* Income Charts Section */}
      <section className="space-y-4">
        <IncomeChart data={chartData?.dailyIncome} monthlyIncome={summary?.monthlyIncome} />
      </section>

      {/* Alerts + Member Status */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
            <span className="text-xs text-slate-500 uppercase tracking-[0.2em]">Action needed</span>
          </div>
          {alerts.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-[5px] px-4 py-6 text-center">
              <p className="text-sm font-medium text-green-700">All clear</p>
              <p className="text-xs text-green-600 mt-1">No alerts right now</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <a
                  key={i}
                  href={alert.link}
                  className={`flex items-center justify-between rounded-[5px] border px-4 py-3 text-sm font-medium transition hover:opacity-80 ${
                    alert.severity === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                  }`}
                >
                  <span>{alert.message}</span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] ${
                    alert.severity === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {alert.count}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Member Status</h2>
            <span className="text-xs text-slate-500 uppercase tracking-[0.2em]">Breakdown</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Active</span>
              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-green-200 bg-green-50 text-green-700">
                {summary?.activeMembers || 0} members
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Expiring Soon</span>
              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-yellow-200 bg-yellow-50 text-yellow-700">
                {summary?.expiringMembers || 0} members
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Expired</span>
              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-red-200 bg-red-50 text-red-700">
                {summary?.expiredMembers || 0} members
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;