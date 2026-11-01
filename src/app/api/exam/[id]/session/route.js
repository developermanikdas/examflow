import { NextResponse } from 'next/server';
import { getAttemptSession } from '@/services/attempt-service';

export async function GET(req, { params }) {
  try {
    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get('attemptId');
    const email = searchParams.get('email');

    if (!attemptId) {
      return NextResponse.json({ error: 'Attempt ID is required' }, { status: 400 });
    }

    const sessionData = await getAttemptSession(attemptId, email);

    return NextResponse.json({
      success: true,
      ...sessionData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve session' },
      { status: error.statusCode || 500 }
    );
  }
}

