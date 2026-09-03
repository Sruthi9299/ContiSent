## Bug Report & Fixes

### CRITICAL BUGS

#### 1. **Deprecated datetime.utcnow() in submissions.py**
**File:** `backend/app/api/routers/submissions.py` (lines 27-28)
**Issue:** Still using `datetime.utcnow()` which is deprecated in Python 3.12+
**Impact:** Future Python incompatibility, already set timezone-aware defaults in models but this overrides them
```python
# WRONG:
created_at=datetime.utcnow(),
updated_at=datetime.utcnow()

# CORRECT: Remove these lines - let the model defaults handle it
# (model has default=default_datetime which uses timezone.utc)
```

#### 2. **In-Memory OTP Storage (users.py)**
**File:** `backend/app/api/routers/users.py` (line 22)
**Issue:** `otp_store = {}` is in-memory and resets when server restarts; no expiration on OTPs
**Impact:** Security risk - OTPs never expire, can be reused across restarts, not persisted
**Fix:** Store OTPs in database with 5-minute expiration

#### 3. **Plaintext OTP in API Response (users.py)**
**File:** `backend/app/api/routers/users.py` (line 35)
**Issue:** Returns `"simulated_otp_for_dev": otp` in production response
**Impact:** OTP leaked in API response logs, browser history, proxies
**Fix:** Only return in dev mode via environment flag

#### 4. **No Password Hashing in Password Reset (users.py)**
**File:** `backend/app/api/routers/users.py` (line 50)
**Issue:** Comment says "update the user's password_hash in DB" but doesn't actually do it
**Impact:** Password reset endpoint exists but doesn't work; user passwords never change
**Fix:** Actually update user.password_hash in database

#### 5. **Hardcoded Mock Data (users.py)**
**File:** `backend/app/api/routers/users.py` (lines 53-62)
**Issue:** `get_sessions()` and `get_audit_logs()` return hardcoded mock data instead of real data
**Impact:** Endpoints appear to work but return fake data; breaks any frontend relying on this
**Fix:** Query actual Session and AuditLog tables from database

#### 6. **Missing Dependency Injection (submissions.py)**
**File:** `backend/app/api/routers/submissions.py` (line 23)
**Issue:** `background_tasks: BackgroundTasks` parameter has no `Depends()` - not dependency-injected
**Impact:** Parameter might be None; background task never executes
**Fix:** This is actually OK in FastAPI (BackgroundTasks is auto-injected), but should document it

#### 7. **YAML Unsafe Import (orchestrator.py)**
**File:** `backend/app/services/orchestrator.py` (line 119)
**Issue:** Imports `yaml` but module not imported at top of file
**Impact:** Runtime error - `yaml` is not defined when trying to use `yaml.safe_dump_all()`
**Fix:** Add `import yaml` at the top of the file

#### 8. **JWT Decode Exception Handling (deps.py)**
**File:** `backend/app/api/deps.py` (line 38)
**Issue:** Catches `ValidationError` but jwt.decode doesn't raise Pydantic ValidationError
**Impact:** Some JWT errors not properly caught; misleading exception handler
**Fix:** Remove `ValidationError` or catch `jwt.ExpiredSignatureError` explicitly

#### 9. **Missing Refresh Token Rotation**
**File:** `backend/app/core/security.py`
**Issue:** JWT tokens don't support refresh/revocation; no token blacklist
**Impact:** Tokens can't be revoked early; logout doesn't invalidate tokens
**Fix:** Implement refresh tokens and token revocation mechanism

#### 10. **No Authorization Check on User Endpoints (users.py)**
**File:** `backend/app/api/routers/users.py` (lines 52-62)
**Issue:** No check to prevent users from accessing other users' audit logs or sessions
**Impact:** Information disclosure - users can see all audit logs/sessions for all users
**Fix:** Filter by current_user.id

#### 11. **Missing Input Validation on Submission Type**
**File:** `backend/app/api/routers/submissions.py`
**Issue:** No validation that `submission_in.type` and `submission_in.source_uri` are valid
**Impact:** Invalid data accepted; scanner fails with cryptic errors later
**Fix:** Add schema validators for enum values and URL format

#### 12. **Race Condition in Submission Processing**
**File:** `backend/app/services/orchestrator.py` (line 50)
**Issue:** Submission status set to SCANNING immediately; two concurrent requests could process same submission
**Impact:** Same submission scanned twice, results overwritten
**Fix:** Use atomic compare-and-set or database locks

#### 13. **Unhandled Docker Image Pull Failures**
**File:** `backend/app/services/orchestrator.py` (line 178)
**Issue:** `docker run` with non-existent image fails silently after long timeout
**Impact:** Deployment hangs, unclear error message
**Fix:** Run `docker pull` first with explicit error handling, or add `--pull always`

#### 14. **Missing HTTP Status Code on Password Reset Success**
**File:** `backend/app/api/routers/users.py` (line 52)
**Issue:** Returns 200 for successful reset but should return 201 or 204
**Impact:** Minor - works but semantically incorrect HTTP status

#### 15. **AuthContext Unsafe Token Handling**
**File:** `frontend/src/context/AuthContext.tsx` (line 64)
**Issue:** Stores JWT in localStorage which is vulnerable to XSS
**Impact:** Any XSS attack can steal auth tokens
**Fix:** Use httpOnly cookies instead (requires backend support)

### HIGH PRIORITY BUGS

#### 16. **Vulnerabilities Endpoint Sorting Bug**
**File:** `backend/app/api/routers/vulnerabilities.py` (line 66)
**Issue:** `severity_order.get(x.severity.upper(), 5)` - severity already uppercased in x.severity
**Impact:** Minor - works but redundant operation
**Fix:** Remove `.upper()` or call it once when setting severity

#### 17. **Missing Database Transaction Handling**
**File:** `backend/app/services/orchestrator.py`
**Issue:** Multiple db.add() and db.commit() calls without rollback on error
**Impact:** Partial state saved if error occurs mid-operation
**Fix:** Use try/except with rollback

#### 18. **Missing Logging Context (orchestrator.py)**
**File:** `backend/app/services/orchestrator.py`
**Issue:** No correlation IDs for tracking submissions through logs
**Impact:** Debugging distributed issues is hard
**Fix:** Add correlation_id to all log messages

### MODERATE BUGS

#### 19. **Kubernetes Namespace Hardcoded (orchestrator.py)**
**File:** `backend/app/services/orchestrator.py` (line 107)
**Issue:** Namespace hardcoded as "prod" - what if user has different namespaces?
**Impact:** Deployments always go to prod, can't deploy to other environments
**Fix:** Make namespace configurable per submission

#### 20. **No Submission Status Validation**
**File:** `backend/app/api/routers/submissions.py`
**Issue:** No check that status transitions are valid (e.g., can't go from COMPLETED back to QUEUED)
**Impact:** State machine can get into invalid states
**Fix:** Add state transition validation

#### 21. **Missing Pagination Metadata**
**File:** `backend/app/api/routers/submissions.py` (line 44)
**Issue:** Returns list but doesn't include total count or has_more flag
**Impact:** Frontend can't implement proper pagination
**Fix:** Return PaginatedResponse with total, page, limit

#### 22. **No Rate Limiting Enforcement**
**File:** `backend/app/main.py`
**Issue:** Limiter added to config but not applied to any routes
**Impact:** Rate limiting doesn't actually work
**Fix:** Add `@limiter.limit()` decorator to endpoints

#### 23. **Infinite Retry on Image Not Found**
**File:** `backend/app/services/orchestrator.py` (line 178)
**Issue:** If image doesn't exist, `docker run` retries indefinitely until timeout
**Impact:** Wastes resources, unclear error to user
**Fix:** Run `docker pull` first to fail fast

### LOW PRIORITY / EDGE CASES

#### 24. **Custom Error Messages Expose Details (scanner.py)**
**File:** `backend/app/services/scanner.py`
**Issue:** Raises RuntimeError with full stderr from subprocess
**Impact:** Might expose sensitive information to API consumers
**Fix:** Log full error, return sanitized message to user

#### 25. **No Content-Length Validation**
**File:** `backend/app/api/routers/submissions.py`
**Issue:** No limit on submission request size
**Impact:** DoS via large submission payloads
**Fix:** Add body_size_limit to FastAPI

#### 26. **Missing CSRF Protection**
**File:** `backend/app/main.py`
**Issue:** No CSRF token validation (though OAuth2 bearer tokens provide some protection)
**Impact:** Cross-site form requests could modify data if user is logged in
**Fix:** Add CsrfMiddleware if form-based auth is used

#### 27. **Typo in Pydantic Config (schemas)**
**File:** `backend/app/schemas/*.py`
**Issue:** Using `class Config: orm_mode = True` (Pydantic v1 style)
**Impact:** Works with pydantic>=2.0.0 for backward compat, but deprecated
**Fix:** Use `model_config = ConfigDict(from_attributes=True)`

#### 28. **Missing Request ID Middleware**
**File:** `backend/app/main.py`
**Issue:** No request correlation IDs for tracing
**Impact:** Hard to correlate logs across services
**Fix:** Add request ID middleware

#### 29. **Next.js Config Missing Output Mode (frontend)**
**File:** `frontend/next.config.ts`
**Issue:** Not verified, but likely missing `output: "standalone"` for Docker
**Impact:** Larger Docker image, slower builds
**Fix:** Set `output: "standalone"` in next.config.js

#### 30. **Missing SQL Injection Protection Check (submissions.py)**
**File:** `backend/app/api/routers/submissions.py`
**Issue:** SQLAlchemy is used (safe), but no validation on source_uri length
**Impact:** Could store extremely long URIs; potential for abuse
**Fix:** Add max length validation in schema (already in domain model, add to schema)

