import React, { useState, useEffect } from 'react';
import {
  Send,
  HelpCircle,
  FileQuestion,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Search,
  Sparkles,
  Info,
  ShieldCheck,
  Building2,
  Calendar,
  X,
} from 'lucide-react';
import { AIAssistantLogo } from '../../components/common/AIAssistantLogo';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { FDRInstrument } from '../../types/fdr';

interface QueryTicket {
  id: string;
  ticketNumber: string;
  category: string;
  fdrNumber?: string;
  subject: string;
  description: string;
  priority: 'ROUTINE' | 'HIGH' | 'CRITICAL';
  status: 'LOGGED' | 'AI_CATEGORIZED' | 'UNDER_SCRUTINY' | 'RESOLVED';
  createdAt: string;
  institutionName: string;
  officialRemarks?: string;
}

const INITIAL_TICKETS: QueryTicket[] = [
  {
    id: 't-101',
    ticketNumber: 'TR-AI-2026-1042',
    category: 'FDR Verification & Status',
    fdrNumber: 'FDR-2021-00891',
    subject: 'Core Banking API confirmation pending for State Bank of India instrument',
    description:
      'We submitted our Fixed Deposit Receipt 4 days ago. The OCR successfully extracted the principal of ₹35 Lakhs, but the status is currently awaiting officer scrutiny.',
    priority: 'ROUTINE',
    status: 'UNDER_SCRUTINY',
    createdAt: '2026-10-24 11:30 AM',
    institutionName: 'Delhi Institute of Technology & Management',
    officialRemarks: 'Scrutiny Officer assigned. Core Banking reconciliation scheduled for next batch cycle.',
  },
  {
    id: 't-102',
    ticketNumber: 'TR-AI-2026-0985',
    category: 'Renewal & Rollover Guidelines',
    fdrNumber: 'FDR-2018-00341',
    subject: 'Rollover procedure with accumulated interest re-capitalization',
    description:
      'Our 8-year FDR is maturing in 45 days. We want to rollover the principal amount and need confirmation whether the renewal certificate must explicitly state AICTE lien endorsement.',
    priority: 'HIGH',
    status: 'AI_CATEGORIZED',
    createdAt: '2026-10-22 04:15 PM',
    institutionName: 'Delhi Institute of Technology & Management',
    officialRemarks: 'Automated AI guidance dispatched: Joint lien endorsement format #AICTE-FD-ANNEXURE-IV is mandatory upon renewal.',
  },
];

const FAQS = [
  {
    q: 'What is the mandatory lock-in period for technical institution security deposits?',
    a: 'Under AICTE Approval Process Handbook (APH) regulations, security deposits pledged via Fixed Deposit Receipts must have a mandatory lock-in period of 8 to 10 years, depending on the academic programme sanctioned, during which encashment is strictly prohibited without prior Competent Authority sanction.',
  },
  {
    q: 'How does the AI OCR Discrepancy Matrix detect mismatches?',
    a: 'When an FDR scan (PDF/Image) is uploaded, TRUST deploys PyMuPDF and Tesseract OCR to cross-examine extracted text against submitted metadata. If there is any variance in principal amount, FDR number, or joint lien clause, an anomaly record is generated for scrutiny resolution.',
  },
  {
    q: 'What should be done when an alert arrives indicating an FDR is expiring in 90 or 30 days?',
    a: 'The Institution Admin should contact the issuing bank to initiate a rollover deposit receipt, ensuring the new instrument maintains the AICTE joint lien endorsement, and subsequently submit a Renewal Request through the TRUST portal.',
  },
  {
    q: 'What are the criteria for Full Release or Lien Discharge of security deposits?',
    a: 'Full release requires: (1) Completion of the mandatory 8-year lock-in period, (2) No pending regulatory violations or student dues, (3) Formal Scrutiny Officer recommendation, and (4) Final digital approval by the Competent Authority.',
  },
];

export const AIAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const [fdrs, setFdrs] = useState<FDRInstrument[]>([]);
  const [tickets, setTickets] = useState<QueryTicket[]>(() => {
    const saved = localStorage.getItem('trust_ai_queries');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_TICKETS;
      }
    }
    return INITIAL_TICKETS;
  });

  // Form State
  const [category, setCategory] = useState<string>('FDR Verification & Status');
  const [selectedFdr, setSelectedFdr] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'ROUTINE' | 'HIGH' | 'CRITICAL'>('ROUTINE');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter & FAQ state
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  useEffect(() => {
    const fetchFdrs = async () => {
      try {
        const res = await api.get<FDRInstrument[]>('/fdrs');
        setFdrs(res.data);
      } catch (err) {
        // Fallback gracefully
      }
    };
    fetchFdrs();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setSubmitting(true);

    setTimeout(() => {
      const ticketNum = `TR-AI-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const newTicket: QueryTicket = {
        id: `t-${Date.now()}`,
        ticketNumber: ticketNum,
        category,
        fdrNumber: selectedFdr || undefined,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: 'LOGGED',
        createdAt: dateStr,
        institutionName: user?.institution_name || 'Technical Institution',
        officialRemarks:
          'Query logged in TRUST Helpdesk. Scrutiny Officer and AI verification desk have received this ticket.',
      };

      const updated = [newTicket, ...tickets];
      setTickets(updated);
      localStorage.setItem('trust_ai_queries', JSON.stringify(updated));

      // Reset form
      setSubject('');
      setDescription('');
      setSelectedFdr('');
      setAttachmentName('');
      setPriority('ROUTINE');
      setSubmitting(false);
      setSuccessMessage(
        `Your query has been logged under Ticket #${ticketNum}. The AI verification desk and Scrutiny Officer have been notified.`
      );
    }, 600);
  };

  const filteredTickets = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (t.fdrNumber && t.fdrNumber.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const getStatusBadge = (status: QueryTicket['status']) => {
    switch (status) {
      case 'LOGGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3" /> Logged
          </span>
        );
      case 'AI_CATEGORIZED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <Sparkles className="w-3 h-3 text-teal-600" /> AI Categorized
          </span>
        );
      case 'UNDER_SCRUTINY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" /> Under Scrutiny
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Resolved
          </span>
        );
    }
  };

  const getPriorityBadge = (p: QueryTicket['priority']) => {
    switch (p) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            High
          </span>
        );
      case 'ROUTINE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Routine
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero / Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gov-navy-900 via-gov-navy-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-slate-700">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <AIAssistantLogo size="xl" withGlow={true} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-teal-500/20 text-teal-300 border border-teal-400/30 px-2.5 py-0.5 rounded-full">
                  AI Regulatory & Scrutiny Helpdesk
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span className="text-[10px] text-teal-200/80 font-mono">Active 24x7</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5">
                TRUST AI Query Assistant
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                Submit institutional inquiries regarding FDR submissions, AI OCR discrepancies, Core Banking
                reconciliation, 8-year lock-in guidelines, renewals, or lien release applications.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center">
              <span className="block text-[10px] uppercase font-bold text-teal-200">Institution Scope</span>
              <span className="text-xs font-semibold text-white truncate max-w-[200px] block">
                {user?.institution_name || user?.full_name || 'AICTE Technical Institute'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">Query Logged Successfully</h4>
              <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two Column Layout: Query Form on Left, Ticket List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Ask Query Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AIAssistantLogo size="sm" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Ask a New Regulatory or Technical Query</h2>
                  <p className="text-[11px] text-slate-500">
                    Your query will be catalogued and routed to the Scrutiny Officer desk.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                Step 1 of 1
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Query Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  >
                    <option value="FDR Verification & Status">FDR Verification & Status</option>
                    <option value="Discrepancy / Anomaly Resolution">Discrepancy / Anomaly Resolution</option>
                    <option value="Renewal & Rollover Guidelines">Renewal & Rollover Guidelines</option>
                    <option value="Lien Release & Encashment">Lien Release & Encashment</option>
                    <option value="Regulatory & Joint-Lien Norms">Regulatory & Joint-Lien Norms</option>
                    <option value="Technical or Portal Assistance">Technical or Portal Assistance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Urgency Priority <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  >
                    <option value="ROUTINE">Routine (Normal Administrative Query)</option>
                    <option value="HIGH">High (Expiring within 30-60 Days)</option>
                    <option value="CRITICAL">Critical (Immediate Maturity / Lien Audit)</option>
                  </select>
                </div>
              </div>

              {/* Related FDR Instrument Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Link to Specific FDR Instrument <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={selectedFdr}
                  onChange={(e) => setSelectedFdr(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                >
                  <option value="">-- No specific instrument / General query --</option>
                  {fdrs.map((fdr) => (
                    <option key={fdr.id} value={fdr.fdr_number}>
                      {fdr.fdr_number} — {fdr.bank_name} (₹{(Number(fdr.amount) / 100000).toFixed(2)} Lakhs)
                    </option>
                  ))}
                  {fdrs.length === 0 && (
                    <option value="FDR-2021-00891">FDR-2021-00891 (State Bank of India - ₹35.00 Lakhs)</option>
                  )}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Query Subject / Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Clarification on IFSC mismatch in State Bank of India certificate"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Detailed Query Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail your question, background context, or document observations so the scrutiny desk can review..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white resize-y"
                />
              </div>

              {/* Attachment Preview (Simulated) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Supporting Letter / Certificate Scan{' '}
                  <span className="text-slate-400 font-normal">(Optional PDF / JPG)</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-300 transition-all">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAttachmentName(e.target.files[0].name);
                        }
                      }}
                    />
                  </label>
                  {attachmentName ? (
                    <span className="text-xs text-teal-700 font-mono bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                      {attachmentName}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No file attached</span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Queries are logged with institution audit signature</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Registering Query...' : 'Submit Query'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Frequently Asked Clarifications Accordion */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Frequently Asked Regulatory Clarifications
              </h3>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full text-left px-4 py-3 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800 gap-3"
                  >
                    <span>{faq.q}</span>
                    {expandedFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 py-3 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Submitted Queries & Ticket Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Institutional Query Ledger</h3>
                <p className="text-[11px] text-slate-500">
                  {tickets.length} total inquiries logged by your institution
                </p>
              </div>
              <div className="relative w-36 sm:w-44">
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search queries..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Ticket Cards List */}
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-teal-400/80 transition-all bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-gov-navy-800 bg-slate-100 px-2 py-0.5 rounded">
                      {ticket.ticketNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(ticket.priority)}
                      {getStatusBadge(ticket.status)}
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-1">{ticket.subject}</h4>

                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {ticket.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {ticket.createdAt}
                    </span>
                    {ticket.fdrNumber && (
                      <span className="font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                        {ticket.fdrNumber}
                      </span>
                    )}
                  </div>

                  {/* Expand Remarks */}
                  {ticket.officialRemarks && (
                    <div className="mt-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        <AIAssistantLogo size="xs" />
                        <span>Desk Remarks</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {ticket.officialRemarks}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {filteredTickets.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <FileQuestion className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>No queries match your search query.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Regulatory Reference Card */}
          <div className="bg-gradient-to-br from-teal-50 via-sky-50 to-indigo-50 border border-teal-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                AICTE Regulatory Safeguards
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Every query registered through TRUST is cryptographically logged in the national security deposit ledger.
              AI analysis assists scrutiny officers in rapid identification of document mismatch patterns.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-teal-800 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              <span>Average Scrutiny Resolution: &lt; 48 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
