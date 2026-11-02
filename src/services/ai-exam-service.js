import { YoutubeTranscript } from 'youtube-transcript';
import { PDFParse } from 'pdf-parse';
import { createExamination, publishExamination } from './examination-service';
import { calculateExamMetrics } from '@/lib/validation';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Extracts a YouTube Video ID from any standard YouTube URL.
 */
export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * Extracts text content from a YouTube lecture URL via captions/transcript.
 */
export async function extractTextFromYouTube(url) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL provided. Please provide a valid YouTube watch or share link.');
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript or captions available for this YouTube video.');
    }
    const fullText = transcript.map((t) => t.text).join(' ');
    return fullText;
  } catch (err) {
    throw new Error(`Unable to fetch YouTube transcript: ${err.message || 'Captions are disabled on this video'}`);
  }
}

/**
 * Extracts text from a PDF file buffer using pdf-parse.
 */
export async function extractTextFromPdf(buffer) {
  let parser = null;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result?.text;
    if (!text || !text.trim()) {
      throw new Error('The uploaded PDF does not contain extractable text.');
    }
    return text.trim();
  } catch (err) {
    throw new Error(`Failed to parse PDF document: ${err.message}`);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch (_) {}
    }
  }
}

/**
 * Extracts text/content from an image (textbook photo or assignment) using Groq Vision.
 */
export async function extractTextFromImage(base64Data, mimeType = 'image/jpeg') {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured in environment variables.');
  }

  const prompt = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Extract and transcribe all educational content, text, questions, diagrams, and explanations from this textbook/study image accurately in markdown format.',
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Data}`,
          },
        },
      ],
    },
  ];

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: prompt,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq Vision error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    throw new Error(`Image extraction failed: ${err.message}`);
  }
}

/**
 * Generates an authoritative Examination using Groq AI from source material.
 * Automatically saves and publishes the examination ready for student immediate access.
 */
export async function generateExamFromContent({
  sourceType, // 'text' | 'pdf' | 'youtube' | 'image'
  rawContent,
  pdfBuffer,
  youtubeUrl,
  imageBase64,
  imageMimeType,
  title,
  subject,
  questionCount = 10,
  questionType = 'mixed', // 'mixed' | 'mcq' | 'short_answer'
  difficulty = 'medium',
  creatorAdmin,
}) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured in environment variables.');
  }

  let extractedMaterial = '';

  if (sourceType === 'youtube' || youtubeUrl) {
    extractedMaterial = await extractTextFromYouTube(youtubeUrl);
  } else if (sourceType === 'pdf' || pdfBuffer) {
    extractedMaterial = await extractTextFromPdf(pdfBuffer);
  } else if (sourceType === 'image' || imageBase64) {
    extractedMaterial = await extractTextFromImage(imageBase64, imageMimeType);
  } else if (sourceType === 'text' || rawContent) {
    extractedMaterial = String(rawContent).trim();
  } else {
    throw new Error('No valid content source provided for examination generation.');
  }

  if (!extractedMaterial || extractedMaterial.trim().length < 20) {
    throw new Error('Extracted study material is too short to generate an examination.');
  }

  // Truncate if exceptionally large to fit within token context window
  const maxChars = 60000;
  const processedText = extractedMaterial.length > maxChars ? extractedMaterial.slice(0, maxChars) : extractedMaterial;

  const systemPrompt = `You are a curriculum architect and examination designer.
Generate a comprehensive, academic examination paper strictly adhering to the JSON schema format below based on the provided study material.

JSON SCHEMA REQUIREMENT:
{
  "schemaVersion": "1.0",
  "title": "Clear exam title",
  "description": "Comprehensive diagnostic evaluation covering the material.",
  "subject": "Subject name",
  "totalMarks": 20,
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "marks": 1,
      "question": "Question prompt?",
      "options": [
        { "id": "a", "text": "Option A" },
        { "id": "b", "text": "Option B" },
        { "id": "c", "text": "Option C" },
        { "id": "d", "text": "Option D" }
      ],
      "correctAnswer": "a",
      "explanation": "Why A is correct."
    },
    {
      "id": "q2",
      "type": "short_answer",
      "marks": 3,
      "question": "Descriptive question prompt?",
      "expectedAnswer": "Model answer points covering key concepts and grading criteria.",
      "explanation": "Key pedagogical points required."
    }
  ]
}

RULES:
1. Generate exactly ${questionCount} questions.
2. Question distribution: ${
    questionType === 'mcq'
      ? 'All questions must be MCQ.'
      : questionType === 'short_answer'
      ? 'All questions must be short_answer / descriptive.'
      : 'Mix of multiple choice (MCQ) and short_answer descriptive questions.'
  }
3. Difficulty level: ${difficulty}.
4. Every MCQ must have at least 4 options with ids "a", "b", "c", "d" and a valid "correctAnswer".
5. Every short_answer must have a detailed "expectedAnswer" for automated grading.
6. The totalMarks must strictly equal the sum of marks of all questions.
7. Return valid JSON only. Do not wrap in markdown quotes.`;

  const userPrompt = JSON.stringify({
    customTitle: title || undefined,
    customSubject: subject || undefined,
    requestedQuestionCount: questionCount,
    studyMaterial: processedText,
  });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq AI generation error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawJson = data.choices?.[0]?.message?.content;
  if (!rawJson) {
    throw new Error('AI returned an empty question paper.');
  }

  let parsedPaper;
  try {
    parsedPaper = JSON.parse(rawJson);
  } catch (e) {
    throw new Error('AI generation did not return valid JSON. Please try again.');
  }

  // Ensure totalMarks equals sum of question marks
  let calculatedTotal = 0;
  for (const q of parsedPaper.questions || []) {
    calculatedTotal += Number(q.marks) || 1;
  }
  parsedPaper.totalMarks = calculatedTotal;

  // Auto-calculate suggested duration
  const metrics = calculateExamMetrics(parsedPaper.questions || []);
  const durationMinutes = metrics.durationMinutes || 30;

  // Create examination in database
  const createdExam = await createExamination(
    {
      questionPaper: parsedPaper,
      overrides: {
        durationMinutes,
      },
    },
    creatorAdmin || { id: 'ai-system', email: 'system@examflow.internal', name: 'AI Generator' }
  );

  // Automatically publish the examination so no manual admin approval is needed
  const publishedExam = await publishExamination(
    createdExam.publicId,
    creatorAdmin || { id: 'ai-system', email: 'system@examflow.internal', name: 'AI Generator' }
  );

  return {
    success: true,
    examination: {
      publicId: publishedExam.publicId,
      title: publishedExam.title,
      subject: publishedExam.subject,
      totalMarks: publishedExam.totalMarks,
      durationMinutes: publishedExam.durationMinutes,
      pin: publishedExam.pin,
      questionCount: publishedExam.questions?.length || 0,
      status: publishedExam.status,
      shareableUrl: `/exam/${publishedExam.publicId}`,
      questions: publishedExam.questions,
    },
  };
}
