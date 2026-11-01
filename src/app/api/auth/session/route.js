import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json(
        { authenticated: false, error: session.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      admin: session.admin,
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}

