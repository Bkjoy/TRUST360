import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Landmark,
  FileCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api';
import { MetricCard } from '../../components/common/MetricCard';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FDRInstrument } from '../../types/fdr';

export const OfficerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [pendingFdrs, setPendingFdrs] = useState<FDRInstrument[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [resStats, resFdrs] = await Promise.all([
        api.get('/reports/analytics'),
        api.get<FDRInstrument[]>('/fdrs'),
      ]);
      setStats(resStats.data);
      // Filter pending review or discrepancies
      const pending = resFdrs.data.filter(
        (f) =>
          f.verification_status === 'INSTITUTION_SUBMITTED' ||
          f.verification_status === 'AI_EXTRACTED' ||
          f.verification_status === 'DISCREPANCY_DETECTED'
      );
      setPendingFdrs(pending);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunMaturityScan = async () => {
    setScanning(true);
    setScanNotice(null);
    try {
      const res = await api.post('/reports/trigger-maturity-scan');
      setScanNotice(`Maturity scan completed: ${res.data.results.alerts_created} automated alerts generated.`);
      await loadData();
    } catch (err) {
      alert('Failed to trigger scan');
    } finally {
      setScanning(false);
    }
  };

  const columns: Column<FDRInstrument>[] = [
    {
      header: 'FDR Number',
      accessor: (f) => (
        <span className="font-semibold text-gov-navy-800 font-mono text-xs">{f.fdr_number}</span>
      ),
    },
    { header: 'Institution', accessor: (f) => f.institution_name || 'N/A' },
    { header: 'Bank', accessor: 'bank_name' },
    {
      header: 'Deposit Amount',
      accessor: (f) => (
        <span className="font-semibold text-slate-900">₹{Number(f.amount || 0).toLocaleString('en-IN')}</span>
      ),
    },
    {
      header: 'Verification Status',
      accessor: (f) => <StatusBadge status={f.verification_status} type="verification" />,
    },
    {
      header: 'Action',
      accessor: (f) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/fdrs/${f.id}`);
          }}
          className="px-2.5 py-1 bg-gov-navy-700 hover:bg-gov-navy-800 text-white rounded text-xs font-medium"
        >
          Scrutinize
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">AICTE Scrutiny Workspace</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Regional verification queue, OCR discrepancy checks, and maturity chronometer.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            disabled={scanning}
            onClick={handleRunMaturityScan}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning Chronometer...' : 'Run Maturity Engine'}</span>
          </button>
          <button
            onClick={() => navigate('/verification')}
            className="flex items-center gap-2 px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <span>Verification Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {scanNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{scanNotice}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pending Verification"
          value={stats?.pending_verification_count ?? '—'}
          subtitle="New instruments awaiting review"
          icon={<FileCheck className="w-5 h-5" />}
          color="amber"
          onClick={() => navigate('/verification')}
        />
        <MetricCard
          title="Open Discrepancies"
          value={stats?.open_discrepancies_count ?? '—'}
          subtitle="AI extraction flagged mismatches"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="rose"
          onClick={() => navigate('/discrepancies')}
        />
        <MetricCard
          title="Pending Release Scrutiny"
          value={stats?.pending_release_count ?? '—'}
          subtitle="Institutions applying for lien refund"
          icon={<Landmark className="w-5 h-5" />}
          color="navy"
          onClick={() => navigate('/releases')}
        />
        <MetricCard
          title="Matured & Overdue"
          value={stats?.matured_count ?? '—'}
          subtitle="Instruments requiring rollover"
          icon={<ShieldAlert className="w-5 h-5" />}
          color="rose"
          onClick={() => navigate('/fdrs?validity_status=MATURED')}
        />
      </div>

      {/* Scrutiny Priority Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            High Priority Scrutiny Queue
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {pendingFdrs.length} instruments require review
          </span>
        </div>

        <DataTable
          columns={columns}
          data={pendingFdrs}
          searchPlaceholder="Search queue by FDR or institution..."
          searchFilter={(item, term) =>
            Boolean(
              item.fdr_number.toLowerCase().includes(term) ||
              (item.institution_name && item.institution_name.toLowerCase().includes(term))
            )
          }
          onRowClick={(item) => navigate(`/fdrs/${item.id}`)}
          itemsPerPage={8}
        />
      </div>
    </div>
  );
};
