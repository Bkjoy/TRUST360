import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Check,
  Building2,
  Sparkles,
  ExternalLink,
  X,
  FileCheck,
} from 'lucide-react';
import { api } from '../../services/api';

interface BankRecord {
  id: string;
  fdr_number: string;
  cbs_internal_ref: string;
  bank_name: string;
  branch_name: string;
  principal_amount: number;
  issue_date: string;
  maturity_date: string;
  status: string;
  lien_status: string;
  lien_beneficiary: string;
  account_number: string;
  verification_reference: string;
  last_updated?: string;
}

export const BankPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [records, setRecords] = useState<BankRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload & OCR State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable Form fields after OCR
  const [fdrNumber, setFdrNumber] = useState('');
  const [bankName, setBankName] = useState('Northstar Fictional Bank');
  const [branchName, setBranchName] = useState('Fictional Central Branch');
  const [amount, setAmount] = useState<string>('243748');
  const [issueDate, setIssueDate] = useState('2026-01-25');
  const [maturityDate, setMaturityDate] = useState('2027-07-19');
  const [status, setStatus] = useState('ACTIVE');
  const [lienStatus, setLienStatus] = useState('ACTIVE_LIEN_MARKED');
  const [lienBeneficiary, setLienBeneficiary] = useState('REGIONAL OFFICER, AICTE');

  const fetchBankRecords = async () => {
    try {
      const res = await api.get<BankRecord[]>('/bank/records');
      setRecords(res.data);
    } catch (err) {
      console.error('Failed to fetch bank records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankRecords();
  }, []);

  const processSelectedFile = async (selectedFile: File) => {
    // Validate file type
    const nameLower = selectedFile.name.toLowerCase();
    const validExts = ['.pdf', '.png', '.jpg', '.jpeg'];
    const hasValidExt = validExts.some((ext) => nameLower.endsWith(ext));
    if (!hasValidExt && !selectedFile.type.includes('pdf') && !selectedFile.type.includes('image')) {
      setErrorMessage('Unsupported format. Please select an FDR document in PDF, PNG, or JPG format.');
      return;
    }

    setFile(selectedFile);
    setProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const token = localStorage.getItem('trust_token') || localStorage.getItem('deposit360_token');
      const response = await fetch('/api/v1/bank/upload-and-register', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        let errorDetail = 'Failed to process document with Bank OCR.';
        try {
          const errData = await response.json();
          errorDetail = errData.detail || errorDetail;
        } catch {
          errorDetail = `Server returned HTTP ${response.status}`;
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();
      setExtractedData(data);
      setFdrNumber(data.fdr_number);
      setBankName(data.bank_name);
      setBranchName(data.branch_name);
      setAmount(String(data.principal_amount));
      setIssueDate(data.issue_date);
      setMaturityDate(data.maturity_date);

      setSuccessMessage(
        `✅ OCR Processed & Registered: Instrument '${data.fdr_number}' (${data.bank_name}, ₹${Number(data.principal_amount).toLocaleString('en-IN')}) is now registered in the Commercial Bank Core Ledger! When uploaded to the TRUST AICTE Portal, it will verify as BANK CONFIRMED.`
      );
      await fetchBankRecords();
    } catch (err: any) {
      console.error('Bank upload error:', err);
      setErrorMessage(err.message || 'Failed to process document with Bank OCR.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setExtractedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdrNumber.trim()) {
      alert('Please enter an FDR number');
      return;
    }

    setProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.post('/bank/records', {
        fdr_number: fdrNumber.trim(),
        bank_name: bankName.trim(),
        branch_name: branchName.trim(),
        principal_amount: parseFloat(amount) || 0,
        issue_date: issueDate,
        maturity_date: maturityDate,
        status: status,
        lien_status: lienStatus,
        lien_beneficiary: lienBeneficiary,
      });

      setSuccessMessage(
        `✅ Bank Ledger Updated: Instrument '${fdrNumber.trim()}' is stored in the Bank Database.`
      );
      await fetchBankRecords();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to save bank record.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRecord = async (fdrNum: string) => {
    if (!confirm(`Remove FDR '${fdrNum}' from the Commercial Bank CBS registry?`)) return;
    try {
      await api.delete(`/bank/records/${encodeURIComponent(fdrNum)}`);
      await fetchBankRecords();
    } catch (err) {
      alert('Failed to delete bank record');
    }
  };

  const handleQuickLoadDemoSpecimen = () => {
    setFdrNumber('DEMO-FDR-983593');
    setBankName('Northstar Fictional Bank');
    setBranchName('Fictional Central Branch');
    setAmount('243748');
    setIssueDate('2026-01-25');
    setMaturityDate('2027-07-19');
    setStatus('ACTIVE');
    setLienStatus('ACTIVE_LIEN_MARKED');
    setLienBeneficiary('REGIONAL OFFICER, AICTE');
    setSuccessMessage(
      'Loaded specimen parameters for DEMO-FDR-983593 (₹243,748.00). Click "Save / Commit to Bank Ledger" to confirm.'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Top Banking Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-wide uppercase">
                  Commercial Bank Core Banking System (CBS)
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Gateway (Port 8000)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Fixed Deposit Registry & Regulatory AICTE Joint Lien Verification Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to TRUST Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* Banner Alert */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-start gap-3 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Bank CBS Record Committed:</strong>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-2xl flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Action Failed:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Section 1: Upload FDR & AI OCR Extraction */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Task 1: Upload Demo FDR & Extract via Bank OCR
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Upload a sample FDR certificate (PDF or Image). The Bank OCR engine extracts the instrument parameters and registers them directly into the Core Banking System ledger.
              </p>
            </div>

            <button
              type="button"
              onClick={handleQuickLoadDemoSpecimen}
              className="self-start sm:self-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
            >
              Quick Fill: DEMO-FDR-983593
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Upload Box */}
            <div className="lg:col-span-5 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.PDF,.png,.PNG,.jpg,.JPG,.jpeg,.JPEG,application/pdf,image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-teal-500 bg-teal-50/60 scale-[1.01]'
                      : 'border-slate-300 hover:border-teal-500 bg-slate-50/50 hover:bg-slate-100/60'
                  }`}
                >
                  <UploadCloud className="w-10 h-10 text-teal-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-800 mb-1">
                    Click to browse or drag & drop FDR PDF
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Accepts official FDR Certificates in <strong>PDF, PNG, JPG</strong> format
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-full text-[10px] font-semibold">
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    <span>Auto-scanned & registered on upload</span>
                  </span>
                </div>
              ) : (
                <div className="border border-teal-200 bg-teal-50/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB • {file.type || 'FDR Document'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove file and choose another"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => processSelectedFile(file)}
                    disabled={processing}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
                    <span>{processing ? 'Processing Bank OCR & Registering...' : 'Re-extract & Commit to Bank Ledger'}</span>
                  </button>
                </div>
              )}

              <div className="p-3 bg-slate-100/70 rounded-xl text-[11px] text-slate-500 space-y-1">
                <div className="font-semibold text-slate-700">How verification works:</div>
                <div>1. The Bank OCR reads FDR number, bank name, amount, issue & maturity dates.</div>
                <div>2. Data is stored in the Commercial Bank CBS ledger.</div>
                <div>3. When uploaded to TRUST, TRUST verifies against this exact record.</div>
              </div>
            </div>

            {/* Right: Bank Ledger Review & Parameter Form */}
            <form onSubmit={handleManualSave} className="lg:col-span-7 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Bank Ledger Registration Parameters
                </span>
                <span className="text-[11px] text-teal-700 font-semibold">
                  {extractedData ? 'Auto-populated via OCR' : 'Manual / Edit Mode'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    FDR Reference Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={fdrNumber}
                    onChange={(e) => setFdrNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. DEMO-FDR-983593"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Issuing Commercial Bank *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Northstar Fictional Bank"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Principal Amount (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="243748"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Deposit Date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Maturity Date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Instrument Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="ACTIVE">ACTIVE (Normal / Verified)</option>
                    <option value="MATURED">MATURED (Flags Discrepancy)</option>
                    <option value="CLOSED">CLOSED (Flags Discrepancy)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    AICTE Regulatory Lien Status
                  </label>
                  <select
                    value={lienStatus}
                    onChange={(e) => setLienStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="ACTIVE_LIEN_MARKED">ACTIVE_LIEN_MARKED (AICTE Joint Lien Pledged)</option>
                    <option value="NO_LIEN_FOUND">NO_LIEN_FOUND (Missing Lien)</option>
                    <option value="LIEN_REVOKED">LIEN_REVOKED (Revoked)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Save / Commit to Bank Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Section 2: Core Banking Ledger Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Bank Core Ledger Registry ({records.length} Instruments)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                These are the records stored in the commercial bank database. TRUST cross-examines uploaded FDRs against these ledger records.
              </p>
            </div>

            <button
              onClick={fetchBankRecords}
              className="self-start sm:self-center px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Ledger</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">FDR Number</th>
                  <th className="px-5 py-3.5">Bank & Branch</th>
                  <th className="px-5 py-3.5">Principal Amount</th>
                  <th className="px-5 py-3.5">Issue Date</th>
                  <th className="px-5 py-3.5">Maturity Date</th>
                  <th className="px-5 py-3.5">Bank Status</th>
                  <th className="px-5 py-3.5">AICTE Lien</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No records found in Bank CBS ledger. Upload an FDR above to register one.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id || r.fdr_number} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {r.fdr_number}
                        <span className="block text-[10px] font-normal text-slate-400 font-mono">
                          {r.cbs_internal_ref}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{r.bank_name}</div>
                        <div className="text-[11px] text-slate-400">{r.branch_name}</div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        ₹{Number(r.principal_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{r.issue_date}</td>
                      <td className="px-5 py-3.5 text-slate-600">{r.maturity_date}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.lien_status === 'ACTIVE_LIEN_MARKED'
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {r.lien_status === 'ACTIVE_LIEN_MARKED' ? 'Pledged to AICTE' : 'No Lien'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteRecord(r.fdr_number)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
