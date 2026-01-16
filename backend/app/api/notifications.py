from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.notification_subscription import NotificationSubscription
from app.models.notification_preference import NotificationPreference
from app.schemas.notification import (
    NotificationSubscriptionCreate,
    NotificationSubscriptionResponse,
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse
)
from app.core.dependencies import get_current_user

router = APIRouter()


@router.post("/subscribe", response_model=NotificationSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def subscribe_to_notifications(
    data: NotificationSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subscribe to push notifications"""

    # Check if subscription already exists
    existing = db.query(NotificationSubscription).filter(
        NotificationSubscription.user_id == current_user.id,
        NotificationSubscription.endpoint == data.endpoint
    ).first()

    if existing:
        # Update existing subscription
        existing.p256dh_key = data.keys.get('p256dh', '')
        existing.auth_key = data.keys.get('auth', '')
        existing.user_agent = data.user_agent
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing

    # Create new subscription
    subscription = NotificationSubscription(
        user_id=current_user.id,
        endpoint=data.endpoint,
        p256dh_key=data.keys.get('p256dh', ''),
        auth_key=data.keys.get('auth', ''),
        user_agent=data.user_agent
    )

    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    return subscription


@router.delete("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_from_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unsubscribe from all push notifications"""

    # Deactivate all subscriptions
    db.query(NotificationSubscription).filter(
        NotificationSubscription.user_id == current_user.id
    ).update({"is_active": False})

    db.commit()
    return None


@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notification preferences"""

    preference = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()

    if not preference:
        # Create default preferences
        preference = NotificationPreference(
            user_id=current_user.id,
            budget_exceeded=True,
            budget_warning_80=True,
            partner_expense=True,
            monthly_report=True
        )
        db.add(preference)
        db.commit()
        db.refresh(preference)

    return preference


@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's notification preferences"""

    preference = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()

    if not preference:
        # Create new preferences
        preference = NotificationPreference(
            user_id=current_user.id,
            budget_exceeded=data.budget_exceeded if data.budget_exceeded is not None else True,
            budget_warning_80=data.budget_warning_80 if data.budget_warning_80 is not None else True,
            partner_expense=data.partner_expense if data.partner_expense is not None else True,
            monthly_report=data.monthly_report if data.monthly_report is not None else True
        )
        db.add(preference)
    else:
        # Update existing preferences
        if data.budget_exceeded is not None:
            preference.budget_exceeded = data.budget_exceeded
        if data.budget_warning_80 is not None:
            preference.budget_warning_80 = data.budget_warning_80
        if data.partner_expense is not None:
            preference.partner_expense = data.partner_expense
        if data.monthly_report is not None:
            preference.monthly_report = data.monthly_report

    db.commit()
    db.refresh(preference)

    return preference


@router.get("/test")
async def test_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a test notification"""

    # Check if user has active subscriptions
    subscription = db.query(NotificationSubscription).filter(
        NotificationSubscription.user_id == current_user.id,
        NotificationSubscription.is_active == True
    ).first()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active notification subscriptions found"
        )

    # TODO: Implement actual push notification sending
    # For now, just return success
    return {
        "message": "Test notification would be sent",
        "user_id": str(current_user.id),
        "subscriptions": 1
    }
