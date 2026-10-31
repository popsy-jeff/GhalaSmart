"""Farmer CRUD routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.schemas import FarmerCreate, FarmerResponse
from db.database import get_db
from db.models import Farmer

router = APIRouter(prefix="/api/farmers", tags=["Farmers"])


@router.post("", response_model=FarmerResponse, status_code=201)
def create_farmer(data: FarmerCreate, db: Session = Depends(get_db)):
    """Register a new farmer."""
    # Check if phone number already exists
    existing = db.query(Farmer).filter(Farmer.phone_number == data.phone_number).first()
    if existing:
        raise HTTPException(status_code=409, detail="Phone number already registered.")

    farmer = Farmer(
        full_name=data.full_name,
        phone_number=data.phone_number,
        county=data.county,
    )
    db.add(farmer)
    db.commit()
    db.refresh(farmer)
    return farmer


@router.get("/{farmer_id}", response_model=FarmerResponse)
def get_farmer(farmer_id: int, db: Session = Depends(get_db)):
    """Get a farmer by ID."""
    farmer = db.query(Farmer).get(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")
    return farmer


@router.get("", response_model=list[FarmerResponse])
def list_farmers(db: Session = Depends(get_db)):
    """List all registered farmers."""
    return db.query(Farmer).order_by(Farmer.created_at.desc()).all()
