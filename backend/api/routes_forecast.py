"""Forecast / recommendation routes."""
from fastapi import APIRouter, HTTPException
from api.schemas import RecommendRequest, RecommendResponse
from core.decision_engine import DecisionEngine
from ml.forecaster import MaizeForecaster

router = APIRouter(prefix="/api", tags=["Forecast"])

# Initialized at app startup via main.py
forecaster: MaizeForecaster = None
engine: DecisionEngine = None


def init_forecast_routes(f: MaizeForecaster):
    global forecaster, engine
    forecaster = f
    engine = DecisionEngine(f)


@router.post("/recommend", response_model=RecommendResponse)
def get_recommendation(req: RecommendRequest):
    """Get a store-vs-sell recommendation for a maize deposit."""
    if forecaster is None:
        raise HTTPException(status_code=503, detail="ML model not loaded yet.")

    available = forecaster.get_available_counties()
    if req.county not in available:
        raise HTTPException(
            status_code=400,
            detail=f"County '{req.county}' not available. Choose from: {available}"
        )

    result = engine.evaluate(
        county=req.county,
        quantity_kg=req.quantity_kg,
        grade=req.grade,
    )
    return RecommendResponse(**result)


@router.get("/counties")
def list_counties():
    """Return the list of counties the model can forecast for."""
    if forecaster is None:
        raise HTTPException(status_code=503, detail="ML model not loaded yet.")
    return {"counties": forecaster.get_available_counties()}


@router.get("/current-price/{county}")
def get_current_price(county: str):
    """Return the latest known wholesale price for a county."""
    if forecaster is None:
        raise HTTPException(status_code=503, detail="ML model not loaded yet.")
    try:
        price = forecaster.get_current_price(county)
        return {"county": county, "price_per_kg": price}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
