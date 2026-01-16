from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class RecurringTransaction(Base):
    """Recurring transaction template for automatic creation"""

    __tablename__ = "recurring_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Transaction details
    type = Column(String(20), nullable=False)  # 'income' or 'expense'
    category = Column(String(50), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)

    # Recurrence settings
    frequency = Column(String(20), nullable=False)  # 'monthly', 'weekly', 'yearly'
    day_of_month = Column(Integer, nullable=True)  # 1-31 for monthly
    day_of_week = Column(Integer, nullable=True)  # 0-6 for weekly (0=Monday)

    # Split setting
    is_split = Column(Boolean, default=False, nullable=False)  # Flag for split expenses

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    last_created_at = Column(DateTime(timezone=True), nullable=True)
    next_due_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="recurring_transactions")

    def __repr__(self):
        return f"<RecurringTransaction {self.type} {self.amount} {self.frequency}>"
