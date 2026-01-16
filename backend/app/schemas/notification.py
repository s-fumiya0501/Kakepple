from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Optional
import uuid


class NotificationSubscriptionCreate(BaseModel):
    """Schema for creating a notification subscription"""
    endpoint: str = Field(..., max_length=500)
    keys: Dict[str, str]  # {'p256dh': '...', 'auth': '...'}
    user_agent: Optional[str] = Field(None, max_length=500)


class NotificationSubscriptionResponse(BaseModel):
    """Schema for notification subscription response"""
    id: uuid.UUID
    user_id: uuid.UUID
    endpoint: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating notification preferences"""
    budget_exceeded: Optional[bool] = None
    budget_warning_80: Optional[bool] = None
    partner_expense: Optional[bool] = None
    monthly_report: Optional[bool] = None


class NotificationPreferenceResponse(BaseModel):
    """Schema for notification preference response"""
    budget_exceeded: bool
    budget_warning_80: bool
    partner_expense: bool
    monthly_report: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationLogResponse(BaseModel):
    """Schema for notification log response"""
    id: uuid.UUID
    user_id: uuid.UUID
    notification_type: str
    title: str
    body: str
    sent_at: datetime
    success: bool
    error_message: Optional[str] = None

    class Config:
        from_attributes = True
