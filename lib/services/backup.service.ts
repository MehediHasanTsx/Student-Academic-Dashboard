import { db } from '@/lib/db/database';
import { z } from 'zod';
import { format } from 'date-fns';

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
const APP_NAME = 'student-academic-dashboard';

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
      db.profile.toArray(),
      db.semesters.toArray(),
      db.subjects.toArray(),
      db.attendance.toArray(),
      db.results.toArray(),
      db.gradeScale.toArray(),
      db.fees.toArray(),
      db.payments.toArray(),
      db.routine.toArray(),
      db.assignments.toArray(),
      db.exams.toArray(),
      db.notes.toArray(),
      db.settings.toArray(),
      db.projects.toArray(),
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
    const filename = `student-academic-backup-${dateStr}.json`;
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
    await db.transaction(
      'rw',
      [
        db.profile,
        db.semesters,
        db.subjects,
        db.attendance,
        db.results,
        db.gradeScale,
        db.fees,
        db.payments,
        db.routine,
        db.assignments,
        db.exams,
        db.notes,
        db.settings,
        db.projects,
      ],
      async () => {
        await db.profile.clear();
        if (backup.data.profile.length) await db.profile.bulkAdd(backup.data.profile as never[]);

        await db.semesters.clear();
        if (backup.data.semesters.length) await db.semesters.bulkAdd(backup.data.semesters as never[]);

        await db.subjects.clear();
        if (backup.data.subjects.length) await db.subjects.bulkAdd(backup.data.subjects as never[]);

        await db.attendance.clear();
        if (backup.data.attendance.length) await db.attendance.bulkAdd(backup.data.attendance as never[]);

        await db.results.clear();
        if (backup.data.results.length) await db.results.bulkAdd(backup.data.results as never[]);

        await db.gradeScale.clear();
        if (backup.data.gradeScale.length) await db.gradeScale.bulkAdd(backup.data.gradeScale as never[]);

        await db.fees.clear();
        if (backup.data.fees.length) await db.fees.bulkAdd(backup.data.fees as never[]);

        await db.payments.clear();
        if (backup.data.payments.length) await db.payments.bulkAdd(backup.data.payments as never[]);

        await db.routine.clear();
        if (backup.data.routine.length) await db.routine.bulkAdd(backup.data.routine as never[]);

        await db.assignments.clear();
        if (backup.data.assignments.length) await db.assignments.bulkAdd(backup.data.assignments as never[]);

        await db.exams.clear();
        if (backup.data.exams.length) await db.exams.bulkAdd(backup.data.exams as never[]);

        await db.notes.clear();
        if (backup.data.notes.length) await db.notes.bulkAdd(backup.data.notes as never[]);

        await db.settings.clear();
        if (backup.data.settings.length) await db.settings.bulkAdd(backup.data.settings as never[]);

        await db.projects.clear();
        if (backup.data.projects.length) await db.projects.bulkAdd(backup.data.projects as never[]);
      }
    );
  },

  /**
   * Export attendance as CSV.
   */
  async exportAttendanceCsv(semesterId: string): Promise<string> {
    const [attendance, subjects] = await Promise.all([
      db.attendance.where('semesterId').equals(semesterId).toArray(),
      db.subjects.where('semesterId').equals(semesterId).toArray(),
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
    await db.delete();
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
