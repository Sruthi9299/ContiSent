from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from slowapi import Limiter
# pyrefly: ignore [missing-import]
from slowapi.util import get_remote_address 
# pyrefly: ignore [missing-import]
from slowapi.errors import RateLimitExceeded  
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routers import auth, submissions, users, notifications, vulnerabilities

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/v1/openapi.json"
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."}
    )

# Set CORS with restricted origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(submissions.router, prefix="/api/v1/submissions", tags=["submissions"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(vulnerabilities.router, prefix="/api/v1/vulnerabilities", tags=["vulnerabilities"])

@app.get("/")
def root():
    return {"message": "Welcome to the ContiSent API"}

@app.get("/health")
def health_check():
    """Health check endpoint for Kubernetes probes."""
    return {"status": "healthy"}
