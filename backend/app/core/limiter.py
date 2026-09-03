from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import FastAPI
from fastapi.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)

def add_rate_limiting(app: FastAPI):
    """Add rate limiting middleware to FastAPI app."""
    app.state.limiter = limiter
    
    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_exceeded_handler(request, exc):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please try again later."}
        )
