import random
import string
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.invite_code import InviteCode


def generate_invite_code(length: int = 8) -> str:
    """Generate a random invite code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(length))


def create_invite_code(db: Session, user_id: str, hours_valid: int = 24) -> InviteCode:
    """Create a new invite code for a user"""
    # Generate unique code
    while True:
        code = generate_invite_code()
        existing = db.query(InviteCode).filter(InviteCode.code == code).first()
        if not existing:
            break

    # Create invite code with expiration
    expires_at = datetime.now(timezone.utc) + timedelta(hours=hours_valid)

    invite_code = InviteCode(
        code=code,
        user_id=user_id,
        expires_at=expires_at
    )

    db.add(invite_code)
    db.commit()
    db.refresh(invite_code)

    return invite_code


def validate_invite_code(db: Session, code: str) -> tuple[bool, str, InviteCode | None]:
    """Validate an invite code

    Returns:
        (is_valid, error_message, invite_code)
    """
    invite_code = db.query(InviteCode).filter(InviteCode.code == code).first()

    if not invite_code:
        return False, "Invalid invite code", None

    if invite_code.used:
        return False, "Invite code has already been used", None

    if datetime.now(timezone.utc) > invite_code.expires_at:
        return False, "Invite code has expired", None

    return True, "", invite_code
