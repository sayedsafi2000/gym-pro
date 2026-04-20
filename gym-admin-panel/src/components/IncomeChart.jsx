import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

const BRAND = '#6366f1';
const ACCENT = '#10b981';

const IncomeChart = ({ data, monthlyIncome }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const axisStroke = isDark ? '#64748b' : '#94a3b8';
  const tickFill = isDark ? '#94a3b8' : '#64748b';

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 dark:text-slate-400">No payment data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    date: item._id,
    income: item.total,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-control border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
          <p className="font-medium">{payload[0].payload.date}</p>
          <p className="text-accent-400">৳{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const avgIncome = monthlyIncome ? (monthlyIncome / 30).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-card border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total (30 Days)
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            ৳{monthlyIncome || 0}
          </p>
        </div>
        <div className="rounded-card border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Daily Average
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            ৳{avgIncome}
          </p>
        </div>
        <div className="rounded-card border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Days Recorded
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {data.length}
          </p>
        </div>
      </div>

      <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Income Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND} stopOpacity={0.3} />
                <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="date"
              stroke={axisStroke}
              style={{ fontSize: '12px' }}
              tick={{ fill: tickFill }}
            />
            <YAxis
              stroke={axisStroke}
              style={{ fontSize: '12px' }}
              tick={{ fill: tickFill }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: BRAND, strokeWidth: 1 }} />
            <Legend wrapperStyle={{ paddingTop: '20px', color: tickFill }} iconType="line" />
            <Line
              type="monotone"
              dataKey="income"
              name="Daily Income"
              stroke={BRAND}
              strokeWidth={2}
              dot={{ fill: BRAND, r: 4 }}
              activeDot={{ r: 6 }}
              fill="url(#colorIncome)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Daily Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="date"
              stroke={axisStroke}
              style={{ fontSize: '12px' }}
              tick={{ fill: tickFill }}
            />
            <YAxis
              stroke={axisStroke}
              style={{ fontSize: '12px' }}
              tick={{ fill: tickFill }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.08)' }}
            />
            <Bar dataKey="income" name="Income" fill={BRAND} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default IncomeChart;
