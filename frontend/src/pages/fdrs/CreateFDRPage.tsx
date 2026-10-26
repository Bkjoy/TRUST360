import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  ArrowLeft,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  RefreshCw,
  Eye,
  FileCheck2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const CreateFDRPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [fdrNumber, setFdrNumber] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [issueDate, setIssueDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // PDF Upload & AI Pre-fill State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [aiSuccessNotice, setAiSuccessNotice] = useState<string | null>(null);
  const [completenessScore, setCompletenessScore] = useState<number | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submission State
  const [loading, setLoading] = useState(false);
  const [submitStepNotice, setSubmitStepNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle PDF file selection & Instant AI OCR parsing
  const handleFileSelect = async (file: File) => {
    setError(null);
    setSelectedFile(file);
    setIsScanning(true);
    setAiSuccessNotice(null);

    // Call AI OCR parse-preview endpoint
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/documents/parse-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { extracted_fields, completeness_score } = res.data;

      // Auto-populate form fields from extracted values
      if (extracted_fields.fdr_number) {
        setFdrNumber(extracted_fields.fdr_number);
      }
      if (extracted_fields.bank_name) {
        setBankName(extracted_fields.bank_name);
      }
      if (extracted_fields.branch_name) {
        setBranchName(extracted_fields.branch_name);
      }
      if (extracted_fields.ifsc_code) {
        setIfscCode(extracted_fields.ifsc_code);
      }
      if (extracted_fields.amount) {
        setAmount(extracted_fields.amount);
      }
      if (extracted_fields.issue_date) {
        setIssueDate(extracted_fields.issue_date);
      }
      if (extracted_fields.maturity_date) {
        setMaturityDate(extracted_fields.maturity_date);
      }

      setCompletenessScore(completeness_score);
      setAiSuccessNotice(
        `AI OCR parsed "${file.name}" with ${completeness_score}% completeness. All fields below have been auto-populated.`
      );
    } catch (err: any) {
      console.warn('AI Parsing failed, falling back to manual entry:', err);
      // Still keep file attached so user can submit it
    } finally {
      setIsScanning(false);
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
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setAiSuccessNotice(null);
    setCompletenessScore(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenLocalPreview = () => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewModalUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      setSubmitStepNotice('1/2 Creating Centralized FDR Ledger Record...');
      const payload = {
        fdr_number: fdrNumber.trim(),
        instrument_type: 'FIXED_DEPOSIT',
        bank_name: bankName.trim(),
        branch_name: branchName.trim(),
        ifsc_code: ifscCode.trim() || undefined,
        amount: Number(amount),
        currency: 'INR',
        issue_date: issueDate,
        maturity_date: maturityDate,
        lock_in_period_years: 8.0,
        joint_holder_name: 'Regional Officer, AICTE & Institution Society',
        remarks: remarks.trim() || undefined,
      };

      const res = await api.post('/fdrs', payload);
      const newFdrId = res.data.id;

      // If a PDF document was attached, upload it directly to the vault
      if (selectedFile) {
        setSubmitStepNotice('2/2 Archiving FDR PDF in Secure Vault & Running Scrutiny Engine...');
        const docFormData = new FormData();
        docFormData.append('fdr_id', newFdrId);
        docFormData.append('document_type', 'FDR_CERTIFICATE');
        docFormData.append('file', selectedFile);

        await api.post('/documents/upload', docFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate(`/fdrs/${newFdrId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit FDR record');
    } finally {
      setLoading(false);
      setSubmitStepNotice(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Repository</span>
      </button>

      <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
              Institution Portal
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Upload & Register Security Deposit (FDR)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload the official Fixed Deposit Receipt (PDF). Our AI Document Engine will read the receipt, extract the key values, and pre-fill the form for your review.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ================= STEP 1: UPLOAD FDR PDF ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>Step 1: Upload FDR PDF Certificate</span>
              <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded font-semibold border border-teal-200">
                AI Auto-Fill Enabled
              </span>
            </label>
            {selectedFile && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove file</span>
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-gov-navy-600 bg-gov-navy-50/50'
                  : 'border-slate-300 hover:border-gov-navy-600 bg-slate-50/70 hover:bg-slate-100/50'
              }`}
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-gov-navy-700 mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Click to browse or drag & drop FDR PDF
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Upload your official bank deposit receipt. Supported formats: <strong>PDF, PNG, JPG</strong> (up to 15 MB).
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-teal-700 bg-white px-3 py-1 rounded-full border border-teal-100 shadow-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>AI will instantly read and auto-fill amount, dates, bank & FDR number</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-50 text-teal-700 rounded-lg border border-teal-200">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 truncate max-w-xs md:max-w-md">
                      {selectedFile.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI verification
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenLocalPreview}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-medium shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-medium shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace</span>
                  </button>
                </div>
              </div>

              {isScanning && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-2.5 text-xs text-teal-800 font-medium">
                  <RefreshCw className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
                  <span>AI Document Engine is parsing the PDF with OCR...</span>
                </div>
              )}

              {aiSuccessNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">AI Auto-Extraction Complete:</span> {aiSuccessNotice}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= STEP 2: REVIEW & CONFIRM ================= */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Step 2: Review & Verify Deposit Details
            </h3>
            <p className="text-[11px] text-slate-400">
              Verify the parameters before submitting to the AICTE Regional Scrutiny Bureau.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                FDR Reference / Receipt Number *
              </label>
              <input
                type="text"
                required
                value={fdrNumber}
                onChange={(e) => setFdrNumber(e.target.value)}
                placeholder="e.g., FDR-2026-SBI-8941"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issuing Commercial Bank *
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none bg-white font-medium"
              >
                <option value="State Bank of India">State Bank of India</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
                <option value="Bank of Baroda">Bank of Baroda</option>
                <option value="Canara Bank">Canara Bank</option>
                <option value="Union Bank of India">Union Bank of India</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                <option value="Indian Bank">Indian Bank</option>
                <option value="Central Bank of India">Central Bank of India</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Branch Name *
              </label>
              <input
                type="text"
                required
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g., Parliament Street Branch"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank IFSC Code
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="e.g., SBIN0001234"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none font-mono font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deposit Amount (₹ INR) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Issue *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Maturity *
              </label>
              <input
                type="date"
                required
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none font-semibold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Submission Remarks / Course Reference
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Security deposit for Bachelor of Technology (Artificial Intelligence) programme approval."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-navy-600 focus:outline-none"
            />
          </div>

          {submitStepNotice && (
            <div className="p-3 bg-gov-navy-50 border border-gov-navy-200 text-gov-navy-800 text-xs rounded-lg font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-gov-navy-600" />
              <span>{submitStepNotice}</span>
            </div>
          )}

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Joint lien: <strong>Regional Officer, AICTE</strong>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isScanning}
                className="px-5 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Processing...'
                    : selectedFile
                    ? 'Register & Upload FDR Certificate'
                    : 'Register Instrument'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* PDF / Document In-Browser Preview Modal */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                <FileText className="w-4 h-4 text-gov-navy-700" />
                <span>Document Preview: {selectedFile?.name}</span>
              </div>
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={previewModalUrl}
                title="FDR Preview"
                className="w-full h-full rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
