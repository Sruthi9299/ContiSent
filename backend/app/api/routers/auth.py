from datetime import timedelta, datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import secrets
import logging

from app.api import deps
from app.core import config, security
from app.models.domain import User, PasswordResetToken
from app.schemas.user import User as UserSchema, UserCreate
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email import send_password_reset_email
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class Token(BaseModel):
    access_token: str
    token_type: str

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user. Check both email and username uniqueness.
    """
    user = db.query(User).filter(
        (User.email == user_in.email) | (User.username == user_in.username)
    ).first()
    
    if user:
        if user.email == user_in.email:
            raise HTTPException(
                status_code=400,
                detail="Email already registered.",
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Username already taken.",
            )
    
    user_obj = User(
        email=user_in.email,
        username=user_in.username,
        password_hash=security.get_password_hash(user_in.password),
        role=user_in.role
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    logger.info(f"New user registered: {user_obj.username} ({user_obj.email})")
    return user_obj

@router.get("/me", response_model=UserSchema)
def read_users_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Password Recovery. Generates a token and sends a reset email.
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # For security, do not reveal whether the user exists or not
        return {"msg": "If your email is registered, you will receive a password reset link."}
    
    # Generate token
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Delete old tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.is_used == False
    ).delete()
    
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires
    )
    db.add(reset_token)
    db.commit()
    
    logger.info(f"Password reset requested for user {user.id}")
    
    # Send email in background
    background_tasks.add_task(send_password_reset_email, user.email, token)
    
    return {"msg": "If your email is registered, you will receive a password reset link."}

@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Reset password using a token.
    """
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == request.token,
        PasswordResetToken.is_used == False
    ).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or used token.")
    
    # Check if expired
    if reset_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token has expired.")
        
    # Update user password
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user.password_hash = security.get_password_hash(request.new_password)
    reset_token.is_used = True
    
    db.commit()
    
    logger.info(f"Password reset successful for user {user.id}")
    
    return {"msg": "Password updated successfully."}
