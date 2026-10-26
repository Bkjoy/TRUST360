import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, FileText, AlertTriangle, CheckCircle, PlusCircle, ArrowUpRight, Clock, ShieldCheck, UploadCloud } from 'lucide-react';
import { api } from '../../services/api';
import { MetricCard } from '../../components/common/MetricCard';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FDRInstrument } from '../../types/fdr';
import { useAuth } from '../../context/AuthContext';

export const InstitutionDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fdrs, setFdrs] = useState<FDRInstrument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.get<FDRInstrument[]>('/fdrs');
        setFdrs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalAmount = fdrs.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const activeCount = fdrs.filter((f) => f.validity_status === 'ACTIVE').length;
  const expiringCount = fdrs.filter((f) => f.validity_status === 'EXPIRING_SOON').length;
  const maturedCount = fdrs.filter((f) => f.validity_status === 'MATURED' || f.validity_status === 'OVERDUE').length;

  const columns: Column<FDRInstrument>[] = [
    {
      header: 'FDR Number',
      accessor: (f) => (
        <span className="font-semibold text-gov-navy-800 font-mono text-xs">{f.fdr_number}</span>
      ),
    },
    { header: 'Bank', accessor: 'bank_name' },
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
        <span className={`text-xs font-semibold ${f.days_to_maturity && f.days_to_maturity <= 90 ? 'text-amber-600' : 'text-slate-600'}`}>
          {f.days_to_maturity !== undefined ? `${f.days_to_maturity}d` : '—'}
        </span>
      ),
    },
    {
      header: 'Validity',
      accessor: (f) => <StatusBadge status={f.validity_status} />,
    },
    {
      header: 'Verification',
      accessor: (f) => <StatusBadge status={f.verification_status} type="verification" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Institution Security Ledger</h2>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              Alerts: auditteamtoucan@gmail.com &rarr; trust360toucan@gmail.com
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of AICTE mandatory fixed deposits, lock-in maturities, and release requests.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => navigate('/fdrs/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4 text-teal-400" />
            <span>Upload FDR PDF</span>
          </button>
          <button
            onClick={() => navigate('/releases/new')}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Apply for Release</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Security Pledged"
          value={loading ? '...' : `₹${(totalAmount / 10000000).toFixed(2)} Cr`}
          subtitle={loading ? 'Calculating total...' : `₹${totalAmount.toLocaleString('en-IN')} across ${fdrs.length} deposit instruments`}
          icon={<Landmark className="w-5 h-5" />}
          color="navy"
        />
        <MetricCard
          title="Active & Locked"
          value={activeCount}
          subtitle="Compliant under lock-in"
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
        />
        <MetricCard
          title="Expiring Within 90 Days"
          value={expiringCount}
          subtitle="Requires renewal rollover"
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          onClick={() => navigate('/fdrs?validity_status=EXPIRING_SOON')}
        />
        <MetricCard
          title="Matured / Overdue"
          value={maturedCount}
          subtitle="Action required immediately"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="rose"
          onClick={() => navigate('/fdrs?validity_status=MATURED')}
        />
      </div>

      {/* Main Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Registered Deposit Instruments
          </h3>
          <button
            onClick={() => navigate('/fdrs')}
            className="text-xs text-gov-navy-700 hover:underline font-semibold"
          >
            View Complete Repository &rarr;
          </button>
        </div>

        <DataTable
          columns={columns}
          data={fdrs}
          searchPlaceholder="Search FDR number, bank name..."
          searchFilter={(item, term) =>
            item.fdr_number.toLowerCase().includes(term) ||
            item.bank_name.toLowerCase().includes(term)
          }
          onRowClick={(item) => navigate(`/fdrs/${item.id}`)}
          itemsPerPage={8}
        />
      </div>
    </div>
  );
};
