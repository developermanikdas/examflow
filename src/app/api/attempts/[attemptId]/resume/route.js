import { NextResponse } from 'next/server';
import { resumeAttempt } from '@/services/attempt-service';

export async function POST(req, { params }) {
  try {
    const { attemptId } = params;
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    const result = await resumeAttempt(attemptId, email);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to resume attempt' },
      { status: error.statusCode || 500 }
    );
  }
}

