from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings


class Base(DeclarativeBase):
    pass


# Conditional engine config: SQLite doesn't support pool_size/max_overflow
_db_url = settings.SQLALCHEMY_DATABASE_URI
_is_sqlite = "sqlite" in _db_url

_engine_kwargs = {
    "pool_pre_ping": True,  # Verify connection before usage (fixes closed connection errors)
}

if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20
    _engine_kwargs["pool_recycle"] = 1800  # Recycle connections every 30 minutes

engine = create_engine(_db_url, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
