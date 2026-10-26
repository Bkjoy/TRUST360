import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HandCoins, PlusCircle, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ReleaseRequest } from '../../types/workflow';
import { useAuth } from '../../context/AuthContext';

export const ReleaseListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [releases, setReleases] = useState<ReleaseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const res = await api.get<ReleaseRequest[]>('/releases');
      setReleases(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  // Scrutiny Officer Action: Recommend Approval or Request Clarification
  const handleOfficerScrutinize = async (id: string, recommendation: string) => {
    const remarks = prompt(`Enter scrutiny remarks (${recommendation}):`, 'Eligibility criteria met under Chapter II.');
    if (!remarks) return;

    try {
      await api.put(`/releases/${id}/scrutinize`, {
        scrutiny_recommendation: recommendation,
        scrutiny_remarks: remarks,
      });
      fetchReleases();
    } catch (err) {
      alert('Failed to submit scrutiny decision');
    }
  };

  // Competent Authority Action: Approve or Reject
  const handleAuthorityDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const remarks = prompt(`Enter official authority remarks for ${decision}:`, 'Release approved as per AICTE Council directives.');
    if (!remarks) return;

    try {
      await api.put(`/releases/${id}/decide`, {
        approval_decision: decision,
        approval_remarks: remarks,
      });
      fetchReleases();
    } catch (err) {
      alert('Failed to record authority decision');
    }
  };

  const columns: Column<ReleaseRequest>[] = [
    {
      header: 'Tracking Reference',
      accessor: (r) => <span className="font-mono text-xs font-bold text-gov-navy-800">{r.request_reference}</span>,
    },
    {
      header: 'FDR Instrument',
      accessor: (r) => <span className="font-mono text-xs text-slate-700">{r.fdr_number || r.fdr_id}</span>,
    },
    { header: 'Institution', accessor: (r) => r.institution_name || '—' },
    {
      header: 'Requested Amount',
      accessor: (r) => <span className="font-semibold text-slate-900">₹{r.request_amount.toLocaleString('en-IN')}</span>,
    },
    { header: 'Reason', accessor: (r) => r.reason_category.replace(/_/g, ' ') },
    {
      header: 'Workflow Stage',
      accessor: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Governance Decision',
      accessor: (r) => {
        // Scrutiny Officer Actions
        if (user?.role === 'SCRUTINY_OFFICER' && r.status === 'PENDING_SCRUTINY') {
          return (
            <div className="flex gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOfficerScrutinize(r.id, 'RECOMMEND_APPROVAL');
                }}
                className="px-2.5 py-1 bg-gov-navy-700 hover:bg-gov-navy-800 text-white rounded text-xs font-semibold"
              >
                Recommend
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOfficerScrutinize(r.id, 'CLARIFICATION_REQUIRED');
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
              >
                Clarify
              </button>
            </div>
          );
        }

        // Competent Authority Actions
        if (user?.role === 'APPROVING_AUTHORITY' && r.status === 'PENDING_APPROVAL') {
          return (
            <div className="flex gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAuthorityDecision(r.id, 'APPROVED');
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
              >
                Authorize Release
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAuthorityDecision(r.id, 'REJECTED');
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
              >
                Reject
              </button>
            </div>
          );
        }

        return <span className="text-xs text-slate-500">{r.approval_remarks || r.scrutiny_remarks || '—'}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security Deposit Release & Refund Workflow</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Three-tier governance: Institution Application &rarr; Scrutiny Officer Examination &rarr; Competent Authority Authorization.
          </p>
        </div>

        {user?.role === 'INSTITUTION_ADMIN' && (
          <button
            onClick={() => navigate('/releases/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply for Release</span>
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={releases}
        searchPlaceholder="Search releases by tracking reference or FDR..."
        searchFilter={(item, term) =>
          Boolean(
            item.request_reference.toLowerCase().includes(term) ||
            (item.fdr_number && item.fdr_number.toLowerCase().includes(term)) ||
            (item.institution_name && item.institution_name.toLowerCase().includes(term))
          )
        }
        itemsPerPage={10}
      />
    </div>
  );
};
