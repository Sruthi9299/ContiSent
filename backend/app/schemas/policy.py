from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.domain import PolicyDecisionEnum

class PolicyDecisionBase(BaseModel):
    decision: PolicyDecisionEnum
    reason: str

class PolicyDecisionCreate(PolicyDecisionBase):
    submission_id: int

class PolicyDecisionInDBBase(PolicyDecisionBase):
    id: int
    submission_id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class PolicyDecision(PolicyDecisionInDBBase):
    pass
