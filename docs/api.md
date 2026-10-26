# DEPOSIT360: RESTful API Reference

Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

## Base URL
`/api/v1`

## Authentication
Bearer Token header: `Authorization: Bearer <jwt_access_token>`

---

### Route Endpoints Matrix

| Group | Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/login` | Authenticate user & issue JWT | Public |
| | `GET` | `/auth/me` | Fetch active user profile | Authenticated |
| | `POST` | `/auth/forgot-password` | Initiate password recovery | Public |
| **Institutions** | `GET` | `/institutions` | List approved institutions | All (Scoped) |
| | `GET` | `/institutions/{id}` | Institution details & total deposits | All (Scoped) |
| | `POST` | `/institutions` | Register new institution | Super Admin |
| **FDR Ledger** | `GET` | `/fdrs` | List FDRs with advanced filters | All (Scoped) |
| | `POST` | `/fdrs` | Submit new FDR instrument | Inst Admin / Admin |
| | `GET` | `/fdrs/{id}` | Complete FDR dossier & documents | All (Scoped) |
| | `PUT` | `/fdrs/{id}` | Update draft FDR metadata | Scoped |
| **Documents** | `POST` | `/documents/upload` | Upload document & run AI OCR | Inst Admin / Admin |
| | `GET` | `/documents/{id}/download` | Stream secure document file | Scoped |
| **Verification**| `POST` | `/verification/fdrs/{id}/verify` | Record scrutiny decision / Bank CBS check | Scrutiny / Admin |
| **Discrepancies**| `GET` | `/discrepancies` | List open AI discrepancies | All (Scoped) |
| | `PUT` | `/discrepancies/{id}/resolve` | Reconcile discrepancy with remarks | Scrutiny / Admin |
| **Renewals** | `GET` | `/renewals` | List renewal requests | All (Scoped) |
| | `POST` | `/renewals` | Submit renewal rollover advice | Inst Admin / Admin |
| | `PUT` | `/renewals/{id}/scrutinize` | Scrutiny officer approves renewal | Scrutiny / Admin |
| **Releases** | `GET` | `/releases` | List release requests | All (Scoped) |
| | `POST` | `/releases` | Submit application for release | Inst Admin / Admin |
| | `PUT` | `/releases/{id}/scrutinize` | Scrutiny officer recommendation | Scrutiny / Admin |
| | `PUT` | `/releases/{id}/decide` | Competent authority final authorization | Authority / Admin |
| **Analytics** | `GET` | `/reports/analytics` | High-density GovTech KPI summary | All (Scoped) |
| | `POST` | `/reports/trigger-maturity-scan`| Trigger maturity chronometer scan | Scrutiny / Admin |
| | `GET` | `/reports/export-csv` | Stream master CSV registry | All (Scoped) |
| **Audit** | `GET` | `/audit` | Search immutable audit trail | Authority / Scrutiny / Admin |
| **Settings** | `GET` | `/settings` | List regulatory policy settings | Super Admin |
| | `PUT` | `/settings/{key}` | Update regulatory policy setting | Super Admin |
