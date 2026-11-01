import mongoose from 'mongoose';

const SystemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_config',
    },
    defaultTimePerType: {
      mcq: { type: Number, default: 2 }, // minutes
      short_answer: { type: Number, default: 4 },
      descriptive: { type: Number, default: 15 },
      long_answer: { type: Number, default: 30 },
    },
    defaultAttemptLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    adminMaxLoginAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },
    adminLockoutMinutes: {
      type: Number,
      default: 30,
      min: 1,
    },
    pinPolicy: {
      minLength: { type: Number, default: 4 },
      requireNumeric: { type: Boolean, default: false },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema);

