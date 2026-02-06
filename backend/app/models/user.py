from sqlalchemy import Column, String, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class User(Base):
    """User model"""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100))
    picture_url = Column(String)

    # 認証関連フィールド
    password_hash = Column(String(255), nullable=True)  # Email/Password認証用
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    apple_id = Column(String(255), unique=True, nullable=True, index=True)
    line_id = Column(String(255), unique=True, nullable=True, index=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)  # 管理者フラグ

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    transactions = relationship("Transaction", back_populates="user", foreign_keys="Transaction.user_id", cascade="all, delete-orphan")
    invite_codes = relationship("InviteCode", foreign_keys="InviteCode.user_id", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    notification_subscriptions = relationship("NotificationSubscription", back_populates="user", cascade="all, delete-orphan")
    notification_preference = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notification_logs = relationship("NotificationLog", back_populates="user", cascade="all, delete-orphan")
    recurring_transactions = relationship("RecurringTransaction", back_populates="user", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"
