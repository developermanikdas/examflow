import mongoose from 'mongoose';
import Attempt from '@/models/Attempt';
import Examination from '@/models/Examination';
import AuditLog from '@/models/AuditLog';
import { connectToDatabase } from '@/lib/mongodb';
import { submitAttempt } from './submission-service';

/**
 * Verifies student credentials, PIN, and attempt eligibility
 */
export async function verifyStudentAndCheckEligibility(examPublicId, { name, email, pin }) {
  await connectToDatabase();

  const exam = await Examination.findOne({ publicId: examPublicId });
  if (!exam) {
    const err = new Error('Examination not found. Please verify the URL.');
    err.statusCode = 404;
    throw err;
  }

  if (exam.status !== 'published') {
    const err = new Error(
      exam.status === 'draft'
        ? 'This examination is currently in draft mode and not accepting attempts.'
        : 'This examination has been deactivated by the administrator.'
    );
    err.statusCode = 400;
    throw err;
  }

  // Validate PIN (case-sensitive or trimmed)
  if (!exam.pin || exam.pin.trim() !== String(pin).trim()) {
    const err = new Error('Invalid examination PIN. Please check with your instructor.');
    err.statusCode = 401;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check existing attempts for this student
  const existingAttempts = await Attempt.find({
    examinationId: exam._id,
    studentEmail: normalizedEmail,
  }).sort({ attemptNumber: -1 });

  // Check if there is an active (in_progress) attempt
  const activeAttempt = existingAttempts.find((a) => a.status === 'in_progress');
  if (activeAttempt) {
    const now = new Date();
    if (activeAttempt.isPaused) {
      // Exam was paused when window was closed - timer is stopped
      return {
        eligible: true,
        canResume: true,
        isPaused: true,
        activeAttemptId: activeAttempt._id.toString(),
        exam: {
          publicId: exam.publicId,
          title: exam.title,
          description: exam.description,
          subject: exam.subject,
          totalMarks: exam.totalMarks,
          questionCount: exam.questions.length,
          durationMinutes: exam.durationMinutes,
        },
      };
    } else if (activeAttempt.expiresAt <= now) {
      // Auto-submit expired active attempt
      await submitAttempt(activeAttempt._id, normalizedEmail, { isAutoSubmit: true });
    } else {
      // Student can resume the existing attempt!
      return {
        eligible: true,
        canResume: true,
        isPaused: false,
        activeAttemptId: activeAttempt._id.toString(),
        exam: {
          publicId: exam.publicId,
          title: exam.title,
          description: exam.description,
          subject: exam.subject,
          totalMarks: exam.totalMarks,
          questionCount: exam.questions.length,
          durationMinutes: exam.durationMinutes,
        },
      };
    }
  }

  // Count completed/submitted attempts
  const completedAttemptsCount = existingAttempts.filter((a) =>
    ['submitted', 'auto_submitted', 'evaluated'].includes(a.status)
  ).length;

  if (completedAttemptsCount >= exam.maxAttempts) {
    const err = new Error(
      `You have reached the maximum allowed attempts (${exam.maxAttempts}) for this examination.`
    );
    err.statusCode = 403;
    throw err;
  }

  return {
    eligible: true,
    canResume: false,
    attemptsRemaining: exam.maxAttempts - completedAttemptsCount,
    exam: {
      publicId: exam.publicId,
      title: exam.title,
      description: exam.description,
      subject: exam.subject,
      totalMarks: exam.totalMarks,
      questionCount: exam.questions.length,
      durationMinutes: exam.durationMinutes,
    },
  };
}

/**
 * Starts a new attempt or resumes an existing in-progress attempt.
 * Enforces server-authoritative timer: startedAt & expiresAt.
 */
export async function startAttempt(examPublicId, { name, email, ip, userAgent }) {
  await connectToDatabase();

  const exam = await Examination.findOne({ publicId: examPublicId });
  if (!exam || exam.status !== 'published') {
    const err = new Error('Examination is not active');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  // 1. Check for active attempt to resume
  const existingAttempts = await Attempt.find({
    examinationId: exam._id,
    studentEmail: normalizedEmail,
  }).sort({ attemptNumber: -1 });

  const activeAttempt = existingAttempts.find((a) => a.status === 'in_progress');
  const now = new Date();

  if (activeAttempt) {
    if (activeAttempt.isPaused) {
      // Return paused attempt state with timer stopped
      return {
        resumed: true,
        isPaused: true,
        attemptId: activeAttempt._id.toString(),
        startedAt: activeAttempt.startedAt,
        expiresAt: activeAttempt.expiresAt,
        durationSeconds: activeAttempt.durationSeconds,
        remainingSeconds: activeAttempt.remainingSeconds != null ? activeAttempt.remainingSeconds : activeAttempt.durationSeconds,
        answers: activeAttempt.answers || [],
        exam: exam.toStudentView(),
      };
    } else if (activeAttempt.expiresAt > now) {
      // Resume existing active attempt
      const remainingSeconds = Math.max(0, Math.floor((activeAttempt.expiresAt.getTime() - now.getTime()) / 1000));
      return {
        resumed: true,
        isPaused: false,
        attemptId: activeAttempt._id.toString(),
        startedAt: activeAttempt.startedAt,
        expiresAt: activeAttempt.expiresAt,
        durationSeconds: activeAttempt.durationSeconds,
        remainingSeconds,
        answers: activeAttempt.answers || [],
        exam: exam.toStudentView(),
      };
    } else {
      // Active attempt expired -> auto-submit
      await submitAttempt(activeAttempt._id, normalizedEmail, { isAutoSubmit: true });
    }
  }

  // 2. Check maximum attempts
  const completedAttemptsCount = existingAttempts.filter((a) =>
    ['submitted', 'auto_submitted', 'evaluated'].includes(a.status)
  ).length;

  if (completedAttemptsCount >= exam.maxAttempts) {
    const err = new Error(`Maximum attempts (${exam.maxAttempts}) exceeded.`);
    err.statusCode = 403;
    throw err;
  }

  // 3. Create fresh attempt with authoritative server timestamps
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + exam.durationSeconds * 1000);
  const attemptNumber = completedAttemptsCount + 1;

  const attempt = new Attempt({
    examinationId: exam._id,
    examPublicId: exam.publicId,
    studentName: normalizedName,
    studentEmail: normalizedEmail,
    attemptNumber,
    status: 'in_progress',
    startedAt,
    expiresAt,
    durationSeconds: exam.durationSeconds,
    remainingSeconds: exam.durationSeconds,
    isPaused: false,
    answers: [],
    questionEvaluations: [],
    ipAddress: ip,
    userAgent,
  });

  await attempt.save();

  // Audit log
  await AuditLog.create({
    action: 'ATTEMPT_STARTED',
    actor: { id: normalizedEmail, email: normalizedEmail, name: normalizedName, role: 'student' },
    targetType: 'Attempt',
    targetId: attempt._id.toString(),
    details: {
      examPublicId: exam.publicId,
      attemptNumber,
      expiresAt,
    },
    ipAddress: ip,
    userAgent,
  });

  return {
    resumed: false,
    attemptId: attempt._id.toString(),
    startedAt,
    expiresAt,
    durationSeconds: exam.durationSeconds,
    remainingSeconds: exam.durationSeconds,
    answers: [],
    exam: exam.toStudentView(),
  };
}

/**
 * Retrieves the current examination session for a student.
 * Recalculates remaining seconds and auto-submits if timer expired.
 */
export async function getAttemptSession(attemptId, studentEmail) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(attemptId)) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  if (studentEmail && attempt.studentEmail.toLowerCase() !== studentEmail.toLowerCase()) {
    const err = new Error('Unauthorized');
    err.statusCode = 403;
    throw err;
  }

  const exam = await Examination.findById(attempt.examinationId);
  if (!exam) {
    const err = new Error('Associated examination not found');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();

  // If still in progress and paused, timer is stopped
  if (attempt.status === 'in_progress' && attempt.isPaused) {
    return {
      attemptId: attempt._id.toString(),
      status: attempt.status,
      isPaused: true,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      remainingSeconds: attempt.remainingSeconds != null ? attempt.remainingSeconds : 0,
      answers: attempt.answers || [],
      exam: exam.toStudentView(),
      evaluation: null,
    };
  }

  // If still in progress but server expiration time has passed, auto-submit
  if (attempt.status === 'in_progress' && attempt.expiresAt <= now) {
    const submitResult = await submitAttempt(attempt._id, attempt.studentEmail, { isAutoSubmit: true });
    return {
      expired: true,
      status: 'auto_submitted',
      attempt: submitResult.attempt,
      remainingSeconds: 0,
      exam: exam.toStudentView(),
    };
  }

  const remainingSeconds =
    attempt.status === 'in_progress'
      ? Math.max(0, Math.floor((attempt.expiresAt.getTime() - now.getTime()) / 1000))
      : 0;

  return {
    attemptId: attempt._id.toString(),
    status: attempt.status,
    isPaused: false,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    remainingSeconds,
    currentQuestionIndex: attempt.currentQuestionIndex || 0,
    lastActiveAt: attempt.lastActiveAt || attempt.startedAt,
    answers: attempt.answers || [],
    exam: exam.toStudentView(),
    evaluation: ['submitted', 'auto_submitted', 'evaluated'].includes(attempt.status)
      ? {
          totalMarks: attempt.totalMarks,
          obtainedMarks: attempt.obtainedMarks,
          percentage: attempt.percentage,
          evaluationStatus: attempt.evaluationStatus,
        }
      : null,
  };
}

/**
 * Autosaves student answers.
 * Checks server authoritative timer and prevents answers if expired or already submitted.
 */
export async function saveAnswers(attemptId, answersArray, studentEmail) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(attemptId)) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  if (studentEmail && attempt.studentEmail.toLowerCase() !== studentEmail.toLowerCase()) {
    const err = new Error('Unauthorized');
    err.statusCode = 403;
    throw err;
  }

  // Check if attempt is already closed
  if (['submitted', 'auto_submitted', 'evaluated'].includes(attempt.status)) {
    const err = new Error('This attempt has already been submitted and cannot be modified.');
    err.statusCode = 400;
    throw err;
  }

  // Check server authoritative timer expiration
  const now = new Date();
  if (attempt.expiresAt <= now) {
    // Time expired! Auto submit and reject modifications
    await submitAttempt(attempt._id, attempt.studentEmail, { isAutoSubmit: true });
    const err = new Error('Examination time has expired. Your answers have been automatically submitted.');
    err.statusCode = 408; // Request Timeout
    throw err;
  }

  // Merge answers into attempt
  const existingAnswersMap = new Map();
  for (const a of attempt.answers || []) {
    existingAnswersMap.set(a.questionId, a);
  }

  for (const incoming of answersArray) {
    if (incoming.questionId) {
      existingAnswersMap.set(incoming.questionId, {
        questionId: incoming.questionId,
        answer: incoming.answer !== undefined ? incoming.answer : '',
        savedAt: now,
      });
    }
  }

  attempt.answers = Array.from(existingAnswersMap.values());
  attempt.lastActiveAt = now;
  await attempt.save();

  return {
    success: true,
    savedCount: answersArray.length,
    timestamp: now,
  };
}

/**
 * Pauses an active examination attempt when the student's browser window is closed.
 * Freezes the remaining seconds and saves any pending answers.
 */
export async function pauseAttempt(attemptId, studentEmail, { remainingSeconds, answers } = {}) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(attemptId)) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  if (studentEmail && attempt.studentEmail.toLowerCase() !== studentEmail.toLowerCase()) {
    const err = new Error('Unauthorized');
    err.statusCode = 403;
    throw err;
  }

  if (attempt.status !== 'in_progress') {
    return { success: true, message: 'Attempt is already finished', status: attempt.status };
  }

  const now = new Date();
  let calculatedRemaining = remainingSeconds;

  if (calculatedRemaining == null) {
    calculatedRemaining = Math.max(0, Math.floor((attempt.expiresAt.getTime() - now.getTime()) / 1000));
  } else {
    // Upper-bound by the maximum theoretical duration to avoid client manipulation
    const maxTheoretical = attempt.durationSeconds || 7200;
    calculatedRemaining = Math.min(Math.max(0, Math.floor(Number(calculatedRemaining))), maxTheoretical);
  }

  attempt.isPaused = true;
  attempt.remainingSeconds = calculatedRemaining;
  attempt.pausedAt = now;

  // Persist answers if passed along with beacon/keepalive
  if (Array.isArray(answers) && answers.length > 0) {
    const existingAnswersMap = new Map();
    for (const a of attempt.answers || []) {
      existingAnswersMap.set(a.questionId, a);
    }
    for (const incoming of answers) {
      if (incoming && incoming.questionId) {
        existingAnswersMap.set(incoming.questionId, {
          questionId: incoming.questionId,
          answer: incoming.answer !== undefined ? incoming.answer : '',
          savedAt: now,
        });
      }
    }
    attempt.answers = Array.from(existingAnswersMap.values());
  }

  await attempt.save();

  return {
    success: true,
    isPaused: true,
    remainingSeconds: attempt.remainingSeconds,
    pausedAt: attempt.pausedAt,
  };
}

/**
 * Resumes a paused examination attempt when the student re-opens the examination.
 * Recalculates expiresAt based on the saved remaining seconds from this instant.
 */
export async function resumeAttempt(attemptId, studentEmail) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(attemptId)) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  if (studentEmail && attempt.studentEmail.toLowerCase() !== studentEmail.toLowerCase()) {
    const err = new Error('Unauthorized');
    err.statusCode = 403;
    throw err;
  }

  if (attempt.status !== 'in_progress') {
    return { success: false, message: 'Attempt is not in progress', status: attempt.status };
  }

  const now = new Date();
  const remaining =
    attempt.remainingSeconds != null
      ? attempt.remainingSeconds
      : Math.max(0, Math.floor((attempt.expiresAt.getTime() - now.getTime()) / 1000));

  if (remaining <= 0) {
    const submitResult = await submitAttempt(attempt._id, attempt.studentEmail, { isAutoSubmit: true });
    return {
      success: false,
      expired: true,
      status: 'auto_submitted',
      attempt: submitResult.attempt,
    };
  }

  // Extend expiresAt by the frozen remaining seconds starting from right now
  attempt.isPaused = false;
  attempt.expiresAt = new Date(now.getTime() + remaining * 1000);
  attempt.resumedAt = now;
  await attempt.save();

  return {
    success: true,
    isPaused: false,
    remainingSeconds: remaining,
    expiresAt: attempt.expiresAt,
  };
}

/**
 * Updates live student progress, current question index, and heartbeat timestamp.
 */
export async function updateStudentActivity(attemptId, studentEmail, { currentQuestionIndex } = {}) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(attemptId)) {
    return { success: false, error: 'Invalid attempt ID' };
  }

  const update = { lastActiveAt: new Date() };
  if (currentQuestionIndex !== undefined && !isNaN(currentQuestionIndex)) {
    update.currentQuestionIndex = Number(currentQuestionIndex);
  }

  await Attempt.findByIdAndUpdate(attemptId, update);
  return { success: true, lastActiveAt: update.lastActiveAt };
}

