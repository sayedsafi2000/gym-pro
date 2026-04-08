import React, { useEffect, useState } from 'react';
import api from '../services/api';
import IncomeChart from '../components/IncomeChart';

const Dashboard = () => {
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

      {/* Main Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <p className="mt-4 text-3xl font-semibold text-slate-900">${summary?.monthlyIncome || 0}</p>
          <p className="mt-2 text-xs text-slate-500">Total income</p>
        </div>

        {/* Total Due */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Total Due</p>
          <p className="mt-4 text-3xl font-semibold text-red-600">${summary?.totalDueAmount || 0}</p>
          <p className="mt-2 text-xs text-slate-500">Outstanding payments</p>
        </div>
      </section>

      {/* Income Charts Section */}
      <section className="space-y-4">
        <IncomeChart data={chartData?.dailyIncome} monthlyIncome={summary?.monthlyIncome} />
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
            <span className="text-xs text-slate-500 uppercase tracking-[0.2em]">Navigate</span>
          </div>
          <div className="grid gap-3">
            <a href="/members/add" className="w-full text-left rounded-[5px] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50">
              + Add Member
            </a>
            <a href="/packages" className="w-full text-left rounded-[5px] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50">
              📦 Manage Packages
            </a>
            <a href="/payments" className="w-full text-left rounded-[5px] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50">
              💳 Record Payment
            </a>
          </div>
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