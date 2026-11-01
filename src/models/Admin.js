import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Security: never return password by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Administrator',
    },
    role: {
      type: String,
      enum: ['admin', 'superadmin'],
      default: 'admin',
    },
    lastLoginAt: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation of model in hot-reload
export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

