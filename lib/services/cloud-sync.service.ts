import { db } from '@/lib/db/database';
import { getActiveUserId } from '@/lib/db/user-db';

/**
 * Cloud Sync Service — Two-way, multi-device synchronization engine
 * Syncs IndexedDB local data with Neon PostgreSQL cloud database.
 *
 * Capabilities:
 * - Smart Sync: Compares timestamps between local device and cloud to pick the latest version.
 * - Push to Cloud: Explicitly uploads this device's data as the cloud source of truth.
 * - Pull from Cloud: Explicitly downloads the cloud snapshot and updates this device.
 * - Auto-sync: Debounced background upload on any data edit (1.5s).
 * - Multi-device awareness: Checks for changes made on other devices when tab is focused.
 * - Safe persistence: Preserves sync state in localStorage across page reloads.
 */

// ── Types ────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncData {
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

export type SmartSyncResult =
  | { success: true; action: 'uploaded' | 'downloaded' | 'up_to_date'; message: string }
  | { success: false; action: 'error'; message: string };

// ── Local Storage Helpers ─────────────────────────────

function getStorageKey(key: string): string {
  const userId = getActiveUserId() || 'global';
  return `dcc_sync_${userId}_${key}`;
}

function getStoredString(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(getStorageKey(key));
  } catch {
    return null;
  }
}

function setStoredString(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      localStorage.removeItem(getStorageKey(key));
    } else {
      localStorage.setItem(getStorageKey(key), value);
    }
  } catch {
    // Ignore storage quota errors
  }
}

// ── Internal State ───────────────────────────────────

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DELAY_MS = 1500;

/** Flag to suppress re-uploading data that was just downloaded from server */
let _isSyncing = false;

let _syncStatus: SyncStatus = 'idle';
let _lastSyncTime: Date | null = null;
const _statusListeners: Array<(status: SyncStatus, lastSyncTime: Date | null) => void> = [];

function setSyncStatus(status: SyncStatus) {
  _syncStatus = status;
  for (const listener of _statusListeners) {
    listener(_syncStatus, _lastSyncTime);
  }
}

// ── Snapshot Helpers ─────────────────────────────────

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
    // Settle Dexie hooks before allowing uploads
    setTimeout(() => { _isSyncing = false; }, 500);
  }
}

// ── Public Service ───────────────────────────────────

export const cloudSyncService = {
  isSyncing(): boolean {
    return _isSyncing;
  },

  getStatus(): SyncStatus {
    return _syncStatus;
  },

  getLastSyncTime(): Date | null {
    if (!_lastSyncTime) {
      const stored = getStoredString('last_sync_time');
      if (stored) _lastSyncTime = new Date(stored);
    }
    return _lastSyncTime;
  },

  hasPendingChanges(): boolean {
    return getStoredString('has_pending') === 'true' || _syncTimer !== null;
  },

  subscribe(listener: (status: SyncStatus, lastSyncTime: Date | null) => void): () => void {
    _statusListeners.push(listener);
    listener(_syncStatus, this.getLastSyncTime());
    return () => {
      const idx = _statusListeners.indexOf(listener);
      if (idx >= 0) _statusListeners.splice(idx, 1);
    };
  },

  /**
   * Explicit Push: Force upload current device's local data to the cloud.
   * Useful when user knows this device holds the freshest data (e.g., phone).
   */
  async pushToCloud(): Promise<boolean> {
    if (_isSyncing) return false;
    this.cancelPendingUpload();
    setSyncStatus('syncing');

    try {
      const snapshot = await exportSnapshot();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: snapshot }),
        keepalive: true,
      });

      if (!res.ok) {
        setSyncStatus('error');
        return false;
      }

      const result = await res.json();
      const serverTs = result.updatedAt || new Date().toISOString();

      setStoredString('last_server_ts', serverTs);
      setStoredString('last_sync_time', serverTs);
      setStoredString('has_pending', 'false');
      setStoredString('last_local_edit', null);

      _lastSyncTime = new Date(serverTs);
      setSyncStatus('synced');
      console.log('✅ Local data uploaded as cloud source of truth');
      return true;
    } catch (err) {
      console.error('Push to cloud failed:', err);
      setSyncStatus('error');
      return false;
    }
  },

  /**
   * Explicit Pull: Force download cloud snapshot to overwrite local device.
   * Useful when device needs to catch up to the latest cloud version.
   */
  async pullFromCloud(): Promise<boolean> {
    setSyncStatus('syncing');

    try {
      const res = await fetch('/api/sync', { credentials: 'include' });
      if (!res.ok) {
        setSyncStatus('error');
        return false;
      }

      const { data, updatedAt } = await res.json();
      if (!data) {
        setSyncStatus('synced');
        return false;
      }

      await importSnapshot(data as SyncData);

      const serverTs = updatedAt || new Date().toISOString();
      setStoredString('last_server_ts', serverTs);
      setStoredString('last_sync_time', serverTs);
      setStoredString('has_pending', 'false');
      setStoredString('last_local_edit', null);

      _lastSyncTime = new Date(serverTs);
      setSyncStatus('synced');
      console.log('✅ Overwritten local data with latest cloud snapshot');
      return true;
    } catch (err) {
      console.error('Pull from cloud failed:', err);
      setSyncStatus('error');
      return false;
    }
  },

  /**
   * Smart Sync: Two-way synchronization based on timestamps and pending changes.
   * - If server is newer and local has no pending edits: Downloads from cloud.
   * - If local has pending edits: Uploads to cloud.
   * - If both are equal: Reports up to date.
   */
  async smartSync(): Promise<SmartSyncResult> {
    if (_isSyncing) {
      return { success: true, action: 'up_to_date', message: 'Sync in progress...' };
    }

    setSyncStatus('syncing');

    try {
      // 1. Fetch server state
      const res = await fetch('/api/sync', { credentials: 'include' });
      if (!res.ok) {
        setSyncStatus('error');
        return { success: false, action: 'error', message: 'Could not connect to cloud database.' };
      }

      const { data: serverData, updatedAt: serverUpdatedAt } = await res.json();
      const hasPending = getStoredString('has_pending') === 'true';
      const lastKnownServerTs = getStoredString('last_server_ts');
      const lastLocalEdit = getStoredString('last_local_edit');

      // Case A: Cloud is completely empty
      if (!serverData) {
        const ok = await this.pushToCloud();
        return ok
          ? { success: true, action: 'uploaded', message: 'Uploaded initial data to cloud.' }
          : { success: false, action: 'error', message: 'Failed to upload initial data.' };
      }

      // Case B: Local has unsaved edits made on this device
      if (hasPending && lastLocalEdit) {
        const localEditTime = new Date(parseInt(lastLocalEdit, 10)).getTime();
        const serverTime = serverUpdatedAt ? new Date(serverUpdatedAt).getTime() : 0;

        // If local edit is newer than server, upload local
        if (localEditTime >= serverTime) {
          const ok = await this.pushToCloud();
          return ok
            ? { success: true, action: 'uploaded', message: 'Uploaded your latest edits to cloud.' }
            : { success: false, action: 'error', message: 'Failed to upload edits.' };
        }
      }

      // Case C: Server has newer data than what this device last downloaded
      if (serverUpdatedAt && serverUpdatedAt !== lastKnownServerTs) {
        const ok = await this.pullFromCloud();
        return ok
          ? { success: true, action: 'downloaded', message: 'Downloaded latest updates from cloud.' }
          : { success: false, action: 'error', message: 'Failed to download updates.' };
      }

      // Case D: Already in sync
      _lastSyncTime = serverUpdatedAt ? new Date(serverUpdatedAt) : new Date();
      setSyncStatus('synced');
      return { success: true, action: 'up_to_date', message: 'All academic data is up to date.' };
    } catch (err) {
      console.error('Smart sync failed:', err);
      setSyncStatus('error');
      return { success: false, action: 'error', message: 'Sync error occurred.' };
    }
  },

  /**
   * Schedule a debounced upload when local data is modified.
   */
  scheduleUpload(): void {
    if (_isSyncing) return;

    setStoredString('has_pending', 'true');
    setStoredString('last_local_edit', String(Date.now()));
    setSyncStatus('syncing');

    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => {
      _syncTimer = null;
      void cloudSyncService.pushToCloud();
    }, SYNC_DELAY_MS);
  },

  cancelPendingUpload(): void {
    if (_syncTimer) {
      clearTimeout(_syncTimer);
      _syncTimer = null;
    }
  },

  async flushPendingUpload(): Promise<void> {
    if (_syncTimer || getStoredString('has_pending') === 'true') {
      this.cancelPendingUpload();
      await this.pushToCloud();
    }
  },

  // Legacy aliases for backward compatibility
  async downloadFromServer(): Promise<boolean> {
    return this.pullFromCloud();
  },
  async uploadToServer(): Promise<boolean> {
    return this.pushToCloud();
  },
  async forceSync(): Promise<boolean> {
    const res = await this.smartSync();
    return res.success;
  },
  async refreshFromServer(): Promise<boolean> {
    const res = await this.smartSync();
    return res.success && res.action === 'downloaded';
  },
};
