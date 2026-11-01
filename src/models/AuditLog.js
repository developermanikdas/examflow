import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      id: { type: String },
      email: { type: String },
      name: { type: String },
      role: { type: String },
    },
    targetType: {
      type: String,
      enum: ['Admin', 'Examination', 'Attempt', 'SystemSetting', 'Auth'],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

