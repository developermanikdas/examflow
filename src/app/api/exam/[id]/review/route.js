import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Examination from '@/models/Examination';
import Attempt from '@/models/Attempt';
import { evaluateAttemptWithAI } from '@/services/ai-evaluator-service';

export async function POST(req, { params }) {
  try {
    const { id: examPublicId } = params;
    const body = await req.json().catch(() => ({}));
    const { email, pin } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Valid student email is required.' }, { status: 400 });
    }

    await connectToDatabase();

    const exam = await Examination.findOne({ publicId: examPublicId });
    if (!exam) {
      return NextResponse.json({ error: 'Examination not found.' }, { status: 404 });
    }

    // Verify PIN if provided or required
    if (exam.pin && pin && exam.pin.trim() !== pin.toString().trim()) {
      return NextResponse.json({ error: 'Invalid Examination PIN.' }, { status: 401 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find the latest completed or evaluated attempt for this candidate
    let completedAttempt = await Attempt.findOne({
      examinationId: exam._id,
      studentEmail: normalizedEmail,
      status: { $in: ['submitted', 'auto_submitted', 'evaluated'] },
    })
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean();

    if (!completedAttempt) {
      return NextResponse.json(
        { error: 'No completed examination attempt found for this email address.' },
        { status: 404 }
      );
    }

    // If pending or partial evaluation, run AI evaluation automatically so student sees results
    if (completedAttempt.evaluationStatus !== 'fully_evaluated') {
      try {
        await evaluateAttemptWithAI(completedAttempt._id);
        completedAttempt = await Attempt.findById(completedAttempt._id).lean();
      } catch (aiErr) {
        console.error('Auto AI grading during student review lookup failed:', aiErr);
      }
    }

    // Map answers into an object { [questionId]: answer }
    const answersMap = {};
    for (const ans of completedAttempt.answers || []) {
      answersMap[ans.questionId] = ans.answer;
    }

    return NextResponse.json({
      success: true,
      hasReview: true,
      completedAttempt: {
        attemptId: completedAttempt._id.toString(),
        studentName: completedAttempt.studentName,
        studentEmail: completedAttempt.studentEmail,
        obtainedMarks: completedAttempt.obtainedMarks,
        totalMarks: completedAttempt.totalMarks,
        percentage: completedAttempt.percentage,
        evaluationStatus: completedAttempt.evaluationStatus,
        submittedAt: completedAttempt.submittedAt,
        questionEvaluations: completedAttempt.questionEvaluations || [],
        answers: answersMap,
      },
      exam: {
        publicId: exam.publicId,
        title: exam.title,
        description: exam.description,
        subject: exam.subject,
        totalMarks: exam.totalMarks,
        questionCount: exam.questions?.length || 0,
        durationMinutes: exam.durationMinutes,
        questions: exam.questions || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attempt review' },
      { status: 500 }
    );
  }
}

