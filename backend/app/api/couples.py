from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.couple import Couple
from app.models.invite_code import InviteCode
from app.schemas.couple import (
    CoupleResponse,
    CoupleCreate,
    InviteCodeCreate,
    InviteCodeResponse
)
from app.core.dependencies import get_current_user
from app.utils.invite_code import create_invite_code, validate_invite_code

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
