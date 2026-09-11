"""Pydantic request/response models."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field


# ---- Auth ----
class RegisterIn(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- Scans ----
class ScanOut(BaseModel):
    id: str
    user_id: str
    original_filename: str
    file_hash: Optional[str] = None
    status: str
    overall_score: Optional[int] = None
    risk_category: Optional[str] = None
    sender_domain: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    # The full forensic report JSON (attached on detail + create responses).
    report: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True
