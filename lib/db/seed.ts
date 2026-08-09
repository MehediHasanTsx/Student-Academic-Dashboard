import { db } from './database';
import { DEFAULT_GRADE_SCALE } from '@/lib/constants/grades';
import {
  DEFAULT_CURRENCY,
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_ATTENDANCE_TARGET,
  DEFAULT_TOTAL_CREDITS,
  SEMESTER_COUNT,
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
}

async function seedSemesters(): Promise<void> {
  const count = await db.semesters.count();
  if (count >= SEMESTER_COUNT) return;

  // Clear and re-seed to ensure clean state
  await db.semesters.clear();

  const semesters = Array.from({ length: SEMESTER_COUNT }, (_, i) => ({
    id: `semester-${i + 1}`,
    number: i + 1,
    name: `Semester ${i + 1}`,
  }));

  await db.semesters.bulkAdd(semesters);
}

async function seedGradeScale(): Promise<void> {
  const count = await db.gradeScale.count();
  if (count > 0) return;

  const grades = DEFAULT_GRADE_SCALE.map((g) => ({
    ...g,
    id: generateId(),
  }));

  await db.gradeScale.bulkAdd(grades);
}

async function seedSettings(): Promise<void> {
  const existing = await db.settings.get('app-settings');
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

  await db.settings.add(settings);
}
