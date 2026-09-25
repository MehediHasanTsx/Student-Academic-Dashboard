import { NextRequest, NextResponse } from 'next/server';
import { getServerDb } from '@/lib/db/server/db';
import { userData } from '@/lib/db/server/schema';
import { validateSession } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/auth/demo';
import { eq } from 'drizzle-orm';

/**
 * GET /api/sync — Download all user data from the server.
 * Used when logging in on a new device to restore all data.
 */
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ data: null });
  }

  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getServerDb();
    const userId = session.user.id;

    const result = await db
      .select()
      .from(userData)
      .where(eq(userData.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: result[0].data,
      updatedAt: result[0].updatedAt,
    });
  } catch (error) {
    console.error('Sync download error:', error);
    return NextResponse.json(
      { error: 'Failed to download data.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync — Upload all user data to the server.
 * Overwrites the previous sync data (last-write-wins).
 */
export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ success: true });
  }

  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid data format.' },
        { status: 400 }
      );
    }

    const db = getServerDb();
    const userId = session.user.id;

    // Check if user data already exists
    const existing = await db
      .select({ id: userData.id })
      .from(userData)
      .where(eq(userData.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing data
      await db
        .update(userData)
        .set({
          data,
          updatedAt: new Date(),
        })
        .where(eq(userData.userId, userId));
    } else {
      // Insert new data
      await db.insert(userData).values({
        userId,
        data,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sync upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload data.' },
      { status: 500 }
    );
  }
}
