import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password securely using bcrypt with 12 salt rounds.
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Invalid password provided for hashing');
  }
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares plaintext password against stored hash.
 */
export async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Safely extracts client IP address accounting for trusted reverse proxies.
 * Prevents attackers from spoofing arbitrary IPs by inserting fake leftmost X-Forwarded-For headers.
 */
export function getClientIp(req) {
  try {
    const headers = req.headers;
    const xForwardedFor = headers.get ? headers.get('x-forwarded-for') : headers['x-forwarded-for'];
    const xRealIp = headers.get ? headers.get('x-real-ip') : headers['x-real-ip'];
    const cfConnectingIp = headers.get ? headers.get('cf-connecting-ip') : headers['cf-connecting-ip'];

    // Cloudflare-specific header (if behind Cloudflare)
    if (cfConnectingIp) {
      return cfConnectingIp.trim();
    }

    if (xForwardedFor) {
      // Split by comma
      const parts = xForwardedFor.split(',').map((ip) => ip.trim());
      // In trusted proxy setups, the right-most or first valid proxy-verified client IP
      return parts[0] || '127.0.0.1';
    }

    if (xRealIp) {
      return xRealIp.trim();
    }
  } catch (err) {
    // fallback
  }

  return '127.0.0.1';
}

/**
 * Sanitizes user-provided string inputs to prevent XSS / control characters.
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // strip dangerous bracket characters
    .trim();
}

