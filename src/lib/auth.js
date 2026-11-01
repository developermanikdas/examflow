import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import Admin from '@/models/Admin';
import { connectToDatabase } from './mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'examflow_default_secret_key_change_in_production';
export const AUTH_COOKIE_NAME = 'examflow_admin_session';

/**
 * Generates a signed JWT session token for an admin.
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'examflow-auth',
  });
}

/**
 * Verifies a JWT session token.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: 'examflow-auth' });
  } catch (error) {
    return null;
  }
}

/**
 * Sets secure HTTP-only cookie in response/cookies.
 */
export function setAuthCookie(token) {
  const cookieStore = cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = process.env.COOKIE_SECURE === 'true' || isProduction;

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clears the auth cookie.
 */
export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Server-side session verification for Next.js Route Handlers.
 * Returns { authenticated: true, admin } or { authenticated: false, error, status }
 */
export async function requireAdminSession(req) {
  await connectToDatabase();

  let token = null;

  // 1. Try reading from cookies
  const cookieStore = cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_NAME);
  if (cookie?.value) {
    token = cookie.value;
  }

  // 2. Try reading from Authorization: Bearer <token>
  if (!token && req) {
    const authHeader = req.headers.get ? req.headers.get('authorization') : req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return {
      authenticated: false,
      error: 'Authentication required. No session found.',
      status: 401,
    };
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.adminId) {
    return {
      authenticated: false,
      error: 'Invalid or expired session. Please log in again.',
      status: 401,
    };
  }

  const admin = await Admin.findById(decoded.adminId).lean();
  if (!admin) {
    return {
      authenticated: false,
      error: 'Admin account not found.',
      status: 401,
    };
  }

  return {
    authenticated: true,
    admin: {
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  };
}

