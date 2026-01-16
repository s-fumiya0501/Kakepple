from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid

from app.database import get_db
from app.models.user import User
from app.models.couple import Couple
from app.models.recurring_transaction import RecurringTransaction
from app.models.transaction import Transaction
from app.schemas.transaction import INCOME_CATEGORIES, ALL_EXPENSE_CATEGORIES
from app.core.dependencies import get_current_user

router = APIRouter()


# ==================== Pydantic Schemas ====================

class RecurringTransactionCreate(BaseModel):
    type: str  # 'income' or 'expense'
    category: str
    amount: Decimal
    description: Optional[str] = None
    frequency: str  # 'monthly', 'weekly', 'yearly'
    day_of_month: Optional[int] = None  # 1-31
    day_of_week: Optional[int] = None  # 0-6 (Monday-Sunday)
    is_split: bool = False  # Split expense with partner


class RecurringTransactionUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    is_split: Optional[bool] = None
    is_active: Optional[bool] = None


class RecurringTransactionResponse(BaseModel):
    id: uuid.UUID
    type: str
    category: str
    amount: Decimal
    description: Optional[str]
    frequency: str
    day_of_month: Optional[int]
    day_of_week: Optional[int]
    is_split: bool
    is_active: bool
    last_created_at: Optional[datetime]
    next_due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Helper Functions ====================

def get_partner_id(db: Session, user_id: str, couple_id: str) -> Optional[str]:
    """Get partner's user ID from couple"""
    couple = db.query(Couple).filter(Couple.id == couple_id).first()
    if not couple:
        return None

    if str(couple.user1_id) == user_id:
        return str(couple.user2_id)
    else:
        return str(couple.user1_id)


def calculate_next_due_date(frequency: str, day_of_month: int = None, day_of_week: int = None) -> datetime:
    """Calculate the next due date based on frequency"""
    today = date.today()

    if frequency == 'monthly':
        day = day_of_month or 1
        # If we're past this month's day, schedule for next month
        if today.day > day:
            if today.month == 12:
                next_date = date(today.year + 1, 1, min(day, 28))
            else:
                # Handle months with fewer days
                import calendar
                max_day = calendar.monthrange(today.year, today.month + 1)[1]
                next_date = date(today.year, today.month + 1, min(day, max_day))
        else:
            import calendar
            max_day = calendar.monthrange(today.year, today.month)[1]
            next_date = date(today.year, today.month, min(day, max_day))

    elif frequency == 'weekly':
        dow = day_of_week or 0
        days_ahead = dow - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_date = today + timedelta(days=days_ahead)

    elif frequency == 'yearly':
        day = day_of_month or 1
        # Assume yearly is for the same month
        if date(today.year, today.month, day) <= today:
            next_date = date(today.year + 1, today.month, day)
        else:
            next_date = date(today.year, today.month, day)

    else:
        next_date = today

    return datetime.combine(next_date, datetime.min.time())


# ==================== API Endpoints ====================

@router.post("/", response_model=RecurringTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_transaction(
    data: RecurringTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new recurring transaction"""

    # Validate type and category
    if data.type == 'income':
        if data.category not in INCOME_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid income category"
            )
    elif data.type == 'expense':
        if data.category not in ALL_EXPENSE_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid expense category"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type must be 'income' or 'expense'"
        )

    # Validate frequency
    if data.frequency not in ['monthly', 'weekly', 'yearly']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Frequency must be 'monthly', 'weekly', or 'yearly'"
        )

    # Validate day settings
    if data.frequency == 'monthly' and data.day_of_month:
        if not 1 <= data.day_of_month <= 31:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Day of month must be between 1 and 31"
            )

    if data.frequency == 'weekly' and data.day_of_week is not None:
        if not 0 <= data.day_of_week <= 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Day of week must be between 0 (Monday) and 6 (Sunday)"
            )

    # Validate split setting
    if data.is_split:
        if data.type != 'expense':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only expenses can be split"
            )
        # Check if user is in a couple
        couple = db.query(Couple).filter(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id
            )
        ).first()
        if not couple:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split requires being in a couple"
            )

    # Calculate next due date
    next_due = calculate_next_due_date(data.frequency, data.day_of_month, data.day_of_week)

    recurring = RecurringTransaction(
        user_id=current_user.id,
        type=data.type,
        category=data.category,
        amount=data.amount,
        description=data.description,
        frequency=data.frequency,
        day_of_month=data.day_of_month,
        day_of_week=data.day_of_week,
        is_split=data.is_split,
        next_due_date=next_due
    )

    db.add(recurring)
    db.commit()
    db.refresh(recurring)

    return recurring


@router.get("/", response_model=List[RecurringTransactionResponse])
async def get_recurring_transactions(
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all recurring transactions for the current user"""

    query = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id
    )

    if is_active is not None:
        query = query.filter(RecurringTransaction.is_active == is_active)

    query = query.order_by(RecurringTransaction.created_at.desc())

    return query.all()


@router.get("/{recurring_id}", response_model=RecurringTransactionResponse)
async def get_recurring_transaction(
    recurring_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific recurring transaction"""

    recurring = db.query(RecurringTransaction).filter(
        and_(
            RecurringTransaction.id == recurring_id,
            RecurringTransaction.user_id == current_user.id
        )
    ).first()

    if not recurring:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found"
        )

    return recurring


@router.put("/{recurring_id}", response_model=RecurringTransactionResponse)
async def update_recurring_transaction(
    recurring_id: uuid.UUID,
    data: RecurringTransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a recurring transaction"""

    recurring = db.query(RecurringTransaction).filter(
        and_(
            RecurringTransaction.id == recurring_id,
            RecurringTransaction.user_id == current_user.id
        )
    ).first()

    if not recurring:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found"
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(recurring, key, value)

    # Recalculate next due date if frequency or day changed
    if any(k in update_data for k in ['frequency', 'day_of_month', 'day_of_week']):
        recurring.next_due_date = calculate_next_due_date(
            recurring.frequency,
            recurring.day_of_month,
            recurring.day_of_week
        )

    db.commit()
    db.refresh(recurring)

    return recurring


@router.delete("/{recurring_id}")
async def delete_recurring_transaction(
    recurring_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a recurring transaction"""

    recurring = db.query(RecurringTransaction).filter(
        and_(
            RecurringTransaction.id == recurring_id,
            RecurringTransaction.user_id == current_user.id
        )
    ).first()

    if not recurring:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found"
        )

    db.delete(recurring)
    db.commit()

    return {"message": "Recurring transaction deleted"}


@router.post("/{recurring_id}/execute")
async def execute_recurring_transaction(
    recurring_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually execute a recurring transaction (create actual transaction)"""

    recurring = db.query(RecurringTransaction).filter(
        and_(
            RecurringTransaction.id == recurring_id,
            RecurringTransaction.user_id == current_user.id
        )
    ).first()

    if not recurring:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found"
        )

    # Get user's couple if exists
    couple = db.query(Couple).filter(
        or_(
            Couple.user1_id == current_user.id,
            Couple.user2_id == current_user.id
        )
    ).first()

    couple_id = couple.id if couple else None

    # Handle split expense
    if recurring.is_split and couple_id:
        original_amount = recurring.amount
        split_amount = original_amount / 2

        # Create transaction for current user (half amount)
        user_transaction = Transaction(
            user_id=current_user.id,
            couple_id=couple_id,
            type=recurring.type,
            category=recurring.category,
            amount=split_amount,
            original_amount=original_amount,
            description=f"{recurring.description or ''} (定期)".strip(),
            date=date.today(),
            is_split=True
        )
        db.add(user_transaction)

        # Create transaction for partner (half amount)
        partner_id = get_partner_id(db, str(current_user.id), str(couple_id))
        if partner_id:
            partner_transaction = Transaction(
                user_id=partner_id,
                couple_id=couple_id,
                type=recurring.type,
                category=recurring.category,
                amount=split_amount,
                original_amount=original_amount,
                description=f"{recurring.description or ''} (定期・割り勘)".strip(),
                date=date.today(),
                is_split=True
            )
            db.add(partner_transaction)

        # Update recurring transaction
        recurring.last_created_at = datetime.now()
        recurring.next_due_date = calculate_next_due_date(
            recurring.frequency,
            recurring.day_of_month,
            recurring.day_of_week
        )

        db.commit()

        return {"message": "Split transactions created", "transaction_id": str(user_transaction.id)}

    else:
        # Create regular transaction
        transaction = Transaction(
            user_id=current_user.id,
            couple_id=couple_id if recurring.is_split else None,
            type=recurring.type,
            category=recurring.category,
            amount=recurring.amount,
            description=f"{recurring.description or ''} (定期)".strip(),
            date=date.today(),
            is_split=False
        )

        db.add(transaction)

        # Update recurring transaction
        recurring.last_created_at = datetime.now()
        recurring.next_due_date = calculate_next_due_date(
            recurring.frequency,
            recurring.day_of_month,
            recurring.day_of_week
        )

        db.commit()

        return {"message": "Transaction created", "transaction_id": str(transaction.id)}
