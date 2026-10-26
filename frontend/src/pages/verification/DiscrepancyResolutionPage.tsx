import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { DiscrepancyRecord } from '../../types/fdr';
import { DiscrepancyComparisonView } from '../../components/fdr/DiscrepancyComparisonView';
import { useAuth } from '../../context/AuthContext';

export const DiscrepancyResolutionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED' | 'ALL'>('OPEN');

  const fetchDiscrepancies = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' ? '/discrepancies' : `/discrepancies?status=${statusFilter}`;
      const res = await api.get<DiscrepancyRecord[]>(url);
      setDiscrepancies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscrepancies();
  }, [statusFilter]);

  const canResolve = user?.role === 'SCRUTINY_OFFICER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Discrepancy Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mismatches identified by automated PyMuPDF & Tesseract OCR pipeline against institution-submitted data.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {(['OPEN', 'RESOLVED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === st
                  ? 'bg-gov-navy-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <DiscrepancyComparisonView
        discrepancies={discrepancies}
        canResolve={canResolve}
        onResolved={fetchDiscrepancies}
      />
    </div>
  );
};
