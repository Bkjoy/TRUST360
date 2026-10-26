# DEPOSIT360: Database Schema Reference

The relational database is normalized and supports both PostgreSQL 15+ and SQLite.

## Table Specifications

### 1. `institutions`
- `id` (VARCHAR(36), PK)
- `code` (VARCHAR(64), UNIQUE, INDEX) — Permanent Institute ID
- `name` (VARCHAR(255), INDEX)
- `application_ref` (VARCHAR(128))
- `state` (VARCHAR(100))
- `city` (VARCHAR(100))
- `contact_email` (VARCHAR(255))
- `contact_phone` (VARCHAR(50))
- `is_active` (BOOLEAN)
- `created_at` (DATETIME)

### 2. `users`
- `id` (VARCHAR(36), PK)
- `email` (VARCHAR(255), UNIQUE, INDEX)
- `hashed_password` (VARCHAR(255))
- `full_name` (VARCHAR(255))
- `role` (VARCHAR(50)) — `SUPER_ADMIN`, `SCRUTINY_OFFICER`, `APPROVING_AUTHORITY`, `INSTITUTION_ADMIN`
- `institution_id` (VARCHAR(36), FK `institutions.id`)
- `is_active` (BOOLEAN)
- `created_at` (DATETIME)
- `last_login` (DATETIME)

### 3. `fdr_instruments`
- `id` (VARCHAR(36), PK)
- `institution_id` (VARCHAR(36), FK `institutions.id`, INDEX)
- `parent_fdr_id` (VARCHAR(36), FK `fdr_instruments.id`, INDEX) — For rollover lineage
- `fdr_number` (VARCHAR(100), UNIQUE, INDEX)
- `instrument_type` (VARCHAR(50))
- `bank_name` (VARCHAR(150), INDEX)
- `branch_name` (VARCHAR(150))
- `ifsc_code` (VARCHAR(20))
- `amount` (NUMERIC(15, 2)) — Exact arbitrary-precision financial amount
- `currency` (VARCHAR(10))
- `issue_date` (DATE)
- `maturity_date` (DATE, INDEX)
- `lock_in_period_years` (NUMERIC(4, 1))
- `joint_holder_name` (VARCHAR(255))
- `validity_status` (VARCHAR(50), INDEX) — `ACTIVE`, `EXPIRING_SOON`, `MATURED`, `OVERDUE`, `RENEWED`, `RELEASED`
- `administrative_status` (VARCHAR(50), INDEX) — `SUBMITTED`, `VERIFIED`, `REJECTED`, `RELEASE_REQUESTED`, `RELEASE_APPROVED`
- `verification_status` (VARCHAR(50), INDEX) — `INSTITUTION_SUBMITTED`, `AI_EXTRACTED`, `OFFICER_VERIFIED`, `BANK_CONFIRMED`, `DISCREPANCY_DETECTED`

### 4. `fdr_documents`
- `id` (VARCHAR(36), PK)
- `fdr_id` (VARCHAR(36), FK `fdr_instruments.id`)
- `original_file_name` (VARCHAR(255))
- `stored_file_path` (VARCHAR(500))
- `file_size_bytes` (INTEGER)
- `mime_type` (VARCHAR(100))
- `sha256_hash` (VARCHAR(64), INDEX)
- `version` (INTEGER)
- `uploaded_by` (VARCHAR(36), FK `users.id`)

### 5. `ai_extractions`
- `id` (VARCHAR(36), PK)
- `document_id` (VARCHAR(36), FK `fdr_documents.id`, UNIQUE)
- `fdr_id` (VARCHAR(36), FK `fdr_instruments.id`)
- `extracted_fields` (JSON)
- `confidence_scores` (JSON)
- `completeness_score` (NUMERIC(5, 2))
- `extraction_method` (VARCHAR(50))

### 6. `discrepancy_records`
- `id` (VARCHAR(36), PK)
- `fdr_id` (VARCHAR(36), FK `fdr_instruments.id`, INDEX)
- `field_name` (VARCHAR(100))
- `submitted_value` (VARCHAR(255))
- `extracted_value` (VARCHAR(255))
- `verified_value` (VARCHAR(255))
- `discrepancy_type` (VARCHAR(100))
- `severity` (VARCHAR(50)) — `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `status` (VARCHAR(50), INDEX) — `OPEN`, `RESOLVED`, `DISMISSED`
- `resolution_remarks` (TEXT)
- `resolved_by` (VARCHAR(36), FK `users.id`)

### 7. `renewal_requests`
- `id` (VARCHAR(36), PK)
- `old_fdr_id` (VARCHAR(36), FK `fdr_instruments.id`)
- `new_fdr_id` (VARCHAR(36), FK `fdr_instruments.id`)
- `institution_id` (VARCHAR(36), FK `institutions.id`)
- `status` (VARCHAR(50))
- `request_remarks` (TEXT)
- `scrutiny_remarks` (TEXT)
- `reviewed_by` (VARCHAR(36), FK `users.id`)

### 8. `release_requests`
- `id` (VARCHAR(36), PK)
- `request_reference` (VARCHAR(64), UNIQUE, INDEX)
- `fdr_id` (VARCHAR(36), FK `fdr_instruments.id`)
- `institution_id` (VARCHAR(36), FK `institutions.id`)
- `reason_category` (VARCHAR(100))
- `request_amount` (NUMERIC(15, 2))
- `justification` (TEXT)
- `status` (VARCHAR(50), INDEX)
- `scrutiny_officer_id` (VARCHAR(36), FK `users.id`)
- `scrutiny_recommendation` (VARCHAR(50))
- `scrutiny_remarks` (TEXT)
- `approver_id` (VARCHAR(36), FK `users.id`)
- `approval_decision` (VARCHAR(50))
- `approval_remarks` (TEXT)

### 9. `audit_logs`
- `id` (VARCHAR(36), PK)
- `actor_id` (VARCHAR(36), FK `users.id`)
- `actor_email` (VARCHAR(255))
- `actor_role` (VARCHAR(50))
- `action` (VARCHAR(100), INDEX)
- `entity_type` (VARCHAR(50), INDEX)
- `entity_id` (VARCHAR(36), INDEX)
- `correlation_id` (VARCHAR(64))
- `before_state` (JSON)
- `after_state` (JSON)
- `ip_address` (VARCHAR(50))
- `created_at` (DATETIME)
