from fastapi import Cookie, HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.core.security import get_session, refresh_session, verify_token
from app.database import get_db
from app.models.user import User
from app.config import settings

# HTTP Bearer token scheme for JWT
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session_id: Optional[str] = Cookie(None, alias=settings.SESSION_COOKIE_NAME),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token or session cookie"""

    # First, try JWT token authentication (preferred for cross-domain)
    if credentials:
        token = credentials.credentials
        payload = verify_token(token, token_type="access")
        if payload:
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Fallback to session cookie authentication (for backwards compatibility)
    if session_id:
        session_data = get_session(session_id)
        if session_data:
            user = db.query(User).filter(User.id == session_data["user_id"]).first()
            if user:
                refresh_session(session_id)
                return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"}
    )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session_id: Optional[str] = Cookie(None, alias=settings.SESSION_COOKIE_NAME),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None"""
    try:
        return await get_current_user(credentials, session_id, db)
    except HTTPException:
        return None


async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and verify they are an admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user
