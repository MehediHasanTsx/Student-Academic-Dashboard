import Dexie from 'dexie';
import { getActiveDb } from './user-db';

const OLD_DB_NAME = 'student_academic_dashboard';

/**
 * Check if the old single-user database exists.
 */
export async function hasOldDatabase(): Promise<boolean> {
  try {
    const databases = await Dexie.getDatabaseNames();
    return databases.includes(OLD_DB_NAME);
  } catch {
    return false;
  }
}

/**
 * Migrate all data from the old single-user database to the current user's scoped database.
 * After successful migration, marks the old database as migrated.
 */
export async function migrateOldData(): Promise<{ migrated: boolean; error?: string }> {
  try {
    const oldDb = new Dexie(OLD_DB_NAME);

    // Try to open with the known v2 schema
    oldDb.version(2).stores({
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

    await oldDb.open();

    // Check if there's actually any data to migrate
    const profileCount = await oldDb.table('profile').count();
    if (profileCount === 0) {
      oldDb.close();
      return { migrated: false };
    }

    const newDb = getActiveDb();
    const tables = [
      'profile', 'semesters', 'subjects', 'attendance', 'results',
      'gradeScale', 'fees', 'payments', 'routine', 'assignments',
      'exams', 'notes', 'settings', 'projects', 'meta',
    ];

    for (const tableName of tables) {
      try {
        const oldData = await oldDb.table(tableName).toArray();
        if (oldData.length > 0) {
          // Clear existing data in new DB for this table first
          await newDb.table(tableName).clear();
          await newDb.table(tableName).bulkAdd(oldData);
        }
      } catch {
        // Table might not exist in old DB, skip
        console.warn(`Skipping migration for table: ${tableName}`);
      }
    }

    oldDb.close();

    // Mark old database as migrated by deleting it
    await Dexie.delete(OLD_DB_NAME);

    return { migrated: true };
  } catch (err) {
    console.error('Migration error:', err);
    return {
      migrated: false,
      error: err instanceof Error ? err.message : 'Unknown error during migration',
    };
  }
}
