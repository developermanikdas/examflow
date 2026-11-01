import mongoose from 'mongoose';
import Attempt from '@/models/Attempt';
import Examination from '@/models/Examination';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * Retrieves paginated attempts with filtering for Admin Dashboard
 */
export async function getAdminAttempts({
  examinationId,
  examPublicId,
  search,
  status,
  evaluationStatus,
  page = 1,
  limit = 20,
} = {}) {
  await connectToDatabase();

  const query = {};

  if (examinationId) {
    query.examinationId = examinationId;
  }
  if (examPublicId) {
    query.examPublicId = examPublicId;
  }
  if (status && status !== 'all') {
    query.status = status;
  }
  if (evaluationStatus && evaluationStatus !== 'all') {
    query.evaluationStatus = evaluationStatus;
  }
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ studentName: regex }, { studentEmail: regex }, { examPublicId: regex }];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [attempts, totalCount] = await Promise.all([
    Attempt.find(query)
      .populate('examinationId', 'title subject totalMarks durationMinutes')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Attempt.countDocuments(query),
  ]);

  return {
    attempts,
    pagination: {
      page: Math.max(1, page),
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    },
  };
}

/**
 * Get detailed attempt by ID with questions for Admin grading & review
 */
export async function getAdminAttemptDetails(attemptId) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(attemptId)) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  const attempt = await Attempt.findById(attemptId)
    .populate('examinationId', 'title description subject totalMarks questions durationMinutes')
    .lean();

  if (!attempt) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  return attempt;
}

/**
 * Export attempt data as clean sanitized JSON for download
 */
export async function exportAttemptData(attemptId) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(attemptId)) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  const attempt = await Attempt.findById(attemptId)
    .populate('examinationId', 'title subject totalMarks durationMinutes questions')
    .lean();

  if (!attempt) {
    const err = new Error('Attempt not found');
    err.statusCode = 404;
    throw err;
  }

  const exam = attempt.examinationId;

  return {
    exportDate: new Date().toISOString(),
    examination: {
      publicId: attempt.examPublicId,
      title: exam?.title,
      subject: exam?.subject,
      totalMarks: exam?.totalMarks,
      durationMinutes: exam?.durationMinutes,
    },
    student: {
      name: attempt.studentName,
      email: attempt.studentEmail,
      attemptNumber: attempt.attemptNumber,
    },
    session: {
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
    },
    results: {
      totalMarks: attempt.totalMarks,
      obtainedMarks: attempt.obtainedMarks,
      percentage: attempt.percentage,
      evaluationStatus: attempt.evaluationStatus,
    },
    answers: attempt.answers || [],
    questionEvaluations: attempt.questionEvaluations || [],
  };
}

/**
 * Export all attempts for an examination
 */
export async function exportAllExamAttempts(examPublicIdOrId) {
  await connectToDatabase();

  const query =
    !examPublicIdOrId || typeof examPublicIdOrId !== 'string'
      ? { _id: null }
      : examPublicIdOrId.startsWith('ex-')
      ? { publicId: examPublicIdOrId }
      : mongoose.isValidObjectId(examPublicIdOrId)
      ? { _id: examPublicIdOrId }
      : { publicId: examPublicIdOrId };

  const exam = await Examination.findOne(query).lean();

  if (!exam) {
    const err = new Error('Examination not found');
    err.statusCode = 404;
    throw err;
  }

  const attempts = await Attempt.find({ examinationId: exam._id }).sort({ createdAt: -1 }).lean();

  return {
    exportDate: new Date().toISOString(),
    examination: {
      publicId: exam.publicId,
      title: exam.title,
      subject: exam.subject,
      totalMarks: exam.totalMarks,
      durationMinutes: exam.durationMinutes,
      status: exam.status,
    },
    summary: {
      totalAttempts: attempts.length,
      evaluatedAttempts: attempts.filter((a) => a.evaluationStatus === 'fully_evaluated').length,
      averagePercentage: attempts.length
        ? Math.round(
            (attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length) * 100
          ) / 100
        : 0,
    },
    attempts: attempts.map((a) => ({
      attemptId: a._id.toString(),
      studentName: a.studentName,
      studentEmail: a.studentEmail,
      attemptNumber: a.attemptNumber,
      status: a.status,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      totalMarks: a.totalMarks,
      obtainedMarks: a.obtainedMarks,
      percentage: a.percentage,
      evaluationStatus: a.evaluationStatus,
      answers: a.answers || [],
      evaluations: a.questionEvaluations || [],
    })),
  };
}

