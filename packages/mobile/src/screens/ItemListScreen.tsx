import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, ApiError, categoryLabel, getBaseUrl } from '../lib/api';
import { FateBadge } from '../components/FateBadge';

const FATES = ['ALL', 'KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED'];
const SEARCH_DEBOUNCE_MS = 300;

export function ItemListScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // `search`, debounced
  const [fate, setFate] = useState('ALL');

  // Debounce: wait until typing pauses before hitting the server, instead
  // of downloading the whole list on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const fetchItems = useCallback(async () => {
    const params: Record<string, string> = {};
    if (fate !== 'ALL') params.fate = fate;
    if (query) params.search = query;

    try {
      const data = await api.items.list(params);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Pull down to retry.');
    }
  }, [fate, query]);

  useEffect(() => {
    setLoading(true);
    fetchItems().finally(() => setLoading(false));
  }, [fetchItems]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }

  // Get photo URL - replace /api with the base url prefix
  function photoUrl(photoPath: string): string {
    const base = getBaseUrl().replace(/\/api$/, '');
    return `${base}/api/files/${photoPath}`;
  }

  function renderItem({ item }: { item: any }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
      >
        {item.photoPath ? (
          <Image source={{ uri: photoUrl(item.photoPath) }} style={styles.cardPhoto} />
        ) : (
          <View style={styles.cardPhotoPlaceholder}>
            <Text style={styles.placeholderText}>No Photo</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <FateBadge fate={item.fate} />
          </View>
          <Text style={styles.cardMeta} numberOfLines={1}>{categoryLabel(item.category)}</Text>
          {item.whereabouts && (
            <Text
              style={[styles.cardWhere, !item.whereabouts.location && styles.cardWhereMissing]}
              numberOfLines={2}
            >
              {item.whereabouts.summary}
            </Text>
          )}
          {item.quantity > 1 && <Text style={styles.cardQty}>×{item.quantity}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search items..."
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      <View style={styles.filters}>
        {FATES.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, fate === f && styles.filterBtnActive]}
            onPress={() => setFate(f)}
          >
            <Text style={[styles.filterText, fate === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'All' : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.empty}>Loading...</Text>
          ) : (
            <Text style={styles.empty}>No items found</Text>
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddItem')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  search: {
    margin: 16, marginBottom: 8, padding: 12, backgroundColor: '#fff',
    borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 15,
  },
  filters: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8, flexWrap: 'wrap', gap: 6 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
  },
  cardPhoto: { width: '100%', height: 140, backgroundColor: '#f1f5f9' },
  cardPhotoPlaceholder: {
    width: '100%', height: 80, backgroundColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center',
  },
  placeholderText: { color: '#94a3b8', fontSize: 13 },
  cardBody: { padding: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  cardMeta: { fontSize: 12, color: '#64748b' },
  cardQty: { fontSize: 12, color: '#64748b', marginTop: 4 },
  cardWhere: { fontSize: 12, color: '#1d4ed8', fontWeight: '600', marginTop: 3 },
  cardWhereMissing: { color: '#b45309' },
  error: { color: '#dc2626', fontSize: 13, paddingHorizontal: 16, paddingBottom: 6 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
});
