# ExamFlow System Architecture

ExamFlow is structured into modular layers designed for scalability, zero downtime, and future extensibility.

---

## 1. High-Level Modular Design

```
+-------------------------------------------------------------+
|                      Client Layer                           |
|  - Google-inspired Material Design (MUI 6+)                 |
|  - Admin Console (Dashboard, Papers, Attempts, Evaluation)  |
|  - Student Exam Session (Distraction-Free, Autosave)        |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                 Next.js App Router (HTTP/API)               |
|  - Server-Side Authorization Middleware                     |
|  - IP-based Distributed Rate Limiter                        |
|  - Input Validation (Zod Engine)                            |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                      Services Layer                         |
|  - examination-service.js (Upload, Metrics, Lifecycle)      |
|  - attempt-service.js (Eligibility, Session, Autosave)      |
|  - submission-service.js (Idempotent Submit, Timing)        |
|  - evaluation-service.js (Auto MCQ, Manual Grading, AI Hook)|
|  - admin-attempt-service.js (Metrics, JSON Export)          |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                   Mongoose / Database Layer                 |
|  - Admin (Bcrypt credentials, Role)                         |
|  - Examination (Public ID, Questions, Answer Keys)          |
|  - Attempt (Authoritative Timers, Answers, Scores)          |
|  - RateLimit (Atomic IP Failure Tracker & Lockout)          |
|  - AuditLog (Immutable Security Trail)                      |
|  - SystemSetting (Global Configuration)                     |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                   MongoDB Atlas Cluster                     |
+-------------------------------------------------------------+
```

---

## 2. Server-Authoritative Timer Architecture

To eliminate client-side cheating (such as page reloads, pausing Javascript, or altering local system clocks):

1. **Initialization:**
   When the student clicks "Start Examination", the server registers:
   - `startedAt`: Timestamp generated on the server ($T_{\text{start}}$).
   - `expiresAt`: $T_{\text{start}} + (\text{durationMinutes} \times 60 \text{ seconds})$.
   - `durationSeconds`: Fixed total duration.
2. **Session Verification & Recovery:**
   On every ping, autosave, or browser refresh, the server computes:
   $$\text{remainingSeconds} = \max\left(0, \left\lfloor \frac{T_{\text{expires}} - T_{\text{server}}}{1000} \right\rfloor\right)$$
3. **Hard Expiration & Auto-Submission:**
   If $T_{\text{server}} \ge T_{\text{expires}}$, any subsequent answer mutation is rejected with HTTP 408 (Request Timeout), and the attempt is automatically transitioned to `auto_submitted` status and graded.

---

## 3. Dual Evaluation Engine

The evaluation pipeline is decoupled from student submission:
- **MCQ Questions:** Evaluated instantaneously upon submission by comparing student choices against the authoritative `correctAnswer` in MongoDB.
- **Written Answers:** Stored safely and marked with `evaluatorType: 'manual'` and `evaluationStatus: 'partially_evaluated'`. Instructors grade them with customized marks and comments.
- **Future AI Expansion:** `evaluation-service.js` provides `registerAiEvaluationProvider()`. AI scoring models (e.g. Gemini API) can be hooked in directly without changing database schemas or student APIs.

---

## 4. Database Schema Relationships & Indexes

- **Examinations:** Indexed on `publicId` (unique) and `status`.
- **Attempts:** Compound indexed on `{ examinationId: 1, studentEmail: 1, attemptNumber: 1 }` and `{ examinationId: 1, status: 1 }`.
- **RateLimits:** Unique index on `key` with a 24-hour TTL auto-expiration.
- **AuditLog:** Indexed on `createdAt: -1` and `action`.

