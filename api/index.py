import os
import sys

# Ensure backend directory is in python search path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(os.path.dirname(current_dir), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Initialize and seed database if on serverless (e.g. Vercel)
try:
    from app.db.base import Base
    from app.db.session import engine, SessionLocal
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db_session:
        from app.db.seed import seed_database
        seed_database(db_session)
except Exception as e:
    # Log but avoid failing module load
    print(f"Serverless DB init notice: {e}")

from app.main import app
