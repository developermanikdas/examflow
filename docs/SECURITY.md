# ExamFlow Security Architecture

ExamFlow incorporates defense-in-depth principles across all layers.

---

## 1. Authentication & Session Defense
- **Bcrypt Hashing:** Passwords hashed with 12 salt rounds. Passwords are never stored in plaintext and never included in standard database queries (`select: false`).
- **HTTP-Only Cookies:** Auth tokens stored exclusively in `SameSite: Lax`, `HttpOnly` cookies to protect against Cross-Site Scripting (XSS) token theft.
- **Server-Side Session Validation:** Every admin route checks the session against the database. No client-side checks can be bypassed to access administrative data.

---

## 2. Brute-Force Rate Limiting (Atomic MongoDB Store)
- Failed admin logins are tracked atomically using MongoDB `findOneAndUpdate` with `$inc`.
- If consecutive failed logins reach the threshold (default: 5), the IP is locked out for 30 minutes.
- Rate limiting survives serverless cold starts and multi-instance restarts because it is backed by the database rather than an in-memory Map.
- Generic error messages are always returned ("Invalid email or password combination") to prevent username enumeration.
- Client IP resolution securely accounts for trusted proxy hops (`CF-Connecting-IP`, `X-Forwarded-For`).

---

## 3. Examination Confidentiality
- **Answer Key Masking:** Correct answers (`correctAnswer`) and expected written guides are strictly projected out in `toStudentView()`.
- Students can never inspect network response payloads in browser DevTools to discover MCQ answer keys before submitting.
- Examination PIN is validated server-side and never echoed back in student payloads.

---

## 4. Timer Authority & Anti-Cheating
- Timers are authoritative on the server (`startedAt` and `expiresAt`).
- Altering the local computer clock or refreshing the browser has zero effect on the remaining countdown.
- Expired attempts are automatically rejected from further answer writes with HTTP 408 (Request Timeout) and transitioned to `auto_submitted`.

---

## 5. Input Validation & IDOR Protection
- All input payloads validated via strict **Zod** schemas.
- Student answer autosave verifies student email ownership before modifying any attempt record.
- Insecure Direct Object References (IDOR) are prevented by verifying attempt ownership against the authenticated email.

---

## 6. Audit Trail
- Sensitive administrative operations (`ADMIN_LOGIN_SUCCESS`, `ADMIN_LOGIN_FAILED`, `EXAM_CREATED`, `EXAM_PUBLISHED`, `EXAM_DEACTIVATED`, `ATTEMPT_EVALUATED`) are logged to an immutable `AuditLog` collection with timestamp, actor metadata, IP address, and details.

