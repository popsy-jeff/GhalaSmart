"""Deposit / warehouse receipt routes with authentication and SMS dispatch."""
import random
import string
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api import routes_forecast
from api.auth_utils import get_current_user
from api.schemas import DepositCreate, DepositResponse
from db.database import get_db
from db.models import Deposit, Farmer, SmsNotification

router = APIRouter(prefix="/api/deposits", tags=["Deposits"])


def generate_receipt_number() -> str:
    """Generate a unique Warehouse Receipt Number, e.g. GHL-WR-2026-874213."""
    suffix = "".join(random.choices(string.digits, k=6))
    return f"GHL-WR-{date.today().year}-{suffix}"


@router.post("", response_model=DepositResponse, status_code=status.HTTP_201_CREATED)
def create_deposit(
    data: DepositCreate,
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new maize deposit and issue a digital Warehouse Receipt."""
    farmer_id = current_user.id

    # Evaluate ML price forecast
    current_price = None
    forecasted_price = None
    recommended_weeks = 0

    # Read via the module: init_forecast_routes() sets these after import
    if routes_forecast.forecaster and routes_forecast.engine:
        try:
            result = routes_forecast.engine.evaluate(data.county, data.quantity_kg, data.grade)
            current_price = result["current_price_per_kg"]
            forecasted_price = result["forecasted_price_per_kg"]
            recommended_weeks = result["recommended_weeks"]
        except Exception:
            pass

    if current_price is None:
        current_price = 45.0
    if forecasted_price is None:
        forecasted_price = round(current_price * 1.15, 2)

    # Ensure unique receipt number
    receipt_number = generate_receipt_number()
    while db.query(Deposit).filter(Deposit.receipt_number == receipt_number).first():
        receipt_number = generate_receipt_number()

    deposit = Deposit(
        receipt_number=receipt_number,
        farmer_id=farmer_id,
        county=data.county,
        quantity_kg=data.quantity_kg,
        grade=data.grade,
        deposit_date=date.today(),
        status="STORED",
        current_price_per_kg=current_price,
        forecasted_price_per_kg=forecasted_price,
        recommended_weeks=recommended_weeks,
    )
    db.add(deposit)
    db.flush()

    # Generate Africa's Talking SMS notification
    bags = round(float(data.quantity_kg) / 90.0, 1)
    sms_text = (
        f"GhalaSmart Receipt {receipt_number}: Deposited {data.quantity_kg:,.0f}kg (~{bags} bags) "
        f"{data.grade} in {data.county}. Spot: KES {current_price:.2f}/kg. "
        f"Optimal storage: {recommended_weeks} wks. Advance offer available on your dashboard."
    )
    notification = SmsNotification(
        farmer_id=farmer_id,
        phone_number=current_user.phone_number,
        message=sms_text,
        event_type="WAREHOUSE_RECEIPT",
        status="DELIVERED",
    )
    db.add(notification)
    db.commit()
    db.refresh(deposit)

    return deposit


@router.get("/{deposit_id}", response_model=DepositResponse)
def get_deposit(
    deposit_id: int,
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific deposit by ID if owned by the user or if user is operator."""
    deposit = db.query(Deposit).get(deposit_id)
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit receipt not found.")

    if current_user.role != "OPERATOR" and deposit.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view this receipt.")

    return deposit


@router.get("", response_model=list[DepositResponse])
def list_deposits(
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List deposits for the authenticated farmer (or all if operator)."""
    query = db.query(Deposit)
    if current_user.role != "OPERATOR":
        query = query.filter(Deposit.farmer_id == current_user.id)
    return query.order_by(Deposit.created_at.desc()).all()
