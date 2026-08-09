import type { FeeType, AttendanceStatus, DayOfWeek } from '@/types/database';

// ── Fee Types ─────────────────────────────────────────

export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  semester: 'Semester Fee',
  admission: 'Admission Fee',
  registration: 'Registration Fee',
  formFillUp: 'Form Fill-up Fee',
  exam: 'Exam Fee',
  library: 'Library Fee',
  lab: 'Lab Fee',
  other: 'Other Fee',
};

export const FEE_TYPES = Object.keys(FEE_TYPE_LABELS) as FeeType[];

// ── Attendance Statuses ───────────────────────────────

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  medical: 'Medical Leave',
  holiday: 'Holiday',
  noClass: 'No Class',
};

export const ATTENDANCE_STATUS_ICONS: Record<AttendanceStatus, string> = {
  present: '✓',
  absent: '✕',
  late: '⏱',
  medical: '🏥',
  holiday: '🏖',
  noClass: '—',
};

/**
 * Which statuses count as "conducted" (class actually happened).
 * Medical leave, holiday, and no class are excluded.
 */
export const CONDUCTED_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late'];

/**
 * Which statuses count as "attended" (student was present).
 * Late counts as attended.
 */
export const ATTENDED_STATUSES: AttendanceStatus[] = ['present', 'late'];

// ── Days of Week ──────────────────────────────────────

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  saturday: 'Saturday',
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  saturday: 'Sat',
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
};

// ── Semesters ─────────────────────────────────────────

export const SEMESTER_COUNT = 8;

export const SEMESTER_NAMES = Array.from({ length: SEMESTER_COUNT }, (_, i) => `Semester ${i + 1}`);

// ── Subject Colors ────────────────────────────────────

export const SUBJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

// ── Default Settings ──────────────────────────────────

export const DEFAULT_CURRENCY = 'BDT';
export const DEFAULT_CURRENCY_SYMBOL = '৳';
export const DEFAULT_ATTENDANCE_TARGET = 75;
export const DEFAULT_TOTAL_CREDITS = 160;
