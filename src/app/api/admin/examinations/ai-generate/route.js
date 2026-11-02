import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { generateExamFromContent } from '@/services/ai-exam-service';

export async function POST(req) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let sourceType = 'text';
    let rawContent = '';
    let youtubeUrl = '';
    let pdfBuffer = null;
    let imageBase64 = null;
    let imageMimeType = 'image/jpeg';
    let title = '';
    let subject = '';
    let questionCount = 10;
    let questionType = 'mixed';
    let difficulty = 'medium';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      sourceType = formData.get('sourceType') || 'text';
      youtubeUrl = formData.get('youtubeUrl') || '';
      rawContent = formData.get('rawContent') || '';
      title = formData.get('title') || '';
      subject = formData.get('subject') || '';
      questionCount = parseInt(formData.get('questionCount') || '10', 10);
      questionType = formData.get('questionType') || 'mixed';
      difficulty = formData.get('difficulty') || 'medium';

      const file = formData.get('file');
      if (file && typeof file === 'object' && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        if (file.type === 'application/pdf' || file.name?.endsWith('.pdf')) {
          sourceType = 'pdf';
          pdfBuffer = buffer;
        } else if (file.type?.startsWith('image/')) {
          sourceType = 'image';
          imageBase64 = buffer.toString('base64');
          imageMimeType = file.type || 'image/jpeg';
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      sourceType = body.sourceType || 'text';
      rawContent = body.rawContent || '';
      youtubeUrl = body.youtubeUrl || '';
      title = body.title || '';
      subject = body.subject || '';
      questionCount = parseInt(body.questionCount || '10', 10);
      questionType = body.questionType || 'mixed';
      difficulty = body.difficulty || 'medium';
      imageBase64 = body.imageBase64 || null;
      imageMimeType = body.imageMimeType || 'image/jpeg';
    }

    const result = await generateExamFromContent({
      sourceType,
      rawContent,
      pdfBuffer,
      youtubeUrl,
      imageBase64,
      imageMimeType,
      title,
      subject,
      questionCount,
      questionType,
      difficulty,
      creatorAdmin: session.admin,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('AI exam generation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate examination with AI' },
      { status: 500 }
    );
  }
}
