import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { createExamination, getExaminations } from '@/services/examination-service';

export async function POST(req) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    // Support both direct question paper upload and wrapper { questionPaper, overrides }
    const questionPaper = body.questions ? body : body.questionPaper;
    const overrides = body.overrides || {};

    if (!questionPaper || !Array.isArray(questionPaper.questions)) {
      return NextResponse.json(
        { error: 'Invalid examination format: root must contain questions array' },
        { status: 400 }
      );
    }

    const examination = await createExamination(session.admin, questionPaper, overrides);

    return NextResponse.json(
      {
        success: true,
        message: 'Examination created successfully',
        examination: {
          id: examination._id,
          publicId: examination.publicId,
          title: examination.title,
          status: examination.status,
          totalMarks: examination.totalMarks,
          durationMinutes: examination.durationMinutes,
          questionCount: examination.questions.length,
          pin: examination.pin,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to create examination',
        details: error.details,
      },
      { status: error.statusCode || 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const attemptFilter = searchParams.get('attemptFilter') || 'all';
    const student = searchParams.get('student') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await getExaminations({
      status,
      search,
      attemptFilter,
      studentEmail: student,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch examinations' },
      { status: error.statusCode || 500 }
    );
  }
}

