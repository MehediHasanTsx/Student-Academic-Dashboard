// ── Attendance Status ──────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'medical' | 'holiday' | 'noClass';

// ── Subject Type ──────────────────────────────────────
export type SubjectType = 'theory' | 'lab';

// ── Fee Status ────────────────────────────────────────
export type FeeStatus = 'paid' | 'partial' | 'pending';

// ── Fee Type ──────────────────────────────────────────
export type FeeType =
  | 'semester'
  | 'admission'
  | 'registration'
  | 'formFillUp'
  | 'exam'
  | 'library'
  | 'lab'
  | 'other';

// ── Assignment ────────────────────────────────────────
export type AssignmentStatus = 'pending' | 'completed' | 'late';
export type AssignmentPriority = 'low' | 'medium' | 'high';

// ── Day of Week ───────────────────────────────────────
export type DayOfWeek = 'saturday' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

// ── Theme ─────────────────────────────────────────────
export type ThemeMode = 'dark' | 'light' | 'system';

// ── Database Entities ─────────────────────────────────

export interface Profile {
  id: string;
  fullName: string;
  university: string;
  department: string;
  studentId: string;
  rollNumber: string;
  registrationNumber: string;
  batch: string;
  session: string;
  phoneNumber: string;
  email?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  currentSemester: number; // 1–8
  profilePicture?: string; // base64 data URL
  createdAt: Date;
  updatedAt: Date;
}

export interface Semester {
  id: string;
  number: number; // 1–8
  name: string;   // "Semester 1"–"Semester 8"
}

export interface Subject {
  id: string;
  semesterId: string;
  code: string;
  name: string;
  teacher?: string;
  credits: number;
  type: SubjectType;
  classDays?: DayOfWeek[];
  startTime?: string;  // HH:mm
  endTime?: string;    // HH:mm
  room?: string;
  color?: string;      // hex color
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  id: string;
  subjectId: string;
  semesterId: string;
  date: string;        // ISO date string YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  createdAt: Date;
}

export interface Result {
  id: string;
  subjectId: string;
  semesterId: string;
  grade: string;       // e.g. "A+", "B-"
  gradePoint: number;
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeScale {
  id: string;
  grade: string;       // e.g. "A+"
  point: number;       // e.g. 4.00
  minMarks?: number;   // optional minimum marks
  order: number;       // display order
}

export interface Fee {
  id: string;
  semesterId: string;
  type: FeeType;
  amount: number;
  dueDate?: string;    // ISO date
  status: FeeStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  feeId?: string;      // optional link to a fee
  semesterId: string;
  amount: number;
  date: string;        // ISO date
  method?: string;
  note?: string;
  createdAt: Date;
}

export interface RoutineSlot {
  id: string;
  semesterId: string;
  dayOfWeek: DayOfWeek;
  subjectId: string;
  teacher?: string;
  room?: string;
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  createdAt: Date;
}

export interface Assignment {
  id: string;
  title: string;
  subjectId: string;
  semesterId: string;
  deadline: string;    // ISO datetime
  priority: AssignmentPriority;
  status: AssignmentStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Exam {
  id: string;
  name: string;
  subjectId: string;
  semesterId: string;
  date: string;        // ISO date
  time?: string;       // HH:mm
  room?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  semesterId?: string;
  subjectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settings {
  id: string;          // always 'app-settings'
  theme: ThemeMode;
  currency: string;    // default 'BDT'
  currencySymbol: string; // default '৳'
  attendanceTarget: number; // default 75
  totalRequiredCredits: number; // default 160
  updatedAt: Date;
}

// ── Lab Projects (preserved from v1) ──────────────────

export interface Project {
  id: string;
  title: string;
  labNumber: string;
  semesterId: string;
  subjectId: string;
  description: string;
  language: string;
  technologies: string[];
  tags: string[];
  sourceCode: string;
  fileName?: string;
  githubUrl?: string;
  liveDemoUrl?: string;
  notes?: string;
  overview?: string;
  objective?: string;
  conceptsLearned?: string;
  outputResult?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaRecord {
  id: string;
  value: string;
}
