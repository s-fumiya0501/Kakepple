from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Date, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class Transaction(Base):
    """Transaction model for income and expenses"""

    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    couple_id = Column(UUID(as_uuid=True), ForeignKey("couples.id", ondelete="CASCADE"), nullable=True)
    type = Column(String(20), nullable=False)  # 'income' or 'expense'
    category = Column(String(50), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    is_split = Column(Boolean, default=False)  # Flag for split expenses
    original_amount = Column(Numeric(12, 2), nullable=True)  # Original amount for split expenses
    paid_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # Who actually paid (for split expenses)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions", foreign_keys=[user_id])
    couple = relationship("Couple", back_populates="transactions")
    paid_by = relationship("User", foreign_keys=[paid_by_user_id])

    def __repr__(self):
        return f"<Transaction {self.type} {self.amount}>"
