from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.couple import Couple
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetSummary
from app.schemas.transaction import ALL_EXPENSE_CATEGORIES, INCOME_CATEGORIES
from app.core.dependencies import get_current_user

router = APIRouter()


def calculate_budget_spent(db: Session, budget: Budget) -> Decimal:
    """Calculate current spent amount for a budget"""
    # Build query for transactions in the budget period
    query = db.query(func.coalesce(func.sum(Transaction.amount), 0))

    # Filter by date range
    query = query.filter(
        extract('year', Transaction.date) == budget.year,
        extract('month', Transaction.date) == budget.month
    )

    # Filter by scope
    if budget.scope == 'personal':
        query = query.filter(Transaction.user_id == budget.user_id)
        query = query.filter(Transaction.couple_id.is_(None))
    else:  # couple
        query = query.filter(Transaction.couple_id == budget.couple_id)

    # Filter by budget type
    if budget.budget_type == 'category':
        query = query.filter(Transaction.category == budget.category)
        query = query.filter(Transaction.type == 'expense')
    else:  # monthly_total
        query = query.filter(Transaction.type == 'expense')

    return query.scalar() or Decimal('0')


def enrich_budget_response(db: Session, budget: Budget) -> BudgetResponse:
    """Enrich budget with current spent amount and percentage"""
    current_spent = calculate_budget_spent(db, budget)
    percentage = float(current_spent / budget.amount * 100) if budget.amount > 0 else 0
    is_exceeded = current_spent > budget.amount

    return BudgetResponse(
        id=budget.id,
        user_id=budget.user_id,
        couple_id=budget.couple_id,
        scope=budget.scope,
        budget_type=budget.budget_type,
        category=budget.category,
        amount=budget.amount,
        year=budget.year,
        month=budget.month,
        is_active=budget.is_active,
        current_spent=current_spent,
        percentage=percentage,
        is_exceeded=is_exceeded,
        created_at=budget.created_at,
        updated_at=budget.updated_at
    )


@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new budget"""

    # Validate category if budget_type is category
    if data.budget_type == 'category':
        if not data.category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category is required for category budgets"
            )
        # Validate category exists in predefined list
        if data.category not in ALL_EXPENSE_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category: {data.category}"
            )

    # Get couple_id if scope is couple
    couple_id = None
    user_id = None

    if data.scope == 'couple':
        couple = db.query(Couple).filter(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id
            )
        ).first()

        if not couple:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are not in a couple"
            )
        couple_id = couple.id
    else:
        user_id = current_user.id

    # Check for existing budget with same parameters
    existing = db.query(Budget).filter(
        Budget.is_active == True,
        Budget.scope == data.scope,
        Budget.budget_type == data.budget_type,
        Budget.year == data.year,
        Budget.month == data.month
    )

    if data.scope == 'personal':
        existing = existing.filter(Budget.user_id == user_id)
    else:
        existing = existing.filter(Budget.couple_id == couple_id)

    if data.budget_type == 'category':
        existing = existing.filter(Budget.category == data.category)
    else:
        existing = existing.filter(Budget.budget_type == 'monthly_total')

    if existing.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Budget already exists for this period and category"
        )

    # Create budget
    budget = Budget(
        user_id=user_id,
        couple_id=couple_id,
        scope=data.scope,
        budget_type=data.budget_type,
        category=data.category,
        amount=data.amount,
        year=data.year,
        month=data.month
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    return enrich_budget_response(db, budget)


@router.get("/", response_model=List[BudgetResponse])
async def get_budgets(
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    year: Optional[int] = None,
    month: Optional[int] = None,
    is_active: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's budgets with optional filters"""

    query = db.query(Budget).filter(Budget.is_active == is_active)

    # Filter by scope
    if scope == 'personal':
        query = query.filter(Budget.user_id == current_user.id)
    else:  # couple
        couple = db.query(Couple).filter(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id
            )
        ).first()

        if not couple:
            return []

        query = query.filter(Budget.couple_id == couple.id)

    # Filter by year and month if provided
    if year:
        query = query.filter(Budget.year == year)
    if month:
        query = query.filter(Budget.month == month)

    # Order by year, month descending
    query = query.order_by(Budget.year.desc(), Budget.month.desc(), Budget.budget_type, Budget.category)

    budgets = query.all()

    # Enrich with current spent
    return [enrich_budget_response(db, budget) for budget in budgets]


@router.get("/status/current", response_model=List[BudgetResponse])
async def get_current_budget_status(
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current month's budget status"""
    now = datetime.now(timezone.utc)
    current_year = now.year
    current_month = now.month

    return await get_budgets(
        scope=scope,
        year=current_year,
        month=current_month,
        is_active=True,
        current_user=current_user,
        db=db
    )


@router.get("/{budget_id}", response_model=BudgetSummary)
async def get_budget_detail(
    budget_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed budget information with transactions"""

    budget = db.query(Budget).filter(Budget.id == budget_id).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    # Check authorization
    if budget.scope == 'personal':
        if budget.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this budget"
            )
    else:  # couple
        couple = db.query(Couple).filter(
            Couple.id == budget.couple_id,
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id
            )
        ).first()

        if not couple:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this budget"
            )

    # Calculate spent
    total_spent = calculate_budget_spent(db, budget)
    remaining = budget.amount - total_spent
    percentage = float(total_spent / budget.amount * 100) if budget.amount > 0 else 0
    is_exceeded = total_spent > budget.amount

    # Count transactions
    trans_query = db.query(func.count(Transaction.id))
    trans_query = trans_query.filter(
        extract('year', Transaction.date) == budget.year,
        extract('month', Transaction.date) == budget.month,
        Transaction.type == 'expense'
    )

    if budget.scope == 'personal':
        trans_query = trans_query.filter(Transaction.user_id == budget.user_id)
        trans_query = trans_query.filter(Transaction.couple_id.is_(None))
    else:
        trans_query = trans_query.filter(Transaction.couple_id == budget.couple_id)

    if budget.budget_type == 'category':
        trans_query = trans_query.filter(Transaction.category == budget.category)

    transaction_count = trans_query.scalar() or 0

    return BudgetSummary(
        budget=enrich_budget_response(db, budget),
        total_spent=total_spent,
        remaining=remaining,
        percentage=percentage,
        is_exceeded=is_exceeded,
        transaction_count=transaction_count
    )


@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    data: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a budget"""

    budget = db.query(Budget).filter(Budget.id == budget_id).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    # Check authorization
    if budget.scope == 'personal':
        if budget.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this budget"
            )
    else:  # couple
        couple = db.query(Couple).filter(
            Couple.id == budget.couple_id,
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id
            )
        ).first()

        if not couple:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this budget"
            )

    # Update fields
    if data.amount is not None:
        budget.amount = data.amount
    if data.is_active is not None:
        budget.is_active = data.is_active

    budget.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(budget)

    return enrich_budget_response(db, budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a budget"""

    budget = db.query(Budget).filter(Budget.id == budget_id).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    # Check authorization
    if budget.scope == 'personal':
        if budget.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this budget"
            )
    else:  # couple
        couple = db.query(Couple).filter(
            Couple.id == budget.couple_id,
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id
            )
        ).first()

        if not couple:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this budget"
            )

    db.delete(budget)
    db.commit()

    return None
