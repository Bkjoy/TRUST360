import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, AlertCircle, Info, AlertTriangle, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { Notification } from '../../types/notification';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [testSending, setTestSending] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.get<Notification[]>('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleSendTestEmail = async () => {
    setTestSending(true);
    setTestNotice(null);
    try {
      await api.post('/notifications/test-email', {
        recipient: 'trust360toucan@gmail.com',
      });
      setTestNotice('Email alert successfully dispatched to trust360toucan@gmail.com!');
      setTimeout(() => setTestNotice(null), 6000);
      await fetchNotifs();
    } catch (err) {
      setTestNotice('Failed to dispatch test alert email.');
    } finally {
      setTestSending(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-sky-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Notification Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated maturity countdown alerts, discrepancy notices, and workflow escalation triggers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSendTestEmail}
            disabled={testSending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gov-navy-800 text-white rounded-lg text-xs font-semibold hover:bg-gov-navy-900 shadow-sm transition-all disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5 text-teal-400" />
            <span>{testSending ? 'Dispatching...' : 'Test Alert to trust360toucan@gmail.com'}</span>
          </button>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <CheckCheck className="w-4 h-4 text-slate-500" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* Real-time Email Dispatch Integration Banner */}
      <div className="bg-teal-50 border border-teal-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-teal-950 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-teal-600 text-white rounded-lg shrink-0 mt-0.5">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">Institutional Alert Email Routing:</span>
              <span className="font-mono text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                From: auditteamtoucan@gmail.com
              </span>
              <span className="text-slate-400 font-bold">&rarr;</span>
              <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-100/80 border border-teal-200 px-2 py-0.5 rounded">
                To: trust360toucan@gmail.com
              </span>
            </div>
            <p className="text-[11px] text-teal-800 mt-1.5">
              All institutional alerts (FDR maturity countdowns, AI discrepancies, release approvals, and renewal reminders) are automatically dispatched from <span className="font-mono font-medium">auditteamtoucan@gmail.com</span> to <span className="font-mono font-medium">trust360toucan@gmail.com</span>.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-center px-2.5 py-1 bg-teal-600 text-white font-bold text-[10px] uppercase rounded-full tracking-wider shrink-0 shadow-sm">
          Active Live
        </span>
      </div>

      {testNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{testNotice}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No notifications found.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkSingleRead(n.id)}
              className={`p-5 flex items-start gap-4 transition-colors cursor-pointer ${
                n.is_read ? 'bg-white hover:bg-slate-50/50' : 'bg-slate-50/70 hover:bg-slate-100/50'
              }`}
            >
              <div className="mt-0.5 p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                {getIcon(n.severity)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {n.created_at.replace('T', ' ').slice(0, 16)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
