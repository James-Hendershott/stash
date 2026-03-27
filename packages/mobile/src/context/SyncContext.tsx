import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { syncDatabase, getLastSyncTime } from '../db/sync';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncContextType {
  status: SyncStatus;
  lastSynced: string | null;
  error: string | null;
  sync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load last sync time on mount
  useEffect(() => {
    getLastSyncTime().then(setLastSynced);
  }, []);

  const sync = useCallback(async () => {
    if (status === 'syncing') return;

    setStatus('syncing');
    setError(null);

    try {
      await syncDatabase();
      const time = await getLastSyncTime();
      setLastSynced(time);
      setStatus('success');

      // Reset to idle after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }, [status]);

  return (
    <SyncContext.Provider value={{ status, lastSynced, error, sync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextType {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
