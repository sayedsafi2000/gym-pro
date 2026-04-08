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

const IncomeChart = ({ data, monthlyIncome }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">No payment data available</p>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map(item => ({
    date: item._id,
    income: item.total,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-[5px] text-sm border border-slate-700">
          <p className="font-medium">{payload[0].payload.date}</p>
          <p className="text-green-400">৳{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const avgIncome = monthlyIncome ? (monthlyIncome / 30).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total (30 Days)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">৳{monthlyIncome || 0}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Daily Average</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">৳{avgIncome}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Days Recorded</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data.length}</p>
        </div>
      </div>

      {/* Line Chart */}
      <div className="bg-white border border-slate-200 rounded-[5px] p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Income Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#64748b' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#64748b' }}
              label={{ value: '$', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="income" 
              name="Daily Income"
              stroke="#0f172a" 
              strokeWidth={2}
              dot={{ fill: '#0f172a', r: 4 }}
              activeDot={{ r: 6 }}
              fill="url(#colorIncome)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-[5px] p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#64748b' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#64748b' }}
              label={{ value: '$', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="income" 
              name="Income"
              fill="#0f172a" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default IncomeChart;
