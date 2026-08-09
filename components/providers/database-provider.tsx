'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { seedDatabase } from '@/lib/db/seed';

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

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    seedDatabase()
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error('Database initialization failed:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      });
  }, []);

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
          <p className="text-sm text-muted-foreground">Initializing database…</p>
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
