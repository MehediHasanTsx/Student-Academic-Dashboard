import { NextRequest, NextResponse } from 'next/server';
import { getServerDb } from '@/lib/db/server/db';
import { users } from '@/lib/db/server/schema';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { normalizeUsername, normalizeMobile, isValidBDMobile } from '@/lib/auth/validation';
import { isDemoMode, DEMO_USER } from '@/lib/auth/demo';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  // In demo mode, accept any registration
  if (isDemoMode()) {
    return NextResponse.json({ user: DEMO_USER }, { status: 201 });
  }

  try {
    const body = await request.json();
    const { username, mobile, password, confirmPassword } = body;

    // ── Validate required fields ──────────────────────
    if (!username || !mobile || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be at most 128 characters.' },
        { status: 400 }
      );
    }

    // ── Normalize username ───────────────────────────
    const normalizedUsername = normalizeUsername(username);

    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 30 characters.' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
      return NextResponse.json(
        { error: 'Username can only contain lowercase letters, numbers, and underscores.' },
        { status: 400 }
      );
    }

    // ── Normalize mobile ─────────────────────────────
    const normalizedMobile = normalizeMobile(mobile);

    if (!isValidBDMobile(normalizedMobile)) {
      return NextResponse.json(
        { error: 'Please enter a valid Bangladesh mobile number (e.g., 01XXXXXXXXX).' },
        { status: 400 }
      );
    }

    // ── Check uniqueness ─────────────────────────────
    const db = getServerDb();

    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);

    if (existingUsername.length > 0) {
      return NextResponse.json(
        { error: 'Username already taken.' },
        { status: 409 }
      );
    }

    const existingMobile = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.mobile, normalizedMobile))
      .limit(1);

    if (existingMobile.length > 0) {
      return NextResponse.json(
        { error: 'An account with this mobile number already exists.' },
        { status: 409 }
      );
    }

    // ── Create user ──────────────────────────────────
    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        username: normalizedUsername,
        mobile: normalizedMobile,
        passwordHash,
      })
      .returning({
        id: users.id,
        username: users.username,
        mobile: users.mobile,
      });

    // ── Create session ───────────────────────────────
    const userAgent = request.headers.get('user-agent') || undefined;
    await createSession(newUser.id, userAgent);

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          username: newUser.username,
          mobile: newUser.mobile,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
