import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, AlertTriangle, Eye, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FDRInstrument } from '../../types/fdr';

export const VerificationQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [fdrs, setFdrs] = useState<FDRInstrument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get<FDRInstrument[]>('/fdrs');
      // Filter items requiring scrutiny
      setFdrs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const columns: Column<FDRInstrument>[] = [
    {
      header: 'FDR Number',
      accessor: (f) => <span className="font-mono font-bold text-xs text-gov-navy-800">{f.fdr_number}</span>,
    },
    { header: 'Institution', accessor: (f) => f.institution_name || '—' },
    { header: 'Bank', accessor: 'bank_name' },
    {
      header: 'Amount',
      accessor: (f) => <span className="font-semibold">₹{Number(f.amount || 0).toLocaleString('en-IN')}</span>,
    },
    {
      header: 'Verification State',
      accessor: (f) => <StatusBadge status={f.verification_status} type="verification" />,
    },
    {
      header: 'Admin Status',
      accessor: (f) => <StatusBadge status={f.administrative_status} />,
    },
    {
      header: 'Action',
      accessor: (f) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/fdrs/${f.id}`);
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-gov-navy-700 hover:bg-gov-navy-800 text-white rounded text-xs font-semibold"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Review Dossier</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">AICTE Scrutiny & Verification Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dossiers awaiting scrutiny officer validation against uploaded FDR documents and core banking status.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={fdrs}
        searchPlaceholder="Search queue by FDR or institution name..."
        searchFilter={(item, term) =>
          item.fdr_number.toLowerCase().includes(term) ||
          (item.institution_name && item.institution_name.toLowerCase().includes(term)) ||
          item.bank_name.toLowerCase().includes(term)
        }
        onRowClick={(item) => navigate(`/fdrs/${item.id}`)}
        itemsPerPage={10}
      />
    </div>
  );
};
