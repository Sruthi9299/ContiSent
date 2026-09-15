from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.models.domain import User, AuditLog

router = APIRouter()

@router.get("/sessions")
def get_sessions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Get active sessions for current user."""
    from app.models.domain import Session as SessionModel
    
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        SessionModel.is_revoked == False
    ).all()
    
    return [
        {
            "id": s.id,
            "created_at": s.created_at,
            "expires_at": s.expires_at,
            "is_revoked": s.is_revoked,
            "ip_address": s.ip_address,
            "device_info": s.device_info
        }
        for s in sessions
    ]

@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 50
) -> Any:
    """Get audit logs for current user."""
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp
        }
        for log in logs
    ]

import secrets
from datetime import datetime, timezone, timedelta
from fastapi import BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.models.domain import OTPCode
from app.services.email import send_otp_email
from app.core import security

class ChangePasswordOTPRequest(BaseModel):
    otp: str
    new_password: str

@router.post("/request-otp")
def request_otp(
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Request an OTP to change password."""
    # Generate 6-digit OTP
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # Invalidate previous OTPs
    db.query(OTPCode).filter(
        OTPCode.user_id == current_user.id,
        OTPCode.is_used == False
    ).delete()
    
    otp_record = OTPCode(
        user_id=current_user.id,
        code=otp,
        expires_at=expires
    )
    db.add(otp_record)
    db.commit()
    
    # Send email
    background_tasks.add_task(send_otp_email, current_user.email, otp)
    
    return {"msg": "OTP sent successfully."}

@router.post("/change-password-otp")
def change_password_otp(
    request: ChangePasswordOTPRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Change password using OTP."""
    otp_record = db.query(OTPCode).filter(
        OTPCode.user_id == current_user.id,
        OTPCode.code == request.otp,
        OTPCode.is_used == False
    ).first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or used OTP.")
        
    if otp_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    current_user.password_hash = security.get_password_hash(request.new_password)
    otp_record.is_used = True
    db.commit()
    
    return {"msg": "Password updated successfully."}
