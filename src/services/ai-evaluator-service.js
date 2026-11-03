import mongoose from 'mongoose';
import Attempt from '@/models/Attempt';
import Examination from '@/models/Examination';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * Automatically evaluates student answers using Groq AI.
 * - Automatically verifies and grades MCQs.
 * - PRESERVES manual instructor marks and feedback if already manually graded.
 * - Submits written/descriptive responses to Groq AI for academic evaluation and scoring.
 * - Calculates total marks, percentages, and marks attempt as fully_evaluated.
 */
export async function evaluateAttemptWithAI(attemptId, { forceAiReevaluation = false } = {}) {
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

  const groqApiKey = process.env.GROQ_API_KEY;

  // Questions map
  const questionsMap = new Map();
  for (const q of exam.questions || []) {
    questionsMap.set(q.id, q);
  }

  // Student answers map
  const studentAnswersMap = new Map();
  for (const a of attempt.answers || []) {
    studentAnswersMap.set(a.questionId, a.answer);
  }

  // Existing evaluations map
  const evaluationsMap = new Map();
  for (const ev of attempt.questionEvaluations || []) {
    evaluationsMap.set(ev.questionId, ev);
  }

  // 1. Grade MCQs automatically if not already graded
  for (const q of exam.questions || []) {
    if (q.type === 'mcq') {
      const existing = evaluationsMap.get(q.id);
      if (!existing || existing.isCorrect === null || !existing.evaluatedAt) {
        const studentAns = studentAnswersMap.get(q.id);
        const isCorrect = Boolean(
          studentAns !== undefined &&
          studentAns !== null &&
          String(studentAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
        );
        const marksAwarded = isCorrect ? (q.marks || 1) : 0;
        evaluationsMap.set(q.id, {
          questionId: q.id,
          marksAwarded,
          maxMarks: q.marks || 1,
          isCorrect,
          evaluatorFeedback: isCorrect ? 'Correct choice' : `Incorrect. Expected (${q.correctAnswer})`,
          evaluatedAt: new Date(),
          evaluatorType: 'auto',
          isManual: false,
        });
      }
    }
  }

  // 2. Identify written questions that need AI evaluation (while PRESERVING manual instructor marks)
  const writtenQuestionsToGrade = [];
  for (const q of exam.questions || []) {
    if (q.type !== 'mcq') {
      const existing = evaluationsMap.get(q.id);
      const isManualGrade = Boolean(
        !forceAiReevaluation &&
        existing &&
        existing.evaluatorType === 'manual' &&
        existing.evaluatedAt &&
        (existing.isManual === true ||
          Number(existing.marksAwarded) > 0 ||
          (typeof existing.evaluatorFeedback === 'string' && existing.evaluatorFeedback.trim() !== ''))
      );

      if (isManualGrade) {
        // Teacher has manually scored this question; PRESERVE IT!
        continue;
      }

      // Needs AI evaluation
      const studentAns = studentAnswersMap.get(q.id) || '';
      writtenQuestionsToGrade.push({
        questionId: q.id,
        question: q.question,
        maxMarks: q.marks || 1,
        expectedAnswer: q.expectedAnswer || q.explanation || 'Accurate, comprehensive, and conceptually sound response.',
        studentAnswer: typeof studentAns === 'string' ? studentAns.trim() : JSON.stringify(studentAns),
      });
    }
  }

  // 3. If there are written questions to grade with AI
  if (writtenQuestionsToGrade.length > 0 && groqApiKey) {
    try {
      const promptMessages = [
        {
          role: 'system',
          content: `You are an expert university examiner and grading professor.
Evaluate the candidate's written answers against the expected answer and maximum marks allocation.
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
          Authorization: `Bearer ${groqApiKey}`,
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
      } else {
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
            isManual: false,
          });
        }
      }
    } catch (aiErr) {
      console.error('Groq AI automated grading failed:', aiErr);
    }
  }

  // 4. Update attempt with finalized question evaluations
  attempt.questionEvaluations = Array.from(evaluationsMap.values());

  // 5. Calculate total marks obtained
  let totalObtained = 0;
  for (const ev of attempt.questionEvaluations) {
    totalObtained += Number(ev.marksAwarded) || 0;
  }

  const examTotal = exam.totalMarks || 1;
  attempt.totalMarks = examTotal;
  attempt.obtainedMarks = Math.round(totalObtained * 100) / 100;
  attempt.percentage = Math.min(100, Math.round((totalObtained / examTotal) * 100));

  // 6. Check if all questions have been graded
  const allGraded = (exam.questions || []).every((q) => {
    const ev = evaluationsMap.get(q.id);
    return ev && ev.evaluatedAt;
  });

  if (allGraded) {
    attempt.evaluationStatus = 'fully_evaluated';
    if (attempt.status !== 'in_progress') {
      attempt.status = 'evaluated';
    }
  } else {
    attempt.evaluationStatus = 'partially_evaluated';
  }

  await attempt.save();
  return attempt;
}
