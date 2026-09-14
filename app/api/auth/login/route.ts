import { NextRequest, NextResponse } from 'next/server';
import { getServerDb } from '@/lib/db/server/db';
import { users } from '@/lib/db/server/schema';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { normalizeUsername } from '@/lib/auth/validation';
import { isDemoMode, DEMO_USER } from '@/lib/auth/demo';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  // In demo mode, accept any login
  if (isDemoMode()) {
    return NextResponse.json({ user: DEMO_USER });
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(username);

    // ── Find user ────────────────────────────────────
    const db = getServerDb();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const user = result[0];

    // ── Verify password ──────────────────────────────
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    // ── Create session ───────────────────────────────
    const userAgent = request.headers.get('user-agent') || undefined;
    await createSession(user.id, userAgent);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
