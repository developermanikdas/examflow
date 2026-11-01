import { NextResponse } from 'next/server';
import { submitAttempt } from '@/services/submission-service';

export async function POST(req, { params }) {
  try {
    const { attemptId } = params;
    const body = await req.json().catch(() => ({}));
    const { email, isAutoSubmit } = body;

    const result = await submitAttempt(attemptId, email, { isAutoSubmit: Boolean(isAutoSubmit) });

    return NextResponse.json({
      success: true,
      alreadySubmitted: result.alreadySubmitted,
      totalMarks: result.attempt.totalMarks,
      obtainedMarks: result.attempt.obtainedMarks,
      percentage: result.attempt.percentage,
      evaluationStatus: result.attempt.evaluationStatus,
      status: result.attempt.status,
      submittedAt: result.attempt.submittedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit examination' },
      { status: error.statusCode || 500 }
    );
  }
}

