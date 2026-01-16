import redis
import json
import secrets
from typing import Optional, Dict, Any
from datetime import timedelta
from app.config import settings

# Redis client for session management
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis_client():
    """Get Redis client instance"""
    return redis_client


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
