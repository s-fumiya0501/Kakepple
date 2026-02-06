from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import Optional, List
from datetime import date
from decimal import Decimal
import math
from app.database import get_db
from app.models.user import User
from app.models.couple import Couple
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionSummary,
    INCOME_CATEGORIES,
    ALL_EXPENSE_CATEGORIES
)
from app.core.dependencies import get_current_user

router = APIRouter()


def get_partner_id(db: Session, user_id: str, couple_id: str) -> Optional[str]:
    """Get partner's user ID from couple"""
    couple = db.query(Couple).filter(Couple.id == couple_id).first()
    if not couple:
        return None

    if str(couple.user1_id) == user_id:
        return str(couple.user2_id)
    else:
        return str(couple.user1_id)


@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new transaction"""

    # Validate category
    if data.type == "income":
        if data.category not in INCOME_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid income category. Must be one of: {', '.join(INCOME_CATEGORIES)}"
            )
    elif data.type == "expense":
        if data.category not in ALL_EXPENSE_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid expense category. Must be one of: {', '.join(ALL_EXPENSE_CATEGORIES)}"
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
    if data.is_split and couple_id:
        if data.type != "expense":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only expenses can be split"
            )

        original_amount = data.amount
        split_amount = Decimal(str(math.ceil(float(original_amount) / 2)))

        # Determine who actually paid (default: current user)
        paid_by = data.paid_by_user_id if data.paid_by_user_id else current_user.id

        # Create transaction for current user (half amount)
        user_transaction = Transaction(
            user_id=current_user.id,
            couple_id=couple_id,
            type=data.type,
            category=data.category,
            amount=split_amount,
            original_amount=original_amount,
            description=data.description,
            date=data.date,
            is_split=True,
            paid_by_user_id=paid_by,
        )
        db.add(user_transaction)

        # Create transaction for partner (half amount)
        partner_id = get_partner_id(db, str(current_user.id), str(couple_id))
        if partner_id:
            partner_transaction = Transaction(
                user_id=partner_id,
                couple_id=couple_id,
                type=data.type,
                category=data.category,
                amount=split_amount,
                original_amount=original_amount,
                description=f"{data.description} (割り勘)" if data.description else "(割り勘)",
                date=data.date,
                is_split=True,
                paid_by_user_id=paid_by,
            )
            db.add(partner_transaction)

        db.commit()
        db.refresh(user_transaction)

        return user_transaction

    else:
        # Create regular transaction
        transaction = Transaction(
            user_id=current_user.id,
            couple_id=couple_id if data.is_split else None,
            type=data.type,
            category=data.category,
            amount=data.amount,
            description=data.description,
            date=data.date,
            is_split=False
        )

        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        return transaction


@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    scope: str = Query("personal", pattern="^(personal|couple)$"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transactions list with filters"""

    query = db.query(Transaction)

    if scope == "personal":
        # Personal transactions only
        query = query.filter(Transaction.user_id == current_user.id)
    elif scope == "couple":
        # Couple transactions only
        couple = db.query(Couple).filter(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id
            )
        ).first()

        if not couple:
            return []

        query = query.filter(
            and_(
                Transaction.couple_id == couple.id,
                or_(
                    Transaction.user_id == couple.user1_id,
                    Transaction.user_id == couple.user2_id
                )
            )
        )

    # Apply filters
    if type:
        query = query.filter(Transaction.type == type)

    if category:
        query = query.filter(Transaction.category == category)

    if start_date:
        query = query.filter(Transaction.date >= start_date)

    if end_date:
        query = query.filter(Transaction.date <= end_date)

    # Order by date descending
    query = query.order_by(Transaction.date.desc(), Transaction.created_at.desc())

    # Apply pagination
    transactions = query.offset(offset).limit(limit).all()

    return transactions


@router.get("/summary", response_model=TransactionSummary)
async def get_transaction_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    scope: str = Query("personal", pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transaction summary"""

    query = db.query(Transaction)

    if scope == "personal":
        query = query.filter(Transaction.user_id == current_user.id)
    elif scope == "couple":
        couple = db.query(Couple).filter(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id
            )
        ).first()

        if not couple:
            return TransactionSummary(
                total_income=Decimal("0.00"),
                total_expense=Decimal("0.00"),
                balance=Decimal("0.00"),
                transaction_count=0
            )

        query = query.filter(Transaction.couple_id == couple.id)

    # Apply date filters
    if start_date:
        query = query.filter(Transaction.date >= start_date)

    if end_date:
        query = query.filter(Transaction.date <= end_date)

    # Calculate summary
    income_sum = query.filter(Transaction.type == "income").with_entities(
        func.sum(Transaction.amount)
    ).scalar() or Decimal("0.00")

    expense_sum = query.filter(Transaction.type == "expense").with_entities(
        func.sum(Transaction.amount)
    ).scalar() or Decimal("0.00")

    transaction_count = query.count()

    return TransactionSummary(
        total_income=income_sum,
        total_expense=expense_sum,
        balance=income_sum - expense_sum,
        transaction_count=transaction_count
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transaction by ID"""

    transaction = db.query(Transaction).filter(
        and_(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update transaction"""

    transaction = db.query(Transaction).filter(
        and_(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)

    return transaction


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete transaction"""

    transaction = db.query(Transaction).filter(
        and_(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # If it's a split transaction, delete the partner's transaction too
    if transaction.is_split and transaction.couple_id:
        partner_id = get_partner_id(db, str(current_user.id), str(transaction.couple_id))
        if partner_id:
            partner_transaction = db.query(Transaction).filter(
                and_(
                    Transaction.user_id == partner_id,
                    Transaction.couple_id == transaction.couple_id,
                    Transaction.original_amount == transaction.original_amount,
                    Transaction.date == transaction.date,
                    Transaction.category == transaction.category,
                    Transaction.is_split == True
                )
            ).first()

            if partner_transaction:
                db.delete(partner_transaction)

    db.delete(transaction)
    db.commit()

    return {"message": "Transaction deleted successfully"}
