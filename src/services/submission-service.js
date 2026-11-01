import mongoose from 'mongoose';
import Attempt from '@/models/Attempt';
import Examination from '@/models/Examination';
import AuditLog from '@/models/AuditLog';
import { connectToDatabase } from '@/lib/mongodb';
import { evaluateAttempt } from './evaluation-service';

/**
 * Idempotently submits a student examination attempt.
 * Evaluates all MCQs upon submission.
 */
export async function submitAttempt(attemptId, studentEmail, { isAutoSubmit = false } = {}) {
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

  // Security check: verify email matches
  if (studentEmail && attempt.studentEmail.toLowerCase() !== studentEmail.toLowerCase()) {
    const err = new Error('Unauthorized: email mismatch for this attempt');
    err.statusCode = 403;
    throw err;
  }

  // Idempotency check: if already submitted, return the existing submitted attempt
  if (['submitted', 'auto_submitted', 'evaluated'].includes(attempt.status)) {
    return {
      success: true,
      alreadySubmitted: true,
      attempt,
    };
  }

  const now = new Date();
  attempt.submittedAt = now;
  attempt.status = isAutoSubmit ? 'auto_submitted' : 'submitted';

  await attempt.save();

  // Run evaluation (auto grades MCQs)
  const evaluatedAttempt = await evaluateAttempt(attempt._id);

  // Audit log
  await AuditLog.create({
    action: isAutoSubmit ? 'ATTEMPT_AUTO_SUBMITTED' : 'ATTEMPT_SUBMITTED',
    actor: {
      id: attempt.studentEmail,
      email: attempt.studentEmail,
      name: attempt.studentName,
      role: 'student',
    },
    targetType: 'Attempt',
    targetId: attempt._id.toString(),
    details: {
      examPublicId: attempt.examPublicId,
      totalMarks: evaluatedAttempt.totalMarks,
      obtainedMarks: evaluatedAttempt.obtainedMarks,
      percentage: evaluatedAttempt.percentage,
      isAutoSubmit,
    },
  });

  return {
    success: true,
    alreadySubmitted: false,
    attempt: evaluatedAttempt,
  };
}

