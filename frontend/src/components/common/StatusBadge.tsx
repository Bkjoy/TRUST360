import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'validity' | 'administrative' | 'verification' | 'severity';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'validity' }) => {
  const getBadgeStyle = (s: string) => {
    switch (s) {
      // Validity
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EXPIRING_SOON':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'MATURED':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'OVERDUE':
        return 'bg-red-50 text-red-700 border-red-200 font-semibold';
      case 'RENEWED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RELEASED':
        return 'bg-purple-50 text-purple-700 border-purple-200';

      // Administrative
      case 'SUBMITTED':
      case 'PENDING_SCRUTINY':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'VERIFIED':
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CLARIFICATION_REQUIRED':
      case 'CLARIFICATION_REQUESTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RELEASE_REQUESTED':
      case 'PENDING_APPROVAL':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';

      // Verification & CBS
      case 'BANK_CONFIRMED':
      case 'CBS_VERIFIED':
        return 'bg-teal-50 text-teal-800 border-teal-300 font-medium';
      case 'OFFICER_VERIFIED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'AI_EXTRACTED':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'DISCREPANCY_DETECTED':
      case 'CBS_DISCREPANCY':
      case 'DISCREPANCY':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      case 'CBS_NOT_FOUND':
      case 'NOT_FOUND':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      case 'CBS_MANUAL_REVIEW':
      case 'MANUAL_REVIEW':
        return 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
      case 'INSTITUTION_SUBMITTED':
        return 'bg-slate-100 text-slate-700 border-slate-300';

      // Severity
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';

      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatText = (txt: string) => {
    return txt.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border tracking-wide uppercase ${getBadgeStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {formatText(status)}
    </span>
  );
};
