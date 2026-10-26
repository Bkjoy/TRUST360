import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Landmark,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  HandCoins,
  BarChart3,
  ShieldAlert,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TrustLogo } from '../common/TrustLogo';
import { AIAssistantLogo } from '../common/AIAssistantLogo';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER', 'APPROVING_AUTHORITY', 'INSTITUTION_ADMIN'],
    },
    {
      label: 'Institutions',
      path: '/institutions',
      icon: <Landmark className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER', 'APPROVING_AUTHORITY'],
    },
    {
      label: 'FDR Repository',
      path: '/fdrs',
      icon: <FileText className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER', 'APPROVING_AUTHORITY', 'INSTITUTION_ADMIN'],
    },
    {
      label: 'Verification Queue',
      path: '/verification',
      icon: <CheckCircle2 className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER'],
    },
    {
      label: 'Discrepancies',
      path: '/discrepancies',
      icon: <AlertTriangle className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER', 'INSTITUTION_ADMIN'],
    },
    {
      label: 'Renewals',
      path: '/renewals',
      icon: <RotateCcw className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER', 'INSTITUTION_ADMIN'],
    },
    {
      label: 'Release Requests',
      path: '/releases',
      icon: <HandCoins className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER', 'APPROVING_AUTHORITY', 'INSTITUTION_ADMIN'],
    },
    {
      label: 'Analytics & Reports',
      path: '/reports',
      icon: <BarChart3 className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER', 'APPROVING_AUTHORITY'],
    },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: <Bell className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER', 'APPROVING_AUTHORITY', 'INSTITUTION_ADMIN'],
    },
    {
      label: 'AI Query Assistant',
      path: '/assistant',
      icon: <AIAssistantLogo size="xs" />,
      roles: ['SCRUTINY_OFFICER', 'APPROVING_AUTHORITY', 'INSTITUTION_ADMIN'],
    },
    {
      label: 'Audit Trail',
      path: '/audit',
      icon: <ShieldAlert className="w-4 h-4" />,
      roles: ['SCRUTINY_OFFICER', 'APPROVING_AUTHORITY'],
    },
  ];

  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <aside className="w-64 bg-gov-navy-900 text-slate-200 flex flex-col border-r border-slate-800 shadow-xl shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800 bg-gov-navy-900/90 gap-2.5">
        <TrustLogo size="sm" variant="light" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-extrabold text-white tracking-wider">TRUST</h1>
            <span className="text-[8px] font-bold text-teal-300 bg-teal-950/70 border border-teal-500/30 px-1 py-0.5 rounded">
              AICTE
            </span>
          </div>
          <p
            className="text-[9px] text-teal-400 font-medium truncate"
            title="Transparent Repository for Unified Security-deposit Tracking"
          >
            Transparent Repository for Unified Security-deposit Tracking
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gov-navy-700 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-gov-navy-800/80 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / Ministry Credit */}
      <div className="p-4 border-t border-slate-800 bg-gov-navy-900 text-center">
        <p className="text-[11px] text-slate-300 font-semibold tracking-wide">TRUST Platform</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Ministry of Education, GoI</p>
        <p className="text-[8px] text-teal-400/80 mt-1 font-mono uppercase tracking-wider">
          Unified Security-Deposit Repository
        </p>
      </div>
    </aside>
  );
};
