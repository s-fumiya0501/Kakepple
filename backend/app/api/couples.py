from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.couple import Couple
from app.models.invite_code import InviteCode
from app.models.transaction import Transaction
from app.schemas.couple import (
    CoupleResponse,
    CoupleCreate,
    InviteCodeCreate,
    InviteCodeResponse
)
from app.core.dependencies import get_current_user
from app.utils.invite_code import create_invite_code, validate_invite_code


class SettlementResponse(BaseModel):
    my_paid: Decimal
    partner_paid: Decimal
    total: Decimal
    settlement_amount: Decimal
    i_pay_partner: bool

router = APIRouter()


@router.post("/invite", response_model=InviteCodeResponse)
async def generate_invite_code(
    data: InviteCodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new invite code for couple pairing"""

    # Check if user is already in a couple
    existing_couple = db.query(Couple).filter(
        or_(
            Couple.user1_id == current_user.id,
            Couple.user2_id == current_user.id
        )
    ).first()

    if existing_couple:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already in a couple"
        )

    # Create invite code
    invite_code = create_invite_code(db, str(current_user.id), data.hours_valid)

    return invite_code


@router.post("/join", response_model=CoupleResponse)
async def join_couple(
    data: CoupleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join a couple using an invite code"""

    # Check if user is already in a couple
    existing_couple = db.query(Couple).filter(
        or_(
            Couple.user1_id == current_user.id,
            Couple.user2_id == current_user.id
        )
    ).first()

    if existing_couple:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already in a couple"
        )

    # Validate invite code
    is_valid, error_message, invite_code = validate_invite_code(db, data.invite_code)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )

    # Check if trying to pair with yourself
    if str(invite_code.user_id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot pair with yourself"
        )

    # Create couple
    couple = Couple(
        user1_id=invite_code.user_id,
        user2_id=current_user.id
    )

    db.add(couple)

    # Mark invite code as used
    invite_code.used = True
    invite_code.used_by = current_user.id

    db.commit()
    db.refresh(couple)

    return couple


@router.get("/me", response_model=Optional[CoupleResponse])
async def get_my_couple(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's couple information"""

    couple = db.query(Couple).filter(
        or_(
            Couple.user1_id == current_user.id,
            Couple.user2_id == current_user.id
        )
    ).first()

    return couple


@router.delete("/me")
async def leave_couple(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave current couple"""

    couple = db.query(Couple).filter(
        or_(
            Couple.user1_id == current_user.id,
            Couple.user2_id == current_user.id
        )
    ).first()

    if not couple:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not in a couple"
        )

    db.delete(couple)
    db.commit()

    return {"message": "Successfully left the couple"}


@router.get("/settlement", response_model=SettlementResponse)
async def get_settlement(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate settlement between couple partners based on who actually paid"""

    couple = db.query(Couple).filter(
        or_(
            Couple.user1_id == current_user.id,
            Couple.user2_id == current_user.id
        )
    ).first()

    if not couple:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not in a couple"
        )

    # Determine partner
    if str(couple.user1_id) == str(current_user.id):
        partner_id = couple.user2_id
    else:
        partner_id = couple.user1_id

    # Query split transactions for this couple
    query = db.query(Transaction).filter(
        and_(
            Transaction.couple_id == couple.id,
            Transaction.is_split == True,
            Transaction.type == "expense",
            Transaction.paid_by_user_id.isnot(None),
        )
    )

    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)

    # We only need one record per split expense (both records share the same original_amount and paid_by).
    # Use the current user's records to avoid double counting.
    query = query.filter(Transaction.user_id == current_user.id)

    transactions = query.all()

    my_paid = Decimal("0.00")
    partner_paid = Decimal("0.00")

    for t in transactions:
        original = t.original_amount or (t.amount * 2)
        if str(t.paid_by_user_id) == str(current_user.id):
            my_paid += original
        else:
            partner_paid += original

    total = my_paid + partner_paid
    half = total / 2

    # How much more I paid than my fair share
    my_excess = my_paid - half

    return SettlementResponse(
        my_paid=my_paid,
        partner_paid=partner_paid,
        total=total,
        settlement_amount=abs(my_excess),
        i_pay_partner=my_excess < 0,  # If I paid less than half, I owe partner
    )
