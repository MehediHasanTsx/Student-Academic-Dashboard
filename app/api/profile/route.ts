import { NextRequest, NextResponse } from 'next/server';
import { getServerDb } from '@/lib/db/server/db';
import { profiles } from '@/lib/db/server/schema';
import { validateSession } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/auth/demo';
import { eq } from 'drizzle-orm';

/**
 * GET /api/profile — Fetch the user's profile from the server.
 * Used when logging in on a new device to restore profile data.
 */
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ profile: null });
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
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ profile: null });
    }

    const p = result[0];
    return NextResponse.json({
      profile: {
        fullName: p.fullName,
        university: p.university,
        department: p.department,
        studentId: p.studentId,
        rollNumber: p.rollNumber,
        registrationNumber: p.registrationNumber,
        batch: p.batch,
        session: p.session,
        phoneNumber: p.phoneNumber,
        email: p.email || '',
        bloodGroup: p.bloodGroup || '',
        emergencyContact: p.emergencyContact || '',
        currentSemester: p.currentSemester,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile — Save or update the user's profile on the server.
 * This syncs onboarding data so the admin can view user details in Neon.
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
    const {
      fullName, university, department, studentId,
      rollNumber, registrationNumber, batch, session: academicSession,
      phoneNumber, email, bloodGroup, emergencyContact, currentSemester,
    } = body;

    if (!fullName || !university || !department || !studentId) {
      return NextResponse.json(
        { error: 'Required profile fields are missing.' },
        { status: 400 }
      );
    }

    const db = getServerDb();
    const userId = session.user.id;

    // Check if profile already exists
    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing profile
      await db
        .update(profiles)
        .set({
          fullName,
          university,
          department,
          studentId,
          rollNumber,
          registrationNumber,
          batch,
          session: academicSession,
          phoneNumber,
          email: email || null,
          bloodGroup: bloodGroup || null,
          emergencyContact: emergencyContact || null,
          currentSemester: currentSemester || 1,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, userId));
    } else {
      // Insert new profile
      await db.insert(profiles).values({
        userId,
        fullName,
        university,
        department,
        studentId,
        rollNumber,
        registrationNumber,
        batch,
        session: academicSession,
        phoneNumber,
        email: email || null,
        bloodGroup: bloodGroup || null,
        emergencyContact: emergencyContact || null,
        currentSemester: currentSemester || 1,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile sync error:', error);
    return NextResponse.json(
      { error: 'Failed to save profile.' },
      { status: 500 }
    );
  }
}
