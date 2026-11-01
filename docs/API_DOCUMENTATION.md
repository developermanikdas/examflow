# ExamFlow API Documentation

All API responses follow consistent JSON structures with standard HTTP status codes.

---

## 1. Authentication APIs

### `POST /api/auth/login`
Authenticates the administrator.
- **Rate Limiting:** Maximum 5 failed attempts per IP within the configurable window before a 30-minute lockout.
- **Request Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "your_secure_password"
  }
  ```
- **Responses:**
  - `200 OK`: Sets HTTP-only `examflow_admin_session` cookie.
  - `401 Unauthorized`: Generic error message with remaining attempts.
  - `429 Too Many Requests`: Returns lockout status and remaining lockout minutes.

### `POST /api/auth/logout`
Clears the session cookie and logs an audit event.

### `GET /api/auth/session`
Returns authenticated administrator information or `401`.

---

## 2. Examination APIs

*Requires authenticated administrator session.*

### `POST /api/examinations`
Uploads and validates a JSON question paper. Computes authoritative total marks and suggested duration.
- **Request Body:**
  ```json
  {
    "questionPaper": { ...valid QuestionPaper JSON... },
    "overrides": {
      "title": "Optional Override",
      "durationMinutes": 45,
      "pin": "123456",
      "maxAttempts": 2
    }
  }
  ```
- **Response:** `201 Created` with examination metadata and unique `publicId`.

### `GET /api/examinations`
Returns paginated list of examinations with student attempt counts.
- **Query Params:** `status`, `search`, `page`, `limit`.

### `GET /api/examinations/[id]`
Retrieves full examination details (including questions and answers for admin view).

### `PATCH /api/examinations/[id]`
Updates title, description, PIN, duration, or maximum attempts.

### `DELETE /api/examinations/[id]`
Permanently deletes examination and cascades to associated student attempts.

### `POST /api/examinations/[id]/publish`
Transitions status to `published`, opening the exam to students.

### `POST /api/examinations/[id]/deactivate`
Transitions status to `deactivated`.

### `GET /api/examinations/[id]/raw`
Downloads the original uploaded JSON question paper as a file attachment.

---

## 3. Student Examination APIs

*Public APIs protected by PIN validation and rate checks.*

### `POST /api/exam/[id]/verify`
Verifies candidate registration details and PIN before beginning.
- **Request Body:** `{ "name": "Alice", "email": "alice@test.com", "pin": "889900" }`
- **Response:** `{ "eligible": true, "canResume": false, "exam": { ...safe view without answer keys... } }`

### `POST /api/exam/[id]/start`
Starts a new attempt or resumes an existing active session. Generates authoritative `startedAt` and `expiresAt` timestamps.
- **Request Body:** `{ "name": "Alice", "email": "alice@test.com" }`
- **Response:** `{ "attemptId": "...", "startedAt": "...", "expiresAt": "...", "remainingSeconds": 2700, "exam": { ...safe view... } }`

### `GET /api/exam/[id]/session`
Retrieves student session upon reload or periodic refresh. If server expiration time has passed, automatically submits the attempt.

### `PATCH /api/attempts/[attemptId]/answers`
Autosaves student answers.
- **Request Body:**
  ```json
  {
    "email": "alice@test.com",
    "answers": [
      { "questionId": "q1", "answer": "b" },
      { "questionId": "q2", "answer": "Detailed answer text..." }
    ]
  }
  ```
- **Responses:**
  - `200 OK`: Answers persisted atomically.
  - `408 Request Timeout`: Returned if exam time has expired on the server.

### `POST /api/attempts/[attemptId]/submit`
Submits the paper idempotently. Automatically evaluates all MCQs and queues written answers for grading.

---

## 4. Admin Attempts & Grading APIs

*Requires authenticated administrator session.*

### `GET /api/admin/attempts`
Paginated search and filter for all student attempts.
- **Query Params:** `examinationId`, `search`, `status`, `evaluationStatus`, `page`, `limit`.

### `GET /api/admin/attempts/[attemptId]`
Fetches full attempt review (student responses, question texts, correct answers, evaluation feedback).

### `POST /api/admin/attempts/[attemptId]/evaluate`
Assigns marks and optional feedback to a written question.
- **Request Body:**
  ```json
  {
    "questionId": "q3",
    "marksAwarded": 4.5,
    "evaluatorFeedback": "Solid grasp of concepts."
  }
  ```
- Automatically recalculates total obtained marks, percentage, and updates evaluation status.

### `GET /api/admin/attempts/export`
Exports sanitized JSON:
- `?attemptId=...`: Single attempt download.
- `?examPublicId=...`: All attempts for an examination.

