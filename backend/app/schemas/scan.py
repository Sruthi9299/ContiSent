from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any
from datetime import datetime

class ScanResultBase(BaseModel):
    status: str
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0

class ScanResultCreate(ScanResultBase):
    submission_id: int
    full_json: Optional[Dict[str, Any]] = None

class ScanResultInDBBase(ScanResultBase):
    id: int
    submission_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ScanResult(ScanResultInDBBase):
    full_json: Optional[Dict[str, Any]] = None
