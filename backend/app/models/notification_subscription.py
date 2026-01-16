from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


class NotificationSubscription(Base):
    """Notification subscription model for Web Push"""
    __tablename__ = "notification_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(String(500), nullable=False)  # Web Push endpoint URL
    p256dh_key = Column(String(200), nullable=False)  # Encryption key
    auth_key = Column(String(200), nullable=False)  # Authentication secret
    user_agent = Column(String(500), nullable=True)  # Optional user agent info
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notification_subscriptions")

    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "endpoint", name="unique_user_endpoint"),
    )

    def __repr__(self):
        return f"<NotificationSubscription(id={self.id}, user_id={self.user_id}, is_active={self.is_active})>"
