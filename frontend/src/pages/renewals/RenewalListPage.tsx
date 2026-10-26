import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, PlusCircle, CheckCircle, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RenewalRequest } from '../../types/workflow';
import { useAuth } from '../../context/AuthContext';

export const RenewalListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [renewals, setRenewals] = useState<RenewalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const res = await api.get<RenewalRequest[]>('/renewals');
      setRenewals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewals();
  }, []);

  const handleScrutinize = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const remarks = prompt(`Enter scrutiny remarks for ${decision}:`, 'Verified renewal advice.');
    if (!remarks) return;

    try {
      await api.put(`/renewals/${id}/scrutinize`, {
        decision,
        scrutiny_remarks: remarks,
      });
      fetchRenewals();
    } catch (err) {
      alert('Failed to process renewal scrutiny');
    }
  };

  const columns: Column<RenewalRequest>[] = [
    {
      header: 'Maturing FDR',
      accessor: (r) => <span className="font-mono text-xs font-bold text-slate-800">{r.old_fdr_number || r.old_fdr_id}</span>,
    },
    {
      header: 'Renewed Instrument',
      accessor: (r) => <span className="font-mono text-xs font-semibold text-teal-700">{r.new_fdr_number || r.new_fdr_id}</span>,
    },
    { header: 'Institution', accessor: (r) => r.institution_name || '—' },
    { header: 'Request Type', accessor: 'request_type' },
    {
      header: 'Status',
      accessor: (r) => <StatusBadge status={r.status} />,
    },
    { header: 'Date', accessor: (r) => r.created_at.slice(0, 10) },
    {
      header: 'Scrutiny Action',
      accessor: (r) => {
        if (user?.role === 'SCRUTINY_OFFICER') {
          if (r.status === 'PENDING_SCRUTINY') {
            return (
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScrutinize(r.id, 'APPROVED');
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                >
                  Approve
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScrutinize(r.id, 'REJECTED');
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                >
                  Reject
                </button>
              </div>
            );
          }
        }
        return <span className="text-xs text-slate-400">{r.scrutiny_remarks || '—'}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">FDR Renewal & Rollover Workflow</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage parent-child replacement instruments for maturing security deposits.
          </p>
        </div>

        {user?.role === 'INSTITUTION_ADMIN' && (
          <button
            onClick={() => navigate('/renewals/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Renewal Advice</span>
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={renewals}
        searchPlaceholder="Search renewals by FDR number or institution..."
        searchFilter={(item, term) =>
          Boolean(
            (item.old_fdr_number && item.old_fdr_number.toLowerCase().includes(term)) ||
            (item.new_fdr_number && item.new_fdr_number.toLowerCase().includes(term)) ||
            (item.institution_name && item.institution_name.toLowerCase().includes(term))
          )
        }
        itemsPerPage={10}
      />
    </div>
  );
};
