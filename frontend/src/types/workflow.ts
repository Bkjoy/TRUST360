export interface RenewalRequest {
  id: string;
  old_fdr_id: string;
  old_fdr_number?: string;
  new_fdr_id: string;
  new_fdr_number?: string;
  institution_id: string;
  institution_name?: string;
  request_type: string;
  status: 'PENDING_SCRUTINY' | 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED';
  request_remarks?: string;
  scrutiny_remarks?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ReleaseRequest {
  id: string;
  request_reference: string;
  fdr_id: string;
  fdr_number?: string;
  institution_id: string;
  institution_name?: string;
  reason_category: string;
  request_amount: number;
  justification: string;
  status: 'PENDING_SCRUTINY' | 'CLARIFICATION_REQUESTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  scrutiny_officer_id?: string;
  scrutiny_officer_name?: string;
  scrutiny_recommendation?: string;
  scrutiny_remarks?: string;
  scrutinized_at?: string;
  approver_id?: string;
  approver_name?: string;
  approval_decision?: string;
  approval_remarks?: string;
  approved_at?: string;
  created_at: string;
}
