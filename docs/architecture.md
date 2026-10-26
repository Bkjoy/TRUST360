# DEPOSIT360: System Architecture & Data Flow

## 1. Modular Monolithic Architecture
DEPOSIT360 follows an enterprise GovTech modular monolithic architecture designed for maximum reliability, transactional integrity, operational simplicity, and deployment ease.

```mermaid
flowchart TD
    subgraph Client ["Client Browser Layer (React 18 + Vite + Tailwind CSS)"]
        UI["GovTech Single Page Application"]
        State["Auth Context & Local Secure Storage"]
    end

    subgraph Gateway ["FastAPI Gateway & Security Layer"]
        CORS["CORS & Request Normalizer"]
        JWT["JWT Bearer Authentication & PBKDF2 Validator"]
        RBAC["Role-Based Access Control & Institutional Isolator"]
    end

    subgraph Modules ["Domain Business Logic Layer"]
        M1["FDR Repository & Lineage Engine"]
        M2["AI Document Intelligence & OCR Pipeline"]
        M3["Automated Discrepancy Matrix Engine"]
        M4["Maturity Chronometer & Alert Dispatcher"]
        M5["Renewal & Replacement State Machine"]
        M6["Three-Tier Release & Refund Workflow"]
        M7["Immutable Audit Logging Service"]
        M8["Sandbox Core Banking Adapter"]
    end

    subgraph Storage ["Persistence Layer"]
        SQL[("PostgreSQL 15 / SQLite DB")]
        Vault[("Private Encrypted Storage Vault")]
    end

    Client --> Gateway
    Gateway --> Modules
    Modules --> Storage
```

## 2. Key Subsystems
1. **Multi-Tenant Institutional Isolation:**
   - Every request is validated against the authenticated user's `institution_id`. Institution Admins are strictly scoped to their own records.
2. **AI Document Intelligence Engine:**
   - Dual-engine: Native PDF textual extraction using PyMuPDF (fitz) combined with Tesseract OCR fallback for scanned certificates.
   - Computes completeness score, confidence intervals, and runs discrepancy matrix against submitted metadata.
3. **Maturity Chronometer:**
   - Calculates exact remaining days to maturity ($Maturity - Today$).
   - Alerts at 90d, 60d, 30d, 7d, 0d, and overdue.
4. **Three-Tier Release Governance:**
   - Tier 1: Institution application with compliance justification.
   - Tier 2: Scrutiny Officer examination and formal recommendation.
   - Tier 3: Competent Authority digital approval with mandatory reasoning.
