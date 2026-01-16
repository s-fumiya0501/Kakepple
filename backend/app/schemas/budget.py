from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List, Literal
from decimal import Decimal
import uuid


class BudgetBase(BaseModel):
    """Base budget schema"""
    scope: Literal['personal', 'couple']
    budget_type: Literal['category', 'monthly_total']
    category: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)

    @field_validator('category')
    @classmethod
    def validate_category(cls, v, info):
        # Category is required if budget_type is 'category'
        if info.data.get('budget_type') == 'category' and not v:
            raise ValueError("category is required when budget_type is 'category'")
        return v


class BudgetCreate(BudgetBase):
    """Schema for creating a budget"""
    pass


class BudgetUpdate(BaseModel):
    """Schema for updating a budget"""
    amount: Optional[Decimal] = Field(None, gt=0)
    is_active: Optional[bool] = None


class BudgetResponse(BudgetBase):
    """Schema for budget response"""
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    couple_id: Optional[uuid.UUID] = None
    is_active: bool
    current_spent: Optional[Decimal] = None  # Computed field
    percentage: Optional[float] = None  # Computed field
    is_exceeded: Optional[bool] = None  # Computed field
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BudgetSummary(BaseModel):
    """Detailed budget summary with transactions"""
    budget: BudgetResponse
    total_spent: Decimal
    remaining: Decimal
    percentage: float
    is_exceeded: bool
    transaction_count: int
