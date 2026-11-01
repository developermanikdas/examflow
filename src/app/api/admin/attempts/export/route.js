import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { exportAttemptData, exportAllExamAttempts } from '@/services/admin-attempt-service';

export async function GET(req) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get('attemptId');
    const examPublicId = searchParams.get('examPublicId') || searchParams.get('examId');

    if (attemptId) {
      const data = await exportAttemptData(attemptId);
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="attempt-${attemptId}.json"`,
        },
      });
    }

    if (examPublicId) {
      const data = await exportAllExamAttempts(examPublicId);
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${examPublicId}-all-attempts.json"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Specify either ?attemptId=... or ?examPublicId=... for export' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: error.statusCode || 500 }
    );
  }
}

