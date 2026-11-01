import { NextResponse } from 'next/server';
import { clearAuthCookie, requireAdminSession } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';
import { getClientIp } from '@/lib/security';

export async function POST(req) {
  try {
    const session = await requireAdminSession(req);
    const ip = getClientIp(req);

    if (session.authenticated) {
      await AuditLog.create({
        action: 'ADMIN_LOGOUT',
        actor: session.admin,
        targetType: 'Auth',
        ipAddress: ip,
      });
    }

    clearAuthCookie();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    clearAuthCookie();
    return NextResponse.json({ success: true });
  }
}

