import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { DiscrepancyRecord } from '../../types/fdr';
import { StatusBadge } from '../common/StatusBadge';
import { api } from '../../services/api';

interface DiscrepancyComparisonViewProps {
  discrepancies: DiscrepancyRecord[];
  canResolve: boolean;
  onResolved?: () => void;
}

export const DiscrepancyComparisonView: React.FC<DiscrepancyComparisonViewProps> = ({
  discrepancies,
  canResolve,
  onResolved,
}) => {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [verifiedVal, setVerifiedVal] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleResolve = async (id: string) => {
    if (!verifiedVal.trim() || !remarks.trim()) return;
    setLoading(true);
    try {
      await api.put(`/discrepancies/${id}/resolve`, {
        verified_value: verifiedVal,
        resolution_remarks: remarks,
        status: 'RESOLVED',
      });
      setResolvingId(null);
      setVerifiedVal('');
      setRemarks('');
      if (onResolved) onResolved();
    } catch (err) {
      alert('Failed to resolve discrepancy');
    } finally {
      setLoading(false);
    }
  };

  if (!discrepancies || discrepancies.length === 0) {
    return (
      <div className="p-6 bg-emerald-50/50 rounded-xl border border-emerald-200 text-center">
        <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-emerald-900">Zero Discrepancies Detected</h4>
        <p className="text-xs text-emerald-700 mt-0.5">
          AI extraction matched 100% of institution-submitted parameters against physical document records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
          <ShieldAlert className="w-4 h-4" />
          <span>Discrepancy Matrix ({discrepancies.length} Anomalies Flagged)</span>
        </div>
        <span className="text-xs text-slate-500">
          Scrutiny Officer adjudication required to reconcile values
        </span>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Field</th>
              <th className="px-5 py-3">Institution Submitted</th>
              <th className="px-5 py-3">AI / OCR Extracted</th>
              <th className="px-5 py-3">Severity & Type</th>
              <th className="px-5 py-3">Status</th>
              {canResolve && <th className="px-5 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {discrepancies.map((disc) => (
              <React.Fragment key={disc.id}>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-800 capitalize">
                    {disc.field_name.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 font-mono text-xs">
                    {disc.submitted_value || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-rose-700 font-mono text-xs font-semibold bg-rose-50/50">
                    {disc.extracted_value || '—'}
                  </td>
                  <td className="px-5 py-3.5 space-x-1.5">
                    <StatusBadge status={disc.severity} type="severity" />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={disc.status} />
                  </td>
                  {canResolve && (
                    <td className="px-5 py-3.5 text-right">
                      {disc.status === 'OPEN' ? (
                        <button
                          onClick={() => {
                            setResolvingId(disc.id);
                            setVerifiedVal(disc.extracted_value || '');
                          }}
                          className="px-3 py-1 bg-gov-navy-700 hover:bg-gov-navy-800 text-white rounded text-xs font-medium shadow-sm"
                        >
                          Reconcile
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold">Resolved</span>
                      )}
                    </td>
                  )}
                </tr>

                {/* Inline Reconciliation Drawer */}
                {resolvingId === disc.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-5 py-4 border-t border-slate-200">
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                        <div className="font-semibold text-xs text-slate-800">
                          Reconcile Discrepancy: {disc.field_name}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-medium text-slate-500">
                              Final Verified Value
                            </label>
                            <input
                              type="text"
                              value={verifiedVal}
                              onChange={(e) => setVerifiedVal(e.target.value)}
                              className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
                              placeholder="Enter officially verified value"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-slate-500">
                              Resolution Remarks / Officer Justification
                            </label>
                            <input
                              type="text"
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
                              placeholder="Explanation for record reconciliation"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => setResolvingId(null)}
                            className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={loading || !verifiedVal.trim() || !remarks.trim()}
                            onClick={() => handleResolve(disc.id)}
                            className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium disabled:opacity-50"
                          >
                            {loading ? 'Saving...' : 'Confirm Reconciliation'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
