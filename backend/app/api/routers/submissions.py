from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.api import deps
from app.models.domain import User, Submission, SubmissionStatus, SubmissionType
from app.schemas.submission import Submission as SubmissionSchema, SubmissionCreate
from app.services.orchestrator import OrchestratorService

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
    
    background_tasks.add_task(OrchestratorService.process_submission, submission.id)
    
    return submission

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
