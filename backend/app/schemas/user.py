from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
import uuid


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    name: Optional[str] = None
    picture_url: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema"""
    google_id: str


class UserUpdate(BaseModel):
    """User update schema"""
    name: Optional[str] = None
    picture_url: Optional[str] = None


class UserResponse(UserBase):
    """User response schema"""
    id: uuid.UUID
    is_admin: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
