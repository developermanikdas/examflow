import mongoose from 'mongoose';
import Attempt from '@/models/Attempt';
import Examination from '@/models/Examination';
import { connectToDatabase } from '@/lib/mongodb';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Automatically evaluates student written answers using Groq AI.
 * Compares student answers against model expected answers and marks allocation rubrics.
 */
export async function evaluateAttemptWithAI(attemptId) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(attemptId)) {
    throw new Error('Invalid attempt ID for AI evaluation');
  }

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) {
    throw new Error('Attempt not found');
  }

  const exam = await Examination.findById(attempt.examinationId);
  if (!exam) {
    throw new Error('Examination not found');
  }

  // Find all questions in the examination
  const questionsMap = new Map();
  for (const q of exam.questions || []) {
    questionsMap.set(q.id, q);
  }

  // Student answers map
  const studentAnswersMap = new Map();
  for (const a of attempt.answers || []) {
    studentAnswersMap.set(a.questionId, a.answer);
  }

  // Existing evaluations map (e.g. MCQs already auto-graded)
  const evaluationsMap = new Map();
  for (const ev of attempt.questionEvaluations || []) {
    evaluationsMap.set(ev.questionId, ev);
  }

  // Identify written/short-answer questions needing AI grading
  const writtenQuestionsToGrade = [];
  for (const q of exam.questions || []) {
    if (q.type !== 'mcq') {
      const studentAns = studentAnswersMap.get(q.id) || '';
      writtenQuestionsToGrade.push({
        questionId: q.id,
        question: q.question,
        maxMarks: q.marks || 1,
        expectedAnswer: q.expectedAnswer || q.explanation || 'Accurate and comprehensive response.',
        studentAnswer: typeof studentAns === 'string' ? studentAns.trim() : JSON.stringify(studentAns),
      });
    }
  }

  // If there are no written questions or no API key, return existing evaluation
  if (writtenQuestionsToGrade.length === 0 || !GROQ_API_KEY) {
    return attempt;
  }

  try {
    const promptMessages = [
      {
        role: 'system',
        content: `You are an expert university examiner and grading professor.
Evaluate the student's written answers against the expected answer and maximum marks allocation.
Be fair, constructive, and academic.
Award an integer or half-mark float (e.g., 0, 1, 2.5, 4) between 0 and maxMarks.
Provide concise, constructive feedback explaining why marks were awarded or deducted.

CRITICAL: Return a JSON object with this exact shape:
{
  "evaluations": [
    {
      "questionId": "q1",
      "marksAwarded": 3,
      "evaluatorFeedback": "Accurately answered key points A and B, but missed explaining point C."
    }
  ]
}`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          examTitle: exam.title,
          subject: exam.subject,
          questionsToGrade: writtenQuestionsToGrade,
        }),
      },
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        response_format: { type: 'json_object' },
        messages: promptMessages,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq AI grading API error:', response.status, errText);
      return attempt;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || '{}');
    const aiEvaluations = parsed.evaluations || [];

    for (const item of aiEvaluations) {
      const q = questionsMap.get(item.questionId);
      if (!q) continue;

      const maxMarks = q.marks || 1;
      const awarded = Math.min(Math.max(0, Number(item.marksAwarded) || 0), maxMarks);

      evaluationsMap.set(item.questionId, {
        questionId: item.questionId,
        marksAwarded: awarded,
        maxMarks,
        isCorrect: awarded >= maxMarks / 2,
        evaluatorFeedback: item.evaluatorFeedback || 'Evaluated by AI.',
        evaluatedAt: new Date(),
        evaluatorType: 'ai',
      });
    }

    // Merge evaluations back into attempt
    attempt.questionEvaluations = Array.from(evaluationsMap.values());

    // Calculate total marks obtained
    let totalObtained = 0;
    for (const ev of attempt.questionEvaluations) {
      totalObtained += ev.marksAwarded || 0;
    }

    const examTotal = exam.totalMarks || 1;
    attempt.obtainedMarks = totalObtained;
    attempt.percentage = Math.min(100, Math.round((totalObtained / examTotal) * 100));

    // Determine status
    const allGraded = exam.questions.every((q) => evaluationsMap.has(q.id));
    if (allGraded) {
      attempt.evaluationStatus = 'fully_evaluated';
      attempt.status = 'evaluated';
    } else {
      attempt.evaluationStatus = 'partially_evaluated';
    }

    await attempt.save();
    return attempt;
  } catch (error) {
    console.error('AI automated evaluation failed:', error);
    return attempt;
  }
}
