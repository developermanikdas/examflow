import { NextResponse } from 'next/server';
import Admin from '@/models/Admin';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/security';

export async function POST(req) {
  try {
    await connectToDatabase();

    const existingAdminCount = await Admin.countDocuments();
    if (existingAdminCount > 0) {
      return NextResponse.json(
        { message: 'System is already initialized with an administrator account.' },
        { status: 400 }
      );
    }

    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    const name = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be configured in environment variables.' },
        { status: 500 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newAdmin = new Admin({
      email,
      passwordHash,
      name,
      role: 'superadmin',
    });

    await newAdmin.save();

    return NextResponse.json({
      success: true,
      message: 'Initial administrator created successfully.',
      admin: {
        email: newAdmin.email,
        name: newAdmin.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initialize administrator', details: error.message },
      { status: 500 }
    );
  }
}

