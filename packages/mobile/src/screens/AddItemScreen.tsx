import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Picker } from 'react-native';
import { api } from '../lib/api';

export function AddItemScreen({ navigation }: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [fate, setFate] = useState('UNDECIDED');
  const [originLocationId, setOriginLocationId] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    Promise.all([api.categories.list(), api.locations.list()])
      .then(([cats, locs]) => {
        setCategories(cats);
        setLocations(locs);
        if (cats.length > 0) setCategoryId(cats[0].id);
        const firstOrigin = locs.find((l: any) => l.type === 'ORIGIN');
        if (firstOrigin) setOriginLocationId(firstOrigin.id);
      });
  }, []);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter an item name');
      return;
    }

    setLoading(true);
    try {
      const item = await api.items.create({
        name: name.trim(),
        description: description.trim() || null,
        categoryId,
        condition,
        fate,
        quantity: parseInt(quantity) || 1,
        originLocationId,
      });
      navigation.replace('ItemDetail', { id: item.id });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const origins = locations.filter((l) => l.type === 'ORIGIN');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Item name" autoFocus />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Optional description" multiline numberOfLines={3} />

        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerWrapper}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, categoryId === c.id && styles.chipActive]}
              onPress={() => setCategoryId(c.id)}
            >
              <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Condition</Text>
        <View style={styles.row}>
          {['GOOD', 'FAIR', 'POOR'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, condition === c && styles.chipActive]}
              onPress={() => setCondition(c)}
            >
              <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Fate</Text>
        <View style={styles.row}>
          {['UNDECIDED', 'KEEP', 'SELL', 'DONATE', 'TRASH'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, fate === f && styles.chipActive]}
              onPress={() => setFate(f)}
            >
              <Text style={[styles.chipText, fate === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Origin Room</Text>
        <View style={styles.pickerWrapper}>
          {origins.map((l) => (
            <TouchableOpacity
              key={l.id}
              style={[styles.chip, originLocationId === l.id && styles.chipActive]}
              onPress={() => setOriginLocationId(l.id)}
            >
              <Text style={[styles.chipText, originLocationId === l.id && styles.chipTextActive]}>{l.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Quantity</Text>
        <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.createBtnText}>{loading ? 'Creating...' : 'Create Item'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  form: { padding: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12,
    fontSize: 15, backgroundColor: '#fff',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  createBtn: {
    backgroundColor: '#3b82f6', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  createBtnDisabled: { backgroundColor: '#93c5fd' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
