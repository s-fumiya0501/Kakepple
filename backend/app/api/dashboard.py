from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, extract
from datetime import date, datetime, timezone
from decimal import Decimal
from collections import defaultdict

from app.database import get_db
from app.models.user import User
from app.models.couple import Couple
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.asset import Asset
from app.core.dependencies import get_current_user

router = APIRouter()

MONTH_NAMES_JP = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
]


@router.get("/data")
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all dashboard data in a single request"""

    now = datetime.now(timezone.utc)
    current_year = now.year
    current_month = now.month
    start_date = date(current_year, current_month, 1)
    if current_month == 12:
        end_date = date(current_year + 1, 1, 1)
    else:
        end_date = date(current_year, current_month + 1, 1)

    # Get couple
    couple = db.query(Couple).filter(
        or_(
            Couple.user1_id == current_user.id,
            Couple.user2_id == current_user.id
        )
    ).first()

    couple_id = couple.id if couple else None

    # ===== Personal Summary =====
    personal_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.couple_id.is_(None),
        Transaction.date >= start_date,
        Transaction.date < end_date
    ).all()

    personal_income = sum(t.amount for t in personal_transactions if t.type == 'income')
    personal_expense = sum(t.amount for t in personal_transactions if t.type == 'expense')

    personal_summary = {
        "total_income": str(personal_income),
        "total_expense": str(personal_expense),
        "balance": str(personal_income - personal_expense),
        "transaction_count": len(personal_transactions),
    }

    # ===== Couple Summary =====
    couple_summary = None
    if couple_id:
        couple_transactions = db.query(Transaction).filter(
            Transaction.couple_id == couple_id,
            Transaction.date >= start_date,
            Transaction.date < end_date
        ).all()

        couple_income = sum(t.amount for t in couple_transactions if t.type == 'income')
        couple_expense = sum(t.amount for t in couple_transactions if t.type == 'expense')

        couple_summary = {
            "total_income": str(couple_income),
            "total_expense": str(couple_expense),
            "balance": str(couple_income - couple_expense),
            "transaction_count": len(couple_transactions),
        }

    # ===== Budgets =====
    from app.api.budgets import enrich_budget_response

    personal_budgets_q = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.year == current_year,
        Budget.month == current_month,
        Budget.is_active == True,
        Budget.scope == 'personal',
    ).all()
    personal_budgets = [enrich_budget_response(db, b) for b in personal_budgets_q]

    couple_budgets = []
    if couple_id:
        couple_budgets_q = db.query(Budget).filter(
            Budget.couple_id == couple_id,
            Budget.year == current_year,
            Budget.month == current_month,
            Budget.is_active == True,
            Budget.scope == 'couple',
        ).all()
        couple_budgets = [enrich_budget_response(db, b) for b in couple_budgets_q]

    # ===== Savings (all-time) =====
    all_personal = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).all()

    all_personal_income = sum(t.amount for t in all_personal if t.type == 'income')
    all_personal_expense = sum(t.amount for t in all_personal if t.type == 'expense')
    personal_balance = all_personal_income - all_personal_expense

    personal_assets = db.query(Asset).filter(Asset.user_id == current_user.id).all()
    personal_assets_total = sum(a.amount for a in personal_assets)

    savings = {
        "personal_total_income": str(all_personal_income),
        "personal_total_expense": str(all_personal_expense),
        "personal_balance": str(personal_balance),
        "personal_transaction_count": len(all_personal),
        "personal_assets_total": str(personal_assets_total),
        "personal_total_balance": str(personal_balance + personal_assets_total),
        "couple_total_income": None,
        "couple_total_expense": None,
        "couple_balance": None,
        "couple_transaction_count": None,
        "couple_assets_total": None,
        "couple_total_balance": None,
        "has_couple": couple is not None,
    }

    if couple:
        all_couple = db.query(Transaction).filter(
            or_(
                Transaction.user_id == couple.user1_id,
                Transaction.user_id == couple.user2_id
            )
        ).all()

        c_income = sum(t.amount for t in all_couple if t.type == 'income')
        c_expense = sum(t.amount for t in all_couple if t.type == 'expense')
        c_balance = c_income - c_expense

        couple_assets = db.query(Asset).filter(
            or_(
                Asset.user_id == couple.user1_id,
                Asset.user_id == couple.user2_id
            )
        ).all()
        c_assets_total = sum(a.amount for a in couple_assets)

        savings.update({
            "couple_total_income": str(c_income),
            "couple_total_expense": str(c_expense),
            "couple_balance": str(c_balance),
            "couple_transaction_count": len(all_couple),
            "couple_assets_total": str(c_assets_total),
            "couple_total_balance": str(c_balance + c_assets_total),
        })

    # ===== Category Analysis (this month, personal) =====
    expense_totals = defaultdict(lambda: {"total": Decimal("0"), "count": 0})
    total_expense_amount = Decimal("0")
    for t in personal_transactions:
        if t.type == "expense":
            expense_totals[t.category]["total"] += t.amount
            expense_totals[t.category]["count"] += 1
            total_expense_amount += t.amount

    expense_breakdown = []
    for category, data in expense_totals.items():
        pct = float(data["total"] / total_expense_amount * 100) if total_expense_amount > 0 else 0
        expense_breakdown.append({
            "category": category,
            "total": str(data["total"]),
            "percentage": round(pct, 1),
            "transaction_count": data["count"],
        })
    expense_breakdown.sort(key=lambda x: float(x["total"]), reverse=True)

    # ===== Monthly Trends (this year, personal) =====
    year_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.couple_id.is_(None),
        extract("year", Transaction.date) == current_year
    ).all()

    monthly_data = {}
    for month in range(1, 13):
        monthly_data[month] = {"income": Decimal("0"), "expense": Decimal("0"), "count": 0}

    for t in year_transactions:
        m = t.date.month
        monthly_data[m]["count"] += 1
        if t.type == "income":
            monthly_data[m]["income"] += t.amount
        else:
            monthly_data[m]["expense"] += t.amount

    monthly_trends = []
    for month in range(1, 13):
        d = monthly_data[month]
        monthly_trends.append({
            "year": current_year,
            "month": month,
            "month_name": MONTH_NAMES_JP[month - 1],
            "total_income": str(d["income"]),
            "total_expense": str(d["expense"]),
            "balance": str(d["income"] - d["expense"]),
            "transaction_count": d["count"],
        })

    # ===== Recent Transactions (5 most recent, personal) =====
    recent = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.couple_id.is_(None),
    ).order_by(Transaction.date.desc(), Transaction.created_at.desc()).limit(5).all()

    recent_transactions = []
    for t in recent:
        recent_transactions.append({
            "id": str(t.id),
            "type": t.type,
            "category": t.category,
            "amount": str(t.amount),
            "description": t.description,
            "date": t.date.isoformat(),
            "is_split": t.is_split,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {
        "personal_summary": personal_summary,
        "couple_summary": couple_summary,
        "personal_budgets": personal_budgets,
        "couple_budgets": couple_budgets,
        "savings": savings,
        "expense_breakdown": expense_breakdown,
        "monthly_trends": monthly_trends,
        "recent_transactions": recent_transactions,
    }
