"""
GhalaSmart FastAPI Application Entry Point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import engine, Base
from ml.forecaster import MaizeForecaster
from api.routes_forecast import router as forecast_router, init_forecast_routes
from api.routes_auth import router as auth_router
from api.routes_farmers import router as farmers_router
from api.routes_deposits import router as deposits_router
from api.routes_payments import router as payments_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ghalasmart")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # ── Startup ──
    logger.info("Creating database tables if they don't exist...")
    Base.metadata.create_all(bind=engine)

    logger.info("Loading price forecasts...")
    try:
        forecaster = MaizeForecaster()
        init_forecast_routes(forecaster)
        logger.info(f"Price forecasts loaded. Counties: {forecaster.get_available_counties()}")
    except FileNotFoundError as e:
        logger.warning(f"Price forecast data not found: {e}")
        logger.warning("The /api/recommend endpoint will return 503 until forecast data is generated.")

    yield
    # ── Shutdown ──
    logger.info("GhalaSmart shutting down.")


app = FastAPI(
    title="GhalaSmart API",
    description="Data-driven storage & financing decisions for Kenyan maize farmers",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(forecast_router)
app.include_router(farmers_router)
app.include_router(deposits_router)
app.include_router(payments_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "GhalaSmart API"}
