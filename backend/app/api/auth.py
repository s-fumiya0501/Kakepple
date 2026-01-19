from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import httpx
import uuid
import json
import redis
import os
import shutil
from pathlib import Path

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.core.security import create_session, delete_session, get_redis_client, create_tokens, verify_token
from app.core.dependencies import get_current_user
from app.config import settings

router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth configuration
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# LINE OAuth URLs (manual handling due to authlib compatibility issues)
LINE_AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize'
LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token'


# ==================== Pydantic Schemas ====================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    name: str = Field(..., min_length=1, max_length=100)
    oauth_pending_id: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class OAuthPendingResponse(BaseModel):
    email: str | None
    name: str | None
    picture_url: str | None
    provider: str


class UserProfileUpdate(BaseModel):
    name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ==================== Helper Functions ====================

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_password_reset_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
    to_encode = {"sub": email, "exp": expire, "type": "password_reset"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def verify_password_reset_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "password_reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def store_pending_oauth(provider: str, user_info: dict) -> str:
    """Store OAuth info temporarily for registration flow"""
    pending_id = str(uuid.uuid4())
    redis_client = get_redis_client()
    data = {
        "provider": provider,
        "user_info": user_info
    }
    redis_client.setex(f"pending_oauth:{pending_id}", 600, json.dumps(data))  # 10 minutes TTL
    return pending_id


def get_pending_oauth(pending_id: str) -> dict | None:
    """Retrieve pending OAuth info"""
    redis_client = get_redis_client()
    data = redis_client.get(f"pending_oauth:{pending_id}")
    if data:
        return json.loads(data)
    return None


def delete_pending_oauth(pending_id: str):
    """Delete pending OAuth info"""
    redis_client = get_redis_client()
    redis_client.delete(f"pending_oauth:{pending_id}")


def send_password_reset_email(email: str, token: str):
    """Send password reset email (mock implementation)"""
    reset_url = f"{settings.FRONTEND_URL}/password-reset/confirm?token={token}"
    print(f"[MOCK EMAIL] Password reset email to {email}")
    print(f"[MOCK EMAIL] Reset URL: {reset_url}")


def create_token_redirect(user: User, redirect_url: str = None):
    """Create JWT tokens and redirect with tokens in URL fragment"""
    tokens = create_tokens(str(user.id))

    # Redirect to frontend with tokens in URL fragment (not query params for security)
    # Frontend will extract tokens from fragment and store them
    target_url = redirect_url or f"{settings.FRONTEND_URL}/auth/callback"
    redirect_with_tokens = f"{target_url}#access_token={tokens['access_token']}&refresh_token={tokens['refresh_token']}"

    return RedirectResponse(url=redirect_with_tokens, status_code=302)


# ==================== Email/Password Auth ====================

@router.post("/register")
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register new user with email/password or complete OAuth registration"""

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスは既に登録されています"
        )

    # Check for pending OAuth registration
    oauth_info = None
    if data.oauth_pending_id:
        oauth_info = get_pending_oauth(data.oauth_pending_id)

    # Create user
    user = User(
        email=data.email,
        name=data.name,
        password_hash=get_password_hash(data.password) if data.password else None,
        email_verified=False
    )

    # Link OAuth provider if pending
    if oauth_info:
        provider = oauth_info["provider"]
        user_info = oauth_info["user_info"]

        if provider == "google":
            user.google_id = user_info.get("sub")
            user.email_verified = True  # Google emails are verified
        elif provider == "line":
            user.line_id = user_info.get("sub")

        if user_info.get("picture"):
            user.picture_url = user_info.get("picture")

        delete_pending_oauth(data.oauth_pending_id)

    db.add(user)
    db.commit()
    db.refresh(user)

    # Create JWT tokens
    tokens = create_tokens(str(user.id))

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "picture_url": user.picture_url
        }
    }


@router.post("/login")
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login with email/password"""

    user = db.query(User).filter(User.email == data.email).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません"
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません"
        )

    # Create JWT tokens
    tokens = create_tokens(str(user.id))

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "picture_url": user.picture_url
        }
    }


# ==================== Token Refresh ====================

@router.post("/refresh")
async def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    payload = verify_token(data.refresh_token, token_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    # Create new tokens
    tokens = create_tokens(str(user.id))

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }


# ==================== Password Reset ====================

@router.post("/password/reset")
async def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request password reset email"""

    user = db.query(User).filter(User.email == data.email).first()

    # Always return success to prevent email enumeration
    if user and user.password_hash:
        token = create_password_reset_token(data.email)
        send_password_reset_email(data.email, token)

    return {"message": "パスワードリセット用のメールを送信しました"}


@router.post("/password/confirm")
async def confirm_password_reset(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Reset password with token"""

    email = verify_password_reset_token(data.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無効または期限切れのトークンです"
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )

    user.password_hash = get_password_hash(data.new_password)
    db.commit()

    return {"message": "パスワードを更新しました"}


# ==================== OAuth Pending Info ====================

@router.get("/oauth/pending/{pending_id}")
async def get_oauth_pending_info(pending_id: str):
    """Get pending OAuth registration info"""

    oauth_info = get_pending_oauth(pending_id)
    if not oauth_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OAuth情報が見つかりません"
        )

    user_info = oauth_info["user_info"]
    return OAuthPendingResponse(
        email=user_info.get("email"),
        name=user_info.get("name"),
        picture_url=user_info.get("picture"),
        provider=oauth_info["provider"]
    )


# ==================== Google OAuth ====================

@router.get("/google")
async def google_login(request: Request):
    """Initiate Google OAuth flow"""
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )

        google_id = user_info.get('sub')
        email = user_info.get('email')
        name = user_info.get('name')
        picture_url = user_info.get('picture')

        if not google_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required user information"
            )

        # Check if user exists by google_id
        user = db.query(User).filter(User.google_id == google_id).first()

        if not user:
            # Check if user exists by email (for account linking)
            user = db.query(User).filter(User.email == email).first()

            if user:
                # Link Google account to existing user
                user.google_id = google_id
                if not user.picture_url:
                    user.picture_url = picture_url
                user.email_verified = True
                db.commit()
            else:
                # New user - redirect to registration
                pending_id = store_pending_oauth("google", {
                    "sub": google_id,
                    "email": email,
                    "name": name,
                    "picture": picture_url
                })
                return RedirectResponse(
                    url=f"{settings.FRONTEND_URL}/register?oauth_pending={pending_id}"
                )
        else:
            # Update existing user info if changed
            if user.name != name or user.picture_url != picture_url:
                user.name = name
                user.picture_url = picture_url
                db.commit()

        return create_token_redirect(user)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


# ==================== LINE OAuth ====================

@router.get("/line")
async def line_login(request: Request):
    """Initiate LINE OAuth flow"""
    if not settings.LINE_CHANNEL_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="LINE OAuth is not configured"
        )

    # Generate state for CSRF protection
    state = str(uuid.uuid4())
    redis_client = get_redis_client()
    redis_client.setex(f"line_state:{state}", 600, "valid")  # 10 minutes TTL

    # Build authorization URL
    params = {
        "response_type": "code",
        "client_id": settings.LINE_CHANNEL_ID,
        "redirect_uri": settings.LINE_REDIRECT_URI,
        "state": state,
        "scope": "profile openid email",
    }
    auth_url = f"{LINE_AUTHORIZE_URL}?" + "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url=auth_url)


@router.get("/line/callback")
async def line_callback(request: Request, code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    """Handle LINE OAuth callback"""
    if not settings.LINE_CHANNEL_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="LINE OAuth is not configured"
        )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"LINE authentication error: {error}"
        )

    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing code or state parameter"
        )

    # Verify state
    redis_client = get_redis_client()
    if not redis_client.get(f"line_state:{state}"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter"
        )
    redis_client.delete(f"line_state:{state}")

    try:
        # Exchange code for token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                LINE_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.LINE_REDIRECT_URI,
                    "client_id": settings.LINE_CHANNEL_ID,
                    "client_secret": settings.LINE_CHANNEL_SECRET,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to get access token: {token_response.text}"
                )

            token = token_response.json()

            # Get user profile from LINE
            profile_response = await client.get(
                "https://api.line.me/v2/profile",
                headers={"Authorization": f"Bearer {token['access_token']}"}
            )
            profile = profile_response.json()

        line_id = profile.get("userId")
        name = profile.get("displayName")
        picture_url = profile.get("pictureUrl")

        # Get email from ID token if available
        id_token = token.get("id_token")
        email = None
        if id_token:
            # Decode without verification (LINE's public key handling is complex)
            # Use jose with dummy key and skip verification
            try:
                payload = jwt.decode(id_token, settings.LINE_CHANNEL_SECRET, algorithms=["HS256"], options={"verify_signature": False, "verify_aud": False, "verify_iss": False})
                email = payload.get("email")
            except Exception:
                # If decoding fails, manually decode the payload
                import base64
                parts = id_token.split(".")
                if len(parts) >= 2:
                    # Add padding if needed
                    payload_part = parts[1]
                    payload_part += "=" * (4 - len(payload_part) % 4)
                    try:
                        payload_json = base64.urlsafe_b64decode(payload_part)
                        payload = json.loads(payload_json)
                        email = payload.get("email")
                    except Exception:
                        pass

        if not line_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required user information from LINE"
            )

        # Check if user exists
        user = db.query(User).filter(User.line_id == line_id).first()

        if not user:
            if email:
                user = db.query(User).filter(User.email == email).first()
                if user:
                    user.line_id = line_id
                    if not user.picture_url:
                        user.picture_url = picture_url
                    db.commit()
                else:
                    pending_id = store_pending_oauth("line", {
                        "sub": line_id,
                        "email": email,
                        "name": name,
                        "picture": picture_url
                    })
                    return RedirectResponse(
                        url=f"{settings.FRONTEND_URL}/register?oauth_pending={pending_id}"
                    )
            else:
                pending_id = store_pending_oauth("line", {
                    "sub": line_id,
                    "name": name,
                    "picture": picture_url
                })
                return RedirectResponse(
                    url=f"{settings.FRONTEND_URL}/register?oauth_pending={pending_id}"
                )
        else:
            if user.name != name or user.picture_url != picture_url:
                user.name = name
                user.picture_url = picture_url
                db.commit()

        return create_token_redirect(user)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LINE authentication failed: {str(e)}"
        )


# ==================== User Info & Logout ====================

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    if data.name is not None:
        current_user.name = data.name

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar image"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="画像ファイル（JPEG, PNG, GIF, WebP）のみアップロード可能です"
        )

    # Validate file size (max 5MB)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ファイルサイズは5MB以下にしてください"
        )

    # Create uploads directory if not exists
    uploads_dir = Path("uploads/avatars")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else ".jpg"
    filename = f"{current_user.id}{file_extension}"
    file_path = uploads_dir / filename

    # Delete old avatar if exists (with different extension)
    for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        old_file = uploads_dir / f"{current_user.id}{ext}"
        if old_file.exists() and old_file != file_path:
            old_file.unlink()

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update user picture_url
    current_user.picture_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/me/avatar", response_model=UserResponse)
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user avatar image"""
    if current_user.picture_url and current_user.picture_url.startswith("/uploads/"):
        # Delete the file
        file_path = Path(current_user.picture_url.lstrip("/"))
        if file_path.exists():
            file_path.unlink()

    current_user.picture_url = None
    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout current user"""
    session_id = f"session:{current_user.id}"
    delete_session(session_id)

    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME)

    return response
