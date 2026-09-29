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

// ── Default 5th Semester Subjects (DCC CSE) ───────────

export const DEFAULT_5TH_SEMESTER_SUBJECTS = [
  {
    code: '530201',
    name: 'Peripheral and Interfacing',
    teacher: 'Md. Mustafa Kamal',
    credits: 3,
    type: 'theory' as const,
    room: '641',
    color: '#3b82f6',
    order: 0,
  },
  {
    code: '530202',
    name: 'Peripheral and Interfacing Lab',
    teacher: 'Mustafa Kamal / Md. Shahiduzzaman Torun / Sheuli Saha',
    credits: 1.5,
    type: 'lab' as const,
    room: '431',
    color: '#6366f1',
    order: 1,
  },
  {
    code: '530203',
    name: 'Data and Telecommunications',
    teacher: 'Nudar Mawla',
    credits: 3,
    type: 'theory' as const,
    room: '641',
    color: '#14b8a6',
    order: 2,
  },
  {
    code: '530204',
    name: 'Data and Telecommunications Lab',
    teacher: 'Nudar Mawla / Salma Parvin',
    credits: 1.5,
    type: 'lab' as const,
    room: '533',
    color: '#06b6d4',
    order: 3,
  },
  {
    code: '530205',
    name: 'Operating System',
    teacher: 'Shirin Aktar',
    credits: 3,
    type: 'theory' as const,
    room: '641',
    color: '#f59e0b',
    order: 4,
  },
  {
    code: '530206',
    name: 'Operating System Lab',
    teacher: 'Shamima Sultana / Md. Mustafizur Rahman / Shirin Aktar',
    credits: 1.5,
    type: 'lab' as const,
    room: '422',
    color: '#f97316',
    order: 5,
  },
  {
    code: '530207',
    name: 'Economics',
    teacher: 'Nadira Jahan Chowdhury / Jannatul Ferdoushi',
    credits: 3,
    type: 'theory' as const,
    room: '641',
    color: '#8b5cf6',
    order: 6,
  },
];

export const DEFAULT_5TH_SEMESTER_ROUTINE = [
  // Sunday
  { subjectCode: '530204', dayOfWeek: 'sunday' as DayOfWeek, startTime: '10:40', endTime: '12:00', room: '533', teacher: 'Salma Parvin' },
  { subjectCode: '530205', dayOfWeek: 'sunday' as DayOfWeek, startTime: '12:20', endTime: '13:00', room: '641', teacher: 'Shirin Aktar' },
  { subjectCode: '530203', dayOfWeek: 'sunday' as DayOfWeek, startTime: '13:00', endTime: '13:40', room: '641', teacher: 'Nudar Mawla' },
  { subjectCode: '530201', dayOfWeek: 'sunday' as DayOfWeek, startTime: '13:40', endTime: '14:20', room: '641', teacher: 'Md. Mustafa Kamal' },
  { subjectCode: '530202', dayOfWeek: 'sunday' as DayOfWeek, startTime: '14:30', endTime: '15:30', room: '431', teacher: 'Sheuli Saha' },

  // Monday
  { subjectCode: '530203', dayOfWeek: 'monday' as DayOfWeek, startTime: '12:20', endTime: '13:00', room: '641', teacher: 'Nudar Mawla' },
  { subjectCode: '530207', dayOfWeek: 'monday' as DayOfWeek, startTime: '13:00', endTime: '13:40', room: '641', teacher: 'Nadira Jahan Chowdhury' },
  { subjectCode: '530201', dayOfWeek: 'monday' as DayOfWeek, startTime: '13:40', endTime: '14:20', room: '641', teacher: 'Md. Mustafa Kamal' },
  { subjectCode: '530204', dayOfWeek: 'monday' as DayOfWeek, startTime: '14:30', endTime: '15:30', room: '422', teacher: 'Salma Parvin' },

  // Wednesday
  { subjectCode: '530202', dayOfWeek: 'wednesday' as DayOfWeek, startTime: '10:40', endTime: '12:00', room: '431', teacher: 'Sheuli Saha' },
  { subjectCode: '530207', dayOfWeek: 'wednesday' as DayOfWeek, startTime: '12:20', endTime: '13:00', room: '641', teacher: 'Jannatul Ferdoushi' },
  { subjectCode: '530205', dayOfWeek: 'wednesday' as DayOfWeek, startTime: '13:00', endTime: '13:40', room: '641', teacher: 'Shirin Aktar' },
  { subjectCode: '530201', dayOfWeek: 'wednesday' as DayOfWeek, startTime: '13:40', endTime: '14:20', room: '641', teacher: 'Md. Mustafa Kamal' },

  // Thursday
  { subjectCode: '530206', dayOfWeek: 'thursday' as DayOfWeek, startTime: '10:40', endTime: '12:00', room: '422', teacher: 'Shamima Sultana' },
  { subjectCode: '530203', dayOfWeek: 'thursday' as DayOfWeek, startTime: '12:20', endTime: '13:00', room: '641', teacher: 'Nudar Mawla' },
  { subjectCode: '530207', dayOfWeek: 'thursday' as DayOfWeek, startTime: '13:00', endTime: '13:40', room: '641', teacher: 'Nadira Jahan Chowdhury' },
  { subjectCode: '530205', dayOfWeek: 'thursday' as DayOfWeek, startTime: '13:40', endTime: '14:20', room: '641', teacher: 'Shirin Aktar' },
];
