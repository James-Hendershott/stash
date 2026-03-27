import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './index';
import { getBaseUrl } from '../lib/api';
import * as SecureStore from 'expo-secure-store';

const LAST_SYNCED_KEY = 'stash_last_synced';

/**
 * Perform a full sync with the server using WatermelonDB's sync protocol.
 *
 * The sync flow:
 * 1. PULL — Ask server for all changes since our last sync timestamp
 * 2. Apply those changes to the local WatermelonDB
 * 3. PUSH — Send our local changes to the server
 * 4. Server applies our changes to PostgreSQL
 * 5. Save the new timestamp for next sync
 */
export async function syncDatabase(): Promise<void> {
  const token = await SecureStore.getItemAsync('stash_token');
  if (!token) throw new Error('Not authenticated');

  const baseUrl = getBaseUrl();

  await synchronize({
    database,

    pullChanges: async ({ lastPulledAt }) => {
      const response = await fetch(`${baseUrl}/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ lastPulledAt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Pull sync failed');
      }

      const { changes, timestamp } = await response.json();
      return { changes, timestamp };
    },

    pushChanges: async ({ changes, lastPulledAt }) => {
      const response = await fetch(`${baseUrl}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ changes, lastPulledAt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Push sync failed');
      }
    },

    migrationsEnabledAtVersion: 1,
  });

  // Save last sync time for UI display
  await SecureStore.setItemAsync(LAST_SYNCED_KEY, new Date().toISOString());
}

/**
 * Get the last sync timestamp for display in the UI.
 */
export async function getLastSyncTime(): Promise<string | null> {
  return SecureStore.getItemAsync(LAST_SYNCED_KEY);
}
