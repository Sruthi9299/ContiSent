## Additional Bugs Found & Fixed

### Critical Bugs Found

#### 1. **Missing SMTP Configuration in Config (config.py)** - CRITICAL
**Issue:** Email service references `settings.SMTP_HOST`, `settings.SMTP_USER`, etc. but these are NOT defined in config.py
**Impact:** Email service crashes on import; password reset emails fail silently
**Fix Needed:** Add to config.py:
```python
SMTP_HOST: str = os.getenv("SMTP_HOST", "")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "noreply@contisent.app")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
```

#### 2. **Duplicate Password Reset Logic - CONFLICT**
**Files:** `backend/app/api/routers/users.py` vs `backend/app/api/routers/auth.py`
**Issue:** Two different password reset implementations exist!
- `users.py` has `/request-password-reset` and `/reset-password`
- `auth.py` has `/forgot-password` and `/reset-password`
**Impact:** Confusing API, duplicate code, maintenance nightmare
**Fix:** Remove from `users.py`, keep only `auth.py` version (which is better)

#### 3. **Missing `sbom_json` in Alembic Migration**
**File:** `backend/alembic/versions/7caf4af60a77_initial_migration.py`
**Issue:** `scan_results` table is missing `sbom_json` column that's defined in models
**Impact:** SBOM data can't be stored; database schema mismatch with ORM model
**Fix:** Add column to migration:
```python
sa.Column('sbom_json', sa.JSON(), nullable=True),
```

#### 4. **Notifications Endpoint Not Implemented**
**File:** `backend/app/api/routers/notifications.py`
**Issue:** `mark_all_read()` doesn't actually update database
**Impact:** Endpoint exists but does nothing
**Fix:** Query and update `Notification` table

#### 5. **Deprecated `Config` in Schemas (Multiple Files)** - HIGH
**Files:**
- `backend/app/schemas/auth.py`
- `backend/app/schemas/scan.py`
- `backend/app/schemas/policy.py`
- `backend/app/schemas/deployment.py`
**Issue:** Using old Pydantic v1 style `class Config: orm_mode = True`
**Impact:** Deprecated, won't work with Pydantic 3.0
**Fix:** Replace with `model_config = ConfigDict(from_attributes=True)`

#### 6. **Missing Password Length Validation**
**File:** `backend/app/schemas/auth.py`
**Issue:** `ForgotPasswordRequest` doesn't validate password, `ResetPasswordRequest` has min_length=8 but no max_length
**Impact:** Could allow extremely long passwords; inconsistent validation
**Fix:** Add to UserCreate:
```python
password: str = Field(min_length=8, max_length=128)
```

#### 7. **Timezone Aware Comparison Missing**
**File:** `backend/app/api/routers/auth.py` (line 119)
**Issue:** Manually checking and fixing `tzinfo` in reset_password - shouldn't be needed
**Impact:** Workaround code; should use timezone-aware from start
**Fix:** Already fixed in models.py, no need for this workaround

#### 8. **No Duplicate Username Check in Register**
**File:** `backend/app/api/routers/auth.py`
**Issue:** Only checks duplicate email, not username
**Impact:** Users can create multiple accounts with same username
**Fix:** Add check:
```python
user = db.query(User).filter(
    (User.email == user_in.email) | (User.username == user_in.username)
).first()
```

#### 9. **Email Service Prints Passwords to Console**
**File:** `backend/app/services/email.py`
**Issue:** Password reset links printed to stdout in fallback
**Impact:** Security risk - credentials visible in logs
**Fix:** Only log to file, not stdout

#### 10. **No Email Rate Limiting**
**File:** `backend/app/services/email.py`
**Issue:** No check for spam; can send unlimited password reset emails
**Impact:** Email bombing attack possible
**Fix:** Add Redis-based rate limiting

#### 11. **DB Session Created Twice**
**Files:** `backend/app/db/session.py` AND `backend/app/api/deps.py`
**Issue:** SessionLocal created in both places with different configurations
**Impact:** Inconsistent database connections; `db/session.py` has `pool_pre_ping=True` but `deps.py` doesn't
**Fix:** Use only one (deps.py is already correct for FastAPI)

#### 12. **Missing Validator for Source URI**
**File:** `backend/app/schemas/submission.py`
**Issue:** No validation on `source_uri` format
**Impact:** Invalid URIs/image names accepted, fail later in scanner
**Fix:** Add `@field_validator('source_uri')`

#### 13. **Password Reset Email Link Building Unsafe**
**File:** `backend/app/services/email.py`
**Issue:** Uses f-string to build URL with user token - not URL-safe
**Impact:** Special characters in token could break URL
**Fix:** Use `urllib.parse.urlencode()`

### High Priority Bugs

#### 14. **No User Input Length Validation**
**Files:** Schema files
**Issue:** Usernames, emails, descriptions have no max length validation
**Impact:** Could store gigantic values
**Fix:** Add Field(max_length=) to all string fields

#### 15. **Missing Pagination on Endpoints**
**Files:** All list endpoints in routers
**Issue:** No pagination for audit_logs, sessions, submissions
**Impact:** Fetching all records is inefficient
**Note:** Already partially fixed with skip/limit but not documented

#### 16. **ORM Mode Config Inconsistency**
**File:** Multiple schema files
**Issue:** Some use `orm_mode`, others don't
**Impact:** Inconsistent behavior
**Fix:** Use `ConfigDict` everywhere

---

## New Bugs to Fix

Let me create fixes for all these:
