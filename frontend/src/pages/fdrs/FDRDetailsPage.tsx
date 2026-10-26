import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Landmark,
  ShieldCheck,
  Upload,
  Download,
  AlertTriangle,
  RotateCcw,
  HandCoins,
  CheckCircle2,
  Clock,
  History,
  Eye,
  X,
  UploadCloud,
} from 'lucide-react';
import { api } from '../../services/api';
import { FDRDetail } from '../../types/fdr';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MaturityCountdown } from '../../components/fdr/MaturityCountdown';
import { DiscrepancyComparisonView } from '../../components/fdr/DiscrepancyComparisonView';
import { useAuth } from '../../context/AuthContext';

export const FDRDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fdr, setFdr] = useState<FDRDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'discrepancies' | 'history'>('details');

  // Verification & Sandbox simulation state
  const [verifying, setVerifying] = useState(false);
  const [verifResult, setVerifResult] = useState<string | null>(null);

  // Document upload & in-browser preview state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const loadFdr = async () => {
    try {
      const res = await api.get<FDRDetail>(`/fdrs/${id}`);
      setFdr(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFdr();
  }, [id]);

  const handleManualVerify = async (status: string) => {
    setVerifying(true);
    try {
      await api.post(`/verification/fdrs/${id}/verify`, {
        verification_status: status,
        remarks: 'Officer verified against physical copy and regional ledger.',
        simulate_bank_confirmation: false,
      });
      setVerifResult(`Status updated to ${status}`);
      await loadFdr();
    } catch (err) {
      alert('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateBankLien = async () => {
    setVerifying(true);
    try {
      const res = await api.post(`/verification/fdrs/${id}/verify`, {
        verification_status: 'VERIFIED',
        remarks: 'Core Banking System simulation check',
        simulate_bank_confirmation: true,
      });
      setVerifResult(
        `Sandbox Bank Confirmed! CBS Ref: ${res.data.bank_confirmation_ref || 'CONFIRMED'}`
      );
      await loadFdr();
    } catch (err) {
      alert('Simulation failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('fdr_id', id!);
    formData.append('file', uploadFile);
    formData.append('document_type', 'FDR_CERTIFICATE');

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadFile(null);
      await loadFdr();
      setActiveTab('documents');
      alert('Document uploaded! AI OCR extraction and discrepancy engine executed.');
    } catch (err) {
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !fdr) {
    return <div className="p-12 text-center text-slate-500">Loading FDR details...</div>;
  }

  const canScrutinize = user?.role === 'SCRUTINY_OFFICER';
  const isInstitutionAdmin = user?.role === 'INSTITUTION_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-bold text-slate-900">{fdr.fdr_number}</span>
              <StatusBadge status={fdr.validity_status} />
              <StatusBadge status={fdr.verification_status} type="verification" />
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{fdr.institution_name}</span>
              <span>•</span>
              <span>{fdr.bank_name} ({fdr.branch_name})</span>
              <span>•</span>
              <span>Code: {fdr.institution_code || 'N/A'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <MaturityCountdown days={fdr.days_to_maturity} maturityDate={fdr.maturity_date} />

            {/* Officer Actions */}
            {canScrutinize && (
              <>
                <button
                  disabled={verifying}
                  onClick={() => handleManualVerify('VERIFIED')}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  Verify Instrument
                </button>
                <button
                  disabled={verifying}
                  onClick={handleSimulateBankLien}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  title="Simulate Core Banking API lien confirmation"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Sandbox Bank Lien Check</span>
                </button>
              </>
            )}

            {/* Institution Actions */}
            {isInstitutionAdmin && (
              <>
                <button
                  onClick={() => navigate(`/renewals/new?fdr_id=${fdr.id}`)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rollover Renewal</span>
                </button>
                <button
                  onClick={() => navigate(`/releases/new?fdr_id=${fdr.id}`)}
                  className="px-3.5 py-1.5 bg-gov-navy-800 hover:bg-gov-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <HandCoins className="w-3.5 h-3.5" />
                  <span>Apply for Release</span>
                </button>
              </>
            )}
          </div>
        </div>

        {verifResult && (
          <div className="mt-4 p-3 bg-teal-50 border border-teal-200 text-teal-900 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{verifResult}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-slate-200 gap-6 text-xs font-semibold">
          {[
            { id: 'details', label: 'Instrument Details' },
            { id: 'documents', label: `Document Vault (${fdr.documents.length})` },
            { id: 'discrepancies', label: `Discrepancy Matrix (${fdr.discrepancies.length})` },
            { id: 'history', label: 'Workflow & Audit History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-gov-navy-700 text-gov-navy-800 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Deposit Specification
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Pledged Deposit Amount</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹{Number(fdr.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Issue Date</span>
                <span className="font-semibold text-slate-800">{fdr.issue_date}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Maturity Date</span>
                <span className="font-semibold text-slate-800">{fdr.maturity_date}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Regulatory Lock-in Period</span>
                <span className="font-semibold text-slate-800">{fdr.lock_in_period_years} Years (APH Standard)</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Joint Encashment Title</span>
                <span className="font-semibold text-slate-800">{fdr.joint_holder_name}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Banking & Branch Details
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Bank Name</span>
                <span className="font-semibold text-slate-800">{fdr.bank_name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Branch Name</span>
                <span className="font-semibold text-slate-800">{fdr.branch_name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">IFSC Code</span>
                <span className="font-mono text-slate-800">{fdr.ifsc_code || 'N/A'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Lien Marked to AICTE</span>
                <span className="font-semibold text-emerald-600">YES (Legally Pledged)</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Parent / Prior FDR Lineage</span>
                <span className="font-mono text-slate-800">
                  {fdr.parent_fdr_details ? fdr.parent_fdr_details.fdr_number : 'Original Instrument (No Prior Rollover)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Document Vault */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Upload Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-gov-navy-700" />
              <span>Upload FDR Scanned Certificate / Bank Receipt</span>
            </h4>
            <p className="text-[11px] text-slate-400 mb-3">
              Upload a new physical copy or updated renewal confirmation. AI OCR will immediately inspect the document.
            </p>
            <form onSubmit={handleDocumentUpload} className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="px-4 py-2 bg-gov-navy-800 hover:bg-gov-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Processing AI OCR...' : 'Upload & Scrutinize'}</span>
              </button>
            </form>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fdr.documents.length === 0 ? (
              <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No physical documents uploaded yet for this instrument. Use the form above to upload the FDR receipt.
              </div>
            ) : (
              fdr.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gov-navy-50 rounded-xl text-gov-navy-700 border border-gov-navy-100">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 truncate max-w-xs">
                          {doc.original_file_name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Version {doc.version} • {(doc.file_size_bytes / 1024).toFixed(1)} KB • {doc.created_at.slice(0, 10)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingDocId(doc.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gov-navy-700 hover:text-gov-navy-900 bg-gov-navy-50 hover:bg-gov-navy-100 rounded-lg font-semibold transition-colors"
                        title="View Document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      <a
                        href={`/api/v1/documents/${doc.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-gov-navy-800 hover:bg-slate-50 rounded-lg"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] font-mono text-slate-600 truncate">
                    SHA-256: {doc.sha256_hash}
                  </div>

                  {doc.ai_extraction && (
                    <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-teal-900 font-semibold">
                        <span>AI Extraction Completeness</span>
                        <span>{doc.ai_extraction.completeness_score}%</span>
                      </div>
                      <div className="w-full bg-teal-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-600 h-full rounded-full"
                          style={{ width: `${doc.ai_extraction.completeness_score}%` }}
                        ></div>
                      </div>
                      <div className="text-[10px] text-teal-700">
                        Method: {doc.ai_extraction.extraction_method}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Discrepancies */}
      {activeTab === 'discrepancies' && (
        <DiscrepancyComparisonView
          discrepancies={fdr.discrepancies}
          canResolve={canScrutinize}
          onResolved={loadFdr}
        />
      )}

      {/* Tab 4: History */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-gov-navy-700" />
            <span>Workflow Events & Verification Provenance</span>
          </h3>

          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {fdr.workflow_events.map((evt: any, i: number) => (
              <div key={i} className="relative group">
                <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-gov-navy-700 ring-4 ring-white"></div>
                <div className="text-xs font-semibold text-slate-800">{evt.event_type}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{evt.notes}</div>
                <div className="text-[10px] text-slate-400 mt-1">{evt.created_at}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-Browser PDF / Document Preview Modal */}
      {viewingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[88vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                <FileText className="w-4 h-4 text-gov-navy-700" />
                <span>AICTE Document Vault — PDF Viewer</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/v1/documents/${viewingDocId}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1 bg-gov-navy-700 hover:bg-gov-navy-800 text-white rounded text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setViewingDocId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={`/api/v1/documents/${viewingDocId}/download`}
                title="FDR PDF Viewer"
                className="w-full h-full rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
