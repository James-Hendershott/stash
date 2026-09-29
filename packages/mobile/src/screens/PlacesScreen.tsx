/**
 * Places tab — browse storage top-down: Place › Area › Spot → containers.
 * Also surfaces containers that don't have a spot yet ("Needs a spot").
 */
import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, ApiError, type ContainerSummary, type LocationTreeNode } from '../lib/api';
import { ContainerRow } from '../components/ContainerRow';

export function PlacesScreen({ navigation }: any) {
  const [tree, setTree] = useState<LocationTreeNode[] | null>(null);
  const [unplaced, setUnplaced] = useState<ContainerSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, u] = await Promise.all([api.locations.tree(), api.locations.unplaced()]);
      setTree(t);
      setUnplaced(u);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!tree && !error) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {error && <Text style={styles.errorText}>{error}</Text>}

      {unplaced.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Needs a spot ({unplaced.length})</Text>
          <Text style={styles.hint}>These containers don't have a location yet. Tap one, then “Set location”.</Text>
          {unplaced.map((c) => (
            <ContainerRow key={c.id} container={c} onPress={() => navigation.navigate('Container', { id: c.id })} />
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Places</Text>
      {tree?.map((place) => (
        <TouchableOpacity
          key={place.id}
          style={styles.placeCard}
          onPress={() => navigation.navigate('Location', { id: place.id, name: place.name })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.placeName}>{place.name}</Text>
            <Text style={styles.placeMeta}>
              {place.children.length} area{place.children.length === 1 ? '' : 's'} · {place.totalContainers} container
              {place.totalContainers === 1 ? '' : 's'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#dc2626', marginBottom: 12 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 8, marginBottom: 8,
  },
  hint: { fontSize: 13, color: '#94a3b8', marginBottom: 10 },
  placeCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  placeName: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  placeMeta: { fontSize: 13, color: '#64748b', marginTop: 3 },
  chevron: { fontSize: 26, color: '#cbd5e1', marginLeft: 8 },
});
