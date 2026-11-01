import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import Examination from '@/models/Examination';
import Attempt from '@/models/Attempt';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    await connectToDatabase();

    const [
      totalExaminations,
      publishedExaminations,
      draftExaminations,
      deactivatedExaminations,
      totalAttempts,
      completedAttempts,
      pendingEvaluations,
      recentAttempts,
    ] = await Promise.all([
      Examination.countDocuments(),
      Examination.countDocuments({ status: 'published' }),
      Examination.countDocuments({ status: 'draft' }),
      Examination.countDocuments({ status: 'deactivated' }),
      Attempt.countDocuments(),
      Attempt.countDocuments({ status: { $in: ['submitted', 'auto_submitted', 'evaluated'] } }),
      Attempt.countDocuments({
        status: { $in: ['submitted', 'auto_submitted'] },
        evaluationStatus: { $in: ['pending', 'partially_evaluated'] },
      }),
      Attempt.find()
        .populate('examinationId', 'title')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalExaminations,
        publishedExaminations,
        draftExaminations,
        deactivatedExaminations,
        totalAttempts,
        completedAttempts,
        pendingEvaluations,
        recentAttempts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

