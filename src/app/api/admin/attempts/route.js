import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { getAdminAttempts } from '@/services/admin-attempt-service';

export async function GET(req) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const examinationId = searchParams.get('examinationId') || undefined;
    const examPublicId = searchParams.get('examPublicId') || undefined;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const evaluationStatus = searchParams.get('evaluationStatus') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getAdminAttempts({
      examinationId,
      examPublicId,
      search,
      status,
      evaluationStatus,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attempts' },
      { status: error.statusCode || 500 }
    );
  }
}

