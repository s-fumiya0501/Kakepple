from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
import uuid

# Category constants
INCOME_CATEGORIES = ["本業", "副業", "アルバイト", "パート", "その他"]

FIXED_EXPENSE_CATEGORIES = ["家賃", "電気・ガス・水道", "通信費", "サブスク・保険"]

VARIABLE_EXPENSE_CATEGORIES = [
    "食費", "日用品", "交通費", "交際費",
    "医療費", "被服・美容", "趣味・娯楽"
]

ALL_EXPENSE_CATEGORIES = FIXED_EXPENSE_CATEGORIES + VARIABLE_EXPENSE_CATEGORIES


class TransactionBase(BaseModel):
    """Base transaction schema"""
    type: str = Field(..., pattern="^(income|expense)$")
    category: str
    amount: Decimal = Field(..., gt=0)
    description: Optional[str] = None
    date: date
    is_split: bool = False


class TransactionCreate(TransactionBase):
    """Transaction creation schema"""
    paid_by_user_id: Optional[uuid.UUID] = None


class TransactionUpdate(BaseModel):
    """Transaction update schema"""
    type: Optional[str] = Field(None, pattern="^(income|expense)$")
    category: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = None
    date: Optional[date] = None
    is_split: Optional[bool] = None
    paid_by_user_id: Optional[uuid.UUID] = None


class TransactionResponse(TransactionBase):
    """Transaction response schema"""
    id: uuid.UUID
    user_id: uuid.UUID
    couple_id: Optional[uuid.UUID] = None
    original_amount: Optional[Decimal] = None
    paid_by_user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionSummary(BaseModel):
    """Transaction summary schema"""
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    transaction_count: int
