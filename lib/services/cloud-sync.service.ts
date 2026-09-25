import { db } from '@/lib/db/database';

/**
 * Cloud sync service — syncs all IndexedDB data to/from the server (Neon PostgreSQL).
 *
 * Strategy: Store a full JSON snapshot of all tables as a single JSONB blob.
 * - On login (new device): download snapshot → populate IndexedDB
 * - After data changes: upload snapshot → overwrite server blob (debounced)
 * - Conflict resolution: last-write-wins
 */

// ── Types ────────────────────────────────────────────

interface SyncData {
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
}

// ── Debounce Timer ───────────────────────────────────

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DELAY_MS = 3000; // 3 seconds after last change

// ── Export all IndexedDB data as a snapshot ───────────

async function exportSnapshot(): Promise<SyncData> {
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

  return {
    profile, semesters, subjects, attendance, results,
    gradeScale, fees, payments, routine, assignments,
    exams, notes, settings, projects,
  };
}

// ── Import snapshot into IndexedDB ───────────────────

async function importSnapshot(data: SyncData): Promise<void> {
  await db().transaction(
    'rw',
    [
      db().profile, db().semesters, db().subjects, db().attendance,
      db().results, db().gradeScale, db().fees, db().payments,
      db().routine, db().assignments, db().exams, db().notes,
      db().settings, db().projects,
    ],
    async () => {
      // Clear all tables first
      await Promise.all([
        db().profile.clear(),
        db().semesters.clear(),
        db().subjects.clear(),
        db().attendance.clear(),
        db().results.clear(),
        db().gradeScale.clear(),
        db().fees.clear(),
        db().payments.clear(),
        db().routine.clear(),
        db().assignments.clear(),
        db().exams.clear(),
        db().notes.clear(),
        db().settings.clear(),
        db().projects.clear(),
      ]);

      // Import all data
      if (data.profile?.length) await db().profile.bulkAdd(data.profile as never[]);
      if (data.semesters?.length) await db().semesters.bulkAdd(data.semesters as never[]);
      if (data.subjects?.length) await db().subjects.bulkAdd(data.subjects as never[]);
      if (data.attendance?.length) await db().attendance.bulkAdd(data.attendance as never[]);
      if (data.results?.length) await db().results.bulkAdd(data.results as never[]);
      if (data.gradeScale?.length) await db().gradeScale.bulkAdd(data.gradeScale as never[]);
      if (data.fees?.length) await db().fees.bulkAdd(data.fees as never[]);
      if (data.payments?.length) await db().payments.bulkAdd(data.payments as never[]);
      if (data.routine?.length) await db().routine.bulkAdd(data.routine as never[]);
      if (data.assignments?.length) await db().assignments.bulkAdd(data.assignments as never[]);
      if (data.exams?.length) await db().exams.bulkAdd(data.exams as never[]);
      if (data.notes?.length) await db().notes.bulkAdd(data.notes as never[]);
      if (data.settings?.length) await db().settings.bulkAdd(data.settings as never[]);
      if (data.projects?.length) await db().projects.bulkAdd(data.projects as never[]);
    }
  );
}

// ── Public API ───────────────────────────────────────

export const cloudSyncService = {
  /**
   * Download all data from the server and populate IndexedDB.
   * Called on login when the local database is empty or on a new device.
   * Returns true if data was restored, false if no server data exists.
   */
  async downloadFromServer(): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', { credentials: 'include' });
      if (!res.ok) return false;

      const { data } = await res.json();
      if (!data) return false;

      await importSnapshot(data as SyncData);
      console.log('✅ All data restored from cloud');
      return true;
    } catch (err) {
      console.warn('Cloud sync download failed:', err);
      return false;
    }
  },

  /**
   * Upload all IndexedDB data to the server.
   * Called after data changes to keep the server in sync.
   */
  async uploadToServer(): Promise<boolean> {
    try {
      const snapshot = await exportSnapshot();

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: snapshot }),
      });

      if (!res.ok) {
        console.warn('Cloud sync upload failed:', res.status);
        return false;
      }

      console.log('✅ Data synced to cloud');
      return true;
    } catch (err) {
      console.warn('Cloud sync upload failed:', err);
      return false;
    }
  },

  /**
   * Schedule a debounced upload to the server.
   * Call this after any data change. Multiple rapid changes
   * will be batched into a single upload.
   */
  scheduleUpload(): void {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => {
      _syncTimer = null;
      void cloudSyncService.uploadToServer();
    }, SYNC_DELAY_MS);
  },

  /**
   * Cancel any pending upload.
   */
  cancelPendingUpload(): void {
    if (_syncTimer) {
      clearTimeout(_syncTimer);
      _syncTimer = null;
    }
  },
};
