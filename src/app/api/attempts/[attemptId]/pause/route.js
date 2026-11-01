import { NextResponse } from 'next/server';
import { pauseAttempt } from '@/services/attempt-service';

export async function POST(req, { params }) {
  try {
    const { attemptId } = params;
    
    // In sendBeacon or keepalive, body might be text or JSON
    let body = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      body = {};
    }

    const { email, remainingSeconds, answers } = body;

    const result = await pauseAttempt(attemptId, email, {
      remainingSeconds,
      answers,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to pause attempt' },
      { status: error.statusCode || 500 }
    );
  }
}

