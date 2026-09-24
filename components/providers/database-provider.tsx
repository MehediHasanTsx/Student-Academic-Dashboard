'use client';

import { createContext, useContext, useEffect, useState, useRef, useSyncExternalStore } from 'react';
import { useAuth } from './auth-provider';
import { setActiveUser, clearActiveUser } from '@/lib/db/user-db';
import { seedDatabase } from '@/lib/db/seed';
import { profileService } from '@/lib/services/profile.service';

interface DatabaseContextValue {
  isReady: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  isReady: false,
  error: null,
});

export function useDatabaseReady() {
  return useContext(DatabaseContext);
}

// React 19 approved way to detect client mount without setState-in-effect
const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // client
    () => false,   // server
  );
}

/**
 * Fetch the user's profile from the server (Neon PostgreSQL) and save it
 * to IndexedDB. This restores the profile when logging in on a new device.
 */
async function syncProfileFromServer(): Promise<void> {
  // Check if local profile already exists
  const localProfile = await profileService.exists();
  if (localProfile) return; // Already have profile locally, no need to fetch

  try {
    const res = await fetch('/api/profile', { credentials: 'include' });
    if (!res.ok) return;

    const { profile } = await res.json();
    if (!profile) return; // No server profile — user needs onboarding

    // Save the server profile to local IndexedDB
    await profileService.create({
      fullName: profile.fullName,
      university: profile.university,
      department: profile.department,
      studentId: profile.studentId,
      rollNumber: profile.rollNumber,
      registrationNumber: profile.registrationNumber,
      batch: profile.batch,
      session: profile.session,
      phoneNumber: profile.phoneNumber,
      email: profile.email || undefined,
      bloodGroup: profile.bloodGroup || undefined,
      emergencyContact: profile.emergencyContact || undefined,
      currentSemester: profile.currentSemester,
    });

    console.log('✅ Profile restored from server');
  } catch (err) {
    // Non-critical — user will go through onboarding if this fails
    console.warn('Could not sync profile from server:', err);
  }
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useIsMounted();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isMounted || authLoading) return;

    const userId = user?.id ?? null;

    if (userId === prevUserIdRef.current && isReady) return;
    prevUserIdRef.current = userId;

    let cancelled = false;

    if (!userId) {
      clearActiveUser();
      setTimeout(() => { if (!cancelled) setIsReady(true); }, 0);
      return () => { cancelled = true; };
    }

    setTimeout(() => { if (!cancelled) setIsReady(false); }, 0);

    setActiveUser(userId);
    seedDatabase()
      .then(async () => {
        if (cancelled) return;
        // After seeding, restore profile from server if needed
        await syncProfileFromServer();
        if (!cancelled) {
          setIsReady(true);
          setError(null);
        }
      })
      .catch((err) => {
        console.error('Database initialization failed:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => { cancelled = true; };
  }, [user, authLoading, isMounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // During SSR, render children directly to avoid hydration mismatch
  if (!isMounted) {
    return <>{children}</>;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="mx-4 max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-destructive">Database Error</h2>
          <p className="text-sm text-muted-foreground">
            Failed to initialize the local database. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Initializing…</p>
        </div>
      </div>
    );
  }

  return (
    <DatabaseContext value={{ isReady, error }}>
      {children}
    </DatabaseContext>
  );
}
