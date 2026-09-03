from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.domain import DeploymentStatus

class FindingBase(BaseModel):
    severity: str
    description: str

class FindingCreate(FindingBase):
    deployment_id: int

class Finding(FindingBase):
    id: int
    deployment_id: int
    reported_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DeploymentBase(BaseModel):
    namespace: str
    cluster: str
    status: Optional[DeploymentStatus] = DeploymentStatus.PENDING

class DeploymentCreate(DeploymentBase):
    submission_id: int

class DeploymentUpdate(BaseModel):
    status: DeploymentStatus

class DeploymentInDBBase(DeploymentBase):
    id: int
    submission_id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class Deployment(DeploymentInDBBase):
    findings: List[Finding] = []
