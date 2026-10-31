import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BACKEND_DIR, ".env")
load_dotenv(ENV_PATH)
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "ghalasmart")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_SSL_CA = os.getenv("DB_SSL_CA", "")  # CA certificate path, required by hosted MySQL such as Aiven

import urllib.parse

connect_args = {}

# DATABASE_URL overrides the DB_* settings (e.g. a SQLite file for tests)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if DB_PASSWORD:
        encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
        DATABASE_URL = f"mysql+pymysql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        DATABASE_URL = f"mysql+pymysql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    if DB_SSL_CA:
        ca_path = DB_SSL_CA if os.path.isabs(DB_SSL_CA) else os.path.join(BACKEND_DIR, DB_SSL_CA)
        connect_args["ssl"] = {"ca": ca_path}
elif DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False  # FastAPI runs sync routes in a threadpool

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
