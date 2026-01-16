from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

from app.database import get_db
from app.models.user import User
from app.models.couple import Couple
from app.models.transaction import Transaction
from app.core.dependencies import get_admin_user

router = APIRouter()


# ==================== Pydantic Schemas ====================

class AdminUserResponse(BaseModel):
    """Admin user response with all fields"""
    id: uuid.UUID
    email: str
    name: Optional[str]
    picture_url: Optional[str]
    google_id: Optional[str]
    line_id: Optional[str]
    email_verified: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    """Admin user update schema"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None
    email_verified: Optional[bool] = None


class UserListResponse(BaseModel):
    """Paginated user list response"""
    users: List[AdminUserResponse]
    total: int
    limit: int
    offset: int


class CoupleResponse(BaseModel):
    """Couple response for admin"""
    id: uuid.UUID
    user1_email: str
    user1_name: Optional[str]
    user2_email: str
    user2_name: Optional[str]
    created_at: datetime


class CoupleListResponse(BaseModel):
    """Paginated couple list response"""
    couples: List[CoupleResponse]
    total: int
    limit: int
    offset: int


class TransactionResponse(BaseModel):
    """Transaction response for admin"""
    id: uuid.UUID
    user_email: str
    user_name: Optional[str]
    type: str
    category: str
    amount: float
    description: Optional[str]
    date: datetime
    created_at: datetime


class TransactionListResponse(BaseModel):
    """Paginated transaction list response"""
    transactions: List[TransactionResponse]
    total: int
    limit: int
    offset: int


class AdminStats(BaseModel):
    """Admin dashboard statistics"""
    total_users: int
    total_couples: int
    total_transactions: int
    users_this_month: int
    transactions_this_month: int
    total_income: float
    total_expense: float


# ==================== Stats Endpoint ====================

@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""

    # Get current month start
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1)

    # Total counts
    total_users = db.query(func.count(User.id)).scalar()
    total_couples = db.query(func.count(Couple.id)).scalar()
    total_transactions = db.query(func.count(Transaction.id)).scalar()

    # This month counts
    users_this_month = db.query(func.count(User.id)).filter(
        User.created_at >= month_start
    ).scalar()

    transactions_this_month = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= month_start
    ).scalar()

    # Total amounts
    total_income = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.type == "income"
    ).scalar()

    total_expense = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.type == "expense"
    ).scalar()

    return AdminStats(
        total_users=total_users,
        total_couples=total_couples,
        total_transactions=total_transactions,
        users_this_month=users_this_month,
        transactions_this_month=transactions_this_month,
        total_income=float(total_income),
        total_expense=float(total_expense)
    )


# ==================== User Management ====================

@router.get("/users", response_model=UserListResponse)
async def list_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all users with pagination and search"""

    query = db.query(User)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_filter)) |
            (User.name.ilike(search_filter))
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    return UserListResponse(
        users=[AdminUserResponse.model_validate(u) for u in users],
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get specific user by ID"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return AdminUserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update user information"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent removing own admin status
    if user.id == admin.id and data.is_admin is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin privileges"
        )

    # Check email uniqueness if updating email
    if data.email and data.email != user.email:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    return AdminUserResponse.model_validate(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deleting self
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}


# ==================== Couple Management ====================

@router.get("/couples", response_model=CoupleListResponse)
async def list_couples(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all couples with pagination"""

    total = db.query(func.count(Couple.id)).scalar()
    couples = db.query(Couple).order_by(Couple.created_at.desc()).offset(offset).limit(limit).all()

    couple_responses = []
    for couple in couples:
        couple_responses.append(CoupleResponse(
            id=couple.id,
            user1_email=couple.user1.email,
            user1_name=couple.user1.name,
            user2_email=couple.user2.email,
            user2_name=couple.user2.name,
            created_at=couple.created_at
        ))

    return CoupleListResponse(
        couples=couple_responses,
        total=total,
        limit=limit,
        offset=offset
    )


# ==================== Transaction Management ====================

@router.get("/transactions", response_model=TransactionListResponse)
async def list_all_transactions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: Optional[uuid.UUID] = None,
    type: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all transactions with pagination and filters"""

    query = db.query(Transaction).join(User)

    if user_id:
        query = query.filter(Transaction.user_id == user_id)

    if type:
        query = query.filter(Transaction.type == type)

    total = query.count()
    transactions = query.order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()

    transaction_responses = []
    for t in transactions:
        transaction_responses.append(TransactionResponse(
            id=t.id,
            user_email=t.user.email,
            user_name=t.user.name,
            type=t.type,
            category=t.category,
            amount=float(t.amount),
            description=t.description,
            date=t.date,
            created_at=t.created_at
        ))

    return TransactionListResponse(
        transactions=transaction_responses,
        total=total,
        limit=limit,
        offset=offset
    )
