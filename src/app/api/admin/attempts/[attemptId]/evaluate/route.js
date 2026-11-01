import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { gradeWrittenQuestion } from '@/services/evaluation-service';
import { GradeQuestionSchema } from '@/lib/validation';

export async function POST(req, { params }) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { attemptId } = params;
    const body = await req.json().catch(() => ({}));

    const parsed = GradeQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid grading data: questionId and marksAwarded are required.' },
        { status: 400 }
      );
    }

    const { questionId, marksAwarded, evaluatorFeedback } = parsed.data;

    const updatedAttempt = await gradeWrittenQuestion(
      attemptId,
      questionId,
      marksAwarded,
      evaluatorFeedback,
      session.admin
    );

    return NextResponse.json({
      success: true,
      message: 'Question graded successfully',
      attempt: {
        id: updatedAttempt._id,
        obtainedMarks: updatedAttempt.obtainedMarks,
        totalMarks: updatedAttempt.totalMarks,
        percentage: updatedAttempt.percentage,
        evaluationStatus: updatedAttempt.evaluationStatus,
        status: updatedAttempt.status,
        questionEvaluations: updatedAttempt.questionEvaluations,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to grade question' },
      { status: error.statusCode || 500 }
    );
  }
}

