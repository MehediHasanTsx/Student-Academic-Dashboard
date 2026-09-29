import { db } from '@/lib/db/database';

/**
 * Cloud sync service — syncs all IndexedDB data to/from the server (Neon PostgreSQL).
 *
 * Strategy: Store a full JSON snapshot of all tables as a single JSONB blob.
 * - On login (new device): download snapshot → populate IndexedDB
 * - After data changes: upload snapshot → overwrite server blob (debounced)
 * - On tab focus / reload: refresh from server if data changed on another device
 * - On tab hide / close: flush pending uploads immediately
 * - Conflict resolution: last-write-wins with timestamp comparison
 */

// ── Types ────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

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

// ── Internal State ───────────────────────────────────

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DELAY_MS = 1500; // 1.5 seconds after last change for quick feedback

/** Flag to suppress re-uploading data that was just downloaded from server */
let _isSyncing = false;

/** Last known server-side updatedAt timestamp (ISO string) */
let _lastServerTimestamp: string | null = null;

let _syncStatus: SyncStatus = 'idle';
let _lastSyncTime: Date | null = null;
let _hasPendingChanges = false;
const _statusListeners: Array<(status: SyncStatus, lastSyncTime: Date | null) => void> = [];

function setSyncStatus(status: SyncStatus) {
  _syncStatus = status;
  for (const listener of _statusListeners) {
    listener(_syncStatus, _lastSyncTime);
  }
}

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
  _isSyncing = true;
  try {
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
  } finally {
    // Small delay to let any remaining Dexie hooks settle before allowing uploads
    setTimeout(() => { _isSyncing = false; }, 500);
  }
}

// ── Public API ───────────────────────────────────────

export const cloudSyncService = {
  /** Returns true if the service is currently importing data from the server */
  isSyncing(): boolean {
    return _isSyncing;
  },

  /** Get current sync status ('idle' | 'syncing' | 'synced' | 'error') */
  getStatus(): SyncStatus {
    return _syncStatus;
  },

  /** Get timestamp of the last successful sync */
  getLastSyncTime(): Date | null {
    return _lastSyncTime;
  },

  /** Check if there are changes waiting to be pushed */
  hasPendingChanges(): boolean {
    return _hasPendingChanges || _syncTimer !== null;
  },

  /** Subscribe to sync status updates */
  subscribe(listener: (status: SyncStatus, lastSyncTime: Date | null) => void): () => void {
    _statusListeners.push(listener);
    listener(_syncStatus, _lastSyncTime);
    return () => {
      const idx = _statusListeners.indexOf(listener);
      if (idx >= 0) _statusListeners.splice(idx, 1);
    };
  },

  /**
   * Download all data from the server and populate IndexedDB.
   * Called on login when the local database is empty or on a new device.
   * Returns true if data was restored, false if no server data exists.
   */
  async downloadFromServer(): Promise<boolean> {
    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/sync', { credentials: 'include' });
      if (!res.ok) {
        setSyncStatus('idle');
        return false;
      }

      const { data, updatedAt } = await res.json();
      if (!data) {
        setSyncStatus('idle');
        return false;
      }

      _lastServerTimestamp = updatedAt ?? null;
      await importSnapshot(data as SyncData);
      _lastSyncTime = updatedAt ? new Date(updatedAt) : new Date();
      setSyncStatus('synced');
      console.log('✅ All data restored from cloud');
      return true;
    } catch (err) {
      console.warn('Cloud sync download failed:', err);
      setSyncStatus('error');
      return false;
    }
  },

  /**
   * Upload all IndexedDB data to the server.
   * Called after data changes to keep the server in sync.
   */
  async uploadToServer(): Promise<boolean> {
    if (_isSyncing) return false; // Don't upload while importing
    setSyncStatus('syncing');

    try {
      const snapshot = await exportSnapshot();

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: snapshot }),
        keepalive: true, // Ensure upload completes even if page is closing
      });

      if (!res.ok) {
        console.warn('Cloud sync upload failed:', res.status);
        setSyncStatus('error');
        return false;
      }

      // Update our known timestamp from server response
      try {
        const result = await res.json();
        if (result.updatedAt) {
          _lastServerTimestamp = result.updatedAt;
          _lastSyncTime = new Date(result.updatedAt);
        } else {
          _lastSyncTime = new Date();
        }
      } catch {
        _lastSyncTime = new Date();
      }

      _hasPendingChanges = false;
      setSyncStatus('synced');
      console.log('✅ Data synced to cloud');
      return true;
    } catch (err) {
      console.warn('Cloud sync upload failed:', err);
      setSyncStatus('error');
      return false;
    }
  },

  /**
   * Force an immediate sync now.
   */
  async forceSync(): Promise<boolean> {
    this.cancelPendingUpload();
    return await this.uploadToServer();
  },

  /**
   * Schedule a debounced upload to the server.
   * Call this after any data change. Multiple rapid changes
   * will be batched into a single upload.
   */
  scheduleUpload(): void {
    if (_isSyncing) return; // Don't re-upload data we just downloaded
    _hasPendingChanges = true;
    setSyncStatus('syncing');

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

  /**
   * Flush any pending upload immediately.
   * Call when the user is about to leave the page (tab hidden, page closing).
   */
  async flushPendingUpload(): Promise<void> {
    if (_syncTimer || _hasPendingChanges) {
      if (_syncTimer) {
        clearTimeout(_syncTimer);
        _syncTimer = null;
      }
      await cloudSyncService.uploadToServer();
    }
  },

  /**
   * Refresh local data from the server if it has changed.
   * Compares server timestamp with our last known timestamp to avoid
   * redundant downloads.
   */
  async refreshFromServer(): Promise<boolean> {
    if (_isSyncing) return false;
    try {
      const res = await fetch('/api/sync', { credentials: 'include' });
      if (!res.ok) return false;

      const { data, updatedAt } = await res.json();
      if (!data) return false;

      // Skip if we already have this exact version
      if (updatedAt && _lastServerTimestamp && updatedAt === _lastServerTimestamp) {
        return false;
      }

      _lastServerTimestamp = updatedAt ?? null;
      await importSnapshot(data as SyncData);
      _lastSyncTime = updatedAt ? new Date(updatedAt) : new Date();
      setSyncStatus('synced');
      console.log('✅ Data refreshed from cloud (changes from another device)');
      return true;
    } catch (err) {
      console.warn('Cloud sync refresh failed:', err);
      return false;
    }
  },
};
