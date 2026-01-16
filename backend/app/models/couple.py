from sqlalchemy import Column, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class Couple(Base):
    """Couple model"""

    __tablename__ = "couples"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user1_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user2_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    transactions = relationship("Transaction", back_populates="couple", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="couple", cascade="all, delete-orphan")

    # Ensure unique couple pairing
    __table_args__ = (
        UniqueConstraint('user1_id', 'user2_id', name='unique_couple_pairing'),
    )

    def __repr__(self):
        return f"<Couple {self.id}>"
