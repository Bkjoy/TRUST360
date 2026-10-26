import React from 'react';
import { Clock } from 'lucide-react';

interface MaturityCountdownProps {
  days?: number;
  maturityDate: string;
}

export const MaturityCountdown: React.FC<MaturityCountdownProps> = ({ days, maturityDate }) => {
  if (days === undefined || days === null) {
    const today = new Date();
    const mat = new Date(maturityDate);
    const diffTime = mat.getTime() - today.getTime();
    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  let style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let label = `${days} Days Remaining`;

  if (days > 90) {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    label = `${days} Days Remaining`;
  } else if (days > 0 && days <= 90) {
    style = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold animate-pulse';
    label = `Matures in ${days} Days`;
  } else if (days === 0) {
    style = 'bg-orange-100 text-orange-900 border-orange-300 font-bold';
    label = 'Matures Today';
  } else {
    style = 'bg-red-100 text-red-900 border-red-300 font-bold';
    label = `${Math.abs(days)} Days Overdue`;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${style}`}>
      <Clock className="w-3.5 h-3.5" />
      <span>{label}</span>
      <span className="text-[10px] opacity-75">({maturityDate})</span>
    </div>
  );
};
