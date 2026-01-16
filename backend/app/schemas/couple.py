from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid
from app.schemas.user import UserResponse


class CoupleBase(BaseModel):
    """Base couple schema"""
    pass


class CoupleCreate(BaseModel):
    """Couple creation schema"""
    invite_code: str


class CoupleResponse(BaseModel):
    """Couple response schema"""
    id: uuid.UUID
    user1: UserResponse
    user2: UserResponse
    created_at: datetime

    class Config:
        from_attributes = True


class InviteCodeBase(BaseModel):
    """Base invite code schema"""
    code: str


class InviteCodeCreate(BaseModel):
    """Invite code creation schema"""
    hours_valid: Optional[int] = 24


class InviteCodeResponse(BaseModel):
    """Invite code response schema"""
    id: uuid.UUID
    code: str
    expires_at: datetime
    used: bool
    created_at: datetime

    class Config:
        from_attributes = True
