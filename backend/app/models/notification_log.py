from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


class NotificationLog(Base):
    """Notification log model for tracking sent notifications"""
    __tablename__ = "notification_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    notification_type = Column(String(50), nullable=False)  # 'budget_exceeded', 'budget_warning', 'partner_expense', 'monthly_report'
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)  # Additional metadata
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="notification_logs")

    def __repr__(self):
        return f"<NotificationLog(id={self.id}, user_id={self.user_id}, type={self.notification_type}, success={self.success})>"
