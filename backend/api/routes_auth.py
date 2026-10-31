"""Authentication routes for member registration, login, and profile lookup."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.auth_utils import create_access_token, get_current_user, hash_password, verify_password
from api.schemas import FarmerResponse, TokenResponse, UserLogin, UserRegister
from db.database import get_db
from db.models import Farmer, SmsNotification

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new farmer member, emit welcome SMS, and return a JWT access token."""
    # Check if phone number already exists
    existing = db.query(Farmer).filter(Farmer.phone_number == user_data.phone_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A member with this phone number is already registered. Please log in."
        )

    # Hash password & create member
    hashed_pwd = hash_password(user_data.password)
    farmer = Farmer(
        full_name=user_data.full_name.strip(),
        phone_number=user_data.phone_number.strip(),
        national_id=user_data.national_id.strip() if user_data.national_id else None,
        county=user_data.county.strip(),
        hashed_password=hashed_pwd,
        role="FARMER",
    )
    db.add(farmer)
    db.flush()

    # Generate Welcome SMS alert (Africa's Talking simulation)
    welcome_sms = SmsNotification(
        farmer_id=farmer.id,
        phone_number=farmer.phone_number,
        message=(
            f"Habari {farmer.full_name}! Karibu GhalaSmart. Your member account is active. "
            f"You can now deposit grain, receive market price advisories, and unlock instant M-Pesa cash advances."
        ),
        event_type="WELCOME",
        status="DELIVERED",
    )
    db.add(welcome_sms)
    db.commit()
    db.refresh(farmer)

    # Generate JWT
    token = create_access_token(data={"sub": str(farmer.id), "phone": farmer.phone_number})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=FarmerResponse.model_validate(farmer),
    )


@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate member with phone number and password."""
    farmer = db.query(Farmer).filter(Farmer.phone_number == login_data.phone_number.strip()).first()
    if not farmer or not verify_password(login_data.password, farmer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password. Please try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": str(farmer.id), "phone": farmer.phone_number})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=FarmerResponse.model_validate(farmer),
    )


@router.get("/me", response_model=FarmerResponse)
def get_profile(current_user: Farmer = Depends(get_current_user)):
    """Return the profile of the currently authenticated member."""
    return FarmerResponse.model_validate(current_user)
