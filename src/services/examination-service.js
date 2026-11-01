import crypto from 'crypto';
import mongoose from 'mongoose';
import Examination from '@/models/Examination';
import AuditLog from '@/models/AuditLog';
import Attempt from '@/models/Attempt';
import SystemSetting from '@/models/SystemSetting';
import { connectToDatabase } from '@/lib/mongodb';
import { QuestionPaperSchema, calculateExamMetrics } from '@/lib/validation';

/**
 * Builds a safe MongoDB query for examination lookup (supports publicId and ObjectId)
 */
function buildExamQuery(id) {
  if (!id || typeof id !== 'string') return { _id: null };
  if (id.startsWith('ex-')) return { publicId: id };
  if (mongoose.isValidObjectId(id)) return { _id: id };
  return { publicId: id };
}

/**
 * Generates a clean URL-friendly unique public ID (e.g. ex-7a3b9f)
 */
function generatePublicId() {
  return `ex-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Generates a default 6-character examination PIN
 */
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Upload and create a new examination from a JSON question paper
 */
export async function createExamination(admin, jsonPayload, customOverrides = {}) {
  await connectToDatabase();

  // Merge overrides into question paper before schema validation
  const paperToValidate = {
    ...jsonPayload,
    ...(customOverrides.title ? { title: customOverrides.title.trim() } : {}),
    ...(customOverrides.description !== undefined ? { description: customOverrides.description.trim() } : {}),
    ...(customOverrides.subject ? { subject: customOverrides.subject.trim() } : {}),
  };

  // 1. Validate payload against Zod schema
  const parsed = QuestionPaperSchema.safeParse(paperToValidate);
  if (!parsed.success) {
    const issues = parsed.error.issues || parsed.error.errors || [];
    const errorDetails = issues.map((e) => ({
      path: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
      message: e.message,
    }));
    const err = new Error(
      errorDetails.length > 0
        ? `Invalid examination JSON schema: ${errorDetails[0].message} (at ${errorDetails[0].path})`
        : 'Invalid examination JSON schema'
    );
    err.details = errorDetails;
    err.statusCode = 400;
    throw err;
  }

  const data = parsed.data;

  // 2. Fetch custom time settings from SystemSetting if available
  const settings = await SystemSetting.findOne({ key: 'global_config' }).lean();
  const timeAllocations = settings?.defaultTimePerType || {};

  // 3. Authoritatively calculate total marks and default duration
  const metrics = calculateExamMetrics(data.questions, timeAllocations);

  const durationMinutes = customOverrides.durationMinutes
    ? Math.max(1, parseInt(customOverrides.durationMinutes, 10))
    : metrics.durationMinutes;

  const publicId = generatePublicId();
  const pin = customOverrides.pin?.trim() || generatePin();
  const maxAttempts = customOverrides.maxAttempts
    ? Math.max(1, parseInt(customOverrides.maxAttempts, 10))
    : settings?.defaultAttemptLimit || 1;

  const exam = new Examination({
    publicId,
    title: customOverrides.title?.trim() || data.title,
    description: customOverrides.description?.trim() ?? data.description,
    subject: customOverrides.subject?.trim() || data.subject,
    schemaVersion: data.schemaVersion || '1.0',
    pin,
    status: 'draft',
    totalMarks: metrics.totalMarks,
    durationMinutes,
    durationSeconds: durationMinutes * 60,
    maxAttempts,
    questions: data.questions,
    rawJson: jsonPayload,
    createdBy: admin.id,
  });

  await exam.save();

  // Audit log
  await AuditLog.create({
    action: 'EXAM_CREATED',
    actor: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    targetType: 'Examination',
    targetId: exam.publicId,
    details: {
      title: exam.title,
      totalQuestions: data.questions.length,
      totalMarks: metrics.totalMarks,
      durationMinutes,
    },
  });

  return exam;
}

/**
 * Retrieve examinations list with attempt metrics
 */
export async function getExaminations({ status, search, page = 1, limit = 20 } = {}) {
  await connectToDatabase();

  const query = {};
  if (status && ['draft', 'published', 'deactivated'].includes(status)) {
    query.status = status;
  }
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ title: regex }, { subject: regex }, { publicId: regex }];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [exams, totalCount] = await Promise.all([
    Examination.find(query)
      .select('-rawJson')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Examination.countDocuments(query),
  ]);

  // Aggregate attempt statistics for these exams
  const examIds = exams.map((e) => e._id);
  const attemptStats = await Attempt.aggregate([
    { $match: { examinationId: { $in: examIds } } },
    {
      $group: {
        _id: '$examinationId',
        totalAttempts: { $sum: 1 },
        completedAttempts: {
          $sum: { $cond: [{ $in: ['$status', ['submitted', 'auto_submitted', 'evaluated']] }, 1, 0] },
        },
      },
    },
  ]);

  const statsMap = new Map();
  for (const s of attemptStats) {
    statsMap.set(s._id.toString(), s);
  }

  const enrichedExams = exams.map((exam) => {
    const st = statsMap.get(exam._id.toString()) || { totalAttempts: 0, completedAttempts: 0 };
    return {
      ...exam,
      attemptCount: st.totalAttempts,
      completedAttemptCount: st.completedAttempts,
      questionCount: exam.questions?.length || 0,
    };
  });

  return {
    examinations: enrichedExams,
    pagination: {
      page: Math.max(1, page),
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    },
  };
}

/**
 * Get single examination by publicId or ObjectId
 */
export async function getExaminationById(id, { includeRaw = false } = {}) {
  await connectToDatabase();

  const query = buildExamQuery(id);
  let q = Examination.findOne(query);
  if (includeRaw) {
    q = q.select('+rawJson');
  }
  return await q.lean();
}

/**
 * Update examination properties (duration, PIN, title, maxAttempts, etc.)
 */
export async function updateExamination(id, updates, admin) {
  await connectToDatabase();

  const exam = await Examination.findOne(buildExamQuery(id));
  if (!exam) {
    const err = new Error('Examination not found');
    err.statusCode = 404;
    throw err;
  }

  if (updates.title) exam.title = updates.title.trim();
  if (updates.description !== undefined) exam.description = updates.description.trim();
  if (updates.subject) exam.subject = updates.subject.trim();
  if (updates.pin) exam.pin = updates.pin.trim();
  if (updates.maxAttempts) exam.maxAttempts = Math.max(1, parseInt(updates.maxAttempts, 10));

  if (updates.durationMinutes) {
    const mins = Math.max(1, parseInt(updates.durationMinutes, 10));
    exam.durationMinutes = mins;
    exam.durationSeconds = mins * 60;
  }

  await exam.save();

  await AuditLog.create({
    action: 'EXAM_UPDATED',
    actor: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    targetType: 'Examination',
    targetId: exam.publicId,
    details: updates,
  });

  return exam;
}

/**
 * Publish examination
 */
export async function publishExamination(id, admin) {
  await connectToDatabase();

  const exam = await Examination.findOne(buildExamQuery(id));
  if (!exam) {
    const err = new Error('Examination not found');
    err.statusCode = 404;
    throw err;
  }

  if (!exam.questions || exam.questions.length === 0) {
    const err = new Error('Cannot publish an examination with no questions');
    err.statusCode = 400;
    throw err;
  }

  exam.status = 'published';
  exam.publishedAt = new Date();
  await exam.save();

  await AuditLog.create({
    action: 'EXAM_PUBLISHED',
    actor: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    targetType: 'Examination',
    targetId: exam.publicId,
  });

  return exam;
}

/**
 * Deactivate examination
 */
export async function deactivateExamination(id, admin) {
  await connectToDatabase();

  const exam = await Examination.findOne(buildExamQuery(id));
  if (!exam) {
    const err = new Error('Examination not found');
    err.statusCode = 404;
    throw err;
  }

  exam.status = 'deactivated';
  exam.deactivatedAt = new Date();
  await exam.save();

  await AuditLog.create({
    action: 'EXAM_DEACTIVATED',
    actor: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    targetType: 'Examination',
    targetId: exam.publicId,
  });

  return exam;
}

/**
 * Delete examination
 */
export async function deleteExamination(id, admin) {
  await connectToDatabase();

  const exam = await Examination.findOne(buildExamQuery(id));
  if (!exam) {
    const err = new Error('Examination not found');
    err.statusCode = 404;
    throw err;
  }

  // Delete associated attempts and exam
  await Promise.all([
    Attempt.deleteMany({ examinationId: exam._id }),
    Examination.deleteOne({ _id: exam._id }),
  ]);

  await AuditLog.create({
    action: 'EXAM_DELETED',
    actor: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    targetType: 'Examination',
    targetId: exam.publicId,
    details: { title: exam.title },
  });

  return { success: true, deletedPublicId: exam.publicId };
}
