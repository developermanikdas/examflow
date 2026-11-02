import mongoose from 'mongoose';

const StudentAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    answer: { type: mongoose.Schema.Types.Mixed, default: '' }, // String for text/mcq option id
    savedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const QuestionEvaluationSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    marksAwarded: { type: Number, default: 0 },
    maxMarks: { type: Number, required: true },
    isCorrect: { type: Boolean, default: null }, // for MCQ
    evaluatorFeedback: { type: String, default: '' },
    evaluatedAt: { type: Date },
    evaluatorType: {
      type: String,
      enum: ['auto', 'manual', 'ai'],
      default: 'auto',
    },
  },
  { _id: false }
);

const AttemptSchema = new mongoose.Schema(
  {
    examinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: true,
      index: true,
    },
    examPublicId: {
      type: String,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'auto_submitted', 'evaluated'],
      default: 'in_progress',
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      required: true,
    },
    isPaused: {
      type: Boolean,
      default: false,
      index: true,
    },
    remainingSeconds: {
      type: Number,
      default: null,
    },
    pausedAt: {
      type: Date,
    },
    resumedAt: {
      type: Date,
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    answers: [StudentAnswerSchema],
    questionEvaluations: [QuestionEvaluationSchema],
    totalMarks: {
      type: Number,
      default: 0,
    },
    obtainedMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    evaluationStatus: {
      type: String,
      enum: ['pending', 'partially_evaluated', 'fully_evaluated'],
      default: 'pending',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for checking student attempt count per exam quickly
AttemptSchema.index({ examinationId: 1, studentEmail: 1, attemptNumber: 1 });
AttemptSchema.index({ examinationId: 1, status: 1 });

export default mongoose.models.Attempt || mongoose.model('Attempt', AttemptSchema);

