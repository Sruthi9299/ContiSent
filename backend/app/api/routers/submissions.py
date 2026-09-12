from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from app.api import deps
from app.models.domain import User, Submission, SubmissionStatus, SubmissionType, DeploymentConfig, ScanResult, PolicyDecision, Deployment, DeploymentStatus, PolicyDecisionEnum
from app.schemas.submission import Submission as SubmissionSchema, SubmissionCreate, DashboardStats, TrendData
from app.services.orchestrator import OrchestratorService
from app.worker import process_submission_task
from app.core.config import settings

router = APIRouter()

@router.post("/", response_model=SubmissionSchema)
def create_submission(
    *,
    db: Session = Depends(deps.get_db),
    submission_in: SubmissionCreate,
    current_user: User = Depends(deps.get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    """
    Create new submission and kick off a scan in the background.
    """
    # Create the submission record
    submission = Submission(
        type=submission_in.type,
        source_uri=submission_in.source_uri,
        user_id=current_user.id,
        status=SubmissionStatus.QUEUED
        # Let model defaults (default_datetime) handle created_at and updated_at
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    if submission_in.deployment_config:
        dc = submission_in.deployment_config
        deployment_config = DeploymentConfig(
            submission_id=submission.id,
            namespace=dc.namespace,
            replicas=dc.replicas,
            cpu_limit=dc.cpu_limit,
            memory_limit=dc.memory_limit,
            enable_redis=dc.enable_redis,
            enable_postgres=dc.enable_postgres,
            ingress_host=dc.ingress_host
        )
        db.add(deployment_config)
        db.commit()
    db.refresh(submission)
    
    if settings.USE_CELERY:
        process_submission_task.delay(submission.id)
    else:
        background_tasks.add_task(OrchestratorService.process_submission, submission.id)
    
    return submission

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get dashboard statistics for current user.
    """
    # 1. Scanned Images
    scanned_images = db.query(Submission).filter(Submission.user_id == current_user.id).count()
    
    # 2. Critical Vulns
    critical_vulns = db.query(func.sum(ScanResult.critical_count)).join(Submission).filter(
        Submission.user_id == current_user.id
    ).scalar() or 0
    
    # 3. Active Deployments
    active_deployments = db.query(Deployment).join(Submission).filter(
        Submission.user_id == current_user.id,
        Deployment.status.in_([DeploymentStatus.RUNNING, DeploymentStatus.SUCCEEDED])
    ).count()
    
    # 4. Policy Compliance
    total_decisions = db.query(PolicyDecision).join(Submission).filter(
        Submission.user_id == current_user.id
    ).count()
    
    passed_decisions = db.query(PolicyDecision).join(Submission).filter(
        Submission.user_id == current_user.id,
        PolicyDecision.decision == PolicyDecisionEnum.PASS
    ).count()
    
    compliance = (passed_decisions / total_decisions * 100) if total_decisions > 0 else 100.0
    
    # 5. Trends
    trends = []
    today = datetime.now(timezone.utc).replace(tzinfo=None)
    for i in range(6, -1, -1):
        target_month = today.month - i
        target_year = today.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
            
        start_date = datetime(target_year, target_month, 1)
        if target_month == 12:
            end_date = datetime(target_year + 1, 1, 1)
        else:
            end_date = datetime(target_year, target_month + 1, 1)
            
        counts = db.query(
            func.sum(ScanResult.critical_count).label('crit'),
            func.sum(ScanResult.high_count).label('high'),
            func.sum(ScanResult.medium_count).label('med')
        ).join(Submission).filter(
            Submission.user_id == current_user.id,
            ScanResult.created_at >= start_date,
            ScanResult.created_at < end_date
        ).first()
        
        trends.append(TrendData(
            name=start_date.strftime("%b"),
            critical=counts.crit or 0,
            high=counts.high or 0,
            medium=counts.med or 0
        ))
        
    return DashboardStats(
        scanned_images=scanned_images,
        critical_vulns=critical_vulns,
        active_deployments=active_deployments,
        policy_compliance=round(compliance, 1),
        trends=trends
    )

@router.get("/", response_model=list[SubmissionSchema])
def get_submissions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all submissions for current user.
    """
    submissions = db.query(Submission).filter(Submission.user_id == current_user.id).offset(skip).limit(limit).all()
    return submissions

@router.get("/{id}", response_model=SubmissionSchema)
def get_submission(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get a specific submission by id.
    """
    submission = db.query(Submission).filter(Submission.id == id, Submission.user_id == current_user.id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@router.delete("/{id}/deployment")
def delete_deployment(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a submission's deployment from Kubernetes (Day-2 Operations).
    """
    submission = db.query(Submission).filter(Submission.id == id, Submission.user_id == current_user.id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    if not submission.deployment:
        raise HTTPException(status_code=400, detail="No active deployment found for this submission")
        
    try:
        # pyrefly: ignore [missing-import]
        from kubernetes import client, config
        import os
        
        k8s_mode = os.environ.get("K8S_DEPLOY_MODE", "local")
        if k8s_mode == "in-cluster":
            config.load_incluster_config()
        else:
            kubeconfig_path = "/home/appuser/.kube/config"
            if not os.path.exists(kubeconfig_path):
                 kubeconfig_path = os.path.expanduser("~/.kube/config")
            config.load_kube_config(config_file=kubeconfig_path)
            
        core_v1 = client.CoreV1Api()
        # Delete the namespace, which deletes all resources (Deployments, PVCs, Secrets, NetworkPolicies)
        core_v1.delete_namespace(name=submission.deployment.namespace)
        
        # Mark as deleted in DB
        submission.status = SubmissionStatus.FAILED # Or create a DELETED status if it existed
        db.delete(submission.deployment)
        db.commit()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete deployment: {str(e)}")
        
    return {"status": "success", "message": "Deployment scheduled for deletion"}
