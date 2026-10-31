"""
Payment and financing workflow routes:
  - Accept cash advance (Safaricom Daraja B2C M-Pesa simulation)
  - Settle loan & final payout
  - Query loan ledgers and transactions
  - Query Africa's Talking SMS delivery logs
"""
import random
import string
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.auth_utils import get_current_user
from api.routes_forecast import forecaster
from api.schemas import (
    AcceptAdvanceRequest,
    AcceptAdvanceResponse,
    LoanResponse,
    SettleRequest,
    SettleResponse,
    SmsNotificationResponse,
    TransactionResponse,
)
from core.decision_engine import (
    ADVANCE_PERCENTAGE,
    GRADE_MULTIPLIER,
    STORAGE_COST_PER_KG_PER_WEEK,
    WEEKLY_INTEREST_RATE,
)
from db.database import get_db
from db.models import Deposit, Farmer, Loan, SmsNotification, Transaction

router = APIRouter(prefix="/api", tags=["Payments & Financing"])


def generate_mpesa_receipt() -> str:
    """Generate a realistic Safaricom M-Pesa transaction code, e.g. QJL89F2A4K."""
    prefix = random.choice(["SHK", "QJL", "RBC", "PLK", "TMB", "VBN"])
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=7))
    return f"{prefix}{suffix}"


@router.post("/deposits/{deposit_id}/accept-advance", response_model=AcceptAdvanceResponse)
def accept_advance(
    deposit_id: int,
    req: AcceptAdvanceRequest,
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Member accepts the risk-adjusted cash advance offer for a stored deposit.
    Disburses funds directly via simulated Safaricom Daraja M-Pesa B2C API.
    """
    deposit = db.query(Deposit).get(deposit_id)
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit receipt not found.")

    if current_user.role != "OPERATOR" and deposit.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this warehouse receipt.")

    if deposit.status != "STORED":
        raise HTTPException(status_code=400, detail="Deposit is not in active STORED status.")

    # Check if loan already exists
    existing_loan = db.query(Loan).filter(Loan.deposit_id == deposit_id).first()
    if existing_loan:
        raise HTTPException(status_code=409, detail="An advance has already been accepted for this receipt.")

    if not deposit.current_price_per_kg:
        raise HTTPException(status_code=400, detail="Current market valuation unavailable for this deposit.")

    current_val = float(deposit.current_price_per_kg) * float(deposit.quantity_kg)
    advance_amount = round(current_val * ADVANCE_PERCENTAGE, 2)
    disbursement_phone = req.phone_number or current_user.phone_number

    # Create Loan
    loan = Loan(
        deposit_id=deposit_id,
        principal_amount=Decimal(str(advance_amount)),
        interest_rate=Decimal(str(WEEKLY_INTEREST_RATE)),
        accrued_interest=Decimal("0.00"),
        storage_fees=Decimal("0.00"),
        disbursement_date=date.today(),
        status="ACTIVE",
    )
    db.add(loan)
    db.flush()

    # Generate M-Pesa Daraja B2C disbursement transaction
    receipt = generate_mpesa_receipt()
    txn = Transaction(
        loan_id=loan.id,
        amount=Decimal(str(advance_amount)),
        type="ADVANCE_DISBURSEMENT",
        description=f"Safaricom B2C Advance Disbursed to {disbursement_phone} for Receipt {deposit.receipt_number}",
        mpesa_receipt=receipt,
        phone_number=disbursement_phone,
        status="COMPLETED",
    )
    db.add(txn)

    # Dispatch SMS Notification
    sms_msg = (
        f"M-PESA Confirmed: {receipt}. KES {advance_amount:,.2f} disbursed to {disbursement_phone} "
        f"for GhalaSmart Receipt #{deposit.receipt_number}. Advance financing rate: 2%/month."
    )
    sms = SmsNotification(
        farmer_id=current_user.id,
        phone_number=disbursement_phone,
        message=sms_msg,
        event_type="ADVANCE_DISBURSED",
        status="DELIVERED",
    )
    db.add(sms)

    db.commit()
    db.refresh(loan)

    return AcceptAdvanceResponse(
        loan_id=loan.id,
        deposit_id=deposit_id,
        principal_amount=advance_amount,
        interest_rate=float(loan.interest_rate),
        mpesa_receipt=receipt,
        message=f"KES {advance_amount:,.2f} disbursed to {disbursement_phone}. M-Pesa code: {receipt}",
    )


@router.post("/deposits/{deposit_id}/settle", response_model=SettleResponse)
def settle_deposit(
    deposit_id: int,
    req: SettleRequest,
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sell the stored maize at market price and settle loan obligations.
    Deducts principal, storage fees, and accrued interest, then transfers net profit via M-Pesa.
    """
    deposit = db.query(Deposit).get(deposit_id)
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit receipt not found.")

    if current_user.role != "OPERATOR" and deposit.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this warehouse receipt.")

    if deposit.status != "STORED":
        raise HTTPException(status_code=400, detail="Deposit has already been sold or settled.")

    loan = db.query(Loan).filter(Loan.deposit_id == deposit_id).first()
    has_loan = loan is not None and loan.status == "ACTIVE"

    # Determine sale price
    if req.sale_price_per_kg and req.sale_price_per_kg > 0:
        sale_price = float(req.sale_price_per_kg)
    elif forecaster:
        try:
            sale_price = float(forecaster.get_current_price(deposit.county))
        except Exception:
            sale_price = float(deposit.current_price_per_kg or 45.0)
    else:
        sale_price = float(deposit.current_price_per_kg or 45.0)

    # Apply grade multiplier
    grade_mult = GRADE_MULTIPLIER.get(deposit.grade, 1.0)
    final_unit_price = sale_price * grade_mult
    gross_sale = round(final_unit_price * float(deposit.quantity_kg), 2)

    # Calculate duration
    if has_loan:
        days_stored = (date.today() - loan.disbursement_date).days
        weeks_stored = max(days_stored / 7.0, 1.0)
        principal = float(loan.principal_amount)
        interest = round(principal * WEEKLY_INTEREST_RATE * weeks_stored, 2)
        storage = round(STORAGE_COST_PER_KG_PER_WEEK * float(deposit.quantity_kg) * weeks_stored, 2)
    else:
        # Deposit stored without advance loan
        days_stored = (date.today() - deposit.deposit_date).days
        weeks_stored = max(days_stored / 7.0, 1.0)
        principal = 0.0
        interest = 0.0
        storage = round(STORAGE_COST_PER_KG_PER_WEEK * float(deposit.quantity_kg) * weeks_stored, 2)

    net_payout = round(gross_sale - principal - interest - storage, 2)
    net_payout = max(net_payout, 0.0)

    # Update loan and deposit
    if has_loan:
        loan.accrued_interest = Decimal(str(interest))
        loan.storage_fees = Decimal(str(storage))
        loan.status = "SETTLED"
        loan_id_val = loan.id
    else:
        # Create a synthetic settled loan record for auditing
        synthetic_loan = Loan(
            deposit_id=deposit_id,
            principal_amount=Decimal("0.00"),
            interest_rate=Decimal("0.00"),
            accrued_interest=Decimal("0.00"),
            storage_fees=Decimal(str(storage)),
            disbursement_date=deposit.deposit_date,
            status="SETTLED",
        )
        db.add(synthetic_loan)
        db.flush()
        loan_id_val = synthetic_loan.id

    deposit.status = "SOLD"

    # Issue final M-Pesa payout transaction
    receipt = generate_mpesa_receipt()
    txn = Transaction(
        loan_id=loan_id_val,
        amount=Decimal(str(net_payout)),
        type="FINAL_SETTLEMENT",
        description=(
            f"Final grain sale payout for Receipt {deposit.receipt_number}. "
            f"Gross: KES {gross_sale:,.2f}, Principal: KES {principal:,.2f}, "
            f"Storage: KES {storage:,.2f}, Interest: KES {interest:,.2f}"
        ),
        mpesa_receipt=receipt,
        phone_number=current_user.phone_number,
        status="COMPLETED",
    )
    db.add(txn)

    # Send Africa's Talking SMS alert
    sms_text = (
        f"GhalaSmart Sale Settlement: Receipt #{deposit.receipt_number} sold for KES {gross_sale:,.2f}. "
        f"Deductions: Loan KES {principal:,.2f}, Storage KES {storage:,.2f}, Interest KES {interest:,.2f}. "
        f"Net payout of KES {net_payout:,.2f} sent to M-Pesa ({receipt})."
    )
    sms = SmsNotification(
        farmer_id=current_user.id,
        phone_number=current_user.phone_number,
        message=sms_text,
        event_type="SETTLEMENT_PAID",
        status="DELIVERED",
    )
    db.add(sms)

    db.commit()

    return SettleResponse(
        loan_id=loan_id_val,
        deposit_id=deposit_id,
        gross_sale_value=gross_sale,
        principal_deducted=principal,
        interest_deducted=interest,
        storage_fees_deducted=storage,
        net_payout=net_payout,
        mpesa_receipt=receipt,
        message=f"Settlement complete! KES {net_payout:,.2f} paid via M-Pesa. Receipt: {receipt}",
    )


@router.get("/loans", response_model=list[LoanResponse])
def list_loans(
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List loans associated with the authenticated member's deposits."""
    if current_user.role == "OPERATOR":
        return db.query(Loan).order_by(Loan.disbursement_date.desc()).all()

    return (
        db.query(Loan)
        .join(Deposit, Loan.deposit_id == Deposit.id)
        .filter(Deposit.farmer_id == current_user.id)
        .order_by(Loan.disbursement_date.desc())
        .all()
    )


@router.get("/loans/{loan_id}", response_model=LoanResponse)
def get_loan(
    loan_id: int,
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get loan by ID."""
    loan = db.query(Loan).get(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan record not found.")

    deposit = db.query(Deposit).get(loan.deposit_id)
    if current_user.role != "OPERATOR" and deposit.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view this loan.")

    return loan


@router.get("/loans/{loan_id}/transactions", response_model=list[TransactionResponse])
def get_transactions(
    loan_id: int,
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all transaction ledger events for a loan."""
    loan = db.query(Loan).get(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan record not found.")

    deposit = db.query(Deposit).get(loan.deposit_id)
    if current_user.role != "OPERATOR" and deposit.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view these transactions.")

    return db.query(Transaction).filter(Transaction.loan_id == loan_id).order_by(Transaction.created_at.desc()).all()


@router.get("/notifications", response_model=list[SmsNotificationResponse])
def list_notifications(
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all SMS and M-Pesa notifications dispatched to the current member."""
    return (
        db.query(SmsNotification)
        .filter(SmsNotification.farmer_id == current_user.id)
        .order_by(SmsNotification.created_at.desc())
        .all()
    )
