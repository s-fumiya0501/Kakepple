from sqlalchemy import Column, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


class NotificationPreference(Base):
    """Notification preference model for user notification settings"""
    __tablename__ = "notification_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    budget_exceeded = Column(Boolean, default=True, nullable=False)  # Notify when budget is exceeded
    budget_warning_80 = Column(Boolean, default=True, nullable=False)  # Notify at 80% of budget
    partner_expense = Column(Boolean, default=True, nullable=False)  # Notify when partner adds expense
    monthly_report = Column(Boolean, default=True, nullable=False)  # Send monthly report
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notification_preference")

    def __repr__(self):
        return f"<NotificationPreference(id={self.id}, user_id={self.user_id})>"
