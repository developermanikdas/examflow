import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { getExaminationById } from '@/services/examination-service';

export async function GET(req, { params }) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { id } = params;
    const exam = await getExaminationById(id, { includeRaw: true });

    if (!exam) {
      return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
    }

    const payload = exam.rawJson || {
      schemaVersion: exam.schemaVersion,
      title: exam.title,
      description: exam.description,
      subject: exam.subject,
      totalMarks: exam.totalMarks,
      questions: exam.questions,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${exam.publicId}-question-paper.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to download question paper' },
      { status: error.statusCode || 500 }
    );
  }
}

