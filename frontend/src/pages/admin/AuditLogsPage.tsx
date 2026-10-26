import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, Key, Filter } from 'lucide-react';
import { api } from '../../services/api';
import { DataTable, Column } from '../../components/common/DataTable';

interface AuditLog {
  id: string;
  actor_email?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  correlation_id?: string;
  ip_address?: string;
  created_at: string;
  after_state?: any;
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get<AuditLog[]>('/audit');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      accessor: (l) => <span className="font-mono text-[11px] text-slate-500">{l.created_at}</span>,
    },
    {
      header: 'Actor',
      accessor: (l) => (
        <div>
          <div className="font-semibold text-xs text-slate-800">{l.actor_email || 'SYSTEM'}</div>
          <div className="text-[10px] text-slate-400 font-medium">{l.actor_role || 'AUTOMATED'}</div>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: (l) => (
        <span className="px-2 py-0.5 bg-slate-100 font-mono text-xs rounded text-slate-800 font-bold">
          {l.action}
        </span>
      ),
    },
    { header: 'Entity', accessor: (l) => `${l.entity_type} (${l.entity_id.slice(0, 8)}...)` },
    {
      header: 'Audit Payload',
      accessor: (l) => (
        <pre className="text-[10px] font-mono text-slate-600 bg-slate-50 p-1.5 rounded max-w-xs truncate">
          {l.after_state ? JSON.stringify(l.after_state) : '—'}
        </pre>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Immutable System Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only governance records capturing all state modifications, verifications, and approvals.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Feed</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Filter audit events by actor or action..."
        searchFilter={(item, term) =>
          item.action.toLowerCase().includes(term) ||
          (item.actor_email && item.actor_email.toLowerCase().includes(term)) ||
          item.entity_type.toLowerCase().includes(term)
        }
        itemsPerPage={12}
      />
    </div>
  );
};
