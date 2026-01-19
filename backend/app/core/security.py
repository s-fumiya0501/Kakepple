import redis
import json
import secrets
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.config import settings

# Redis client for session management
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis_client():
    """Get Redis client instance"""
    return redis_client


# ==================== JWT Token Functions ====================

def create_access_token(user_id: str, additional_data: Optional[Dict[str, Any]] = None) -> str:
    """Create a JWT access token"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    }
    if additional_data:
        to_encode.update(additional_data)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a JWT refresh token"""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "jti": secrets.token_urlsafe(16)  # Unique token ID for potential revocation
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """Verify a JWT token and return the payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except JWTError:
        return None


def create_tokens(user_id: str) -> Dict[str, str]:
    """Create both access and refresh tokens"""
    return {
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
        "token_type": "bearer"
    }


# ==================== Session Functions (Legacy - kept for compatibility) ====================

def create_session(user_id: str, user_data: Dict[str, Any]) -> str:
    """Create a new session for a user"""
    # Generate cryptographically secure random session ID
    random_token = secrets.token_urlsafe(32)
    session_id = f"session:{random_token}"

    # Store user data in Redis (include user_id in data for reference)
    session_data = {**user_data, "user_id": user_id}
    redis_client.setex(
        session_id,
        settings.SESSION_MAX_AGE,
        json.dumps(session_data)
    )

    return session_id


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get session data from Redis"""
    data = redis_client.get(session_id)
    if data:
        return json.loads(data)
    return None


def delete_session(session_id: str) -> None:
    """Delete a session from Redis"""
    redis_client.delete(session_id)


def refresh_session(session_id: str) -> None:
    """Refresh session expiration time"""
    redis_client.expire(session_id, settings.SESSION_MAX_AGE)
