import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['mcq', 'short_answer', 'descriptive', 'long_answer'],
    },
    marks: { type: Number, required: true, min: 0 },
    question: { type: String, required: true },
    options: [OptionSchema], // for MCQ
    correctAnswer: { type: String }, // For MCQ: option id
    expectedAnswer: { type: String, default: '' }, // For written answers guide
  },
  { _id: false }
);

const ExaminationSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    subject: {
      type: String,
      default: 'General',
    },
    schemaVersion: {
      type: String,
      default: '1.0',
    },
    pin: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'deactivated'],
      default: 'draft',
      index: true,
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    durationSeconds: {
      type: Number,
      required: true,
    },
    maxAttempts: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    questions: [QuestionSchema],
    rawJson: {
      type: Object, // Store original uploaded JSON securely
      select: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    publishedAt: {
      type: Date,
    },
    deactivatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Method to project safe student-facing questions (strips correctAnswer and expectedAnswer)
ExaminationSchema.methods.toStudentView = function () {
  const exam = this.toObject();
  delete exam.rawJson;
  delete exam.pin; // Do not leak PIN back to student in exam payload

  exam.questions = (exam.questions || []).map((q) => {
    const safeQ = {
      id: q.id,
      type: q.type,
      marks: q.marks,
      question: q.question,
    };
    if (q.type === 'mcq' && Array.isArray(q.options)) {
      safeQ.options = q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
      }));
    }
    return safeQ;
  });

  return exam;
};

export default mongoose.models.Examination || mongoose.model('Examination', ExaminationSchema);

