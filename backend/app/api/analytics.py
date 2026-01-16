from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, or_
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from collections import defaultdict

from app.database import get_db
from app.models.user import User
from app.models.couple import Couple
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.asset import Asset
from app.schemas.analytics import (
    CategoryBreakdown,
    MonthlyTrend,
    YearlyTrend,
    CategoryAnalysis,
    TimeSeriesData,
    ReportData,
    SavingsData
)
from app.schemas.transaction import TransactionSummary
from app.core.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter()

# Japanese month names
MONTH_NAMES_JP = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
]


def get_transactions_query(db: Session, user: User, scope: str):
    """Get base transactions query for user/couple"""
    query = db.query(Transaction)

    if scope == 'personal':
        query = query.filter(
            Transaction.user_id == user.id,
            Transaction.couple_id.is_(None)
        )
    else:  # couple
        couple = db.query(Couple).filter(
            or_(
                Couple.user1_id == user.id,
                Couple.user2_id == user.id
            )
        ).first()

        if not couple:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are not in a couple"
            )

        query = query.filter(Transaction.couple_id == couple.id)

    return query


@router.get("/category-analysis", response_model=CategoryAnalysis)
async def get_category_analysis(
    start_date: date,
    end_date: date,
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get category-wise analysis of transactions"""

    query = get_transactions_query(db, current_user, scope)
    query = query.filter(
        Transaction.date >= start_date,
        Transaction.date <= end_date
    )

    transactions = query.all()

    # Group by type and category
    income_totals = defaultdict(lambda: {'total': Decimal('0'), 'count': 0})
    expense_totals = defaultdict(lambda: {'total': Decimal('0'), 'count': 0})

    total_income = Decimal('0')
    total_expense = Decimal('0')

    for trans in transactions:
        if trans.type == 'income':
            income_totals[trans.category]['total'] += trans.amount
            income_totals[trans.category]['count'] += 1
            total_income += trans.amount
        else:
            expense_totals[trans.category]['total'] += trans.amount
            expense_totals[trans.category]['count'] += 1
            total_expense += trans.amount

    # Build income breakdown
    income_breakdown = []
    for category, data in income_totals.items():
        percentage = float(data['total'] / total_income * 100) if total_income > 0 else 0
        income_breakdown.append(CategoryBreakdown(
            category=category,
            total=data['total'],
            percentage=percentage,
            transaction_count=data['count']
        ))
    income_breakdown.sort(key=lambda x: x.total, reverse=True)

    # Build expense breakdown
    expense_breakdown = []
    for category, data in expense_totals.items():
        percentage = float(data['total'] / total_expense * 100) if total_expense > 0 else 0
        expense_breakdown.append(CategoryBreakdown(
            category=category,
            total=data['total'],
            percentage=percentage,
            transaction_count=data['count']
        ))
    expense_breakdown.sort(key=lambda x: x.total, reverse=True)

    # Top 5 expense categories
    top_expense_categories = expense_breakdown[:5]

    return CategoryAnalysis(
        scope=scope,
        start_date=start_date,
        end_date=end_date,
        income_breakdown=income_breakdown,
        expense_breakdown=expense_breakdown,
        top_expense_categories=top_expense_categories
    )


@router.get("/monthly-trends", response_model=List[MonthlyTrend])
async def get_monthly_trends(
    year: int,
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly trends for a year"""

    query = get_transactions_query(db, current_user, scope)
    query = query.filter(extract('year', Transaction.date) == year)

    transactions = query.all()

    # Group by month
    monthly_data = {}
    for month in range(1, 13):
        monthly_data[month] = {
            'income': Decimal('0'),
            'expense': Decimal('0'),
            'count': 0
        }

    for trans in transactions:
        month = trans.date.month
        monthly_data[month]['count'] += 1
        if trans.type == 'income':
            monthly_data[month]['income'] += trans.amount
        else:
            monthly_data[month]['expense'] += trans.amount

    # Build response
    trends = []
    for month in range(1, 13):
        data = monthly_data[month]
        balance = data['income'] - data['expense']
        trends.append(MonthlyTrend(
            year=year,
            month=month,
            month_name=MONTH_NAMES_JP[month - 1],
            total_income=data['income'],
            total_expense=data['expense'],
            balance=balance,
            transaction_count=data['count']
        ))

    return trends


@router.get("/yearly-trends", response_model=List[YearlyTrend])
async def get_yearly_trends(
    start_year: int,
    end_year: int,
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get yearly trends across multiple years"""

    trends = []

    for year in range(start_year, end_year + 1):
        # Get monthly trends for this year
        monthly_trends = await get_monthly_trends(year, scope, current_user, db)

        # Calculate yearly totals
        total_income = sum(m.total_income for m in monthly_trends)
        total_expense = sum(m.total_expense for m in monthly_trends)
        balance = total_income - total_expense
        transaction_count = sum(m.transaction_count for m in monthly_trends)

        trends.append(YearlyTrend(
            year=year,
            total_income=total_income,
            total_expense=total_expense,
            balance=balance,
            transaction_count=transaction_count,
            monthly_data=monthly_trends
        ))

    return trends


@router.get("/report/monthly", response_model=ReportData)
async def get_monthly_report(
    year: int,
    month: int,
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive monthly report"""

    # Calculate start and end dates
    if month == 12:
        next_month = 1
        next_year = year + 1
    else:
        next_month = month + 1
        next_year = year

    start_date = date(year, month, 1)
    end_date = date(next_year, next_month, 1)

    query = get_transactions_query(db, current_user, scope)
    query = query.filter(
        Transaction.date >= start_date,
        Transaction.date < end_date
    )

    transactions = query.all()

    # Calculate summary
    total_income = Decimal('0')
    total_expense = Decimal('0')
    transaction_count = len(transactions)

    for trans in transactions:
        if trans.type == 'income':
            total_income += trans.amount
        else:
            total_expense += trans.amount

    balance = total_income - total_expense

    summary = TransactionSummary(
        total_income=str(total_income),
        total_expense=str(total_expense),
        balance=str(balance),
        transaction_count=transaction_count
    )

    # Get category analysis
    category_analysis = await get_category_analysis(
        start_date=start_date,
        end_date=end_date,
        scope=scope,
        current_user=current_user,
        db=db
    )

    # Build daily time series
    daily_data = defaultdict(lambda: {'income': Decimal('0'), 'expense': Decimal('0')})
    for trans in transactions:
        date_str = trans.date.isoformat()
        if trans.type == 'income':
            daily_data[date_str]['income'] += trans.amount
        else:
            daily_data[date_str]['expense'] += trans.amount

    time_series = []
    for date_str in sorted(daily_data.keys()):
        data = daily_data[date_str]
        balance = data['income'] - data['expense']
        time_series.append(TimeSeriesData(
            date=date_str,
            label=date_str,
            income=data['income'],
            expense=data['expense'],
            balance=balance
        ))

    # Get budget status
    budget_query = db.query(Budget).filter(
        Budget.year == year,
        Budget.month == month,
        Budget.is_active == True
    )

    if scope == 'personal':
        budget_query = budget_query.filter(Budget.user_id == current_user.id)
    else:
        couple = db.query(Couple).filter(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id
            )
        ).first()
        if couple:
            budget_query = budget_query.filter(Budget.couple_id == couple.id)

    budgets = budget_query.all()

    # Import here to avoid circular dependency
    from app.api.budgets import enrich_budget_response
    budget_status = [enrich_budget_response(db, b) for b in budgets] if budgets else None

    return ReportData(
        period='monthly',
        scope=scope,
        year=year,
        month=month,
        summary=summary,
        category_analysis=category_analysis,
        time_series=time_series,
        budget_status=budget_status
    )


@router.get("/savings", response_model=SavingsData)
async def get_savings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cumulative savings/balance for personal and couple"""

    # Personal savings - all transactions for this user
    personal_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).all()

    personal_income = Decimal('0')
    personal_expense = Decimal('0')
    personal_count = len(personal_transactions)

    for trans in personal_transactions:
        if trans.type == 'income':
            personal_income += trans.amount
        else:
            personal_expense += trans.amount

    personal_balance = personal_income - personal_expense

    # Personal assets
    personal_assets = db.query(Asset).filter(
        Asset.user_id == current_user.id
    ).all()

    personal_assets_total = sum(asset.amount for asset in personal_assets)
    personal_total_balance = personal_balance + personal_assets_total

    # Check for couple
    couple = db.query(Couple).filter(
        or_(
            Couple.user1_id == current_user.id,
            Couple.user2_id == current_user.id
        )
    ).first()

    couple_income = None
    couple_expense = None
    couple_balance = None
    couple_count = None
    couple_assets_total = None
    couple_total_balance = None

    if couple:
        # Couple savings - all transactions from both users
        couple_transactions = db.query(Transaction).filter(
            or_(
                Transaction.user_id == couple.user1_id,
                Transaction.user_id == couple.user2_id
            )
        ).all()

        couple_income = Decimal('0')
        couple_expense = Decimal('0')
        couple_count = len(couple_transactions)

        for trans in couple_transactions:
            if trans.type == 'income':
                couple_income += trans.amount
            else:
                couple_expense += trans.amount

        couple_balance = couple_income - couple_expense

        # Couple assets - all assets from both users
        couple_assets = db.query(Asset).filter(
            or_(
                Asset.user_id == couple.user1_id,
                Asset.user_id == couple.user2_id
            )
        ).all()

        couple_assets_total = sum(asset.amount for asset in couple_assets)
        couple_total_balance = couple_balance + couple_assets_total

    return SavingsData(
        personal_total_income=personal_income,
        personal_total_expense=personal_expense,
        personal_balance=personal_balance,
        personal_transaction_count=personal_count,
        personal_assets_total=personal_assets_total,
        personal_total_balance=personal_total_balance,
        couple_total_income=couple_income,
        couple_total_expense=couple_expense,
        couple_balance=couple_balance,
        couple_transaction_count=couple_count,
        couple_assets_total=couple_assets_total,
        couple_total_balance=couple_total_balance,
        has_couple=couple is not None
    )


@router.get("/report/yearly", response_model=ReportData)
async def get_yearly_report(
    year: int,
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive yearly report"""

    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)

    query = get_transactions_query(db, current_user, scope)
    query = query.filter(
        Transaction.date >= start_date,
        Transaction.date <= end_date
    )

    transactions = query.all()

    # Calculate summary
    total_income = Decimal('0')
    total_expense = Decimal('0')
    transaction_count = len(transactions)

    for trans in transactions:
        if trans.type == 'income':
            total_income += trans.amount
        else:
            total_expense += trans.amount

    balance = total_income - total_expense

    summary = TransactionSummary(
        total_income=str(total_income),
        total_expense=str(total_expense),
        balance=str(balance),
        transaction_count=transaction_count
    )

    # Get category analysis
    category_analysis = await get_category_analysis(
        start_date=start_date,
        end_date=end_date,
        scope=scope,
        current_user=current_user,
        db=db
    )

    # Build monthly time series
    monthly_trends = await get_monthly_trends(year, scope, current_user, db)
    time_series = [
        TimeSeriesData(
            date=f"{trend.year}-{trend.month:02d}",
            label=trend.month_name,
            income=trend.total_income,
            expense=trend.total_expense,
            balance=trend.balance
        )
        for trend in monthly_trends
    ]

    return ReportData(
        period='yearly',
        scope=scope,
        year=year,
        month=None,
        summary=summary,
        category_analysis=category_analysis,
        time_series=time_series,
        budget_status=None
    )
