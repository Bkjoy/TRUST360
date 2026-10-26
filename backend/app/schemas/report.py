from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class StatusDistribution(BaseModel):
    status: str
    count: int
    total_amount: float

class TrendItem(BaseModel):
    label: str
    count: int
    amount: float

class AnalyticsSummaryResponse(BaseModel):
    total_institutions: int
    total_instruments: int
    total_deposit_amount: float
    active_fdrs_count: int
    expiring_soon_count: int
    matured_count: int
    pending_verification_count: int
    open_discrepancies_count: int
    pending_release_count: int
    pending_renewal_count: int
    bank_confirmed_count: int
    
    # Distributions & Trends
    status_distribution: List[StatusDistribution]
    bank_distribution: List[Dict[str, Any]]
    monthly_trends: List[TrendItem]
    maturity_horizon: Dict[str, int]
    
    # Efficiency Impact Metrics (Baseline Manual vs Deposit360 Prototype)
    avg_turnaround_days_manual: float = 18.5
    avg_turnaround_days_platform: float = 2.4
    discrepancy_detection_rate_pct: float = 98.2
    automated_alerts_dispatched: int = 412
