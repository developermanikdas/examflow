import RateLimit from '@/models/RateLimit';
import { connectToDatabase } from './mongodb';

const DEFAULT_MAX_ATTEMPTS = parseInt(process.env.ADMIN_MAX_LOGIN_ATTEMPTS || '5', 10);
const DEFAULT_LOCKOUT_MINUTES = parseInt(process.env.ADMIN_LOCKOUT_MINUTES || '30', 10);

/**
 * Checks if an IP is currently blocked due to excessive failed attempts.
 */
export async function checkRateLimit(ip, options = {}) {
  await connectToDatabase();
  const key = `auth_fail:${ip}`;

  const record = await RateLimit.findOne({ key });
  if (!record) {
    return { blocked: false, count: 0 };
  }

  const now = new Date();

  // If blocked and lockout period hasn't elapsed
  if (record.blockedUntil && record.blockedUntil > now) {
    const remainingMs = record.blockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    return {
      blocked: true,
      remainingMinutes,
      blockedUntil: record.blockedUntil,
    };
  }

  // If lockout period elapsed, reset atomically
  if (record.blockedUntil && record.blockedUntil <= now) {
    await RateLimit.deleteOne({ key });
    return { blocked: false, count: 0 };
  }

  return {
    blocked: false,
    count: record.count,
  };
}

/**
 * Records a failed login attempt for the given IP address using atomic MongoDB operations.
 */
export async function recordFailedAttempt(ip, config = {}) {
  await connectToDatabase();
  const maxAttempts = config.maxAttempts || DEFAULT_MAX_ATTEMPTS;
  const lockoutMinutes = config.lockoutMinutes || DEFAULT_LOCKOUT_MINUTES;
  const key = `auth_fail:${ip}`;

  const now = new Date();

  // Atomically increment attempt count
  const updated = await RateLimit.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { firstAttemptAt: now },
    },
    { upsert: true, new: true }
  );

  // If threshold reached, block IP for the lockout duration
  if (updated.count >= maxAttempts && !updated.blockedUntil) {
    const blockedUntil = new Date(now.getTime() + lockoutMinutes * 60 * 1000);
    updated.blockedUntil = blockedUntil;
    await updated.save();

    return {
      blocked: true,
      lockoutMinutes,
      blockedUntil,
      currentCount: updated.count,
    };
  }

  return {
    blocked: Boolean(updated.blockedUntil && updated.blockedUntil > now),
    currentCount: updated.count,
    attemptsRemaining: Math.max(0, maxAttempts - updated.count),
  };
}

/**
 * Resets the rate limit counter for an IP after a successful login.
 */
export async function resetRateLimit(ip) {
  await connectToDatabase();
  const key = `auth_fail:${ip}`;
  await RateLimit.deleteOne({ key });
}

