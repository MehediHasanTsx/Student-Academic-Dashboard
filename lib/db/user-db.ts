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

// ── Type for User-Scoped Database ─────────────────────

export type UserDatabase = Dexie & {
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

/**
 * Create a new Dexie database instance scoped to a specific user.
 * Each user gets their own IndexedDB database: `dcc_cse_user_{userId}`
 *
 * This ensures complete data isolation between users on the same device.
 */
export function createUserDatabase(userId: string): UserDatabase {
  const dbName = `dcc_cse_user_${userId}`;
  const db = new Dexie(dbName) as UserDatabase;

  // Use the same schema as the original v2 database
  db.version(1).stores({
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
  });

  return db;
}

// ── Active Database Singleton ─────────────────────────

let _activeDb: UserDatabase | null = null;
let _activeUserId: string | null = null;
const _listeners: Array<(db: UserDatabase | null) => void> = [];

/**
 * Set the active user and open their database.
 */
export function setActiveUser(userId: string): UserDatabase {
  if (_activeUserId === userId && _activeDb) {
    return _activeDb;
  }

  // Close previous database if open
  if (_activeDb) {
    _activeDb.close();
  }

  _activeUserId = userId;
  _activeDb = createUserDatabase(userId);

  // Notify listeners
  for (const listener of _listeners) {
    listener(_activeDb);
  }

  return _activeDb;
}

/**
 * Clear the active user (on logout).
 */
export function clearActiveUser(): void {
  if (_activeDb) {
    _activeDb.close();
  }
  _activeDb = null;
  _activeUserId = null;

  // Notify listeners
  for (const listener of _listeners) {
    listener(null);
  }
}

/**
 * Get the currently active user's database.
 * Throws if no user is active (should only be called within authenticated context).
 */
export function getActiveDb(): UserDatabase {
  if (!_activeDb) {
    throw new Error(
      'No active database. User must be logged in before accessing data.'
    );
  }
  return _activeDb;
}

/**
 * Get the active user ID, or null if none.
 */
export function getActiveUserId(): string | null {
  return _activeUserId;
}

/**
 * Subscribe to database changes (user login/logout).
 * Returns an unsubscribe function.
 */
export function onDatabaseChange(
  listener: (db: UserDatabase | null) => void
): () => void {
  _listeners.push(listener);
  return () => {
    const idx = _listeners.indexOf(listener);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}
