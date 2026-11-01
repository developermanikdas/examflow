import mongoose from 'mongoose';

const RateLimitSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    firstAttemptAt: {
      type: Date,
      default: Date.now,
    },
    blockedUntil: {
      type: Date,
      default: null,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // Auto TTL after 24 hours
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);

