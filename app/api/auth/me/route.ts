import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await validateSession();

    if (!session) {
      return NextResponse.json(
        { user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: session.user,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { user: null },
      { status: 401 }
    );
  }
}
