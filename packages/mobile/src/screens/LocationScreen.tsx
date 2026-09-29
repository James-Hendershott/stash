/**
 * One location: its full path, the sub-locations inside it, the containers
 * sitting here, and any loose items here. Route params: { id, name? }.
 */
import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, ApiError, type LocationContents } from '../lib/api';
import { ContainerRow } from '../components/ContainerRow';

export function LocationScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string; name?: string };
  const [data, setData] = useState<LocationContents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.locations.contents(id);
      setData(result);
      setError(null);
      navigation.setOptions({ title: result.name });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }, [id, navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        {error ? <Text style={styles.errorText}>{error}</Text> : <ActivityIndicator size="large" />}
      </View>
    );
  }

  const nothingHere = data.children.length === 0 && data.containers.length === 0 && data.looseItems.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.path}>{data.path}</Text>
      {data.shortCode && <Text style={styles.code}>Code: {data.shortCode}</Text>}

      {data.children.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Inside</Text>
          <View style={styles.childGrid}>
            {data.children.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.childTile}
                onPress={() => navigation.push('Location', { id: c.id, name: c.name })}
              >
                <Text style={styles.childName} numberOfLines={2}>{c.name}</Text>
                <Text style={[styles.childCount, c.totalContainers === 0 && styles.childCountEmpty]}>
                  {c.totalContainers === 0 ? 'empty' : `${c.totalContainers} container${c.totalContainers === 1 ? '' : 's'}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {data.containers.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Containers here</Text>
          {data.containers.map((c) => (
            <ContainerRow key={c.id} container={c} onPress={() => navigation.navigate('Container', { id: c.id })} />
          ))}
        </>
      )}

      {data.looseItems.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Items here (not in a container)</Text>
          {data.looseItems.map((i) => (
            <TouchableOpacity key={i.id} style={styles.looseRow} onPress={() => navigation.navigate('ItemDetail', { id: i.id })}>
              <Text style={styles.looseName}>{i.name}{i.quantity > 1 ? ` ×${i.quantity}` : ''}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {nothingHere && <Text style={styles.empty}>Nothing stored here yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  path: { fontSize: 15, color: '#334155', fontWeight: '600', lineHeight: 21 },
  code: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 20, marginBottom: 8,
  },
  childGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  childTile: {
    width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0', minHeight: 70, justifyContent: 'space-between',
  },
  childName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  childCount: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginTop: 6 },
  childCountEmpty: { color: '#cbd5e1' },
  looseRow: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  looseName: { fontSize: 15, color: '#1e293b' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 24 },
});
