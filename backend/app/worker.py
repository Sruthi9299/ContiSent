import os
from celery import Celery
from app.services.orchestrator import OrchestratorService

celery_broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
celery_result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery(
    "contisent_worker",
    broker=celery_broker_url,
    backend=celery_result_backend
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="process_submission_task")
def process_submission_task(submission_id: int):
    OrchestratorService.process_submission(submission_id)
