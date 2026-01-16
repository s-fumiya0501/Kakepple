from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class Asset(Base):
    """Non-liquid asset model for NISA, stocks, fixed deposits, etc."""

    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Asset details
    name = Column(String(100), nullable=False)  # Asset name (e.g., "SBI証券 NISA")
    asset_type = Column(String(50), nullable=False)  # 'nisa', 'stock', 'fixed_deposit', 'other'
    amount = Column(Numeric(12, 2), nullable=False)  # Current value
    description = Column(Text, nullable=True)  # Optional notes

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="assets")

    def __repr__(self):
        return f"<Asset {self.name} {self.amount}>"
