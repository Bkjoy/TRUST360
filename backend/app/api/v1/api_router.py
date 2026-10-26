from fastapi import APIRouter
from app.api.v1 import (
    auth,
    users,
    institutions,
    fdrs,
    documents,
    verification,
    discrepancies,
    renewals,
    releases,
    notifications,
    reports,
    audit,
    settings,
    bank
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(institutions.router)
api_router.include_router(fdrs.router)
api_router.include_router(documents.router)
api_router.include_router(verification.router)
api_router.include_router(discrepancies.router)
api_router.include_router(renewals.router)
api_router.include_router(releases.router)
api_router.include_router(notifications.router)
api_router.include_router(reports.router)
api_router.include_router(audit.router)
api_router.include_router(settings.router)
api_router.include_router(bank.router)
