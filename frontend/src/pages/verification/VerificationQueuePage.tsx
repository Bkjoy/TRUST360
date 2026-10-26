import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Eye,
  ArrowRight,
  Building2,
  X,
  Bell,
  RefreshCw,
  Landmark,
} from 'lucide-react';
import { api } from '../../services/api';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FDRInstrument } from '../../types/fdr';

export const VerificationQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [fdrs, setFdrs] = useState<FDRInstrument[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Bank CBS verification state
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{ fdr: FDRInstrument; result: any } | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get<FDRInstrument[]>('/fdrs');
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

  const handleCheckBankCBS = async (fdr: FDRInstrument) => {
    setCheckingId(fdr.id);
    try {
      const res = await api.post(`/verification/fdrs/${fdr.id}/cbs-verify`);
      setCheckResult({ fdr, result: res.data });
      await fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to execute Bank CBS check.');
    } finally {
      setCheckingId(null);
    }
  };

  const columns: Column<FDRInstrument>[] = [
    {
      header: 'FDR Number',
      accessor: (f) => (
        <div>
          <span className="font-mono font-bold text-xs text-gov-navy-800">{f.fdr_number}</span>
          {f.cbs_confirmation_ref && (
            <span className="block text-[10px] text-teal-700 font-mono font-medium">
              Ref: {f.cbs_confirmation_ref}
            </span>
          )}
        </div>
      ),
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
      header: 'Actions',
      accessor: (f) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* On-Demand Bank CBS Check Button */}
          <button
            disabled={checkingId === f.id}
            onClick={() => handleCheckBankCBS(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50 ${
              f.verification_status === 'BANK_CONFIRMED'
                ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
            title="Cross-examine FDR against Commercial Bank CBS ledger"
          >
            <Building2 className={`w-3.5 h-3.5 ${checkingId === f.id ? 'animate-spin' : ''}`} />
            <span>
              {checkingId === f.id
                ? 'Checking...'
                : f.verification_status === 'BANK_CONFIRMED'
                ? 'Re-check CBS'
                : 'Check Bank CBS'}
            </span>
          </button>

          {/* Dossier Review */}
          <button
            onClick={() => navigate(`/fdrs/${f.id}`)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            title="Open comprehensive dossier view"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Review</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-gov-navy-50 text-gov-navy-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">AICTE Scrutiny & Verification Queue</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dossiers submitted by technical institutions. Scrutiny officers can trigger on-demand Core Banking System (CBS) cross-verification against bank records.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="self-start md:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
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

      {/* Bank CBS Verification Result Modal */}
      {checkResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
            {/* Modal Header */}
            <div
              className={`p-5 flex items-center justify-between border-b ${
                checkResult.result.cbs_status === 'VERIFIED'
                  ? 'bg-emerald-50/80 border-emerald-100 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-100 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    checkResult.result.cbs_status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {checkResult.result.cbs_status === 'VERIFIED' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {checkResult.result.cbs_status === 'VERIFIED'
                      ? 'Bank CBS Verification: MATCHED & CONFIRMED'
                      : 'Bank CBS Verification: DISCREPANCY DETECTED'}
                  </h3>
                  <p className="text-[11px] opacity-80 font-mono">
                    FDR: {checkResult.fdr.fdr_number} • {checkResult.fdr.institution_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckResult(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Status Banner */}
              {checkResult.result.cbs_status === 'VERIFIED' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Commercial Bank Records Confirmed</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    The submitted FDR matches the issuing bank's Core Banking System ledger. Active AICTE joint lien is legally pledged.
                  </p>
                  <div className="pt-1 font-mono text-[11px] font-semibold text-emerald-950 bg-emerald-100/60 p-2 rounded-lg">
                    Bank Confirmation Reference: {checkResult.result.bank_confirmation_ref || 'SBX-CBS-CONFIRMED'}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-rose-950">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Discrepancy Detected Against Bank Ledger</span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    The submitted instrument failed one or more verification checks against the Commercial Bank Core Banking System.
                  </p>
                </div>
              )}

              {/* Checklist Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Bank Verification Checklist
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                    <span className="text-slate-600">Bank Record:</span>
                    <span
                      className={`font-semibold ${
                        checkResult.result.checks?.record_found ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {checkResult.result.checks?.record_found ? '✓ Registered' : '✕ Not Found'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                    <span className="text-slate-600">Instrument Status:</span>
                    <span
                      className={`font-semibold ${
                        checkResult.result.checks?.status_active ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {checkResult.result.checks?.status_active ? '✓ Active' : '✕ Inactive/Closed'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                    <span className="text-slate-600">Amount Match:</span>
                    <span
                      className={`font-semibold ${
                        checkResult.result.checks?.amount_matched ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {checkResult.result.checks?.amount_matched ? '✓ Matched' : '✕ Mismatch'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                    <span className="text-slate-600">Maturity Date:</span>
                    <span
                      className={`font-semibold ${
                        checkResult.result.checks?.maturity_date_matched ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {checkResult.result.checks?.maturity_date_matched ? '✓ Matched' : '✕ Mismatch'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100 col-span-2">
                    <span className="text-slate-600">AICTE Regulatory Lien:</span>
                    <span
                      className={`font-semibold ${
                        checkResult.result.checks?.lien_active &&
                        checkResult.result.checks?.lien_beneficiary_matched
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {checkResult.result.checks?.lien_active &&
                      checkResult.result.checks?.lien_beneficiary_matched
                        ? '✓ Pledged to AICTE'
                        : '✕ Missing AICTE Lien'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exact Discrepancy Reasons */}
              {checkResult.result.discrepancies && checkResult.result.discrepancies.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                    Discrepancy Details & Reason(s):
                  </div>
                  <div className="space-y-1.5">
                    {checkResult.result.discrepancies.map((reason: string, i: number) => (
                      <div
                        key={i}
                        className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2"
                      >
                        <span className="text-rose-600 font-bold">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notification Banner dispatched to Institution */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <Bell className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Institution Portal Notification Dispatched</div>
                  <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                    {checkResult.result.cbs_status === 'VERIFIED'
                      ? `A confirmation notification was dispatched to ${checkResult.fdr.institution_name} confirming successful bank verification.`
                      : `A discrepancy notification detailing the exact mismatch reason(s) has been dispatched to the ${checkResult.fdr.institution_name} portal with rectification instructions.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setCheckResult(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-all"
              >
                Close
              </button>
              <button
                onClick={() => navigate(`/fdrs/${checkResult.fdr.id}`)}
                className="px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span>View Full Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
