import { z } from 'zod';

// Default question time allocations in minutes
export const DEFAULT_QUESTION_TIME_MINUTES = {
  mcq: 2,
  short_answer: 4,
  descriptive: 15,
  long_answer: 30,
};

/**
 * Single MCQ Option Schema
 */
const OptionSchema = z.object({
  id: z.string().min(1, 'Option ID is required'),
  text: z.string().min(1, 'Option text cannot be empty'),
});

/**
 * Question Schema with conditional MCQ validation
 */
const QuestionSchema = z
  .object({
    id: z.string().min(1, 'Question ID is required'),
    type: z.enum(['mcq', 'short_answer', 'descriptive', 'long_answer'], {
      errorMap: () => ({ message: "Type must be 'mcq', 'short_answer', 'descriptive', or 'long_answer'" }),
    }),
    marks: z.number().min(0.5, 'Marks must be at least 0.5'),
    question: z.string().min(3, 'Question text must be at least 3 characters'),
    options: z.array(OptionSchema).optional(),
    correctAnswer: z.string().optional(),
    expectedAnswer: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'mcq') {
      if (!Array.isArray(data.options) || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Multiple choice questions must have at least 2 options',
          path: ['options'],
        });
        return;
      }

      // Check unique option IDs
      const optIds = new Set();
      for (const opt of data.options) {
        if (optIds.has(opt.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate option ID '${opt.id}' in question '${data.id}'`,
            path: ['options'],
          });
        }
        optIds.add(opt.id);
      }

      // Validate correctAnswer exists in options
      if (!data.correctAnswer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MCQ questions require a correctAnswer',
          path: ['correctAnswer'],
        });
      } else if (!optIds.has(data.correctAnswer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correctAnswer '${data.correctAnswer}' does not match any option ID (${Array.from(optIds).join(', ')})`,
          path: ['correctAnswer'],
        });
      }
    }
  });

/**
 * Full Question Paper JSON Schema
 */
export const QuestionPaperSchema = z
  .object({
    schemaVersion: z.string().default('1.0'),
    title: z.string().min(3, 'Examination title must be at least 3 characters').max(500, 'Title cannot exceed 500 characters'),
    description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional().default(''),
    subject: z.string().max(500, 'Subject cannot exceed 500 characters').optional().default('General'),
    totalMarks: z.number().optional(), // We calculate authoritatively
    questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
  })
  .superRefine((data, ctx) => {
    // Check unique question IDs
    const seenIds = new Set();
    data.questions.forEach((q, index) => {
      if (seenIds.has(q.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate question ID '${q.id}' at index ${index}`,
          path: ['questions', index, 'id'],
        });
      }
      seenIds.add(q.id);
    });
  });

/**
 * Calculates authoritative total marks and suggested duration based on questions.
 */
export function calculateExamMetrics(questions, customTimeAllocations = {}) {
  const times = { ...DEFAULT_QUESTION_TIME_MINUTES, ...customTimeAllocations };

  let totalMarks = 0;
  let totalDurationMinutes = 0;
  const typeCounts = {
    mcq: 0,
    short_answer: 0,
    descriptive: 0,
    long_answer: 0,
  };

  for (const q of questions) {
    totalMarks += Number(q.marks) || 0;
    const qType = q.type;
    if (typeCounts[qType] !== undefined) {
      typeCounts[qType] += 1;
      totalDurationMinutes += times[qType] || 2;
    } else {
      totalDurationMinutes += 2;
    }
  }

  // Round marks to max 2 decimals
  totalMarks = Math.round(totalMarks * 100) / 100;

  return {
    totalMarks,
    durationMinutes: Math.max(1, totalDurationMinutes),
    durationSeconds: Math.max(60, totalDurationMinutes * 60),
    typeCounts,
  };
}

/**
 * Admin Login Validation
 */
export const AdminLoginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Student Verification Schema
 */
export const StudentVerifySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  pin: z.string().min(1, 'Examination PIN is required').trim(),
});

/**
 * Answer Autosave Schema
 */
export const AnswerSaveSchema = z.object({
  questionId: z.string().min(1),
  answer: z.any(),
});

/**
 * Manual Question Evaluation Schema
 */
export const GradeQuestionSchema = z.object({
  questionId: z.string().min(1),
  marksAwarded: z.number().min(0, 'Marks awarded cannot be negative'),
  evaluatorFeedback: z.string().max(2000).optional().default(''),
});

