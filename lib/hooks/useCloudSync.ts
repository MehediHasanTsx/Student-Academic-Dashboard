'use client';

import { useEffect, useRef } from 'react';
import { cloudSyncService } from '@/lib/services/cloud-sync.service';
import { useDatabaseReady } from '@/components/providers/database-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { db } from '@/lib/db/database';
import { hasActiveDb } from '@/lib/db/user-db';

/**
 * Hook that auto-syncs data to the cloud after any IndexedDB change.
 * Uses Dexie's observable hooks to detect changes across all tables.
 *
 * Place this in the app shell so it runs while the user is authenticated.
 */
export function useCloudSync() {
  const { isReady } = useDatabaseReady();
  const { isAuthenticated } = useAuth();
  const initialSyncDone = useRef(false);

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

  useEffect(() => {
    if (!isReady || !isAuthenticated || !hasActiveDb()) return;

    // Subscribe to all table changes using Dexie's hooks
    const database = db();
    const tables = [
      database.profile, database.subjects, database.attendance,
      database.results, database.fees, database.payments,
      database.routine, database.assignments, database.exams,
      database.notes, database.settings, database.projects,
    ];

    // Dexie fires 'changes' events on the database when tables are modified
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
}
