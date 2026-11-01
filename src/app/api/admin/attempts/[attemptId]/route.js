import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { getAdminAttemptDetails } from '@/services/admin-attempt-service';

export async function GET(req, { params }) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { attemptId } = params;
    const attempt = await getAdminAttemptDetails(attemptId);

    return NextResponse.json({
      success: true,
      attempt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attempt details' },
      { status: error.statusCode || 500 }
    );
  }
}

