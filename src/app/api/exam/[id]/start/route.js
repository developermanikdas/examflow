import { NextResponse } from 'next/server';
import { startAttempt } from '@/services/attempt-service';
import { getClientIp } from '@/lib/security';

export async function POST(req, { params }) {
  try {
    const { id: examPublicId } = params;
    const body = await req.json().catch(() => ({}));
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required to begin the examination' },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';

    const attemptSession = await startAttempt(examPublicId, {
      name,
      email,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      ...attemptSession,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to start examination session' },
      { status: error.statusCode || 500 }
    );
  }
}

