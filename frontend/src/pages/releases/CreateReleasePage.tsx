import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, HandCoins } from 'lucide-react';
import { api } from '../../services/api';
import { FDRInstrument } from '../../types/fdr';

export const CreateReleasePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedFdrId = searchParams.get('fdr_id') || '';

  const [fdrs, setFdrs] = useState<FDRInstrument[]>([]);
  const [fdrId, setFdrId] = useState(preselectedFdrId);
  const [reasonCategory, setReasonCategory] = useState('TERM_COMPLETION_8_YEARS');
  const [requestAmount, setRequestAmount] = useState<number>(3500000);
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFdrs = async () => {
      try {
        const res = await api.get<FDRInstrument[]>('/fdrs');
        setFdrs(res.data);
        if (!fdrId && res.data.length > 0) {
          setFdrId(res.data[0].id);
          setRequestAmount(res.data[0].amount);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchFdrs();
  }, []);

  const handleFdrChange = (id: string) => {
    setFdrId(id);
    const selected = fdrs.find((f) => f.id === id);
    if (selected) {
      setRequestAmount(selected.amount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/releases', {
        fdr_id: fdrId,
        reason_category: reasonCategory,
        request_amount: Number(requestAmount),
        justification: justification.trim(),
      });
      navigate('/releases');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit release application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Releases</span>
      </button>

      <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Apply for Security Deposit Release / Refund
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Submit a formal administrative application to release AICTE lien upon conclusion of lock-in terms.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Pledged Instrument *
            </label>
            <select
              required
              value={fdrId}
              onChange={(e) => handleFdrChange(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none bg-white font-mono"
            >
              {fdrs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fdr_number} — {f.bank_name} (₹{Number(f.amount || 0).toLocaleString('en-IN')}) — Matures {f.maturity_date}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Release Eligibility Category *
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none bg-white"
              >
                <option value="TERM_COMPLETION_8_YEARS">Conclusion of 8-Year Mandatory Lock-in</option>
                <option value="PROGRAMME_CLOSURE">Formal Closure of Technical Programme</option>
                <option value="EXCESS_DEPOSIT">Excess Security Deposit Reconciliation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Claimed Refund Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={requestAmount}
                onChange={(e) => setRequestAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none font-semibold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Compliance Justification & Undertaking *
            </label>
            <textarea
              required
              rows={4}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="State compliance status: No pending faculty salary disputes, no student dues, complete adherence to AICTE Approval Process Handbook norms..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 border border-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !justification.trim()}
              className="px-5 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Release Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
