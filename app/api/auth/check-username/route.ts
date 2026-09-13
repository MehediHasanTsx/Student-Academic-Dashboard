import { NextRequest, NextResponse } from 'next/server';
import { getServerDb } from '@/lib/db/server/db';
import { users } from '@/lib/db/server/schema';
import { normalizeUsername } from '@/lib/auth/validation';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('u');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required.' },
        { status: 400 }
      );
    }

    const normalized = normalizeUsername(username);

    if (normalized.length < 3) {
      return NextResponse.json({ available: false, reason: 'Too short' });
    }

    if (normalized.length > 30) {
      return NextResponse.json({ available: false, reason: 'Too long' });
    }

    if (!/^[a-z0-9_]+$/.test(normalized)) {
      return NextResponse.json({ available: false, reason: 'Invalid characters' });
    }

    const db = getServerDb();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, normalized))
      .limit(1);

    return NextResponse.json({
      available: existing.length === 0,
      username: normalized,
    });
  } catch (error) {
    console.error('Username check error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
