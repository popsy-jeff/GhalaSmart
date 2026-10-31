"""Pydantic schemas for API request/response models."""
from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import date, datetime


# ── Authentication & Member Schemas ─────────────────────
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., pattern=r"^(?:\+254|0)\d{9}$")
    county: str
    password: str = Field(..., min_length=6, max_length=100)
    national_id: Optional[str] = Field(None, max_length=20)


class UserLogin(BaseModel):
    phone_number: str = Field(..., pattern=r"^(?:\+254|0)\d{9}$")
    password: str = Field(..., min_length=1)


class FarmerResponse(BaseModel):
    id: int
    full_name: str
    phone_number: str
    county: str
    national_id: Optional[str] = None
    role: str = "FARMER"
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: FarmerResponse


# ── Recommendation (forecast only, no DB write) ────────
class RecommendRequest(BaseModel):
    county: str
    quantity_kg: float = Field(..., gt=0)
    grade: Literal["Grade 1", "Grade 2", "Grade 3"]


class ForecastHorizon(BaseModel):
    weeks: int
    forecasted_price_per_kg: float
    storage_cost: float
    interest: float
    expected_net: float
    profit_vs_sell_now: float


class RecommendResponse(BaseModel):
    decision: Literal["Sell Now", "Store"]
    current_price_per_kg: float
    forecasted_price_per_kg: float
    recommended_weeks: int
    storage_cost: float
    advance_interest: float
    expected_net_value: float
    advance_offer: float
    reasoning: str
    forecast_breakdown: list[ForecastHorizon]


# ── Deposit ─────────────────────────────────────────────
class DepositCreate(BaseModel):
    farmer_id: Optional[int] = None
    county: str
    quantity_kg: float = Field(..., gt=0)
    grade: Literal["Grade 1", "Grade 2", "Grade 3"]


class DepositResponse(BaseModel):
    id: int
    receipt_number: str
    farmer_id: int
    county: str
    quantity_kg: float
    grade: str
    deposit_date: date
    status: str
    current_price_per_kg: Optional[float] = None
    forecasted_price_per_kg: Optional[float] = None
    recommended_weeks: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Payments / Advance ──────────────────────────────────
class AcceptAdvanceRequest(BaseModel):
    phone_number: Optional[str] = None


class AcceptAdvanceResponse(BaseModel):
    loan_id: int
    deposit_id: int
    principal_amount: float
    interest_rate: float
    mpesa_receipt: str
    message: str


class SettleRequest(BaseModel):
    sale_price_per_kg: Optional[float] = None  # if None, use current market price


class SettleResponse(BaseModel):
    loan_id: int
    deposit_id: int
    gross_sale_value: float
    principal_deducted: float
    interest_deducted: float
    storage_fees_deducted: float
    net_payout: float
    mpesa_receipt: str
    message: str


# ── Transactions & Ledgers ──────────────────────────────
class TransactionResponse(BaseModel):
    id: int
    loan_id: int
    amount: float
    type: str
    description: Optional[str] = None
    mpesa_receipt: Optional[str] = None
    phone_number: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class LoanResponse(BaseModel):
    id: int
    deposit_id: int
    principal_amount: float
    interest_rate: float
    accrued_interest: float
    storage_fees: float
    disbursement_date: date
    status: str

    class Config:
        from_attributes = True


# ── SMS Notifications ───────────────────────────────────
class SmsNotificationResponse(BaseModel):
    id: int
    farmer_id: int
    phone_number: str
    message: str
    event_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
