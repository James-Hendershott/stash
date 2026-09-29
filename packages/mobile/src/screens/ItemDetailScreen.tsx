import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, categoryLabel, getBaseUrl } from '../lib/api';
import { FateBadge } from '../components/FateBadge';

const FATES = ['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED'];

export function ItemDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.items.get(id)
      .then(setItem)
      .catch((err) => Alert.alert('Error', err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleFateChange(fate: string) {
    try {
      const updated = await api.items.updateFate(id, fate);
      setItem({ ...item, ...updated });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const res = await api.items.uploadPhoto(id, result.assets[0].uri);
        setItem({ ...item, photoPath: res.photoPath });
      } catch (err: any) {
        Alert.alert('Upload Failed', err.message);
      }
    }
  }

  async function handlePickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const res = await api.items.uploadPhoto(id, result.assets[0].uri);
        setItem({ ...item, photoPath: res.photoPath });
      } catch (err: any) {
        Alert.alert('Upload Failed', err.message);
      }
    }
  }

  async function handleGetPrice() {
    try {
      const estimate = await api.items.requestPriceEstimate(id);
      Alert.alert(
        `Suggested: $${estimate.suggestedPrice}`,
        `${estimate.rationale}\n\nPlatforms: ${estimate.platforms.join(', ')}`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  function photoUrl(path: string): string {
    const base = getBaseUrl().replace(/\/api$/, '');
    return `${base}/api/files/${path}`;
  }

  if (loading) return <View style={styles.centered}><Text>Loading...</Text></View>;
  if (!item) return <View style={styles.centered}><Text>Item not found</Text></View>;

  return (
    <ScrollView style={styles.container}>
      {/* Photo */}
      {item.photoPath ? (
        <Image source={{ uri: photoUrl(item.photoPath) }} style={styles.photo} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.placeholderText}>No Photo</Text>
        </View>
      )}

      <View style={styles.photoActions}>
        <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
          <Text style={styles.photoBtnText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
          <Text style={styles.photoBtnText}>Choose Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{item.name}</Text>
        <FateBadge fate={item.fate} />
      </View>

      {item.description && <Text style={styles.description}>{item.description}</Text>}

      {/* Where it is (v2): container + full location path */}
      {item.whereabouts && (
        <TouchableOpacity
          style={styles.whereCard}
          disabled={!item.whereabouts.container && !item.container}
          onPress={() =>
            item.container
              ? navigation.navigate('Container', { id: item.container.id })
              : navigation.navigate('Container', { id: item.whereabouts.container.id })
          }
        >
          <Text style={styles.whereLabel}>{item.container ? 'This is a container' : 'Where it is'}</Text>
          {item.whereabouts.container && (
            <Text style={styles.whereContainer}>In container {item.whereabouts.container.display}</Text>
          )}
          <Text style={[styles.wherePath, !item.whereabouts.location && styles.whereMissing]}>
            {item.whereabouts.location ? `📍 ${item.whereabouts.location.path}` : 'No location set yet'}
          </Text>
          {(item.whereabouts.container || item.container) && (
            <Text style={styles.whereLink}>{item.container ? 'Open its contents ›' : 'Open container ›'}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Fate Selector */}
      <Text style={styles.sectionTitle}>Fate</Text>
      <View style={styles.fateRow}>
        {FATES.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.fateBtn, item.fate === f && styles.fateBtnActive]}
            onPress={() => handleFateChange(f)}
          >
            <FateBadge fate={f} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Details */}
      <Text style={styles.sectionTitle}>Details</Text>
      <View style={styles.detailGrid}>
        <DetailField label="Category" value={categoryLabel(item.category)} />
        <DetailField label="Condition" value={item.condition} />
        <DetailField label="Quantity" value={String(item.quantity)} />
        <DetailField label="Origin" value={item.originLocation?.name} />
        {item.destinationLocation && (
          <DetailField label="Destination" value={item.destinationLocation.name} />
        )}
        {item.lengthIn && (
          <DetailField
            label="Dimensions"
            value={`${item.lengthIn}"L × ${item.widthIn}"W × ${item.heightIn}"H`}
          />
        )}
        {item.weightLbs && <DetailField label="Weight" value={`${item.weightLbs} lbs`} />}
        {item.estimatedSaleValue && (
          <DetailField label="Est. Sale" value={`$${item.estimatedSaleValue}`} />
        )}
      </View>

      {/* Price Estimate */}
      {item.fate === 'SELL' && (
        <TouchableOpacity style={styles.priceBtn} onPress={handleGetPrice}>
          <Text style={styles.priceBtnText}>Get AI Price Estimate</Text>
        </TouchableOpacity>
      )}

      {item.notes && (
        <>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{item.notes}</Text>
        </>
      )}

      {/* Placements */}
      {item.placements?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Container Placements</Text>
          {item.placements.map((p: any) => (
            <View key={p.id} style={[styles.placementRow, p.removedAt && styles.placementRemoved]}>
              <Text style={styles.placementName}>{p.container?.item?.name || 'Unknown'}</Text>
              <Text style={styles.placementDate}>
                {new Date(p.placedAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photo: { width: '100%', height: 250, backgroundColor: '#f1f5f9' },
  photoPlaceholder: {
    width: '100%', height: 160, backgroundColor: '#e2e8f0',
    justifyContent: 'center', alignItems: 'center',
  },
  placeholderText: { color: '#94a3b8', fontSize: 15 },
  photoActions: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 0 },
  photoBtn: {
    flex: 1, padding: 10, backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center',
  },
  photoBtnText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingBottom: 4,
  },
  name: { fontSize: 22, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
  description: { paddingHorizontal: 16, color: '#475569', fontSize: 14, lineHeight: 20 },
  whereCard: {
    marginHorizontal: 16, marginTop: 14, padding: 14, backgroundColor: '#eff6ff',
    borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe',
  },
  whereLabel: { fontSize: 12, fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5 },
  whereContainer: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 4 },
  wherePath: { fontSize: 15, color: '#1e293b', fontWeight: '600', marginTop: 4, lineHeight: 21 },
  whereMissing: { color: '#b45309' },
  whereLink: { fontSize: 13, color: '#2563eb', fontWeight: '600', marginTop: 8 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 0.5, paddingHorizontal: 16, marginTop: 20, marginBottom: 8,
  },
  fateRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 6, flexWrap: 'wrap' },
  fateBtn: {
    padding: 8, borderRadius: 8, borderWidth: 2, borderColor: 'transparent',
  },
  fateBtnActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  detailGrid: { paddingHorizontal: 16 },
  field: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  fieldLabel: { fontSize: 13, color: '#94a3b8', textTransform: 'uppercase' },
  fieldValue: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  priceBtn: {
    marginHorizontal: 16, marginTop: 16, padding: 14, backgroundColor: '#f97316',
    borderRadius: 10, alignItems: 'center',
  },
  priceBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  notes: { paddingHorizontal: 16, color: '#475569', fontSize: 14, lineHeight: 20 },
  placementRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16,
    paddingVertical: 10, backgroundColor: '#fff', marginHorizontal: 16,
    marginBottom: 4, borderRadius: 8,
  },
  placementRemoved: { opacity: 0.4 },
  placementName: { fontSize: 14, color: '#1e293b' },
  placementDate: { fontSize: 12, color: '#94a3b8' },
});
