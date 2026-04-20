import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useToast from '../hooks/useToast';
import IncomeChart from '../components/IncomeChart';
import { isSuperAdmin, hasPermission } from '../utils/auth';

const Dashboard = () => {
  const { showError } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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
      <section className="bg-white border border-slate-200 p-8 shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Overview</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-3 dark:text-slate-100">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl dark:text-slate-400">
              Real-time gym analytics and member management metrics.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="rounded-[5px] border border-slate-200 px-4 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">Updated just now</div>
            <div className="rounded-[5px] border border-slate-200 px-4 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">Live dashboard</div>
          </div>
        </div>
      </section>

      {/* Attendance Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/attendance" className="bg-white border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition cursor-pointer block dark:bg-slate-900 dark:border-slate-700">
          <p className="text-sm text-slate-500 uppercase tracking-wide dark:text-slate-400">Check-ins Today</p>
          <p className="mt-4 text-4xl font-semibold text-green-600 dark:text-green-400">{summary?.todayCheckIns || 0}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Fingerprint scans</p>
        </Link>
        <Link to="/attendance" className="bg-white border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition cursor-pointer block dark:bg-slate-900 dark:border-slate-700">
          <p className="text-sm text-slate-500 uppercase tracking-wide dark:text-slate-400">Present Now</p>
          <p className="mt-4 text-4xl font-semibold text-blue-600 dark:text-blue-400">{summary?.currentlyPresent || 0}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Currently in gym</p>
        </Link>
      </section>

      {/* Main Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/members" className="bg-white border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition cursor-pointer block dark:bg-slate-900 dark:border-slate-700">
          <p className="text-sm text-slate-500 uppercase tracking-wide dark:text-slate-400">Total Members</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900 dark:text-slate-100">{summary?.totalMembers || 0}</p>
        </Link>

        <Link to="/members?status=active" className="bg-white border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition cursor-pointer block dark:bg-slate-900 dark:border-slate-700">
          <p className="text-sm text-slate-500 uppercase tracking-wide dark:text-slate-400">Active</p>
          <p className="mt-4 text-4xl font-semibold text-green-600 dark:text-green-400">{summary?.activeMembers || 0}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Valid membership</p>
        </Link>

        <Link to="/members?status=expiring" className="bg-white border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition cursor-pointer block dark:bg-slate-900 dark:border-slate-700">
          <p className="text-sm text-slate-500 uppercase tracking-wide dark:text-slate-400">Expiring Soon</p>
          <p className="mt-4 text-4xl font-semibold text-yellow-600 dark:text-yellow-400">{summary?.expiringMembers || 0}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Next 7 days</p>
        </Link>

        <Link to="/members?status=expired" className="bg-white border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition cursor-pointer block dark:bg-slate-900 dark:border-slate-700">
          <p className="text-sm text-slate-500 uppercase tracking-wide dark:text-slate-400">Expired</p>
          <p className="mt-4 text-4xl font-semibold text-red-600 dark:text-red-400">{summary?.expiredMembers || 0}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Action needed</p>
        </Link>

        {isSuperAdmin() && (summary?.pendingMembers || 0) > 0 && (
        <Link to="/members?tab=pending" className="bg-white border border-orange-200 dark:border-orange-800/60 p-6 shadow-sm hover:border-orange-300 transition cursor-pointer block dark:bg-slate-900">
          <p className="text-sm text-orange-500 uppercase tracking-wide">Pending Approval</p>
          <p className="mt-4 text-4xl font-semibold text-orange-600 dark:text-orange-400">{summary?.pendingMembers || 0}</p>
          <p className="mt-2 text-xs text-orange-500">Awaiting approval</p>
        </Link>
        )}

        {hasPermission('canViewIncome') && (
        <Link to="/payments" className="bg-white border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition cursor-pointer block dark:bg-slate-900 dark:border-slate-700">
          <p className="text-sm text-slate-500 uppercase tracking-wide dark:text-slate-400">This Month</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">৳{summary?.monthlyIncome || 0}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total income</p>
        </Link>
        )}

        {hasPermission('canViewIncome') && (
        <Link to="/payments" className="bg-white border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition cursor-pointer block dark:bg-slate-900 dark:border-slate-700">
          <p className="text-sm text-slate-500 uppercase tracking-wide dark:text-slate-400">Total Due</p>
          <p className="mt-4 text-3xl font-semibold text-red-600 dark:text-red-400">৳{summary?.totalDueAmount || 0}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Outstanding payments</p>
        </Link>
        )}
        {(summary?.needsMonthlyRenewal || 0) > 0 && (
        <Link to="/members?status=expired" className="bg-white border border-purple-200 dark:border-purple-800/60 p-6 shadow-sm hover:border-purple-300 transition cursor-pointer block dark:bg-slate-900">
          <p className="text-sm text-purple-500 uppercase tracking-wide">Needs Monthly Payment</p>
          <p className="mt-4 text-4xl font-semibold text-purple-600 dark:text-purple-400">{summary?.needsMonthlyRenewal || 0}</p>
          <p className="mt-2 text-xs text-purple-500">Lifetime members with expired access</p>
        </Link>
        )}
      </section>

      {/* Product Analytics Section */}
      <section className="space-y-4">
        <div className="bg-white border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 mb-4 dark:text-slate-100">Store Analytics</h2>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Product inventory and sales performance</p>
            <a
              href="/store"
              className="text-sm text-slate-600 hover:text-slate-900 underline dark:text-slate-400"
            >
              Manage Store →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Products */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-[5px] dark:bg-slate-950 dark:border-slate-700">
              <p className="text-sm text-slate-500 uppercase tracking-wide dark:text-slate-400">Total Products</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{summary?.totalProducts || 0}</p>
            </div>

            {/* Low Stock Products */}
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/60 p-4 rounded-[5px]">
              <p className="text-sm text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Low Stock</p>
              <p className="mt-2 text-2xl font-semibold text-yellow-700 dark:text-yellow-300">{summary?.lowStockProducts || 0}</p>
              <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">Under 10 units</p>
            </div>

            {/* Out of Stock */}
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/60 p-4 rounded-[5px]">
              <p className="text-sm text-red-600 dark:text-red-400 uppercase tracking-wide">Out of Stock</p>
              <p className="mt-2 text-2xl font-semibold text-red-700 dark:text-red-300">{summary?.outOfStockProducts || 0}</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Need restocking</p>
            </div>

            {/* Monthly Product Revenue */}
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/60 p-4 rounded-[5px]">
              <p className="text-sm text-green-600 dark:text-green-400 uppercase tracking-wide">Monthly Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-green-700 dark:text-green-300">৳{summary?.monthlyProductRevenue || 0}</p>
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">Store sales</p>
            </div>
          </div>

          {/* Product Sales Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 p-4 rounded-[5px]">
              <p className="text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wide">Today Sold</p>
              <p className="mt-2 text-xl font-semibold text-blue-700 dark:text-blue-300">{summary?.todayProductSold || 0}</p>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Units sold today</p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/60 p-4 rounded-[5px]">
              <p className="text-sm text-purple-600 dark:text-purple-400 uppercase tracking-wide">Monthly Sold</p>
              <p className="mt-2 text-xl font-semibold text-purple-700 dark:text-purple-300">{summary?.monthlyProductSold || 0}</p>
              <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">Units this month</p>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/60 p-4 rounded-[5px]">
              <p className="text-sm text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Total Revenue</p>
              <p className="mt-2 text-xl font-semibold text-indigo-700 dark:text-indigo-300">৳{summary?.totalProductRevenue || 0}</p>
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">All time sales</p>
            </div>
          </div>
        </div>
      </section>

      {/* Income Charts Section — super admin only */}
      {hasPermission('canViewAnalytics') && (
      <section className="space-y-4">
        <IncomeChart data={chartData?.dailyIncome} monthlyIncome={summary?.monthlyIncome} />
      </section>
      )}

    </div>
  );
};

export default Dashboard;