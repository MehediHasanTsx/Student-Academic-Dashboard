import { db } from './database';
import { DEFAULT_GRADE_SCALE } from '@/lib/constants/grades';
import {
  DEFAULT_CURRENCY,
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_ATTENDANCE_TARGET,
  DEFAULT_TOTAL_CREDITS,
  SEMESTER_COUNT,
  DEFAULT_5TH_SEMESTER_SUBJECTS,
  DEFAULT_5TH_SEMESTER_ROUTINE,
} from '@/lib/constants';
import { generateId } from '@/lib/utils/formatters';
import type { Settings } from '@/types/database';

/**
 * Seeds the database with initial data on first launch.
 * Idempotent — safe to call multiple times.
 */
export async function seedDatabase(): Promise<void> {
  await seedSemesters();
  await seedGradeScale();
  await seedSettings();
  await seedInitialMainData();
}

export async function seedInitialMainData(force = false): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      const { mainDataService } = await import('@/lib/services/main-data.service');
      const subjectCount = await db().subjects.where('semesterId').equals('semester-5').count();
      if (subjectCount === 0 || force) {
        await mainDataService.syncSubjectsWithMain('semester-5');
      }
      const routineCount = await db().routine.where('semesterId').equals('semester-5').count();
      if (routineCount === 0 || force) {
        await mainDataService.syncRoutineWithMain('semester-5');
      }
      return;
    }
  } catch {
    // Fall back to local constants
  }
  await seed5thSemesterSubjects(force);
  await seed5thSemesterRoutine(force);
}

export async function seed5thSemesterSubjects(force = false): Promise<void> {
  if (!force) {
    const existingCount = await db().subjects.where('semesterId').equals('semester-5').count();
    if (existingCount > 0) return;
  }

  const now = new Date();
  const subjectsToInsert = DEFAULT_5TH_SEMESTER_SUBJECTS.map((s) => ({
    id: `subj-sem5-${s.code}`,
    semesterId: 'semester-5',
    ...s,
    createdAt: now,
    updatedAt: now,
  }));

  if (force) {
    // Upsert or overwrite default IDs
    for (const sub of subjectsToInsert) {
      await db().subjects.put(sub);
    }
  } else {
    await db().subjects.bulkAdd(subjectsToInsert);
  }
}

export async function seed5thSemesterRoutine(force = false): Promise<void> {
  if (!force) {
    const existingRoutineCount = await db().routine.where('semesterId').equals('semester-5').count();
    if (existingRoutineCount > 0) return;
  }

  const subjects = await db().subjects.where('semesterId').equals('semester-5').toArray();
  const subjectMap = new Map(subjects.map((s) => [s.code, s.id]));

  const now = new Date();
  const slotsToInsert = DEFAULT_5TH_SEMESTER_ROUTINE.map((r) => {
    const subjectId = subjectMap.get(r.subjectCode);
    if (!subjectId) return null;
    return {
      id: generateId(),
      semesterId: 'semester-5',
      subjectId,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      room: r.room,
      teacher: r.teacher,
      createdAt: now,
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  if (slotsToInsert.length > 0) {
    if (force) {
      await db().routine.where('semesterId').equals('semester-5').delete();
    }
    await db().routine.bulkAdd(slotsToInsert);
  }
}

async function seedSemesters(): Promise<void> {
  const count = await db().semesters.count();
  if (count >= SEMESTER_COUNT) return;

  // Clear and re-seed to ensure clean state
  await db().semesters.clear();

  const semesters = Array.from({ length: SEMESTER_COUNT }, (_, i) => ({
    id: `semester-${i + 1}`,
    number: i + 1,
    name: `Semester ${i + 1}`,
  }));

  await db().semesters.bulkAdd(semesters);
}

async function seedGradeScale(): Promise<void> {
  const count = await db().gradeScale.count();
  if (count > 0) return;

  const grades = DEFAULT_GRADE_SCALE.map((g) => ({
    ...g,
    id: generateId(),
  }));

  await db().gradeScale.bulkAdd(grades);
}

async function seedSettings(): Promise<void> {
  const existing = await db().settings.get('app-settings');
  if (existing) return;

  const settings: Settings = {
    id: 'app-settings',
    theme: 'system',
    currency: DEFAULT_CURRENCY,
    currencySymbol: DEFAULT_CURRENCY_SYMBOL,
    attendanceTarget: DEFAULT_ATTENDANCE_TARGET,
    totalRequiredCredits: DEFAULT_TOTAL_CREDITS,
    updatedAt: new Date(),
  };

  await db().settings.add(settings);
}
