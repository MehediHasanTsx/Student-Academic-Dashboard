'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // During SSR / hydration, render children directly to avoid mismatch
  if (!isMounted) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
