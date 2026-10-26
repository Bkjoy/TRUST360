import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gavel,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Landmark,
  Search,
  Filter,
  Eye,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  FileText,
  RotateCw,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { DiscrepancyRecord } from '../../types/fdr';
import { useAuth } from '../../context/AuthContext';

export const ActionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'WORKING' | 'RESOLVED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  // Action Modal State
  const [selectedDisc, setSelectedDisc] = useState<DiscrepancyRecord | null>(null);
  const [actionStatus, setActionStatus] = useState<'WORKING' | 'RESOLVED' | 'OPEN'>('WORKING');
  const [actionRemarks, setActionRemarks] = useState<string>('');
  const [actionVerifiedVal, setActionVerifiedVal] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  const fetchDiscrepancies = async () => {
    setLoading(true);
    try {
      const res = await api.get<DiscrepancyRecord[]>('/discrepancies');
      setDiscrepancies(res.data);
    } catch (err) {
      console.error('Failed to load discrepancies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscrepancies();
  }, []);

  // Helper to categorize discrepancy statuses
  const getCategory = (st: string): 'PENDING' | 'WORKING' | 'RESOLVED' => {
    const s = (st || '').toUpperCase();
    if (s === 'RESOLVED' || s === 'DISMISSED') return 'RESOLVED';
    if (s === 'WORKING' || s === 'IN_PROGRESS' || s === 'INVESTIGATING') return 'WORKING';
    return 'PENDING'; // 'OPEN' or other default
  };

  // Grouped lists for the side panel
  const pendingList = discrepancies.filter((d) => getCategory(d.status) === 'PENDING');
  const workingList = discrepancies.filter((d) => getCategory(d.status) === 'WORKING');
  const resolvedList = discrepancies.filter((d) => getCategory(d.status) === 'RESOLVED');

  // Filtered list for the main table
  const filteredDiscrepancies = discrepancies.filter((d) => {
    const cat = getCategory(d.status);
    if (statusFilter !== 'ALL' && cat !== statusFilter) return false;
    if (severityFilter !== 'ALL' && d.severity !== severityFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchInst = (d.institution_name || '').toLowerCase().includes(q);
      const matchCode = (d.institution_code || '').toLowerCase().includes(q);
      const matchFdr = (d.fdr_number || '').toLowerCase().includes(q);
      const matchBank = (d.bank_name || '').toLowerCase().includes(q);
      const matchField = (d.field_name || '').toLowerCase().includes(q);
      const matchReason = (d.extracted_value || '').toLowerCase().includes(q);
      return matchInst || matchCode || matchFdr || matchBank || matchField || matchReason;
    }
    return true;
  });

  const openActionModal = (disc: DiscrepancyRecord, defaultStatus: 'WORKING' | 'RESOLVED') => {
    setSelectedDisc(disc);
    setActionStatus(defaultStatus);
    setActionRemarks(
      disc.resolution_remarks ||
        (defaultStatus === 'WORKING'
          ? 'Under active investigation by AICTE Competent Authority with issuing bank and technical institute.'
          : 'Reconciled and verified against official bank records.')
    );
    setActionVerifiedVal(disc.verified_value || disc.submitted_value || '');
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisc) return;
    setSubmittingAction(true);
    try {
      await api.put(`/discrepancies/${selectedDisc.id}/resolve`, {
        status: actionStatus,
        resolution_remarks: actionRemarks,
        verified_value: actionVerifiedVal,
      });
      setSelectedDisc(null);
      await fetchDiscrepancies();
    } catch (err) {
      alert('Failed to update discrepancy action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - High-Contrast Polished Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1.5 shadow-2xs">
                <Gavel className="w-3 h-3 text-amber-700" />
                <span>Action Desk • Competent Authority</span>
              </span>
              <span className="text-slate-500 text-xs font-semibold">AICTE Regulatory Oversight</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span>Discrepancy & Anomaly Action Center</span>
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Executive oversight on technical institution FDR mismatches flagged by AI OCR and Core Banking System (CBS) checks. Review full institution dossiers and manage real-time resolution workflows.
            </p>
          </div>

          <button
            onClick={fetchDiscrepancies}
            className="self-start md:self-center flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-all border border-slate-300 shadow-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* 3 Status KPI Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-5 border-t border-slate-100">
          <div
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/40 shadow-xs'
                : 'bg-rose-50/50 border-rose-200/80 hover:bg-rose-50 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span>Pending Action</span>
              </span>
              <span className="text-2xl font-mono font-extrabold text-rose-950">{pendingList.length}</span>
            </div>
            <p className="text-[11px] text-rose-700 font-medium mt-1">Discrepancies awaiting authority investigation</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'WORKING' ? 'ALL' : 'WORKING')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              statusFilter === 'WORKING'
                ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400/40 shadow-xs'
                : 'bg-sky-50/50 border-sky-200/80 hover:bg-sky-50 hover:border-sky-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Working / Investigating</span>
              </span>
              <span className="text-2xl font-mono font-extrabold text-sky-950">{workingList.length}</span>
            </div>
            <p className="text-[11px] text-sky-700 font-medium mt-1">Active correspondence with bank & institute</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'RESOLVED' ? 'ALL' : 'RESOLVED')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40 shadow-xs'
                : 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Resolved & Settled</span>
              </span>
              <span className="text-2xl font-mono font-extrabold text-emerald-950">{resolvedList.length}</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">Reconciled with official bank confirmation</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Detailed Table with Institute Details; Right = Sidely Status Worklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Discrepancies with full Institute Details */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by institute name, code, FDR number, or bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gov-navy-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                {(['ALL', 'PENDING', 'WORKING', 'RESOLVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      statusFilter === st
                        ? 'bg-gov-navy-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Discrepancies List with Institute Details */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Loading discrepancy records from national repository...
            </div>
          ) : filteredDiscrepancies.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-semibold text-slate-700">No discrepancies match the active filters</div>
              <p className="text-[11px] text-slate-400">All FDR instruments are verified or no records meet criteria.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredDiscrepancies.map((disc) => {
                const category = getCategory(disc.status);

                return (
                  <div
                    key={disc.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-3.5"
                  >
                    {/* Top Row: Institute Header + Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gov-navy-700 shrink-0" />
                          <span className="font-bold text-sm text-slate-900">
                            {disc.institution_name || 'AICTE Technical Institute'}
                          </span>
                          {disc.institution_code && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-semibold rounded">
                              {disc.institution_code}
                            </span>
                          )}
                          {disc.institution_state && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              • {disc.institution_state}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Bank: <strong className="text-slate-700">{disc.bank_name || 'Commercial Bank'}</strong></span>
                          <span>•</span>
                          <span>FDR: <strong className="font-mono text-slate-800">{disc.fdr_number}</strong></span>
                          {disc.amount && (
                            <>
                              <span>•</span>
                              <span>Pledged: <strong className="text-slate-800">₹{Number(disc.amount).toLocaleString('en-IN')}</strong></span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                            disc.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : disc.severity === 'HIGH'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {disc.severity}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full flex items-center gap-1 ${
                            category === 'PENDING'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : category === 'WORKING'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {category === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                          {category === 'WORKING' && <Clock className="w-3 h-3 text-sky-500" />}
                          {category === 'RESOLVED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          <span>{category}</span>
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Mismatch Comparison Box */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span className="uppercase tracking-wider">Field: {disc.field_name}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          Flagged: {disc.created_at.replace('T', ' ').slice(0, 16)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase">Institution Form Value</div>
                          <div className="font-medium text-slate-800 mt-0.5">
                            {disc.submitted_value || 'None provided'}
                          </div>
                        </div>
                        <div className="p-2.5 bg-rose-50/70 rounded-lg border border-rose-200 text-rose-950">
                          <div className="text-[10px] font-bold text-rose-700 uppercase">Bank CBS / AI OCR Extraction</div>
                          <div className="font-semibold mt-0.5">
                            {disc.extracted_value || 'Unconfirmed in bank ledger'}
                          </div>
                        </div>
                      </div>

                      {disc.resolution_remarks && (
                        <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Authority Note:</strong> {disc.resolution_remarks}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        onClick={() => navigate(`/fdrs/${disc.fdr_id}`)}
                        className="text-xs font-semibold text-gov-navy-700 hover:text-gov-navy-900 flex items-center gap-1 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View FDR Dossier</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {category !== 'WORKING' && (
                          <button
                            onClick={() => openActionModal(disc, 'WORKING')}
                            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            <span>Mark as Working</span>
                          </button>
                        )}
                        {category !== 'RESOLVED' && (
                          <button
                            onClick={() => openActionModal(disc, 'RESOLVED')}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolve Discrepancy</span>
                          </button>
                        )}
                        {category === 'RESOLVED' && (
                          <button
                            onClick={() => openActionModal(disc, 'WORKING')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Re-open Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side Panel (4 cols): Sidely Showing Discrepancies - Resolved, Working, Pending */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Live Status Worklist</h3>
                <p className="text-[11px] text-slate-400">Sidely discrepancy state tracker</p>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                {discrepancies.length} Total
              </span>
            </div>

            {/* Section 1: Pending Discrepancies */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Pending ({pendingList.length})</span>
                </span>
                <span className="text-[10px] font-semibold text-rose-600">Action Required</span>
              </div>

              {pendingList.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-[11px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No pending discrepancies.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {pendingList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openActionModal(item, 'WORKING')}
                      className="p-3 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800">{item.fdr_number}</span>
                        <span className="text-[10px] font-bold text-rose-600 group-hover:translate-x-0.5 transition-transform flex items-center">
                          Action &rarr;
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-700 truncate mt-0.5">
                        {item.institution_name || 'Technical Institute'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        Field: <strong className="text-slate-700">{item.field_name}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Working / Investigating Discrepancies */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Working ({workingList.length})</span>
                </span>
                <span className="text-[10px] font-semibold text-sky-600">Under Inquiry</span>
              </div>

              {workingList.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-[11px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No active investigations in progress.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {workingList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openActionModal(item, 'RESOLVED')}
                      className="p-3 bg-white hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800">{item.fdr_number}</span>
                        <span className="text-[10px] font-bold text-sky-600 group-hover:translate-x-0.5 transition-transform flex items-center">
                          Resolve &rarr;
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-700 truncate mt-0.5">
                        {item.institution_name || 'Technical Institute'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {item.resolution_remarks || 'Investigating with commercial bank'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Resolved Discrepancies */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Resolved ({resolvedList.length})</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">Settled</span>
              </div>

              {resolvedList.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-[11px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No resolved records yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {resolvedList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/fdrs/${item.fdr_id}`)}
                      className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800">{item.fdr_number}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="text-[11px] font-medium text-slate-700 truncate mt-0.5">
                        {item.institution_name || 'Technical Institute'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {item.resolution_remarks || 'Reconciled & verified'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Execution Modal */}
      {selectedDisc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gov-navy-50 text-gov-navy-800 rounded-xl">
                  <Gavel className="w-5 h-5 text-gov-navy-800" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Execute Authority Action</h3>
                  <p className="text-[11px] text-slate-500">
                    FDR: <strong className="font-mono">{selectedDisc.fdr_number}</strong> • {selectedDisc.institution_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDisc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Action Status Decision</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActionStatus('WORKING')}
                    className={`p-3 rounded-xl border text-left font-semibold transition-all ${
                      actionStatus === 'WORKING'
                        ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-sky-800 font-bold mb-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Mark Working</span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500">
                      Initiate inquiry with issuing bank & technical institute
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionStatus('RESOLVED')}
                    className={`p-3 rounded-xl border text-left font-semibold transition-all ${
                      actionStatus === 'RESOLVED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolve & Close</span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500">
                      Reconcile mismatch and mark instrument verified
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Verified / Sanctioned Value
                </label>
                <input
                  type="text"
                  value={actionVerifiedVal}
                  onChange={(e) => setActionVerifiedVal(e.target.value)}
                  placeholder="Official reconciled amount, date, or bank confirmation reference..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gov-navy-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Authority Investigation Remarks & Audit Note
                </label>
                <textarea
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Detail the correspondence or reason for status update..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gov-navy-600 focus:bg-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDisc(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-semibold bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submittingAction ? 'Recording Action...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
