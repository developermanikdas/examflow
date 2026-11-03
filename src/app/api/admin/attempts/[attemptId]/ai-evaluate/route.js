import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { evaluateAttemptWithAI } from '@/services/ai-evaluator-service';
import { getAdminAttemptDetails } from '@/services/admin-attempt-service';

export async function POST(req, { params }) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { attemptId } = params;
    const body = await req.json().catch(() => ({}));
    const force = Boolean(body.force);

    // Run AI Evaluation (which respects manual instructor scores unless force is requested)
    await evaluateAttemptWithAI(attemptId, { forceAiReevaluation: force });

    // Fetch the updated full attempt with questions populated
    const updatedAttempt = await getAdminAttemptDetails(attemptId);

    return NextResponse.json({
      success: true,
      message: 'AI Evaluation completed successfully',
      attempt: updatedAttempt,
    });
  } catch (error) {
    console.error('AI evaluation endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate attempt with AI' },
      { status: error.statusCode || 500 }
    );
  }
}

