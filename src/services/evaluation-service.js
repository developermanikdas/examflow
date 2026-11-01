import mongoose from 'mongoose';
import Attempt from '@/models/Attempt';
import Examination from '@/models/Examination';
import AuditLog from '@/models/AuditLog';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * Interface/Engine for evaluating an attempt.
 * Evaluates all MCQs automatically against the original question answer keys.
 * Marks written answers as pending manual/AI evaluation.
 */
export async function evaluateAttempt(attemptId) {
  await connectToDatabase();

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) {
    throw new Error('Attempt not found for evaluation');
  }

  const exam = await Examination.findById(attempt.examinationId);
  if (!exam) {
    throw new Error('Examination not found for attempt evaluation');
  }

  const questionMap = new Map();
  for (const q of exam.questions) {
    questionMap.set(q.id, q);
  }

  const studentAnswersMap = new Map();
  for (const ans of attempt.answers || []) {
    studentAnswersMap.set(ans.questionId, ans.answer);
  }

  let totalObtainedMarks = 0;
  let hasPendingWritten = false;
  let hasEvaluatedQuestions = false;

  const evaluations = [];

  for (const q of exam.questions) {
    const studentAns = studentAnswersMap.get(q.id);

    if (q.type === 'mcq') {
      // Automatic MCQ grading
      const isCorrect = Boolean(
        studentAns !== undefined &&
        studentAns !== null &&
        String(studentAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
      );

      const marksAwarded = isCorrect ? q.marks : 0;
      totalObtainedMarks += marksAwarded;
      hasEvaluatedQuestions = true;

      evaluations.push({
        questionId: q.id,
        marksAwarded,
        maxMarks: q.marks,
        isCorrect,
        evaluatorFeedback: isCorrect ? 'Correct answer' : 'Incorrect choice',
        evaluatedAt: new Date(),
        evaluatorType: 'auto',
      });
    } else {
      // Written question: check if previously manually graded
      const existingEval = attempt.questionEvaluations?.find((e) => e.questionId === q.id);

      if (existingEval && existingEval.evaluatorType === 'manual') {
        totalObtainedMarks += existingEval.marksAwarded;
        evaluations.push(existingEval);
        hasEvaluatedQuestions = true;
      } else {
        hasPendingWritten = true;
        evaluations.push({
          questionId: q.id,
          marksAwarded: 0,
          maxMarks: q.marks,
          isCorrect: null,
          evaluatorFeedback: '',
          evaluatedAt: null,
          evaluatorType: 'manual', // pending
        });
      }
    }
  }

  const totalMarks = exam.totalMarks || 1;
  const percentage = Math.round((totalObtainedMarks / totalMarks) * 10000) / 100;

  attempt.questionEvaluations = evaluations;
  attempt.totalMarks = totalMarks;
  attempt.obtainedMarks = Math.round(totalObtainedMarks * 100) / 100;
  attempt.percentage = percentage;

  if (!hasPendingWritten) {
    attempt.evaluationStatus = 'fully_evaluated';
    if (attempt.status !== 'in_progress') {
      attempt.status = 'evaluated';
    }
  } else if (hasEvaluatedQuestions) {
    attempt.evaluationStatus = 'partially_evaluated';
  } else {
    attempt.evaluationStatus = 'pending';
  }

  await attempt.save();
  return attempt;
}

/**
 * Grades a specific written answer manually by an administrator.
 */
export async function gradeWrittenQuestion(attemptId, questionId, marksAwarded, feedback = '', admin) {
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

  const exam = await Examination.findById(attempt.examinationId);
  if (!exam) {
    const err = new Error('Examination not found');
    err.statusCode = 404;
    throw err;
  }

  const question = exam.questions.find((q) => q.id === questionId);
  if (!question) {
    const err = new Error(`Question ${questionId} not found in examination`);
    err.statusCode = 404;
    throw err;
  }

  if (marksAwarded < 0 || marksAwarded > question.marks) {
    const err = new Error(`Marks awarded must be between 0 and ${question.marks}`);
    err.statusCode = 400;
    throw err;
  }

  // Update or insert question evaluation
  const evalIndex = attempt.questionEvaluations.findIndex((e) => e.questionId === questionId);
  const evaluationObj = {
    questionId,
    marksAwarded: Number(marksAwarded),
    maxMarks: question.marks,
    isCorrect: marksAwarded === question.marks ? true : marksAwarded > 0 ? null : false,
    evaluatorFeedback: feedback?.trim() || '',
    evaluatedAt: new Date(),
    evaluatorType: 'manual',
  };

  if (evalIndex >= 0) {
    attempt.questionEvaluations[evalIndex] = evaluationObj;
  } else {
    attempt.questionEvaluations.push(evaluationObj);
  }

  // Recalculate totals
  let totalObtained = 0;
  let allGraded = true;

  for (const q of exam.questions) {
    const qEval = attempt.questionEvaluations.find((e) => e.questionId === q.id);
    if (!qEval || (q.type !== 'mcq' && !qEval.evaluatedAt)) {
      allGraded = false;
    }
    if (qEval) {
      totalObtained += Number(qEval.marksAwarded) || 0;
    }
  }

  const totalMarks = exam.totalMarks || 1;
  attempt.obtainedMarks = Math.round(totalObtained * 100) / 100;
  attempt.percentage = Math.round((attempt.obtainedMarks / totalMarks) * 10000) / 100;
  attempt.evaluationStatus = allGraded ? 'fully_evaluated' : 'partially_evaluated';
  if (allGraded && ['submitted', 'auto_submitted'].includes(attempt.status)) {
    attempt.status = 'evaluated';
  }

  await attempt.save();

  // Audit log
  if (admin) {
    await AuditLog.create({
      action: 'ATTEMPT_EVALUATED',
      actor: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      targetType: 'Attempt',
      targetId: attempt._id.toString(),
      details: {
        questionId,
        marksAwarded,
        maxMarks: question.marks,
        studentEmail: attempt.studentEmail,
        newTotal: attempt.obtainedMarks,
      },
    });
  }

  return attempt;
}

/**
 * Future Extension Hook for AI evaluation
 * Can be plugged in seamlessly without changing attempt models or APIs
 */
export async function registerAiEvaluationProvider(providerConfig) {
  // Plug-and-play hook for Gemini or custom LLM evaluation provider
  return { registered: true, provider: providerConfig?.name || 'mock-provider' };
}

