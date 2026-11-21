"""
Base Model and Mixins for SkillBridge AI
Provides standard UUID primary keys and timestamp tracking.
"""
import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import CHAR, TypeDecorator, UserDefinedType


class SQLiteUUID(TypeDecorator):
    """Platform-independent UUID type.
    Uses PostgreSQL's native UUID type, or CHAR(36) on SQLite.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return str(uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


class VectorType(UserDefinedType):
    """Custom pgvector compatible vector type.
    Emits vector(dim) on PostgreSQL, and TEXT on SQLite/offline.
    """
    def __init__(self, dim: int = 1536):
        self.dim = dim

    def get_col_spec(self, **kw):
        return f"vector({self.dim})"


@compiles(VectorType, "sqlite")
def compile_vector_sqlite(type_, compiler, **kw):
    return "TEXT"


@compiles(VectorType, "postgresql")
def compile_vector_postgresql(type_, compiler, **kw):
    return f"vector({type_.dim})"


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 Declarative Base"""
    pass


class UUIDPrimaryKeyMixin:
    """Provides a UUID v4 primary key column."""
    id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        doc="Unique identifier (UUID v4)",
    )


class TimestampMixin:
    """Provides created_at and updated_at audit columns with timezone support."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp of creation (UTC)",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last update (UTC)",
    )
