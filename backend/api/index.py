import os
import sys

# Ensure backend directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Initialize database
try:
    from app.db.base import Base
    from app.db.session import engine, SessionLocal
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db_session:
        from app.models.course import Course
        from app.db.seed import seed_database
        if db_session.query(Course).count() < 17:
            seed_database(db_session)
except Exception as e:
    print(f"Serverless DB init notice: {e}")

from app.main import app

# Expose app at module level for ASGI/WSGI servers
# Vercel's @vercel/python looks for 'app' or 'handler'
handler = app
