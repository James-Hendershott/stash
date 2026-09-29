/**
 * Pick where a container lives. Drill down Place › Area › Spot; any level can
 * be chosen. A new spot can be created inline at the current level.
 * Route params: { containerId, containerDisplay }.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { api, ApiError, type LocationTreeNode } from '../lib/api';

export function LocationPickerScreen({ route, navigation }: any) {
  const { containerId, containerDisplay } = route.params as { containerId: string; containerDisplay: string };
  const [tree, setTree] = useState<LocationTreeNode[] | null>(null);
  const [trail, setTrail] = useState<LocationTreeNode[]>([]); // drill-down path, root first
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadTree(keepTrailIds?: string[]) {
    const t = await api.locations.tree();
    setTree(t);
    if (keepTrailIds) {
      // Rebuild the trail against the fresh tree (after creating a spot).
      const rebuilt: LocationTreeNode[] = [];
      let level = t;
      for (const id of keepTrailIds) {
        const node = level.find((n) => n.id === id);
        if (!node) break;
        rebuilt.push(node);
        level = node.children;
      }
      setTrail(rebuilt);
    }
  }

  useEffect(() => {
    navigation.setOptions({ title: `Move ${containerDisplay}` });
    loadTree().catch((err) => setError(err instanceof ApiError ? err.message : 'Could not reach the server.'));
  }, [containerDisplay, navigation]);

  const current = trail[trail.length - 1] ?? null;
  const options = useMemo(() => (current ? current.children : tree ?? []), [current, tree]);

  async function choose(node: LocationTreeNode) {
    setSaving(true);
    try {
      await api.containers.setLocation(containerId, node.id);
      navigation.goBack(); // the container screen refetches on focus
    } catch (err) {
      Alert.alert('Could not move it', err instanceof ApiError ? err.message : 'Could not reach the server.');
      setSaving(false);
    }
  }

  async function createSpot() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await api.locations.createInTree({
        name,
        parentId: current?.id ?? null,
        kind: current ? 'SPOT' : 'PLACE',
      });
      setNewName('');
      await loadTree(trail.map((n) => n.id));
    } catch (err) {
      Alert.alert('Could not add it', err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  if (!tree) {
    return (
      <View style={styles.centered}>
        {error ? <Text style={styles.errorText}>{error}</Text> : <ActivityIndicator size="large" />}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {/* Breadcrumbs */}
      <View style={styles.crumbs}>
        <TouchableOpacity onPress={() => setTrail([])}>
          <Text style={[styles.crumb, trail.length === 0 && styles.crumbActive]}>All places</Text>
        </TouchableOpacity>
        {trail.map((n, i) => (
          <View key={n.id} style={styles.crumbRow}>
            <Text style={styles.crumbSep}>›</Text>
            <TouchableOpacity onPress={() => setTrail(trail.slice(0, i + 1))}>
              <Text style={[styles.crumb, i === trail.length - 1 && styles.crumbActive]}>{n.name}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {current && (
        <TouchableOpacity style={styles.hereBtn} disabled={saving} onPress={() => choose(current)}>
          <Text style={styles.hereBtnText}>{saving ? 'Saving…' : `Put ${containerDisplay} here: ${current.name}`}</Text>
        </TouchableOpacity>
      )}

      {options.length > 0 && <Text style={styles.sectionTitle}>{current ? 'Or pick a spot inside' : 'Pick a place'}</Text>}
      {options.map((node) => (
        <View key={node.id} style={styles.optionRow}>
          <TouchableOpacity
            style={styles.optionMain}
            onPress={() => (node.children.length ? setTrail([...trail, node]) : choose(node))}
            disabled={saving}
          >
            <Text style={styles.optionName}>{node.name}</Text>
            <Text style={styles.optionMeta}>
              {node.totalContainers} container{node.totalContainers === 1 ? '' : 's'}
              {node.children.length ? ` · ${node.children.length} inside ›` : ''}
            </Text>
          </TouchableOpacity>
          {node.children.length > 0 && (
            <TouchableOpacity style={styles.pickSmall} onPress={() => choose(node)} disabled={saving}>
              <Text style={styles.pickSmallText}>Here</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <Text style={styles.sectionTitle}>{current ? `New spot in ${current.name}` : 'New place'}</Text>
      <View style={styles.newRow}>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder={current ? 'e.g. Workbench Shelf' : 'e.g. Grandma’s Basement'}
          returnKeyType="done"
          onSubmitEditing={createSpot}
        />
        <TouchableOpacity style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]} onPress={createSpot} disabled={!newName.trim() || saving}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  crumbs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
  crumbRow: { flexDirection: 'row', alignItems: 'center' },
  crumb: { fontSize: 14, color: '#3b82f6', paddingVertical: 4 },
  crumbActive: { color: '#1e293b', fontWeight: '700' },
  crumbSep: { color: '#94a3b8', marginHorizontal: 6 },
  hereBtn: { backgroundColor: '#16a34a', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  hereBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 16, marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10,
    marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0',
  },
  optionMain: { flex: 1, padding: 14 },
  optionName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  optionMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  pickSmall: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, backgroundColor: '#dcfce7', borderRadius: 8 },
  pickSmallText: { color: '#15803d', fontWeight: '700' },
  newRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10,
    fontSize: 15, backgroundColor: '#fff',
  },
  addBtn: { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
