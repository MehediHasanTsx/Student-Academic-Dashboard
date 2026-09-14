import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { isDemoMode, DEMO_USER } from '@/lib/auth/demo';

export async function GET() {
  // In demo mode, always return demo user
  if (isDemoMode()) {
    return NextResponse.json({ user: DEMO_USER });
  }

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
