"""Farmer lookup routes (signup lives in routes_auth)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.auth_utils import get_current_user
from api.schemas import FarmerResponse
from db.database import get_db
from db.models import Farmer

router = APIRouter(prefix="/api/farmers", tags=["Farmers"])


@router.get("/{farmer_id}", response_model=FarmerResponse)
def get_farmer(
    farmer_id: int,
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a farmer by ID if it is the user themselves or the user is an operator."""
    if current_user.role != "OPERATOR" and farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view this member.")

    farmer = db.query(Farmer).get(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")
    return farmer


@router.get("", response_model=list[FarmerResponse])
def list_farmers(
    current_user: Farmer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all registered farmers (operators only)."""
    if current_user.role != "OPERATOR":
        raise HTTPException(status_code=403, detail="Only operators can list members.")
    return db.query(Farmer).order_by(Farmer.created_at.desc()).all()
