import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import SystemSetting from '@/models/SystemSetting';
import Admin from '@/models/Admin';
import AuditLog from '@/models/AuditLog';
import { connectToDatabase } from '@/lib/mongodb';
import { comparePassword, hashPassword } from '@/lib/security';

export async function GET(req) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    await connectToDatabase();

    let settings = await SystemSetting.findOne({ key: 'global_config' }).lean();
    if (!settings) {
      settings = await SystemSetting.create({
        key: 'global_config',
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        defaultTimePerType: settings.defaultTimePerType,
        defaultAttemptLimit: settings.defaultAttemptLimit,
        adminMaxLoginAttempts: settings.adminMaxLoginAttempts,
        adminLockoutMinutes: settings.adminLockoutMinutes,
        pinPolicy: settings.pinPolicy,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const body = await req.json().catch(() => ({}));
    await connectToDatabase();

    // 1. Password change handling
    if (body.passwordChange) {
      const { currentPassword, newPassword } = body.passwordChange;
      if (!currentPassword || !newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long.' },
          { status: 400 }
        );
      }

      const admin = await Admin.findById(session.admin.id).select('+passwordHash');
      const isMatch = await comparePassword(currentPassword, admin.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: 'Current password does not match.' },
          { status: 400 }
        );
      }

      admin.passwordHash = await hashPassword(newPassword);
      await admin.save();

      await AuditLog.create({
        action: 'ADMIN_PASSWORD_CHANGED',
        actor: session.admin,
        targetType: 'Admin',
        targetId: admin._id.toString(),
      });
    }

    // 2. System settings handling
    let settings = await SystemSetting.findOne({ key: 'global_config' });
    if (!settings) {
      settings = new SystemSetting({ key: 'global_config' });
    }

    if (body.defaultTimePerType) {
      settings.defaultTimePerType = {
        mcq: Math.max(1, Number(body.defaultTimePerType.mcq) || 2),
        short_answer: Math.max(1, Number(body.defaultTimePerType.short_answer) || 4),
        descriptive: Math.max(1, Number(body.defaultTimePerType.descriptive) || 15),
        long_answer: Math.max(1, Number(body.defaultTimePerType.long_answer) || 30),
      };
    }

    if (body.defaultAttemptLimit) {
      settings.defaultAttemptLimit = Math.max(1, parseInt(body.defaultAttemptLimit, 10));
    }

    if (body.adminMaxLoginAttempts) {
      settings.adminMaxLoginAttempts = Math.max(1, parseInt(body.adminMaxLoginAttempts, 10));
    }

    if (body.adminLockoutMinutes) {
      settings.adminLockoutMinutes = Math.max(1, parseInt(body.adminLockoutMinutes, 10));
    }

    settings.updatedBy = session.admin.id;
    await settings.save();

    await AuditLog.create({
      action: 'SETTINGS_UPDATED',
      actor: session.admin,
      targetType: 'SystemSetting',
      details: body,
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}

