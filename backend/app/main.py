from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.api_router import api_router
from app.utils.seed_data import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema is created and synthetic demo data is seeded
    Base.metadata.create_all(bind=engine)
    try:
        seed_database()
    except Exception as e:
        print(f"[STARTUP WARNING] Seed data initialization skipped or error: {e}")
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
# AICTE Security Deposit & FDR Management & Intelligence Platform (DEPOSIT360)
### Smart India Hackathon 2026 — Problem Statement ID: SIH26265

Centralized, secure, intelligent, and workflow-driven platform for managing the complete lifecycle of Fixed Deposit Receipts (FDRs) pledged to the All India Council for Technical Education (AICTE).

---
## Key Modules:
* **Authentication & RBAC**: Granular multi-tenant isolation.
* **FDR Instrument Ledger**: Complete lifecycle repository with parent-child renewal lineage.
* **Secure Document Vault**: SHA-256 integrity verification, safe storage, and gated downloads.
* **AI Document Intelligence**: Text & OCR extraction with confidence scoring and automated discrepancy detection.
* **Maturity Chrono-Monitoring**: Multi-stage alerts (90d, 60d, 30d, 7d, 0d, overdue).
* **Workflows**: Three-tier release approvals and rollover renewals.
* **Sandbox Integrations**: Realistic bank lien verification adapter.
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": "demonstration_prototype",
        "timestamp": "2026-10-25T12:00:00Z"
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to DEPOSIT360 — AICTE Security Deposit Intelligence Platform API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
