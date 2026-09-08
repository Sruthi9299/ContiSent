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
    access_url: Optional[str] = None
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

class DeploymentConfigCreate(BaseModel):
    namespace: Optional[str] = "default"
    replicas: Optional[int] = 3
    cpu_limit: Optional[str] = "500m"
    memory_limit: Optional[str] = "512Mi"
    enable_redis: Optional[bool] = False
    enable_postgres: Optional[bool] = False
    ingress_host: Optional[str] = None

class SubmissionCreate(SubmissionBase):
    deployment_config: Optional[DeploymentConfigCreate] = None

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

class TrendData(BaseModel):
    name: str
    critical: int
    high: int
    medium: int

class DashboardStats(BaseModel):
    scanned_images: int
    critical_vulns: int
    active_deployments: int
    policy_compliance: float
    trends: list[TrendData]
