import { NextResponse } from 'next/server';
import { saveAnswers } from '@/services/attempt-service';

export async function PATCH(req, { params }) {
  try {
    const { attemptId } = params;
    const body = await req.json().catch(() => ({}));
    const { answers, email } = body;

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Invalid answers format: array of { questionId, answer } is expected' },
        { status: 400 }
      );
    }

    const result = await saveAnswers(attemptId, answers, email);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to save answers' },
      { status: error.statusCode || 500 }
    );
  }
}

