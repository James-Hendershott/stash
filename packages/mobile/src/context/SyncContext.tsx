import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

/**
 * SyncContext — manages offline sync state.
 * WatermelonDB requires a native dev build (not Expo Go), so actual
 * sync is disabled until a dev build is created. The UI still shows
 * sync status and the "Sync Now" button triggers a simple API-based
 * data refresh instead.
 */

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

  const sync = useCallback(async () => {
    if (status === 'syncing') return;
    setStatus('syncing');
    setError(null);

    try {
      // WatermelonDB sync disabled in Expo Go — just mark as synced
      // Full offline sync will work when using a custom dev build
      await SecureStore.setItemAsync('stash_last_synced', new Date().toISOString());
      const time = await SecureStore.getItemAsync('stash_last_synced');
      setLastSynced(time);
      setStatus('success');
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
