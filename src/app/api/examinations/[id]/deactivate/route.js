import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { deactivateExamination } from '@/services/examination-service';

export async function POST(req, { params }) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { id } = params;
    const exam = await deactivateExamination(id, session.admin);

    return NextResponse.json({
      success: true,
      message: 'Examination deactivated successfully',
      examination: {
        publicId: exam.publicId,
        status: exam.status,
        deactivatedAt: exam.deactivatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate examination' },
      { status: error.statusCode || 500 }
    );
  }
}

