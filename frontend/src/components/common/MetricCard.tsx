import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
  color?: 'navy' | 'teal' | 'amber' | 'emerald' | 'rose';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendPositive,
  color = 'navy',
  onClick,
}) => {
  const colorMap = {
    navy: 'text-gov-navy-700 bg-gov-navy-50 border-gov-navy-100',
    teal: 'text-teal-700 bg-teal-50 border-teal-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    rose: 'text-rose-700 bg-rose-50 border-rose-100',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>{icon}</div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center text-xs text-slate-500">
            {trend && (
              <span className={`font-semibold mr-1.5 ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
