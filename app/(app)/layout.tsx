'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useDatabaseReady } from '@/components/providers/database-provider';
import { profileService } from '@/lib/services/profile.service';
import { AppShell } from '@/components/layout/app-shell';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isReady: dbReady } = useDatabaseReady();
  const [ready, setReady] = useState(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!isMounted || authLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Wait for database to be ready before accessing it
    if (!dbReady) return;

    profileService.exists().then((exists) => {
      if (!exists) {
        router.replace('/onboarding');
      } else {
        setReady(true);
      }
    });
  }, [router, authLoading, isAuthenticated, isMounted, dbReady]);

  // During SSR / hydration, render children to avoid mismatch
  if (!isMounted) {
    return <>{children}</>;
  }

  if (authLoading || !dbReady || !ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
