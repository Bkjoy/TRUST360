# DEPOSIT360: Security & Compliance Specification

## 1. Threat Modeling & Defense Strategies
DEPOSIT360 is engineered to handle sensitive institutional financial records, bank guarantees, and official council approvals.

### 1.1 Multi-Tenant Institutional Boundary Protection
- **Vulnerability Mitigated:** Cross-tenant data leakage (IDOR / Broken Object-Level Authorization).
- **Enforcement Mechanism:** Enforced in FastAPI dependency `verify_institution_access` (`backend/app/api/deps.py`).
- **Policy:** Users with the `INSTITUTION_ADMIN` role are strictly bound to their authenticated JWT claim `institution_id`. Any attempt to access or modify records belonging to other institutions results in an HTTP `403 Forbidden` response.

### 1.2 Authentication & Token Security
- **Hashing Algorithm:** PBKDF2-HMAC-SHA256 with dynamic salts.
- **Tokens:** Stateless JSON Web Tokens (JWT) signed via HMAC-SHA256 with 12-hour expiration.
- **Session Termination:** Immediate token clearance and client-side memory invalidation on logout.

### 1.3 Secure Document Vault
- **Path Traversal Defense:** Uploaded filenames supplied by client browsers are discarded. Server generates unique UUID-based safe paths (`<inst_id>_<uuid>.<ext>`).
- **MIME & Extension Whitelisting:** Strictly restricted to `.pdf`, `.png`, `.jpg`, `.jpeg`.
- **Integrity Verification:** SHA-256 cryptographic hashes are calculated on upload and stored in `fdr_documents.sha256_hash`.
- **Private Storage:** Document files are stored outside the public document root in private directory `/storage/vault/` and streamed only through authenticated endpoint `/api/v1/documents/{id}/download` after verifying user access.

### 1.4 Financial Precision
- **IEEE 754 Floating-Point Prohibition:** All financial amounts are represented as arbitrary-precision decimals (`NUMERIC(15, 2)` in PostgreSQL/SQLite and `Decimal` in Python). Prevents rounding drift and precision truncation in multi-crore transactions.

### 1.5 Immutable Audit Trail
- All security-critical events (FDR creation, document uploads, scrutiny decisions, release authorizations, discrepancy resolutions) are recorded in an append-only relational ledger (`audit_logs`) tracking actor ID, role, action, target entity UUID, before/after JSON state snapshots, and client IP.
