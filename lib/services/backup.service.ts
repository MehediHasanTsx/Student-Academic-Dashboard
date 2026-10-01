import { db } from '@/lib/db/database';
import { z } from 'zod';
import { format } from 'date-fns';

/**
 * Recursively converts ISO 8601 date strings back to Date objects.
 * JSON.parse() loses Date types, so we need to revive them after parsing.
 */
function reviveDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      const d = new Date(obj);
      if (!isNaN(d.getTime())) return d as unknown as T;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(reviveDates) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = reviveDates(value);
    }
    return result as T;
  }
  return obj;
}

/**
 * Backup file structure.
 */
interface BackupData {
  version: number;
  createdAt: string;
  appName: string;
  data: {
    profile: unknown[];
    semesters: unknown[];
    subjects: unknown[];
    attendance: unknown[];
    results: unknown[];
    gradeScale: unknown[];
    fees: unknown[];
    payments: unknown[];
    routine: unknown[];
    assignments: unknown[];
    exams: unknown[];
    notes: unknown[];
    settings: unknown[];
    projects: unknown[];
  };
}

const BACKUP_VERSION = 2;
const APP_NAME = 'dcc-cse';

/**
 * Basic schema to validate backup file structure before importing.
 */
const backupSchema = z.object({
  version: z.number().int().min(1),
  createdAt: z.string(),
  appName: z.literal(APP_NAME),
  data: z.object({
    profile: z.array(z.unknown()),
    semesters: z.array(z.unknown()),
    subjects: z.array(z.unknown()),
    attendance: z.array(z.unknown()),
    results: z.array(z.unknown()),
    gradeScale: z.array(z.unknown()),
    fees: z.array(z.unknown()),
    payments: z.array(z.unknown()),
    routine: z.array(z.unknown()),
    assignments: z.array(z.unknown()),
    exams: z.array(z.unknown()),
    notes: z.array(z.unknown()),
    settings: z.array(z.unknown()),
    projects: z.array(z.unknown()),
  }),
});

export const backupService = {
  /**
   * Export all data as a JSON backup file.
   */
  async exportBackup(): Promise<{ data: string; filename: string }> {
    const [
      profile, semesters, subjects, attendance, results,
      gradeScale, fees, payments, routine, assignments,
      exams, notes, settings, projects,
    ] = await Promise.all([
      db().profile.toArray(),
      db().semesters.toArray(),
      db().subjects.toArray(),
      db().attendance.toArray(),
      db().results.toArray(),
      db().gradeScale.toArray(),
      db().fees.toArray(),
      db().payments.toArray(),
      db().routine.toArray(),
      db().assignments.toArray(),
      db().exams.toArray(),
      db().notes.toArray(),
      db().settings.toArray(),
      db().projects.toArray(),
    ]);

    const backup: BackupData = {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appName: APP_NAME,
      data: {
        profile, semesters, subjects, attendance, results,
        gradeScale, fees, payments, routine, assignments,
        exams, notes, settings, projects,
      },
    };

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `dcc-cse-backup-${dateStr}.json`;
    const data = JSON.stringify(backup, null, 2);

    return { data, filename };
  },

  /**
   * Validate a backup file before importing.
   */
  validateBackup(jsonString: string): { valid: boolean; error?: string; data?: BackupData } {
    try {
      const parsed = JSON.parse(jsonString);
      const result = backupSchema.safeParse(parsed);

      if (!result.success) {
        return { valid: false, error: 'Invalid backup file format. The file structure does not match the expected format.' };
      }

      return { valid: true, data: parsed as BackupData };
    } catch {
      return { valid: false, error: 'Invalid JSON file. The file could not be parsed.' };
    }
  },

  /**
   * Import a validated backup, replacing all existing data.
   */
  async importBackup(backup: BackupData): Promise<void> {
    // Revive date strings back to Date objects (JSON parse loses Date types)
    const d = reviveDates(backup.data);

    await db().transaction(
      'rw',
      [
        db().profile,
        db().semesters,
        db().subjects,
        db().attendance,
        db().results,
        db().gradeScale,
        db().fees,
        db().payments,
        db().routine,
        db().assignments,
        db().exams,
        db().notes,
        db().settings,
        db().projects,
      ],
      async () => {
        await db().profile.clear();
        if (d.profile.length) await db().profile.bulkAdd(d.profile as never[]);

        await db().semesters.clear();
        if (d.semesters.length) await db().semesters.bulkAdd(d.semesters as never[]);

        await db().subjects.clear();
        if (d.subjects.length) await db().subjects.bulkAdd(d.subjects as never[]);

        await db().attendance.clear();
        if (d.attendance.length) await db().attendance.bulkAdd(d.attendance as never[]);

        await db().results.clear();
        if (d.results.length) await db().results.bulkAdd(d.results as never[]);

        await db().gradeScale.clear();
        if (d.gradeScale.length) await db().gradeScale.bulkAdd(d.gradeScale as never[]);

        await db().fees.clear();
        if (d.fees.length) await db().fees.bulkAdd(d.fees as never[]);

        await db().payments.clear();
        if (d.payments.length) await db().payments.bulkAdd(d.payments as never[]);

        await db().routine.clear();
        if (d.routine.length) await db().routine.bulkAdd(d.routine as never[]);

        await db().assignments.clear();
        if (d.assignments.length) await db().assignments.bulkAdd(d.assignments as never[]);

        await db().exams.clear();
        if (d.exams.length) await db().exams.bulkAdd(d.exams as never[]);

        await db().notes.clear();
        if (d.notes.length) await db().notes.bulkAdd(d.notes as never[]);

        await db().settings.clear();
        if (d.settings.length) await db().settings.bulkAdd(d.settings as never[]);

        await db().projects.clear();
        if (d.projects.length) await db().projects.bulkAdd(d.projects as never[]);
      }
    );
  },

  /**
   * Export attendance as CSV.
   */
  async exportAttendanceCsv(semesterId: string): Promise<string> {
    const [attendance, subjects] = await Promise.all([
      db().attendance.where('semesterId').equals(semesterId).toArray(),
      db().subjects.where('semesterId').equals(semesterId).toArray(),
    ]);

    const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
    const header = 'Date,Subject,Status,Note\n';
    const rows = attendance
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(a => `${a.date},"${subjectMap.get(a.subjectId) || 'Unknown'}",${a.status},"${a.note || ''}"`)
      .join('\n');

    return header + rows;
  },

  /**
   * Completely reset the application.
   */
  async resetApplication(): Promise<void> {
    await db().delete();
    window.location.reload();
  },

  /**
   * Download a string as a file.
   */
  downloadFile(content: string, filename: string, mimeType: string = 'application/json'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
