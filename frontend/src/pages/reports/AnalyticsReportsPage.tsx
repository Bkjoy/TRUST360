import React, { useEffect, useState } from 'react';
import { Download, BarChart2, PieChart as PieIcon, TrendingUp, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { api, API_BASE_URL } from '../../services/api';

const COLORS = ['#0D9488', '#F59E0B', '#EF4444', '#6366F1', '#3B82F6', '#8B5CF6'];

export const AnalyticsReportsPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/reports/analytics');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleExportCsv = () => {
    window.open(`${API_BASE_URL}/reports/export-csv`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">GovTech Analytics & Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial analytics, bank risk concentration, and chronological maturity forecasts.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Master CSV Report</span>
        </button>
      </div>

      {/* Grid of Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Submission Trends */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gov-navy-700" />
            <span>Monthly Deposit Submissions Trend</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.monthly_trends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#1E3A8A"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#1E3A8A' }}
                  name="Submissions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bank Concentration */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-teal-600" />
            <span>Deposit Exposure by Commercial Bank</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.bank_distribution || []}>
                <XAxis dataKey="bank_name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val: any) => [`₹${(Number(val) / 100000).toFixed(2)} Lakhs`, 'Amount']} />
                <Bar dataKey="amount" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Maturity Horizon Forecasting */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-600" />
          <span>Chronological Maturity Forecast Horizon</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Anticipate forthcoming liquidity events and renewal rollover requirements.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <span className="text-[11px] font-bold uppercase text-amber-800">Within 30 Days</span>
            <div className="text-2xl font-black text-amber-900 mt-1">
              {stats?.maturity_horizon?.within_30_days ?? 0}
            </div>
            <span className="text-[10px] text-amber-700">Immediate Action Required</span>
          </div>

          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 text-center">
            <span className="text-[11px] font-bold uppercase text-yellow-800">Within 60 Days</span>
            <div className="text-2xl font-black text-yellow-900 mt-1">
              {stats?.maturity_horizon?.within_60_days ?? 0}
            </div>
            <span className="text-[10px] text-yellow-700">Notice Dispatched</span>
          </div>

          <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 text-center">
            <span className="text-[11px] font-bold uppercase text-sky-800">Within 90 Days</span>
            <div className="text-2xl font-black text-sky-900 mt-1">
              {stats?.maturity_horizon?.within_90_days ?? 0}
            </div>
            <span className="text-[10px] text-sky-700">Upcoming Rollover</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-700">Beyond 1 Year</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stats?.maturity_horizon?.beyond_1_year ?? 0}
            </div>
            <span className="text-[10px] text-slate-500">Under Lock-in</span>
          </div>
        </div>
      </div>
    </div>
  );
};
