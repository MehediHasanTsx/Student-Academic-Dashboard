'use client';

import { useEffect, useRef } from 'react';
import { cloudSyncService } from '@/lib/services/cloud-sync.service';
import { useDatabaseReady } from '@/components/providers/database-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { db } from '@/lib/db/database';
import { hasActiveDb } from '@/lib/db/user-db';

/**
 * Hook that auto-syncs data to the cloud after any IndexedDB change,
 * and refreshes from the server when the tab regains focus (multi-device sync).
 *
 * Place this in the app shell so it runs while the user is authenticated.
 */
export function useCloudSync() {
  const { isReady } = useDatabaseReady();
  const { isAuthenticated } = useAuth();
  const initialSyncDone = useRef(false);

  // ── Initial upload after first load ──────────────────
  useEffect(() => {
    if (!isReady || !isAuthenticated || !hasActiveDb()) return;

    // Do an initial upload after first load (ensures server has latest data)
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      // Small delay to let the app fully load
      const timer = setTimeout(() => {
        void cloudSyncService.uploadToServer();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isReady, isAuthenticated]);

  // ── Watch ALL table changes via Dexie hooks ──────────
  useEffect(() => {
    if (!isReady || !isAuthenticated || !hasActiveDb()) return;

    // Subscribe to all table changes using Dexie's hooks
    const database = db();
    const tables = [
      database.profile, database.semesters, database.subjects,
      database.attendance, database.results, database.gradeScale,
      database.fees, database.payments, database.routine,
      database.assignments, database.exams, database.notes,
      database.settings, database.projects,
    ];

    // Dexie fires hook events when tables are modified
    const handleChange = () => {
      cloudSyncService.scheduleUpload();
    };

    // Use Dexie's hook system to watch for creating/updating/deleting
    const hooks: Array<() => void> = [];
    for (const table of tables) {
      table.hook('creating', handleChange);
      table.hook('updating', handleChange);
      table.hook('deleting', handleChange);
      hooks.push(
        () => table.hook('creating').unsubscribe(handleChange),
        () => table.hook('updating').unsubscribe(handleChange),
        () => table.hook('deleting').unsubscribe(handleChange),
      );
    }

    return () => {
      cloudSyncService.cancelPendingUpload();
      for (const unsub of hooks) {
        unsub();
      }
    };
  }, [isReady, isAuthenticated]);

  // ── Multi-device sync: visibility change ─────────────
  // When user leaves the tab → flush pending uploads immediately
  // When user returns to the tab → download latest from server
  useEffect(() => {
    if (!isReady || !isAuthenticated || !hasActiveDb()) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User is leaving this tab — flush any pending upload immediately
        // so other devices can see the latest data
        void cloudSyncService.flushPendingUpload();
      } else if (document.visibilityState === 'visible') {
        // User returned to this tab — check if another device made changes
        // Uses timestamp comparison to skip redundant downloads
        void cloudSyncService.refreshFromServer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ── Before closing app / leaving tab ────────────────
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cloudSyncService.hasPendingChanges()) {
        void cloudSyncService.flushPendingUpload();
        e.preventDefault();
        e.returnValue = '';
      } else {
        void cloudSyncService.flushPendingUpload();
      }
    };

    const handlePageHide = () => {
      void cloudSyncService.flushPendingUpload();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isReady, isAuthenticated]);
}
