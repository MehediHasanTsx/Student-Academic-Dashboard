'use client';

import { useState, useEffect } from 'react';
import { cloudSyncService, type SyncStatus } from '@/lib/services/cloud-sync.service';
import { Button } from '@/components/ui/button';
import { CloudCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function CloudSyncStatus({
  variant = 'compact',
  className = '',
}: {
  variant?: 'compact' | 'card';
  className?: string;
}) {
  const [status, setStatus] = useState<SyncStatus>(cloudSyncService.getStatus());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(cloudSyncService.getLastSyncTime());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = cloudSyncService.subscribe((newStatus, time) => {
      setStatus(newStatus);
      if (time) setLastSyncTime(time);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const ok = await cloudSyncService.forceSync();
      if (ok) {
        toast.success('All academic data backed up to cloud!');
      } else {
        toast.error('Cloud sync failed. Check internet connection.');
      }
    } catch {
      toast.error('Error during cloud sync.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isSyncing = status === 'syncing' || isManualSyncing;

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualSync}
        disabled={isSyncing}
        title="Cloud Sync — Tap to sync changes to database now"
        className={`h-8 px-2.5 text-xs font-medium rounded-full border transition-all ${
          isSyncing
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : status === 'error'
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
        } ${className}`}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin text-amber-500" />
            <span>Syncing...</span>
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-rose-500" />
            <span>Retry Sync</span>
          </>
        ) : (
          <>
            <CloudCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
            <span className="hidden xs:inline">Synced</span>
          </>
        )}
      </Button>
    );
  }

  // Card variant for sidebar and settings
  return (
    <div className={`rounded-xl border border-border/70 p-3 bg-muted/30 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            </div>
          ) : status === 'error' ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-500">
              <AlertCircle className="h-3.5 w-3.5" />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <CloudCheck className="h-3.5 w-3.5" />
            </div>
          )}
          <div>
            <p className="text-xs font-semibold leading-none">
              {isSyncing ? 'Syncing to Cloud...' : status === 'error' ? 'Sync Paused' : 'Cloud Connected'}
            </p>
            <p className="text-[0.65rem] text-muted-foreground mt-0.5">
              {lastSyncTime
                ? `Last synced ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Neon PostgreSQL DB'}
            </p>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleManualSync}
        disabled={isSyncing}
        className="w-full h-7 text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-all"
      >
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Backing up...' : 'Sync Now'}
      </Button>
    </div>
  );
}
