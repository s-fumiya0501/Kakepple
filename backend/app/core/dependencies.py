from fastapi import Cookie, HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import json
from app.core.security import get_session, refresh_session, verify_token, get_redis_client
from app.database import get_db
from app.models.user import User
from app.config import settings

# HTTP Bearer token scheme for JWT
security = HTTPBearer(auto_error=False)

USER_CACHE_TTL = 300  # 5 minutes


def _get_cached_user(user_id: str, db: Session) -> Optional[User]:
    """Try to get user from Redis cache, fall back to DB"""
    redis = get_redis_client()
    cache_key = f"user_cache:{user_id}"

    try:
        cached = redis.get(cache_key)
        if cached:
            user_data = json.loads(cached)
            # Create a transient User object and merge into session
            user = User(
                id=user_data["id"],
                email=user_data["email"],
                name=user_data.get("name"),
                picture_url=user_data.get("picture_url"),
                is_admin=user_data.get("is_admin", False),
                email_verified=user_data.get("email_verified", False),
            )
            user = db.merge(user, load=False)
            return user
    except Exception:
        pass  # Redis error, fall through to DB

    # Cache miss - query DB
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        try:
            redis.setex(cache_key, USER_CACHE_TTL, json.dumps({
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "picture_url": user.picture_url,
                "is_admin": user.is_admin,
                "email_verified": getattr(user, 'email_verified', False),
            }))
        except Exception:
            pass  # Redis error, continue without caching

    return user


def invalidate_user_cache(user_id: str):
    """Invalidate user cache after profile update"""
    try:
        redis = get_redis_client()
        redis.delete(f"user_cache:{user_id}")
    except Exception:
        pass


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
                user = _get_cached_user(user_id, db)
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
            user = _get_cached_user(session_data["user_id"], db)
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
