from sqlalchemy import Column, String, Numeric, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


class Budget(Base):
    """Budget model for tracking spending limits"""
    __tablename__ = "budgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    couple_id = Column(UUID(as_uuid=True), ForeignKey("couples.id", ondelete="CASCADE"), nullable=True)
    scope = Column(String(10), nullable=False)  # 'personal' or 'couple'
    budget_type = Column(String(20), nullable=False)  # 'category' or 'monthly_total'
    category = Column(String(50), nullable=True)  # Category name, null for monthly_total
    amount = Column(Numeric(12, 2), nullable=False)  # Budget limit amount
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="budgets")
    couple = relationship("Couple", back_populates="budgets")

    # Constraints
    __table_args__ = (
        # Ensure either user_id or couple_id is set, but not both
        CheckConstraint(
            "(user_id IS NULL AND couple_id IS NOT NULL) OR (user_id IS NOT NULL AND couple_id IS NULL)",
            name="budget_owner_check"
        ),
        # Unique constraint for personal budgets
        UniqueConstraint(
            "user_id", "scope", "budget_type", "category", "year", "month",
            name="unique_user_budget"
        ),
        # Unique constraint for couple budgets
        UniqueConstraint(
            "couple_id", "scope", "budget_type", "category", "year", "month",
            name="unique_couple_budget"
        ),
    )

    def __repr__(self):
        return f"<Budget(id={self.id}, scope={self.scope}, type={self.budget_type}, category={self.category}, amount={self.amount})>"
