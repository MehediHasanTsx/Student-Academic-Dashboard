import Dexie, { type EntityTable } from 'dexie';
import type {
  Profile,
  Semester,
  Subject,
  Attendance,
  Result,
  GradeScale,
  Fee,
  Payment,
  RoutineSlot,
  Assignment,
  Exam,
  Note,
  Settings,
  Project,
  MetaRecord,
} from '@/types/database';

// ── Database Instance ─────────────────────────────────

const db = new Dexie('student_academic_dashboard') as Dexie & {
  profile: EntityTable<Profile, 'id'>;
  semesters: EntityTable<Semester, 'id'>;
  subjects: EntityTable<Subject, 'id'>;
  attendance: EntityTable<Attendance, 'id'>;
  results: EntityTable<Result, 'id'>;
  gradeScale: EntityTable<GradeScale, 'id'>;
  fees: EntityTable<Fee, 'id'>;
  payments: EntityTable<Payment, 'id'>;
  routine: EntityTable<RoutineSlot, 'id'>;
  assignments: EntityTable<Assignment, 'id'>;
  exams: EntityTable<Exam, 'id'>;
  notes: EntityTable<Note, 'id'>;
  settings: EntityTable<Settings, 'id'>;
  projects: EntityTable<Project, 'id'>;
  meta: EntityTable<MetaRecord, 'id'>;
};

// ── Schema Versions ───────────────────────────────────

// Version 1: Original Lab Projects schema
db.version(1).stores({
  semesters: 'id, yearNumber, semesterNumber',
  subjects: 'id, semesterId, name',
  projects: 'id, semesterId, subjectId, language, createdAt, updatedAt, [semesterId+subjectId]',
  meta: 'id',
});

// Version 2: Full academic dashboard
db.version(2).stores({
  profile: 'id',
  semesters: 'id, number',
  subjects: 'id, semesterId, code, name',
  attendance: 'id, subjectId, semesterId, date, status, [semesterId+date], [subjectId+date], [semesterId+subjectId]',
  results: 'id, subjectId, semesterId, [semesterId+subjectId]',
  gradeScale: 'id, grade, order',
  fees: 'id, semesterId, type, status, [semesterId+type]',
  payments: 'id, feeId, semesterId, date, [semesterId+date]',
  routine: 'id, semesterId, dayOfWeek, subjectId, [semesterId+dayOfWeek]',
  assignments: 'id, semesterId, subjectId, status, deadline, [semesterId+status]',
  exams: 'id, semesterId, subjectId, date, [semesterId+date]',
  notes: 'id, semesterId, subjectId, updatedAt',
  settings: 'id',
  projects: 'id, semesterId, subjectId, language, createdAt, updatedAt, [semesterId+subjectId]',
  meta: 'id',
}).upgrade(tx => {
  // Migrate v1 semesters to v2 format
  return tx.table('semesters').toCollection().modify(semester => {
    if ('semesterNumber' in semester && !('number' in semester)) {
      (semester as Record<string, unknown>).number = (semester as Record<string, unknown>).semesterNumber;
    }
    if (!('name' in semester) || !(semester as Record<string, unknown>).name) {
      (semester as Record<string, unknown>).name = `Semester ${(semester as Record<string, unknown>).number || (semester as Record<string, unknown>).semesterNumber}`;
    }
  });
});

export { db };
