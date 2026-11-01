import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import {
  getExaminationById,
  updateExamination,
  deleteExamination,
} from '@/services/examination-service';

export async function GET(req, { params }) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { id } = params;
    const exam = await getExaminationById(id);

    if (!exam) {
      return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      examination: exam,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch examination' },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));

    const updatedExam = await updateExamination(id, body, session.admin);

    return NextResponse.json({
      success: true,
      message: 'Examination updated successfully',
      examination: updatedExam,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update examination' },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await requireAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error }, { status: session.status || 401 });
    }

    const { id } = params;
    const result = await deleteExamination(id, session.admin);

    return NextResponse.json({
      success: true,
      message: 'Examination and associated attempts deleted successfully',
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete examination' },
      { status: error.statusCode || 500 }
    );
  }
}

