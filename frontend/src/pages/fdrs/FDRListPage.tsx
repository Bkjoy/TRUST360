import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, UploadCloud, Download, Filter, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FDRInstrument } from '../../types/fdr';
import { useAuth } from '../../context/AuthContext';

export const FDRListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [fdrs, setFdrs] = useState<FDRInstrument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const currentStatusFilter = searchParams.get('validity_status') || 'ALL';

  const fetchFdrs = async () => {
    setLoading(true);
    try {
      const url =
        currentStatusFilter && currentStatusFilter !== 'ALL'
          ? `/fdrs?validity_status=${currentStatusFilter}`
          : '/fdrs';
      const res = await api.get<FDRInstrument[]>(url);
      setFdrs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFdrs();
  }, [currentStatusFilter]);

  const handleStatusFilterChange = (status: string) => {
    if (status === 'ALL') {
      searchParams.delete('validity_status');
    } else {
      searchParams.set('validity_status', status);
    }
    setSearchParams(searchParams);
  };

  const columns: Column<FDRInstrument>[] = [
    {
      header: 'FDR Number',
      accessor: (f) => (
        <span className="font-semibold text-gov-navy-800 font-mono text-xs">{f.fdr_number}</span>
      ),
    },
    { header: 'Institution', accessor: (f) => f.institution_name || '—' },
    { header: 'Issuing Bank', accessor: 'bank_name' },
    {
      header: 'Deposit Amount',
      accessor: (f) => (
        <span className="font-semibold text-slate-900">₹{Number(f.amount || 0).toLocaleString('en-IN')}</span>
      ),
    },
    { header: 'Maturity Date', accessor: 'maturity_date' },
    {
      header: 'Days Left',
      accessor: (f) => (
        <span
          className={`text-xs font-semibold ${
            f.days_to_maturity !== undefined && f.days_to_maturity <= 90
              ? 'text-amber-600'
              : 'text-slate-600'
          }`}
        >
          {f.days_to_maturity !== undefined ? `${f.days_to_maturity}d` : '—'}
        </span>
      ),
    },
    {
      header: 'Validity Status',
      accessor: (f) => <StatusBadge status={f.validity_status} />,
    },
    {
      header: 'Verification',
      accessor: (f) => <StatusBadge status={f.verification_status} type="verification" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Security Deposit & FDR Repository
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Central registry of all AICTE-pledged fixed deposit instruments and bank guarantees.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.open('/api/v1/reports/export-csv', '_blank')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          {user?.role === 'INSTITUTION_ADMIN' && (
            <button
              onClick={() => navigate('/fdrs/new')}
              className="flex items-center gap-2 px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <UploadCloud className="w-4 h-4 text-teal-400" />
              <span>Upload FDR PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {['ALL', 'ACTIVE', 'EXPIRING_SOON', 'MATURED', 'OVERDUE', 'RELEASED', 'RENEWED'].map(
          (st) => (
            <button
              key={st}
              onClick={() => handleStatusFilterChange(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentStatusFilter === st
                  ? 'bg-gov-navy-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          )
        )}
      </div>

      {/* Grid */}
      <DataTable
        columns={columns}
        data={fdrs}
        searchPlaceholder="Search by FDR number, bank name, institution..."
        searchFilter={(item, term) =>
          Boolean(
            item.fdr_number.toLowerCase().includes(term) ||
            item.bank_name.toLowerCase().includes(term) ||
            (item.institution_name && item.institution_name.toLowerCase().includes(term))
          )
        }
        onRowClick={(item) => navigate(`/fdrs/${item.id}`)}
        itemsPerPage={12}
      />
    </div>
  );
};
