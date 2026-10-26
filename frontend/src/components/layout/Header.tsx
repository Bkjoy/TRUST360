import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Notification } from '../../types/notification';

export const Header: React.FC = () => {
  const { user, logout, quickDemoLogin } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get<Notification[]>('/notifications?unread_only=true');
        setUnreadCount(res.data.length);
      } catch (err) {
        // ignore
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const getRoleLabel = (r?: string) => {
    switch (r) {
      case 'SCRUTINY_OFFICER':
        return 'AICTE Scrutiny Officer';
      case 'APPROVING_AUTHORITY':
        return 'Competent Authority';
      case 'INSTITUTION_ADMIN':
        return 'Institution Administrator';
      default:
        return 'User';
    }
  };

  const handleRoleSwitch = async (roleKey: any) => {
    await quickDemoLogin(roleKey);
    setShowRoleSwitcher(false);
    navigate('/dashboard');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          All India Council for Technical Education
        </span>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gov-navy-50 border border-gov-navy-100 rounded-full text-xs font-semibold text-gov-navy-700">
          <ShieldCheck className="w-3.5 h-3.5 text-gov-navy-600" />
          <span>{getRoleLabel(user?.role)}</span>
        </div>
        {user?.institution_name && (
          <span className="text-xs text-slate-600 font-medium truncate max-w-xs">
            ({user.institution_name})
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            title="Switch Demo Role"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Switch Role</span>
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Demo Persona Switcher
              </div>
              <button
                onClick={() => handleRoleSwitch('INSTITUTION_ADMIN')}
                className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex flex-col"
              >
                <span className="font-semibold text-slate-800">Institution Admin</span>
                <span className="text-[10px] text-slate-500">Delhi Institute of Tech</span>
              </button>
              <button
                onClick={() => handleRoleSwitch('SCRUTINY_OFFICER')}
                className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex flex-col"
              >
                <span className="font-semibold text-slate-800">Scrutiny Officer</span>
                <span className="text-[10px] text-slate-500">AICTE Verification Desk</span>
              </button>
              <button
                onClick={() => handleRoleSwitch('APPROVING_AUTHORITY')}
                className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex flex-col"
              >
                <span className="font-semibold text-slate-800">Competent Authority</span>
                <span className="text-[10px] text-slate-500">Final Release Approvals</span>
              </button>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          )}
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-800">{user?.full_name}</div>
            <div className="text-[10px] text-slate-400">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
