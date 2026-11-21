# SkillBridge AI — Security & Governance Policy

## 1. Authentication & Session Security

- **JWT Authentication**: SkillBridge AI validates asymmetric or HS256 tokens signed by Supabase Auth.
- **Strict Expiration**: Tokens expire within 1 hour; callers must refresh credentials.
- **Role Verification**: User identity, account active status (`is_active=True`), and role permissions are verified against the database on every authenticated API invocation.

---

## 2. Authorization & Role-Based Access Control (RBAC)

The platform enforces three distinct administrative and learning tiers:

1. **Learner**:
   - Access to own profile, enrolled courses, learning paths, and personalized recommendations.
   - Access to take published diagnostic assessments and view personal gap radar.
   - Access to AI Learning Assistant (RAG) strictly bounded to authorized published documents.
   - Can export only their own official academic transcript (`/api/v1/reports/learner-transcript`).
   - Insecure direct object reference (IDOR) attempts return `403 Forbidden`.

2. **Trainer / Faculty**:
   - Authorized to upload curriculum training materials and trigger chunk extraction.
   - Access to AI Quiz Generation Studio and interactive quiz editing.
   - Publishing workflows for documents and quizzes.
   - Access to view assessment performance across their own authored modules.
   - Trainer data isolation guarantees faculty members cannot edit or archive each other's materials.

3. **System Administrator**:
   - Executive governance dashboard access.
   - User account activation, deactivation, and role elevation.
   - Last-active-administrator safeguard: System forbids deactivating or demoting the last remaining active administrator.
   - Read-only inspection access to the full national competency, course, and job role catalogue.
   - Authorized to generate executive platform reports (CSV & PDF).
   - Immutable security audit log inspection.

---

## 3. Rate Limiting & Denial of Service Protection

- **SlowAPI Integration**: Standard endpoints are rate-limited to 100 requests per minute per IP address.
- **Sensitive Operations**: Report generation and quiz submission endpoints carry dedicated rate limits.
- **Production Redis Storage**: Multi-worker setups share rate-limiting states using Redis via `RATELIMIT_STORAGE_URL`.

---

## 4. OWASP Security Headers

All HTTP responses emitted by the FastAPI backend include mandatory security headers:

- `X-Content-Type-Options: nosniff` (Prevents MIME-type sniffing).
- `X-Frame-Options: DENY` (Mitigates clickjacking attacks).
- `X-XSS-Protection: 1; mode=block` (Browser cross-site scripting filter).
- `Referrer-Policy: strict-origin-when-cross-origin` (Protects path confidentiality).
- `Permissions-Policy: geolocation=(), microphone=(), camera=()` (Restricts browser hardware access).
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Enforced in production mode).

---

## 5. Audit Logging Architecture

Every security-relevant operation creates an immutable entry in the `audit_logs` table:
- User profile updates and role changes.
- Administrator deactivation or activation events.
- Assessment submissions and scoring calculations.
- Document uploads, publication, and deletion.
- Executive report exports (records report type, export format, record count, and actor metadata).
