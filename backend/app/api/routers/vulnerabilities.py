from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.api import deps
from app.models.domain import User, Submission, ScanResult
from app.schemas.vulnerability import VulnerabilityItem

router = APIRouter()

@router.get("/", response_model=List[VulnerabilityItem])
def get_vulnerabilities(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all vulnerabilities for all submissions of the current user.
    """
    submissions = db.query(Submission).filter(Submission.user_id == current_user.id).all()
    
    vuln_list = []
    
    for sub in submissions:
        if not sub.scan_result or not sub.scan_result.full_json:
            continue
            
        full_json = sub.scan_result.full_json
        created_at = sub.scan_result.created_at
        source_uri = sub.source_uri
        
        results = full_json.get("Results", [])
        for result in results:
            vulns = result.get("Vulnerabilities", [])
            for v in vulns:
                vuln_item = VulnerabilityItem(
                    id=v.get("VulnerabilityID", "Unknown"),
                    target=source_uri,
                    pkg_name=v.get("PkgName", "Unknown"),
                    installed_version=v.get("InstalledVersion", "Unknown"),
                    fixed_version=v.get("FixedVersion"),
                    severity=v.get("Severity", "UNKNOWN"),
                    title=v.get("Title"),
                    description=v.get("Description"),
                    created_at=created_at
                )
                vuln_list.append(vuln_item)
                
    # Sort by severity (Critical first) and then by date
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 4}
    vuln_list.sort(key=lambda x: (severity_order.get(x.severity.upper(), 5), x.created_at), reverse=False)
    
    return vuln_list
