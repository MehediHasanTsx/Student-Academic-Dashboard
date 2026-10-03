import { NextRequest, NextResponse } from 'next/server';
import { getServerDb } from '@/lib/db/server/db';
import { mainData } from '@/lib/db/server/schema';
import { validateSession } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/auth/demo';
import { eq } from 'drizzle-orm';
import {
  DEFAULT_5TH_SEMESTER_SUBJECTS,
  DEFAULT_5TH_SEMESTER_ROUTINE,
  DEFAULT_5TH_SEMESTER_EXAM_ROUTINE,
  DEFAULT_LAB_GROUPS,
  DEFAULT_SCHOLARSHIP_CONFIG,
} from '@/lib/constants';

function getDefaultFallback(semesterId = 'semester-5') {
  const subjects = DEFAULT_5TH_SEMESTER_SUBJECTS.map((s, idx) => ({
    id: `subj-sem5-${s.code}`,
    semesterId,
    name: s.name,
    code: s.code,
    credits: s.credits,
    type: s.type,
    color: s.color,
    teacher: s.teacher,
    room: s.room,
    order: idx,
  }));

  const subjectMap = new Map(subjects.map((s) => [s.code, s.id]));

  const routine = DEFAULT_5TH_SEMESTER_ROUTINE.map((r, idx) => ({
    id: `slot-sem5-${idx + 1}`,
    semesterId,
    subjectId: subjectMap.get(r.subjectCode) || `subj-sem5-${r.subjectCode}`,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    room: r.room,
    teacher: r.teacher,
    group: r.group,
    section: r.section,
  }));

  return {
    id: semesterId,
    semesterId,
    subjects,
    routine,
    exams: [],
    assignments: [],
    examRoutines: semesterId === 'semester-5' ? DEFAULT_5TH_SEMESTER_EXAM_ROUTINE : [],
    labGroups: semesterId === 'semester-5' ? DEFAULT_LAB_GROUPS : [],
    scholarshipConfig: DEFAULT_SCHOLARSHIP_CONFIG,
    scholarshipResults: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * GET /api/main-data?semesterId=semester-5
 * Reads authoritative shared data maintained by DCC CSE Admin.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const semesterId = searchParams.get('semesterId') || 'semester-5';

  if (isDemoMode()) {
    return NextResponse.json({ success: true, data: getDefaultFallback(semesterId) });
  }

  try {
    const db = getServerDb();
    const rows = await db
      .select()
      .from(mainData)
      .where(eq(mainData.id, semesterId))
      .limit(1);

    if (rows.length === 0) {
      // Return fallback defaults if not yet created in db
      return NextResponse.json({ success: true, data: getDefaultFallback(semesterId) });
    }

    const row = rows[0];
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        semesterId: row.semesterId,
        subjects: row.subjects,
        routine: row.routine,
        exams: row.exams,
        assignments: row.assignments || [],
        examRoutines: row.examRoutines || (semesterId === 'semester-5' ? DEFAULT_5TH_SEMESTER_EXAM_ROUTINE : []),
        labGroups: row.labGroups || (semesterId === 'semester-5' ? DEFAULT_LAB_GROUPS : []),
        scholarshipConfig: row.scholarshipConfig || DEFAULT_SCHOLARSHIP_CONFIG,
        scholarshipResults: row.scholarshipResults || [],
        updatedAt: row.updatedAt,
        updatedBy: row.updatedBy,
      },
    });
  } catch (error) {
    console.error('Failed to fetch main data:', error);
    // Graceful fallback to default in case of temporary DB network hiccup
    return NextResponse.json({ success: true, data: getDefaultFallback(semesterId) });
  }
}

/**
 * POST /api/main-data
 * Updates authoritative shared data. PROTECTED: Admin role only.
 */
export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ success: true, message: 'Demo mode simulated save.' });
  }

  try {
    const session = await validateSession();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required to update Main Data.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      semesterId = 'semester-5',
      subjects,
      routine,
      exams,
      assignments,
      examRoutines,
      labGroups,
      scholarshipConfig,
      scholarshipResults,
    } = body;

    if (!Array.isArray(subjects) || !Array.isArray(routine)) {
      return NextResponse.json(
        { error: 'Invalid payload format: subjects and routine must be arrays.' },
        { status: 400 }
      );
    }

    const db = getServerDb();
    const now = new Date();

    const existing = await db
      .select({ id: mainData.id })
      .from(mainData)
      .where(eq(mainData.id, semesterId))
      .limit(1);

    const updatePayload: Record<string, unknown> = {
      subjects,
      routine,
      exams: Array.isArray(exams) ? exams : [],
      assignments: Array.isArray(assignments) ? assignments : [],
      updatedAt: now,
      updatedBy: session.user.id,
    };

    if (examRoutines !== undefined) updatePayload.examRoutines = examRoutines;
    if (labGroups !== undefined) updatePayload.labGroups = labGroups;
    if (scholarshipConfig !== undefined) updatePayload.scholarshipConfig = scholarshipConfig;
    if (scholarshipResults !== undefined) updatePayload.scholarshipResults = scholarshipResults;

    if (existing.length > 0) {
      await db
        .update(mainData)
        .set(updatePayload)
        .where(eq(mainData.id, semesterId));
    } else {
      await db.insert(mainData).values({
        id: semesterId,
        semesterId,
        subjects,
        routine,
        exams: Array.isArray(exams) ? exams : [],
        assignments: Array.isArray(assignments) ? assignments : [],
        examRoutines: Array.isArray(examRoutines) ? examRoutines : [],
        labGroups: Array.isArray(labGroups) ? labGroups : [],
        scholarshipConfig: scholarshipConfig || DEFAULT_SCHOLARSHIP_CONFIG,
        scholarshipResults: Array.isArray(scholarshipResults) ? scholarshipResults : [],
        updatedAt: now,
        updatedBy: session.user.id,
      });
    }

    return NextResponse.json({
      success: true,
      updatedAt: now.toISOString(),
      message: 'Main data published successfully.',
    });
  } catch (error) {
    console.error('Failed to save main data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while saving main data.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
