/**
 * Container screen — "what's in this tote?" (SPEC.md "Scanning a container QR").
 * Opened by scanning a label, tapping a tote in Places, or tapping the
 * container on an item. Route params: { number } or { id }.
 */
import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, ApiError, categoryLabel, fileUrl, type ContainerScreenData } from '../lib/api';
import { lidSwatch } from '../components/ContainerRow';

const STATUS_TEXT: Record<string, string> = {
  PACKING: 'Packing',
  STORED: 'Stored',
  AWAY: 'Away from its spot',
};

export function ContainerScreen({ route, navigation }: any) {
  const { id, number } = route.params as { id?: string; number?: number };
  const [data, setData] = useState<ContainerScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = number != null ? await api.containers.byNumber(number) : await api.containers.screen(id!);
      setData(result);
      setError(null);
      navigation.setOptions({ title: `Container ${result.display}` });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }, [id, number, navigation]);

  // Refetch whenever the screen regains focus (e.g. after picking a new location).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (error && !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!data) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  const swatch = lidSwatch(data.lidColor);
  const title = data.description || data.name;
  const where = data.whereabouts.location?.path;

  const header = (
    <View>
      <View style={styles.hero}>
        <View style={styles.bigNumberBox}>
          <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{data.display}</Text>
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.title}>{title}</Text>
          {data.model && <Text style={styles.meta}>{data.model.brand} {data.model.name}</Text>}
          <View style={styles.chips}>
            <Text style={styles.chip}>{STATUS_TEXT[data.status] ?? data.status}</Text>
            {data.lidColor && (
              <View style={[styles.chip, styles.chipRow]}>
                {swatch && <View style={[styles.dot, { backgroundColor: swatch }]} />}
                <Text style={styles.chipText}>{data.lidColor} lid</Text>
              </View>
            )}
            {data.bodyColor && <Text style={styles.chip}>{data.bodyColor}</Text>}
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Where it is</Text>
      <View style={styles.card}>
        {where ? (
          <Text style={styles.path}>📍 {where}</Text>
        ) : (
          <Text style={styles.pathMissing}>No location set yet</Text>
        )}
        {data.whereabouts.container && (
          <Text style={styles.meta}>Packed inside {data.whereabouts.container.display}</Text>
        )}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('LocationPicker', { containerId: data.id, containerDisplay: data.display })}
        >
          <Text style={styles.primaryBtnText}>{where ? 'Move to another spot' : 'Set location'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        Inside ({data.itemCount} item{data.itemCount === 1 ? '' : 's'})
      </Text>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data.items}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>Nothing in this container yet.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.itemRow}
          onPress={() =>
            item.container
              ? navigation.push('Container', { id: item.container.id })
              : navigation.navigate('ItemDetail', { id: item.id })
          }
        >
          {item.photoPath ? (
            <Image source={{ uri: fileUrl(item.photoPath) }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Text style={styles.thumbEmptyText}>{item.container ? '📦' : '·'}</Text>
            </View>
          )}
          <View style={styles.itemBody}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.container ? `${item.name} (container)` : item.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {categoryLabel(item.category)}
              {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
              {item.status === 'IN_USE' ? ' · checked out' : ''}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#dc2626', fontSize: 15, textAlign: 'center' },
  retryBtn: { marginTop: 12, padding: 10 },
  retryText: { color: '#3b82f6', fontWeight: '600' },
  hero: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bigNumberBox: {
    width: 96, height: 96, borderRadius: 16, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  bigNumber: { color: '#fff', fontSize: 38, fontWeight: '900', paddingHorizontal: 6 },
  heroBody: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    fontSize: 12, fontWeight: '600', color: '#334155', backgroundColor: '#e2e8f0',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden',
  },
  chipRow: { flexDirection: 'row', alignItems: 'center' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 16, marginBottom: 8,
  },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  path: { fontSize: 16, color: '#1e293b', fontWeight: '600', lineHeight: 22 },
  pathMissing: { fontSize: 15, color: '#b45309', fontWeight: '600' },
  primaryBtn: { marginTop: 12, padding: 12, backgroundColor: '#3b82f6', borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 12 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10,
    padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#f1f5f9',
  },
  thumb: { width: 48, height: 48, borderRadius: 8, marginRight: 12, backgroundColor: '#f1f5f9' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbEmptyText: { fontSize: 18, color: '#94a3b8' },
  itemBody: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
});
