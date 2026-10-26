import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { api } from '../../services/api';
import { FDRInstrument } from '../../types/fdr';

export const CreateRenewalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedFdrId = searchParams.get('fdr_id') || '';

  const [fdrs, setFdrs] = useState<FDRInstrument[]>([]);
  const [oldFdrId, setOldFdrId] = useState(preselectedFdrId);
  const [newFdrNumber, setNewFdrNumber] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [issueDate, setIssueDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEligibleFdrs = async () => {
      try {
        const res = await api.get<FDRInstrument[]>('/fdrs');
        setFdrs(res.data);
        if (!oldFdrId && res.data.length > 0) {
          setOldFdrId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEligibleFdrs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/renewals', {
        old_fdr_id: oldFdrId,
        new_fdr_number: newFdrNumber.trim(),
        bank_name: bankName.trim(),
        branch_name: branchName.trim(),
        amount: Number(amount),
        issue_date: issueDate,
        maturity_date: maturityDate,
        request_remarks: remarks.trim() || undefined,
      });
      navigate('/renewals');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit renewal request');
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
        <span>Back to Renewals</span>
      </button>

      <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Submit Instrument Renewal / Rollover
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Provide details of the renewed fixed deposit instrument to maintain AICTE lien compliance upon maturity.
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
              Select Maturing Instrument *
            </label>
            <select
              required
              value={oldFdrId}
              onChange={(e) => setOldFdrId(e.target.value)}
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
                New Renewed FDR Number *
              </label>
              <input
                type="text"
                required
                value={newFdrNumber}
                onChange={(e) => setNewFdrNumber(e.target.value)}
                placeholder="e.g., FDR-RNW-2026-9011"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch Name *
              </label>
              <input
                type="text"
                required
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch name"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deposit Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maturity Date *
              </label>
              <input
                type="date"
                required
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Renewal Remarks / Justification
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Automatic rollover executed with issuing bank for a subsequent 8-year lock-in period."
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
              disabled={loading}
              className="px-5 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Renewal Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
