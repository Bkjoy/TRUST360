export type ValidityStatus = 
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'MATURED'
  | 'OVERDUE'
  | 'RENEWED'
  | 'RELEASED';

export type AdministrativeStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_SCRUTINY'
  | 'CLARIFICATION_REQUIRED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'RELEASE_REQUESTED'
  | 'RELEASE_APPROVED'
  | 'ARCHIVED';

export type VerificationStatus = 
  | 'INSTITUTION_SUBMITTED'
  | 'AI_EXTRACTED'
  | 'OFFICER_VERIFIED'
  | 'BANK_CONFIRMED'
  | 'DISCREPANCY_DETECTED';

export interface FDRInstrument {
  id: string;
  institution_id: string;
  institution_name?: string;
  institution_code?: string;
  parent_fdr_id?: string;
  fdr_number: string;
  instrument_type: string;
  bank_name: string;
  branch_name: string;
  ifsc_code?: string;
  account_number?: string;
  amount: number;
  currency: string;
  issue_date: string;
  maturity_date: string;
  days_to_maturity?: number;
  lock_in_period_years: number;
  joint_holder_name: string;
  auto_renew: boolean;
  lien_marked: boolean;
  validity_status: ValidityStatus;
  administrative_status: AdministrativeStatus;
  verification_status: VerificationStatus;
  cbs_status?: 'VERIFIED' | 'DISCREPANCY' | 'NOT_FOUND' | 'MANUAL_REVIEW';
  cbs_confirmation_ref?: string;
  cbs_verified_at?: string;
  remarks?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CBSChecks {
  record_found?: boolean;
  status_active?: boolean;
  bank_matched?: boolean;
  amount_matched?: boolean;
  issue_date_matched?: boolean;
  maturity_date_matched?: boolean;
  lien_active?: boolean;
  lien_beneficiary_matched?: boolean;
}

export interface CBSBankRecordData {
  fdr_number?: string;
  cbs_internal_ref?: string;
  bank_name?: string;
  branch_name?: string;
  account_number?: string;
  principal_amount?: number;
  issue_date?: string;
  maturity_date?: string;
  status?: string;
  lien_status?: string;
  lien_beneficiary?: string;
  verification_reference?: string;
  last_updated_at?: string;
}

export interface VerificationRecord {
  id: string;
  verification_source: string;
  verification_status: string;
  bank_confirmation_ref?: string;
  is_simulated: boolean;
  cbs_status?: 'VERIFIED' | 'DISCREPANCY' | 'NOT_FOUND' | 'MANUAL_REVIEW';
  cbs_checks?: CBSChecks;
  cbs_discrepancies?: string[];
  cbs_bank_record?: CBSBankRecordData;
  remarks?: string;
  verified_at: string;
}

export interface AIExtraction {
  extracted_fields: Record<string, any>;
  confidence_scores: Record<string, number>;
  completeness_score: number;
  extraction_method: string;
  raw_text_preview?: string;
}

export interface FDRDocument {
  id: string;
  document_type: string;
  original_file_name: string;
  file_size_bytes: number;
  mime_type: string;
  sha256_hash: string;
  version: number;
  created_at: string;
  ai_extraction?: AIExtraction;
}

export interface DiscrepancyRecord {
  id: string;
  fdr_id: string;
  fdr_number?: string;
  institution_name?: string;
  institution_code?: string;
  institution_state?: string;
  bank_name?: string;
  amount?: number;
  field_name: string;
  submitted_value?: string;
  extracted_value?: string;
  verified_value?: string;
  discrepancy_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'OPEN' | 'PENDING' | 'WORKING' | 'RESOLVED' | 'DISMISSED' | string;
  resolved_by?: string;
  resolution_remarks?: string;
  created_at: string;
  updated_at?: string;
}

export interface FDRDetail extends FDRInstrument {
  documents: FDRDocument[];
  discrepancies: DiscrepancyRecord[];
  verification_records: VerificationRecord[];
  workflow_events: any[];
  parent_fdr_details?: {
    id: string;
    fdr_number: string;
    bank_name: string;
    amount: number;
    maturity_date: string;
    validity_status: string;
  };
}
