from datetime import datetime, timezone
from typing import List, Optional, Any
from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey, JSON, Enum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import enum

def default_datetime():
    return datetime.now(timezone.utc)

class Base(DeclarativeBase):
    pass

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DEVELOPER = "developer"
    VIEWER = "viewer"

class SubmissionType(str, enum.Enum):
    URL = "url"
    FOLDER = "folder"
    IMAGE = "image"
    DEPLOYED = "deployed"

class SubmissionStatus(str, enum.Enum):
    QUEUED = "queued"
    BUILDING = "building"
    SCANNING = "scanning"
    POLICY_EVALUATION = "policy_evaluation"
    DEPLOYING = "deploying"
    COMPLETED = "completed"
    FAILED = "failed"
    QUARANTINED = "quarantined"

class PolicyDecisionEnum(str, enum.Enum):
    PASS = "pass"
    FAIL = "fail"
    QUARANTINE = "quarantine"

class DeploymentStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    BLOCKED = "blocked"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.DEVELOPER)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    submissions: Mapped[List["Submission"]] = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[List["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="sessions")

class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    type: Mapped[SubmissionType] = mapped_column(Enum(SubmissionType))
    source_uri: Mapped[str] = mapped_column(String(1024))
    status: Mapped[SubmissionStatus] = mapped_column(Enum(SubmissionStatus), default=SubmissionStatus.QUEUED)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=default_datetime, onupdate=default_datetime)

    user: Mapped["User"] = relationship("User", back_populates="submissions")
    scan_result: Mapped["ScanResult"] = relationship("ScanResult", back_populates="submission", uselist=False, cascade="all, delete-orphan")
    policy_decision: Mapped["PolicyDecision"] = relationship("PolicyDecision", back_populates="submission", uselist=False, cascade="all, delete-orphan")
    deployment: Mapped["Deployment"] = relationship("Deployment", back_populates="submission", uselist=False, cascade="all, delete-orphan")

class ScanResult(Base):
    __tablename__ = "scan_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), unique=True)
    status: Mapped[str] = mapped_column(String(50))
    critical_count: Mapped[int] = mapped_column(Integer, default=0)
    high_count: Mapped[int] = mapped_column(Integer, default=0)
    medium_count: Mapped[int] = mapped_column(Integer, default=0)
    low_count: Mapped[int] = mapped_column(Integer, default=0)
    full_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    sbom_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    iac_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    k8s_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)

    submission: Mapped["Submission"] = relationship("Submission", back_populates="scan_result")

class PolicyDecision(Base):
    __tablename__ = "policy_decisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), unique=True)
    decision: Mapped[PolicyDecisionEnum] = mapped_column(Enum(PolicyDecisionEnum))
    reason: Mapped[str] = mapped_column(String(1024))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)

    submission: Mapped["Submission"] = relationship("Submission", back_populates="policy_decision")

class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), unique=True)
    namespace: Mapped[str] = mapped_column(String(255))
    cluster: Mapped[str] = mapped_column(String(255))
    status: Mapped[DeploymentStatus] = mapped_column(Enum(DeploymentStatus), default=DeploymentStatus.PENDING)
    access_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)

    submission: Mapped["Submission"] = relationship("Submission", back_populates="deployment")
    findings: Mapped[List["Finding"]] = relationship("Finding", back_populates="deployment", cascade="all, delete-orphan")

class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(primary_key=True)
    deployment_id: Mapped[int] = mapped_column(ForeignKey("deployments.id"))
    severity: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(String(1024))
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)

    deployment: Mapped["Deployment"] = relationship("Deployment", back_populates="findings")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(255))
    details: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship("User")

class OTPCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    code: Mapped[str] = mapped_column(String(10), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(String(1024))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=default_datetime)

    user: Mapped["User"] = relationship("User")
