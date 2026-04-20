import React, { useEffect, useState } from 'react';
import {
  Fingerprint,
  UserCheck,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserPlus,
  Wallet,
  AlertTriangle,
  RefreshCw,
  Package as PackageIcon,
  PackageX,
  TrendingUp,
  ShoppingBag,
  BarChart3,
} from 'lucide-react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import IncomeChart from '../components/IncomeChart';
import { isSuperAdmin, hasPermission } from '../utils/auth';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';

const DashboardSkeleton = () => (
  <div className="space-y-8">
    <Skeleton className="h-28 w-full" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);

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

  if (loading) return <DashboardSkeleton />;

  const { summary, chartData } = stats || {};
  const formatTk = (n) => `৳${(n || 0).toLocaleString()}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Overview
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Real-time gym analytics and member management metrics.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Badge variant="neutral">Updated just now</Badge>
            <Badge variant="success">Live</Badge>
          </div>
        </div>
      </Card>

      {/* Attendance */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Check-ins Today"
          value={summary?.todayCheckIns || 0}
          hint="Fingerprint scans"
          icon={<Fingerprint className="w-5 h-5" />}
          accent="success"
          to="/attendance"
        />
        <StatCard
          label="Present Now"
          value={summary?.currentlyPresent || 0}
          hint="Currently in gym"
          icon={<UserCheck className="w-5 h-5" />}
          accent="brand"
          to="/attendance"
        />
      </section>

      {/* Main stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Members"
          value={summary?.totalMembers || 0}
          icon={<Users className="w-5 h-5" />}
          accent="neutral"
          to="/members"
        />
        <StatCard
          label="Active"
          value={summary?.activeMembers || 0}
          hint="Valid membership"
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="success"
          to="/members?status=active"
        />
        <StatCard
          label="Expiring Soon"
          value={summary?.expiringMembers || 0}
          hint="Next 7 days"
          icon={<Clock className="w-5 h-5" />}
          accent="warning"
          to="/members?status=expiring"
        />
        <StatCard
          label="Expired"
          value={summary?.expiredMembers || 0}
          hint="Action needed"
          icon={<AlertCircle className="w-5 h-5" />}
          accent="danger"
          to="/members?status=expired"
        />

        {isSuperAdmin() && (summary?.pendingMembers || 0) > 0 && (
          <StatCard
            label="Pending Approval"
            value={summary?.pendingMembers || 0}
            hint="Awaiting approval"
            icon={<UserPlus className="w-5 h-5" />}
            accent="warning"
            to="/members?tab=pending"
          />
        )}

        {hasPermission('canViewIncome') && (
          <StatCard
            label="This Month"
            value={formatTk(summary?.monthlyIncome)}
            hint="Total income"
            icon={<Wallet className="w-5 h-5" />}
            accent="brand"
            to="/payments"
          />
        )}

        {hasPermission('canViewIncome') && (
          <StatCard
            label="Total Due"
            value={formatTk(summary?.totalDueAmount)}
            hint="Outstanding payments"
            icon={<AlertTriangle className="w-5 h-5" />}
            accent="danger"
            to="/payments"
          />
        )}

        {(summary?.needsMonthlyRenewal || 0) > 0 && (
          <StatCard
            label="Needs Monthly Payment"
            value={summary?.needsMonthlyRenewal || 0}
            hint="Lifetime members with expired access"
            icon={<RefreshCw className="w-5 h-5" />}
            accent="warning"
            to="/members?status=expired"
          />
        )}
      </section>

      {/* Store analytics */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Store Analytics
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Product inventory and sales performance
            </p>
          </div>
          <a
            href="/store"
            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Manage Store →
          </a>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Products"
            value={summary?.totalProducts || 0}
            icon={<PackageIcon className="w-5 h-5" />}
            accent="neutral"
          />
          <StatCard
            label="Low Stock"
            value={summary?.lowStockProducts || 0}
            hint="Under 10 units"
            icon={<AlertTriangle className="w-5 h-5" />}
            accent="warning"
          />
          <StatCard
            label="Out of Stock"
            value={summary?.outOfStockProducts || 0}
            hint="Need restocking"
            icon={<PackageX className="w-5 h-5" />}
            accent="danger"
          />
          <StatCard
            label="Monthly Revenue"
            value={formatTk(summary?.monthlyProductRevenue)}
            hint="Store sales"
            icon={<TrendingUp className="w-5 h-5" />}
            accent="success"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Today Sold"
            value={summary?.todayProductSold || 0}
            hint="Units sold today"
            icon={<ShoppingBag className="w-5 h-5" />}
            accent="brand"
          />
          <StatCard
            label="Monthly Sold"
            value={summary?.monthlyProductSold || 0}
            hint="Units this month"
            icon={<BarChart3 className="w-5 h-5" />}
            accent="info"
          />
          <StatCard
            label="Total Revenue"
            value={formatTk(summary?.totalProductRevenue)}
            hint="All time sales"
            icon={<TrendingUp className="w-5 h-5" />}
            accent="success"
          />
        </div>
      </Card>

      {/* Income charts — super admin only */}
      {hasPermission('canViewAnalytics') && (
        <section className="space-y-4">
          <IncomeChart data={chartData?.dailyIncome} monthlyIncome={summary?.monthlyIncome} />
        </section>
      )}
    </div>
  );
};

export default Dashboard;
