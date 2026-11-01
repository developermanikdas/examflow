import { NextResponse } from 'next/server';
import Admin from '@/models/Admin';
import AuditLog from '@/models/AuditLog';
import { connectToDatabase } from '@/lib/mongodb';
import { comparePassword, getClientIp, hashPassword } from '@/lib/security';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rate-limit';
import { AdminLoginSchema } from '@/lib/validation';

export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';

    // 1. IP-Based Rate Limiting Check
    const rateStatus = await checkRateLimit(ip);
    if (rateStatus.blocked) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Access temporarily locked for ${rateStatus.remainingMinutes} minute(s).`,
          lockout: true,
          remainingMinutes: rateStatus.remainingMinutes,
        },
        { status: 429 }
      );
    }

    // 2. Validate input
    const body = await req.json().catch(() => ({}));
    const parseResult = AdminLoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid credentials format provided.' },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    await connectToDatabase();

    // Auto-bootstrap initial admin if database is completely fresh and env credentials are configured
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const initEmail = process.env.INITIAL_ADMIN_EMAIL;
      const initPass = process.env.INITIAL_ADMIN_PASSWORD;
      const initName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

      if (initEmail && initPass && email.toLowerCase() === initEmail.toLowerCase()) {
        const passHash = await hashPassword(initPass);
        await Admin.create({
          email: initEmail.toLowerCase(),
          passwordHash: passHash,
          name: initName,
          role: 'superadmin',
        });
      }
    }

    // Find admin by email (with passwordHash explicitly selected)
    const admin = await Admin.findOne({ email }).select('+passwordHash');

    let isValid = false;
    if (admin) {
      isValid = await comparePassword(password, admin.passwordHash);
    }

    if (!isValid) {
      // Record failed attempt in atomic rate-limiting store
      const failResult = await recordFailedAttempt(ip);

      // Record audit log for security monitoring
      await AuditLog.create({
        action: 'ADMIN_LOGIN_FAILED',
        actor: { email, role: 'unknown' },
        targetType: 'Auth',
        details: {
          ip,
          attemptsCount: failResult.currentCount,
          blocked: failResult.blocked,
        },
        ipAddress: ip,
        userAgent,
      });

      if (failResult.blocked) {
        return NextResponse.json(
          {
            error: `Maximum login attempts exceeded. Your IP has been temporarily locked for ${failResult.lockoutMinutes} minutes.`,
            lockout: true,
            remainingMinutes: failResult.lockoutMinutes,
          },
          { status: 429 }
        );
      }

      // Generic error message: do not reveal whether email or password was wrong
      return NextResponse.json(
        {
          error: 'Invalid email or password combination.',
          attemptsRemaining: failResult.attemptsRemaining,
        },
        { status: 401 }
      );
    }

    // 3. Login Successful: Reset rate limit counter for this IP
    await resetRateLimit(ip);

    // Update last login metadata
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = ip;
    await admin.save();

    // Generate JWT and set secure HTTP-only cookie
    const token = generateToken({
      adminId: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    setAuthCookie(token);

    // Audit log
    await AuditLog.create({
      action: 'ADMIN_LOGIN_SUCCESS',
      actor: { id: admin._id.toString(), email: admin.email, name: admin.name, role: admin.role },
      targetType: 'Auth',
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id.toString(),
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.', details: error.message },
      { status: 500 }
    );
  }
}

