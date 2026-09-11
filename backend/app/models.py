"""SQLAlchemy ORM models — mirror the four tables from the schema."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey, JSON, Text,
)
from sqlalchemy.orm import relationship

from .database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    full_name = Column(String, nullable=False, default="")
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=_now)

    scans = relationship("Scan", back_populates="user", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    original_filename = Column(String, nullable=False)
    file_hash = Column(String)
    status = Column(String, default="queued")  # queued|analyzing|completed|failed
    overall_score = Column(Integer)
    risk_category = Column(String)             # Low Risk|Suspicious|High Risk|Critical
    sender_domain = Column(String)
    created_at = Column(DateTime, default=_now, index=True)
    completed_at = Column(DateTime)

    user = relationship("User", back_populates="scans")
    report = relationship("ScanReport", back_populates="scan", uselist=False, cascade="all, delete-orphan")
    indicators = relationship("ScanIndicator", back_populates="scan", cascade="all, delete-orphan")


class ScanReport(Base):
    __tablename__ = "scan_reports"

    id = Column(String, primary_key=True, default=_uuid)
    scan_id = Column(String, ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False)
    report_json = Column(JSON, nullable=False)
    pdf_path = Column(String)
    created_at = Column(DateTime, default=_now)

    scan = relationship("Scan", back_populates="report")


class ScanIndicator(Base):
    __tablename__ = "scan_indicators"

    id = Column(String, primary_key=True, default=_uuid)
    scan_id = Column(String, ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False)
    type = Column(String, nullable=False)
    value = Column(Text)
    severity = Column(String, default="info")  # info|low|medium|high|critical
    source = Column(String)
    finding = Column(Text)
    created_at = Column(DateTime, default=_now)

    scan = relationship("Scan", back_populates="indicators")
