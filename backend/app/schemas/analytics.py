from pydantic import BaseModel
from datetime import date
from typing import List, Optional, Literal
from decimal import Decimal
from app.schemas.transaction import TransactionSummary
from app.schemas.budget import BudgetResponse


class CategoryBreakdown(BaseModel):
    """Category-wise breakdown of transactions"""
    category: str
    total: Decimal
    percentage: float
    transaction_count: int


class MonthlyTrend(BaseModel):
    """Monthly trend data"""
    year: int
    month: int
    month_name: str  # Japanese month name
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    transaction_count: int


class YearlyTrend(BaseModel):
    """Yearly trend data"""
    year: int
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    transaction_count: int
    monthly_data: List[MonthlyTrend]


class CategoryAnalysis(BaseModel):
    """Category-wise analysis"""
    scope: str
    start_date: date
    end_date: date
    income_breakdown: List[CategoryBreakdown]
    expense_breakdown: List[CategoryBreakdown]
    top_expense_categories: List[CategoryBreakdown]


class TimeSeriesData(BaseModel):
    """Time series data point"""
    date: str  # YYYY-MM-DD or YYYY-MM format
    label: str  # Display label (Japanese)
    income: Decimal
    expense: Decimal
    balance: Decimal


class ReportData(BaseModel):
    """Comprehensive report data"""
    period: Literal['monthly', 'yearly']
    scope: str
    year: int
    month: Optional[int] = None
    summary: TransactionSummary
    category_analysis: CategoryAnalysis
    time_series: List[TimeSeriesData]
    budget_status: Optional[List[BudgetResponse]] = None


class SavingsData(BaseModel):
    """Cumulative savings/balance data"""
    # Liquid balance (usable money)
    personal_total_income: Decimal
    personal_total_expense: Decimal
    personal_balance: Decimal  # Liquid balance
    personal_transaction_count: int

    # Non-liquid assets
    personal_assets_total: Decimal  # Total of registered assets
    personal_total_balance: Decimal  # Liquid + Assets

    # Couple data
    couple_total_income: Optional[Decimal] = None
    couple_total_expense: Optional[Decimal] = None
    couple_balance: Optional[Decimal] = None  # Couple liquid balance
    couple_transaction_count: Optional[int] = None
    couple_assets_total: Optional[Decimal] = None  # Total assets of both users
    couple_total_balance: Optional[Decimal] = None  # Couple liquid + assets

    has_couple: bool
