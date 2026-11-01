import { NextResponse } from 'next/server';
import { verifyStudentAndCheckEligibility } from '@/services/attempt-service';
import { StudentVerifySchema } from '@/lib/validation';

export async function POST(req, { params }) {
  try {
    const { id: examPublicId } = params;
    const body = await req.json().catch(() => ({}));

    const parsed = StudentVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please check your inputs: valid name, email, and PIN are required.' },
        { status: 400 }
      );
    }

    const { name, email, pin } = parsed.data;
    const result = await verifyStudentAndCheckEligibility(examPublicId, { name, email, pin });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: error.statusCode || 500 }
    );
  }
}

