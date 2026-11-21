"""
Database Session Management
Provides SQLAlchemy engine, session maker, and FastAPI dependency.
"""
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.core.config import settings

# Engine configuration
# Normalize postgresql:// to postgresql+psycopg:// for modern psycopg 3
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # Ensure relative SQLite path always resolves to backend directory
    if db_url.startswith("sqlite:///./") or db_url.startswith("sqlite:////./"):
        prefix = "sqlite:///./" if db_url.startswith("sqlite:///./") else "sqlite:////./"
        rel_path = db_url[len(prefix):]
        backend_dir = Path(__file__).resolve().parent.parent.parent
        abs_db_path = (backend_dir / rel_path).resolve()
        db_url = f"sqlite:///{abs_db_path.as_posix()}"

engine = create_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
