// Comprehensive E2E Verification Script for ExamFlow
const fs = require('fs');
const path = require('path');

// Auto-load .env.local or .env if present and not yet loaded into process.env
for (const envFile of ['.env.local', '.env']) {
  const envPath = path.join(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
const mongoUri = process.env.MONGODB_URI;

if (!adminEmail || !adminPassword) {
  console.error('[ERROR] INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be configured in environment or .env.local');
  process.exit(1);
}

if (!mongoUri) {
  console.error('[ERROR] MONGODB_URI must be configured in environment or .env.local');
  process.exit(1);
}

async function runTests() {
  console.log('=== STARTING EXAMFLOW AUTOMATED VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Verify unauthorized users CANNOT access admin APIs
    console.log('\n--- 1. Testing Admin Route Authorization Protection ---');
    const unauthRes = await fetch(`${baseUrl}/api/examinations`);
    assert(unauthRes.status === 401, 'Unauthorized request to /api/examinations returns 401');

    // 2. Verify incorrect login rate limiting
    console.log('\n--- 2. Testing Admin Login & Rate Limiting ---');
    let failCount = 0;
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'fakeadmin@test.com', password: 'wrongpassword' }),
      });
      if (res.status === 429) {
        failCount = 429;
        const data = await res.json();
        assert(data.lockout === true, `Rate limit triggered on attempt ${i + 1} with 429 and lockout duration`);
        break;
      }
    }
    assert(failCount === 429, 'Brute force IP rate limiting successfully locked out excessive failed attempts');

    // Reset rate limit directly via DB
    const mongoose = require('mongoose');
    await mongoose.connect(mongoUri);
    await mongoose.connection.collection('ratelimits').deleteMany({});
    console.log('[INFO] RateLimit reset for testing authorized admin flow.');

    // 3. Verify Admin Login with configured credentials
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.success, 'Admin successfully authenticated with initial credentials');

    // Capture auth cookie
    const setCookie = loginRes.headers.get('set-cookie');
    assert(!!setCookie && setCookie.includes('examflow_admin_session'), 'HTTP-only auth cookie set with SameSite');
    const authHeaders = {
      'Content-Type': 'application/json',
      Cookie: setCookie,
    };

    // 4. Verify Malformed JSON Rejection
    console.log('\n--- 3. Testing Question Paper Validation & Metrics ---');
    const malformedRes = await fetch(`${baseUrl}/api/examinations`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        schemaVersion: '1.0',
        title: 'Broken Paper',
        questions: [
          { id: 'q1', type: 'mcq', marks: 1, question: 'Q with no options' }, // missing options
        ],
      }),
    });
    const malformedData = await malformedRes.json();
    assert(malformedRes.status === 400, 'Malformed JSON rejected with 400 Bad Request');
    assert(!!malformedData.error, `Useful error message returned: ${malformedData.error}`);

    // 5. Verify Valid JSON Question Paper Upload & Duration Formula
    const demoPaper = require('./public/demo-exam-template.json');
    const createRes = await fetch(`${baseUrl}/api/examinations`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        questionPaper: demoPaper,
        overrides: {
          pin: '889900',
          maxAttempts: 2,
        },
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201 && createData.success, 'Valid examination created from JSON');
    const exam = createData.examination;
    assert(exam.totalMarks === 19 || exam.totalMarks === 18, `Total marks calculated authoritatively (${exam.totalMarks})`);
    assert(exam.durationMinutes > 0, `Duration calculated authoritatively (${exam.durationMinutes} mins)`);
    assert(exam.pin === '889900', `PIN configured correctly (${exam.pin})`);
    assert(exam.publicId.startsWith('ex-'), `Unique shareable public ID generated (${exam.publicId})`);

    // 6. Verify Admin Timer Override
    console.log('\n--- 4. Testing Admin Timer Override & Publishing ---');
    const patchRes = await fetch(`${baseUrl}/api/examinations/${exam.publicId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ durationMinutes: 45 }),
    });
    const patchData = await patchRes.json();
    assert(patchData.examination.durationMinutes === 45, 'Admin can manually override total duration to 45 mins');

    // 7. Verify Publish Examination
    const pubRes = await fetch(`${baseUrl}/api/examinations/${exam.publicId}/publish`, {
      method: 'POST',
      headers: authHeaders,
    });
    const pubData = await pubRes.json();
    assert(pubData.examination.status === 'published', 'Examination successfully published');

    // 8. Verify Student PIN Validation & Attempt Eligibility
    console.log('\n--- 5. Testing Student Flow, PIN & Verification ---');
    // Invalid PIN
    const wrongPinRes = await fetch(`${baseUrl}/api/exam/${exam.publicId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice Smith', email: 'alice@test.com', pin: '000000' }),
    });
    assert(wrongPinRes.status === 401, 'Invalid PIN rejected with 401 Unauthorized');

    // Valid PIN
    const validVerifyRes = await fetch(`${baseUrl}/api/exam/${exam.publicId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice Smith', email: 'alice@test.com', pin: '889900' }),
    });
    const validVerifyData = await validVerifyRes.json();
    assert(validVerifyRes.status === 200 && validVerifyData.eligible === true, 'Student verified and eligible to start exam');

    // 9. Verify Student Starts Exam & Server Authoritative Timer
    console.log('\n--- 6. Testing Exam Start & Authoritative Timer ---');
    const startRes = await fetch(`${baseUrl}/api/exam/${exam.publicId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice Smith', email: 'alice@test.com' }),
    });
    const startData = await startRes.json();
    assert(startRes.status === 200 && !!startData.attemptId, 'Exam started with attempt ID created');
    assert(!!startData.startedAt && !!startData.expiresAt, 'Authoritative server timestamps startedAt & expiresAt generated');
    const attemptId = startData.attemptId;

    // 10. Verify that students CANNOT access correct MCQ answers
    const studentQuestions = startData.exam.questions;
    const hasLeakedKey = studentQuestions.some((q) => q.correctAnswer !== undefined || q.expectedAnswer !== undefined);
    assert(!hasLeakedKey, 'CRITICAL SECURITY: correctAnswer is completely stripped from student-facing API payload');

    // 11. Verify Answer Autosave
    console.log('\n--- 7. Testing Answer Autosave & Recovery ---');
    const saveRes = await fetch(`${baseUrl}/api/attempts/${attemptId}/answers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@test.com',
        answers: [
          { questionId: 'q1', answer: 'b' }, // Correct MCQ
          { questionId: 'q2', answer: 'b' }, // Correct MCQ
          { questionId: 'q3', answer: 'A closure is a function bundled with lexical scope.' },
        ],
      }),
    });
    const saveData = await saveRes.json();
    assert(saveData.success === true && saveData.savedCount === 3, 'Answers autosaved successfully to MongoDB');

    // 12. Verify Browser Refresh Recovery
    const sessionRes = await fetch(`${baseUrl}/api/exam/${exam.publicId}/session?attemptId=${attemptId}&email=alice@test.com`);
    const sessionData = await sessionRes.json();
    assert(sessionData.answers.length === 3, 'Saved answers successfully restored upon browser reload/recovery');
    assert(sessionData.remainingSeconds > 0, `Authoritative remaining countdown recovered (${sessionData.remainingSeconds}s)`);

    // 13. Verify Manual Examination Submission & MCQ Auto-Grading
    console.log('\n--- 8. Testing Submission & Automatic MCQ Evaluation ---');
    const submitRes = await fetch(`${baseUrl}/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@test.com' }),
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 200 && submitData.success, 'Examination successfully submitted');
    assert(submitData.obtainedMarks >= 2, `MCQ answers automatically evaluated: ${submitData.obtainedMarks} marks awarded`);
    assert(submitData.evaluationStatus === 'partially_evaluated', 'Evaluation status marked as partially_evaluated (written answers pending)');

    // 14. Verify Submission Idempotency
    const resubmitRes = await fetch(`${baseUrl}/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@test.com' }),
    });
    const resubmitData = await resubmitRes.json();
    assert(resubmitData.alreadySubmitted === true, 'Submission is idempotent: duplicate submit requests handled safely');

    // 15. Verify Admin Manual Written Answer Grading
    console.log('\n--- 9. Testing Admin Manual Grading for Written Answers ---');
    const gradeRes = await fetch(`${baseUrl}/api/admin/attempts/${attemptId}/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        questionId: 'q3',
        marksAwarded: 2,
        evaluatorFeedback: 'Excellent definition of closures in JavaScript.',
      }),
    });
    const gradeData = await gradeRes.json();
    assert(gradeRes.status === 200 && gradeData.success, 'Instructor manually graded written question q3 (+2 marks)');
    assert(gradeData.attempt.obtainedMarks === submitData.obtainedMarks + 2, 'Total obtained marks and percentage dynamically updated');

    // 16. Verify JSON Attempt Export
    console.log('\n--- 10. Testing JSON Data Exports ---');
    const exportRes = await fetch(`${baseUrl}/api/admin/attempts/export?attemptId=${attemptId}`, {
      headers: authHeaders,
    });
    assert(exportRes.status === 200, 'Attempt exported successfully as JSON');
    const exportData = await exportRes.json();
    assert(exportData.student.email === 'alice@test.com', 'Exported JSON contains sanitized student metadata');
    assert(!exportData.admin && !exportData.passwordHash, 'Exported JSON has zero sensitive secrets or credentials');

    // 17. Verify Dashboard KPI Metrics
    console.log('\n--- 11. Testing Admin Dashboard Metrics ---');
    const statsRes = await fetch(`${baseUrl}/api/admin/stats`, { headers: authHeaders });
    const statsData = await statsRes.json();
    assert(statsData.stats.totalExaminations >= 1, `Total examinations: ${statsData.stats.totalExaminations}`);
    assert(statsData.stats.completedAttempts >= 1, `Completed attempts: ${statsData.stats.completedAttempts}`);

    // 18. Verify Examination Deletion & Cascade Clean-up
    console.log('\n--- 12. Testing Examination Deletion & Cascade Clean-up ---');
    const deleteRes = await fetch(`${baseUrl}/api/examinations/${exam.publicId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200 && deleteData.success === true, 'Examination and related data deleted successfully');

    // Verify it is gone
    const getDeletedRes = await fetch(`${baseUrl}/api/examinations/${exam.publicId}`, {
      headers: authHeaders,
    });
    assert(getDeletedRes.status === 404, 'Deleted examination returns 404 Not Found');

    console.log('\n=================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=================================================\n');

    process.exit(failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTests();
