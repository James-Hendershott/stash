import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSync } from '../context/SyncContext';

/**
 * Small sync status indicator. Shows in the item list header.
 * Tap to trigger a manual sync.
 */
export function SyncIndicator() {
  const { status, lastSynced, sync } = useSync();

  const statusConfig = {
    idle: { color: '#94a3b8', label: 'Tap to sync' },
    syncing: { color: '#3b82f6', label: 'Syncing...' },
    success: { color: '#16a34a', label: 'Synced' },
    error: { color: '#dc2626', label: 'Sync failed' },
  };

  const { color, label } = statusConfig[status];

  return (
    <TouchableOpacity style={styles.container} onPress={sync} disabled={status === 'syncing'}>
      {status === 'syncing' ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '600' },
});
