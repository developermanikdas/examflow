import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { publishExamination } from '@/services/examination-service';

export async function POST(req, { params }) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { id } = params;
    const exam = await publishExamination(id, session.admin);

    return NextResponse.json({
      success: true,
      message: 'Examination published successfully',
      examination: {
        publicId: exam.publicId,
        status: exam.status,
        publishedAt: exam.publishedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to publish examination' },
      { status: error.statusCode || 500 }
    );
  }
}

