import { NextResponse } from 'next/server';
import { updateStudentActivity } from '@/services/attempt-service';

export async function POST(req, { params }) {
  try {
    const { attemptId } = params;
    const body = await req.json().catch(() => ({}));
    const { email, currentQuestionIndex } = body;

    const result = await updateStudentActivity(attemptId, email, {
      currentQuestionIndex,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update activity' },
      { status: 500 }
    );
  }
}

