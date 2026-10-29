import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Building2,
  Landmark,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Sparkles,
  Hash,
  ArrowUpDown,
  Layers,
  ExternalLink,
  X,
  ShieldCheck,
  Check,
  Copy,
  Gavel,
} from 'lucide-react';
import { api } from '../../services/api';
import { DiscrepancyRecord } from '../../types/fdr';
import { Institution } from '../../types/institution';
import { useAuth } from '../../context/AuthContext';

interface CollegeDiscrepancyGroup {
  institutionKey: string;
  institutionName: string;
  institutionCode: string;
  institutionState: string;
  totalCount: number;
  pendingCount: number;
  workingCount: number;
  resolvedCount: number;
  criticalCount: number;
  highCount: number;
  items: (DiscrepancyRecord & {
    discrepancyNumber: string;
    itemIndex: number;
  })[];
}

export const DiscrepanciesHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRecord[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'WORKING' | 'RESOLVED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>('ALL');
  const [showZeroDiscrepancyColleges, setShowZeroDiscrepancyColleges] = useState<boolean>(false);

  // Expand / Collapse state per College
  const [expandedColleges, setExpandedColleges] = useState<Record<string, boolean>>({});

  // Detail Modal
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<
    (DiscrepancyRecord & { discrepancyNumber?: string; itemIndex?: number }) | null
  >(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [discRes, instRes] = await Promise.all([
        api.get<DiscrepancyRecord[]>('/discrepancies'),
        api.get<Institution[]>('/institutions').catch(() => ({ data: [] })),
      ]);
      setDiscrepancies(discRes.data || []);
      setInstitutions(instRes.data || []);

      // Default expand all colleges that have discrepancies
      const initialExpanded: Record<string, boolean> = {};
      (discRes.data || []).forEach((d) => {
        const key = d.institution_name || 'Unassigned Technical Institute';
        initialExpanded[key] = true;
      });
      setExpandedColleges((prev) => ({ ...initialExpanded, ...prev }));
    } catch (err) {
      console.error('Failed to load discrepancies history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCategory = (st: string): 'PENDING' | 'WORKING' | 'RESOLVED' => {
    const s = (st || '').toUpperCase();
    if (s === 'RESOLVED' || s === 'DISMISSED') return 'RESOLVED';
    if (s === 'WORKING' || s === 'IN_PROGRESS' || s === 'INVESTIGATING') return 'WORKING';
    return 'PENDING';
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group discrepancies by College / Institute
  const collegeGroups = useMemo(() => {
    const map = new Map<string, CollegeDiscrepancyGroup>();

    // 1. Group discrepancies by college
    discrepancies.forEach((d) => {
      const key = d.institution_name || 'Unassigned Technical Institute';
      if (!map.has(key)) {
        map.set(key, {
          institutionKey: key,
          institutionName: key,
          institutionCode: d.institution_code || 'AICTE-REG',
          institutionState: d.institution_state || 'N/A',
          totalCount: 0,
          pendingCount: 0,
          workingCount: 0,
          resolvedCount: 0,
          criticalCount: 0,
          highCount: 0,
          items: [],
        });
      }
      const group = map.get(key)!;
      const cat = getCategory(d.status);
      group.totalCount += 1;
      if (cat === 'PENDING') group.pendingCount += 1;
      if (cat === 'WORKING') group.workingCount += 1;
      if (cat === 'RESOLVED') group.resolvedCount += 1;
      if (d.severity === 'CRITICAL') group.criticalCount += 1;
      if (d.severity === 'HIGH') group.highCount += 1;

      const shortId = (d.id || '').replace(/-/g, '').slice(0, 6).toUpperCase();
      const codeRef = (d.institution_code || 'INST').replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase();
      const discrepancyNumber = `DISC-${codeRef}-${shortId}`;

      group.items.push({
        ...d,
        discrepancyNumber,
        itemIndex: group.items.length + 1,
      });
    });

    // 2. If showZeroDiscrepancyColleges is true, add colleges from institutions list that have 0 discrepancies
    if (showZeroDiscrepancyColleges) {
      institutions.forEach((inst) => {
        if (!map.has(inst.name)) {
          map.set(inst.name, {
            institutionKey: inst.name,
            institutionName: inst.name,
            institutionCode: inst.code,
            institutionState: inst.state,
            totalCount: 0,
            pendingCount: 0,
            workingCount: 0,
            resolvedCount: 0,
            criticalCount: 0,
            highCount: 0,
            items: [],
          });
        }
      });
    }

    // Convert map to array and sort by highest discrepancies first
    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (b.totalCount !== a.totalCount) {
        return b.totalCount - a.totalCount; // most discrepancies first
      }
      return a.institutionName.localeCompare(b.institutionName);
    });

    return list;
  }, [discrepancies, institutions, showZeroDiscrepancyColleges]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalDiscrepancies = discrepancies.length;
    let totalPending = 0;
    let totalWorking = 0;
    let totalResolved = 0;
    let totalCritical = 0;

    discrepancies.forEach((d) => {
      const cat = getCategory(d.status);
      if (cat === 'PENDING') totalPending += 1;
      if (cat === 'WORKING') totalWorking += 1;
      if (cat === 'RESOLVED') totalResolved += 1;
      if (d.severity === 'CRITICAL') totalCritical += 1;
    });

    const collegesWithDiscrepancies = collegeGroups.filter((g) => g.totalCount > 0).length;
    const totalColleges = Math.max(institutions.length, collegeGroups.length);

    return {
      totalDiscrepancies,
      totalPending,
      totalWorking,
      totalResolved,
      totalCritical,
      collegesWithDiscrepancies,
      totalColleges,
    };
  }, [discrepancies, institutions, collegeGroups]);

  // Filtered groups based on search & filter controls
  const filteredGroups = useMemo(() => {
    return collegeGroups
      .filter((group) => {
        if (selectedCollegeFilter !== 'ALL' && group.institutionKey !== selectedCollegeFilter) {
          return false;
        }

        // Search in institute name, code, state
        const query = searchTerm.toLowerCase().trim();
        if (query) {
          const matchInstName = group.institutionName.toLowerCase().includes(query);
          const matchInstCode = group.institutionCode.toLowerCase().includes(query);
          const matchInstState = group.institutionState.toLowerCase().includes(query);

          // Check if any of its discrepancies match search
          const matchItem = group.items.some(
            (item) =>
              (item.discrepancyNumber || '').toLowerCase().includes(query) ||
              (item.fdr_number || '').toLowerCase().includes(query) ||
              (item.bank_name || '').toLowerCase().includes(query) ||
              (item.field_name || '').toLowerCase().includes(query) ||
              (item.extracted_value || '').toLowerCase().includes(query) ||
              (item.submitted_value || '').toLowerCase().includes(query) ||
              (item.resolution_remarks || '').toLowerCase().includes(query)
          );

          if (!matchInstName && !matchInstCode && !matchInstState && !matchItem) {
            return false;
          }
        }
        return true;
      })
      .map((group) => {
        // Filter items within group
        const filteredItems = group.items.filter((item) => {
          const cat = getCategory(item.status);
          if (statusFilter !== 'ALL' && cat !== statusFilter) return false;
          if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;

          const query = searchTerm.toLowerCase().trim();
          if (query) {
            const matchInst =
              group.institutionName.toLowerCase().includes(query) ||
              group.institutionCode.toLowerCase().includes(query);
            const matchItem =
              (item.discrepancyNumber || '').toLowerCase().includes(query) ||
              (item.fdr_number || '').toLowerCase().includes(query) ||
              (item.bank_name || '').toLowerCase().includes(query) ||
              (item.field_name || '').toLowerCase().includes(query) ||
              (item.extracted_value || '').toLowerCase().includes(query) ||
              (item.submitted_value || '').toLowerCase().includes(query) ||
              (item.resolution_remarks || '').toLowerCase().includes(query);
            return matchInst || matchItem;
          }
          return true;
        });

        return {
          ...group,
          filteredItems,
        };
      })
      .filter((group) => {
        // If status or severity filters are active, only show groups with matching items
        if (statusFilter !== 'ALL' || severityFilter !== 'ALL') {
          return group.filteredItems.length > 0;
        }
        return true;
      });
  }, [collegeGroups, searchTerm, statusFilter, severityFilter, selectedCollegeFilter]);

  const toggleCollege = (key: string) => {
    setExpandedColleges((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    collegeGroups.forEach((g) => {
      next[g.institutionKey] = true;
    });
    setExpandedColleges(next);
  };

  const collapseAll = () => {
    setExpandedColleges({});
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - High-Contrast Polished Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-1.5 shadow-2xs">
                <History className="w-3 h-3 text-indigo-700" />
                <span>Competent Authority Regulatory Oversight</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                Institutional Audit Ledger
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <span>Discrepancies History</span>
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Permanent institutional audit ledger tracking all discrepancies identified across technical colleges
              and universities. Review historical discrepancy counts per institution with unique sequential tracking numbers
              and current resolution states.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
            <button
              onClick={() => navigate('/action')}
              className="flex items-center gap-2 px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
            >
              <Gavel className="w-3.5 h-3.5 text-amber-400" />
              <span>Open Action Queue</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5 border-t border-slate-100">
          <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-600" />
              <span>Colleges Flagged</span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-slate-900 mt-1">
              {stats.collegesWithDiscrepancies}
              <span className="text-xs font-sans text-slate-400 font-normal ml-1">/ {stats.totalColleges}</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Affiliated Institutions</p>
          </div>

          <div className="p-3.5 rounded-xl border bg-indigo-50/70 border-indigo-200 shadow-2xs">
            <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-700" />
              <span>Total Discrepancies</span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-indigo-950 mt-1">{stats.totalDiscrepancies}</div>
            <p className="text-[10px] text-indigo-700 font-medium mt-0.5">Across All Colleges</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all shadow-2xs ${
              statusFilter === 'PENDING'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/40'
                : 'bg-rose-50/70 border-rose-200 hover:bg-rose-50 hover:border-rose-300'
            }`}
          >
            <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <span>Pending Action</span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-rose-950 mt-1">{stats.totalPending}</div>
            <p className="text-[10px] text-rose-700 font-medium mt-0.5">Awaiting Reconcile</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'WORKING' ? 'ALL' : 'WORKING')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all shadow-2xs ${
              statusFilter === 'WORKING'
                ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-400/40'
                : 'bg-sky-50/70 border-sky-200 hover:bg-sky-50 hover:border-sky-300'
            }`}
          >
            <div className="text-[10px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-600" />
              <span>Working</span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-sky-950 mt-1">{stats.totalWorking}</div>
            <p className="text-[10px] text-sky-700 font-medium mt-0.5">Under Investigation</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'RESOLVED' ? 'ALL' : 'RESOLVED')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all shadow-2xs ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/40'
                : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
            }`}
          >
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Resolved</span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-emerald-950 mt-1">{stats.totalResolved}</div>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Officially Settled</p>
          </div>

          <div
            onClick={() => setSeverityFilter(severityFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all shadow-2xs ${
              severityFilter === 'CRITICAL'
                ? 'bg-red-50 border-red-400 ring-2 ring-red-400/40'
                : 'bg-red-50/60 border-red-200 hover:bg-red-50 hover:border-red-300'
            }`}
          >
            <div className="text-[10px] font-bold text-red-800 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span>Critical Severity</span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-red-950 mt-1">{stats.totalCritical}</div>
            <p className="text-[10px] text-red-700 font-medium mt-0.5">High Regulatory Risk</p>
          </div>
        </div>
      </div>

      {/* College Quick-Select / Risk Overview Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gov-navy-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Institutes by Discrepancies Volume
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              (Select an institute to filter or jump to history)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowZeroDiscrepancyColleges(!showZeroDiscrepancyColleges)}
              className="text-[11px] text-slate-600 hover:text-gov-navy-800 font-medium underline transition-colors"
            >
              {showZeroDiscrepancyColleges ? 'Hide Clean Colleges' : 'Show All Colleges (incl. 0 discrepancies)'}
            </button>
          </div>
        </div>

        {/* College Badges Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCollegeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCollegeFilter === 'ALL'
                ? 'bg-gov-navy-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Institutions ({collegeGroups.length})</span>
          </button>

          {collegeGroups.map((g) => {
            const isSelected = selectedCollegeFilter === g.institutionKey;
            const hasIssues = g.totalCount > 0;
            return (
              <button
                key={g.institutionKey}
                onClick={() => setSelectedCollegeFilter(isSelected ? 'ALL' : g.institutionKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-indigo-900 text-white border-indigo-700 shadow-xs'
                    : hasIssues
                    ? 'bg-rose-50/70 hover:bg-rose-100/70 text-slate-800 border-rose-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold truncate max-w-[200px]" title={g.institutionName}>
                  {g.institutionName}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : g.totalCount > 0
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {g.totalCount} {g.totalCount === 1 ? 'issue' : 'issues'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by college name, code, FDR number, discrepancy # (e.g. DISC-...), or field..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gov-navy-600 focus:bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            {(['ALL', 'PENDING', 'WORKING', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-gov-navy-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity Dropdown */}
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

          {/* Expand/Collapse All Buttons */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              onClick={expandAll}
              className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-gov-navy-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Expand all college histories"
            >
              Expand All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={collapseAll}
              className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-gov-navy-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Collapse all college histories"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Main List: Colleges with Full Discrepancies History */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-gov-navy-600 animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">Loading Discrepancies History...</h3>
          <p className="text-xs text-slate-500 mt-1">Retrieving institutional discrepancy audit trail from secure records.</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Discrepancies Match the Criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'ALL' || severityFilter !== 'ALL' || selectedCollegeFilter !== 'ALL'
              ? 'No college discrepancies matched your selected search or filter parameters. Try clearing filters.'
              : 'All technical colleges have completely reconciled FDR records. No discrepancies recorded.'}
          </p>
          {(searchTerm || statusFilter !== 'ALL' || severityFilter !== 'ALL' || selectedCollegeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setSeverityFilter('ALL');
                setSelectedCollegeFilter('ALL');
              }}
              className="px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedColleges[group.institutionKey] !== false;
            const itemsToRender = group.filteredItems;

            return (
              <div
                key={group.institutionKey}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* College Header Box */}
                <div
                  onClick={() => toggleCollege(group.institutionKey)}
                  className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50/60 border-b border-slate-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-gov-navy-900 text-white shadow-xs shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5 text-teal-300" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-black text-slate-900 tracking-tight">
                          {group.institutionName}
                        </h2>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono font-bold rounded-md">
                          {group.institutionCode}
                        </span>
                        {group.institutionState && (
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-semibold rounded-md">
                            {group.institutionState}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Technical Education Institute • Verified Affiliated Body
                      </p>
                    </div>
                  </div>

                  {/* Discrepancies Count Badge & Breakdown */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Big Discrepancy Count Badge */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 border shadow-2xs ${
                          group.totalCount > 0
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {group.totalCount > 0 ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        )}
                        <span>
                          {group.totalCount} {group.totalCount === 1 ? 'Discrepancy Made' : 'Discrepancies Made'}
                        </span>
                      </div>
                    </div>

                    {/* Status Breakdown Pills */}
                    <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold">
                      {group.pendingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                          {group.pendingCount} Pending
                        </span>
                      )}
                      {group.workingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">
                          {group.workingCount} Working
                        </span>
                      )}
                      {group.resolvedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {group.resolvedCount} Resolved
                        </span>
                      )}
                    </div>

                    {/* Toggle Chevron */}
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors"
                      title={isExpanded ? 'Collapse History' : 'Expand History'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* History Ledger Table for this College */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    {itemsToRender.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No discrepancies recorded for this college under current status/severity filter.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4 w-40">Discrepancy #</th>
                            <th className="py-3 px-4">FDR Instrument</th>
                            <th className="py-3 px-4">Mismatch Category</th>
                            <th className="py-3 px-4">Document vs CBS Verification</th>
                            <th className="py-3 px-4">Severity</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Recorded Date</th>
                            <th className="py-3 px-4 text-right">Audit Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {itemsToRender.map((item, idx) => {
                            const cat = getCategory(item.status);
                            const severity = (item.severity || 'HIGH').toUpperCase();

                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/70 transition-colors group"
                              >
                                {/* Discrepancy Number */}
                                <td className="py-3.5 px-4 font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-slate-400">
                                      #{item.itemIndex}
                                    </span>
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-md font-bold text-[11px] tracking-tight">
                                      {item.discrepancyNumber}
                                    </span>
                                    <button
                                      onClick={() => handleCopy(item.discrepancyNumber, item.id)}
                                      className="p-1 text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                                      title="Copy Discrepancy #"
                                    >
                                      {copiedId === item.id ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[140px] font-mono mt-0.5">
                                    UUID: {item.id.slice(0, 8)}...
                                  </div>
                                </td>

                                {/* FDR Instrument */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                    <FileText className="w-3.5 h-3.5 text-gov-navy-600 shrink-0" />
                                    <span>{item.fdr_number || 'N/A'}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {item.bank_name || 'Issuing Bank'}
                                    {item.amount ? ` • ${formatCurrency(item.amount)}` : ''}
                                  </div>
                                </td>

                                {/* Mismatch Category & Field */}
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-slate-800 capitalize">
                                    {(item.field_name || 'Verification Check').replace(/_/g, ' ')}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">
                                    {item.discrepancy_type || 'CBS_DATA_MISMATCH'}
                                  </div>
                                </td>

                                {/* Document vs CBS Verification */}
                                <td className="py-3.5 px-4 max-w-xs">
                                  <div className="space-y-1">
                                    {item.submitted_value && (
                                      <div className="text-[11px] text-slate-700">
                                        <span className="font-semibold text-slate-500">Submitted FDR:</span>{' '}
                                        <span className="font-mono bg-rose-50 px-1 py-0.5 rounded text-rose-900 border border-rose-100">
                                          {item.submitted_value}
                                        </span>
                                      </div>
                                    )}
                                    {item.extracted_value && (
                                      <div className="text-[11px] text-slate-700">
                                        <span className="font-semibold text-slate-500">Bank CBS Record:</span>{' '}
                                        <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-900 border border-slate-200">
                                          {item.extracted_value}
                                        </span>
                                      </div>
                                    )}
                                    {item.verified_value && (
                                      <div className="text-[11px] text-emerald-800 font-semibold">
                                        Verified Reconciled: {item.verified_value}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Severity */}
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                                      severity === 'CRITICAL'
                                        ? 'bg-red-100 text-red-800 border-red-200'
                                        : severity === 'HIGH'
                                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                                        : severity === 'MEDIUM'
                                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {severity}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 w-max border ${
                                      cat === 'RESOLVED'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : cat === 'WORKING'
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : 'bg-rose-50 text-rose-700 border-rose-300'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        cat === 'RESOLVED'
                                          ? 'bg-emerald-500'
                                          : cat === 'WORKING'
                                          ? 'bg-amber-500 animate-pulse'
                                          : 'bg-rose-500'
                                      }`}
                                    ></span>
                                    <span>{cat}</span>
                                  </span>
                                  {item.resolution_remarks && (
                                    <div
                                      className="text-[10px] text-slate-500 truncate max-w-[130px] mt-1"
                                      title={item.resolution_remarks}
                                    >
                                      {item.resolution_remarks}
                                    </div>
                                  )}
                                </td>

                                {/* Recorded Date */}
                                <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                                  {formatDate(item.created_at)}
                                </td>

                                {/* Action */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedDiscrepancy(item)}
                                      className="p-1.5 text-slate-400 hover:text-gov-navy-800 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="Inspect Audit Record"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => navigate(`/fdrs/${item.fdr_id}`)}
                                      className="p-1.5 text-slate-400 hover:text-gov-navy-800 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="View FDR Details"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Discrepancy Inspection Modal */}
      {selectedDiscrepancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-gov-navy-950 to-gov-navy-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Institutional Discrepancy Ledger Record</h3>
                  <p className="text-[11px] text-slate-300">
                    Official tracking reference:{' '}
                    <span className="font-mono text-teal-300 font-bold">
                      {selectedDiscrepancy.discrepancyNumber || selectedDiscrepancy.id}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDiscrepancy(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Institution Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Technical College / Institution
                </div>
                <div className="font-bold text-sm text-slate-900">
                  {selectedDiscrepancy.institution_name || 'N/A'}
                </div>
                <div className="text-slate-500 flex items-center gap-2">
                  <span>Code: <span className="font-mono font-semibold text-slate-800">{selectedDiscrepancy.institution_code || 'N/A'}</span></span>
                  <span>•</span>
                  <span>State: <span className="font-semibold text-slate-800">{selectedDiscrepancy.institution_state || 'N/A'}</span></span>
                </div>
              </div>

              {/* FDR Instrument Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FDR Instrument</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedDiscrepancy.fdr_number || 'N/A'}</div>
                  <div className="text-[11px] text-slate-500">{selectedDiscrepancy.bank_name || 'Bank N/A'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Principal Amount</div>
                  <div className="font-bold text-slate-800 mt-0.5">{formatCurrency(selectedDiscrepancy.amount)}</div>
                  <div className="text-[11px] text-slate-500">Security Deposit Ledger</div>
                </div>
              </div>

              {/* Mismatch Breakdown */}
              <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900 uppercase tracking-wider text-[11px]">
                    Mismatch Details • {(selectedDiscrepancy.field_name || '').replace(/_/g, ' ')}
                  </span>
                  <span className="px-2 py-0.5 bg-rose-200 text-rose-900 font-bold rounded text-[10px]">
                    {selectedDiscrepancy.severity} SEVERITY
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 bg-white rounded-lg border border-rose-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Submitted Document Value</div>
                    <div className="font-mono text-slate-900 font-bold mt-0.5">
                      {selectedDiscrepancy.submitted_value || 'N/A'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-rose-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Bank CBS Ledger Value</div>
                    <div className="font-mono text-slate-900 font-bold mt-0.5">
                      {selectedDiscrepancy.extracted_value || 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedDiscrepancy.verified_value && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                    <div className="text-[10px] font-semibold uppercase">Official Verified Reconciled Value</div>
                    <div className="font-mono font-bold mt-0.5">{selectedDiscrepancy.verified_value}</div>
                  </div>
                )}
              </div>

              {/* Status & Remarks */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Status</div>
                  <span className="font-bold text-slate-800 uppercase">{selectedDiscrepancy.status}</span>
                </div>
                {selectedDiscrepancy.resolution_remarks ? (
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700 italic">
                    "{selectedDiscrepancy.resolution_remarks}"
                  </div>
                ) : (
                  <div className="text-slate-400 text-[11px]">No resolution remarks recorded yet.</div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <div>Logged on: {formatDate(selectedDiscrepancy.created_at)}</div>
                {selectedDiscrepancy.updated_at && (
                  <div>Last Updated: {formatDate(selectedDiscrepancy.updated_at)}</div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => navigate(`/fdrs/${selectedDiscrepancy.fdr_id}`)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Go to FDR Record</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/action')}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Update in Action Queue</span>
                </button>
                <button
                  onClick={() => setSelectedDiscrepancy(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
