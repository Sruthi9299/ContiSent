from pydantic import BaseModel, ConfigDict, field_validator, EmailStr, Field
from typing import Optional, Any
from datetime import datetime, timezone
from app.models.domain import SubmissionType, SubmissionStatus, PolicyDecisionEnum, DeploymentStatus

def force_utc(v: Any) -> Any:
    if isinstance(v, datetime) and v.tzinfo is None:
        return v.replace(tzinfo=timezone.utc)
    return v

class ScanResultBase(BaseModel):
    status: str
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    full_json: Optional[dict[str, Any]] = None
    sbom_json: Optional[dict[str, Any]] = None
    created_at: datetime
    
    @field_validator('created_at', mode='before')
    @classmethod
    def make_utc(cls, v):
        return force_utc(v)

    model_config = ConfigDict(from_attributes=True)

class PolicyDecisionBase(BaseModel):
    decision: PolicyDecisionEnum
    reason: str
    timestamp: datetime
    
    @field_validator('timestamp', mode='before')
    @classmethod
    def make_utc(cls, v):
        return force_utc(v)

    model_config = ConfigDict(from_attributes=True)

class DeploymentBase(BaseModel):
    namespace: str
    cluster: str
    status: DeploymentStatus
    timestamp: datetime
    
    @field_validator('timestamp', mode='before')
    @classmethod
    def make_utc(cls, v):
        return force_utc(v)

    model_config = ConfigDict(from_attributes=True)

class SubmissionBase(BaseModel):
    type: SubmissionType
    source_uri: str = Field(max_length=1024)
    
    @field_validator('source_uri')
    @classmethod
    def validate_source_uri(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("source_uri cannot be empty")
        return v.strip()

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionUpdate(BaseModel):
    status: Optional[SubmissionStatus] = None

class SubmissionInDBBase(SubmissionBase):
    id: int
    user_id: int
    status: SubmissionStatus
    created_at: datetime
    updated_at: datetime
    
    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def make_utc(cls, v):
        return force_utc(v)

    model_config = ConfigDict(from_attributes=True)

class Submission(SubmissionInDBBase):
    scan_result: Optional[ScanResultBase] = None
    policy_decision: Optional[PolicyDecisionBase] = None
    deployment: Optional[DeploymentBase] = None
