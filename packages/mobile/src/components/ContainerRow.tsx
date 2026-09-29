import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ContainerSummary } from '../lib/api';

// Rough swatches for lid colors typed as words ("Red", "Yellow"…).
const LID_SWATCH: Record<string, string> = {
  red: '#DC2626', yellow: '#EAB308', green: '#16A34A', blue: '#2563EB',
  orange: '#F97316', black: '#111827', clear: '#E5E7EB', gray: '#9CA3AF', grey: '#9CA3AF',
};

export function lidSwatch(color: string | null | undefined): string | null {
  if (!color) return null;
  return LID_SWATCH[color.trim().toLowerCase()] ?? '#9CA3AF';
}

/** One tappable row for a container: big number, lid dot, name, item count. */
export function ContainerRow({ container, onPress }: { container: ContainerSummary; onPress: () => void }) {
  const swatch = lidSwatch(container.lidColor);
  const title = container.description || container.name;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.numberBox}>
        <Text style={styles.number} numberOfLines={1} adjustsFontSizeToFit>
          {container.display}
        </Text>
        {swatch && <View style={[styles.lid, { backgroundColor: swatch }]} />}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.meta}>
          {container.itemCount} item{container.itemCount === 1 ? '' : 's'}
          {container.lidColor ? ` · ${container.lidColor} lid` : ''}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0',
  },
  numberBox: {
    width: 64, height: 52, borderRadius: 10, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  number: { color: '#fff', fontSize: 20, fontWeight: '800', paddingHorizontal: 4 },
  lid: {
    position: 'absolute', top: -4, right: -4, width: 14, height: 14,
    borderRadius: 7, borderWidth: 2, borderColor: '#fff',
  },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  chevron: { fontSize: 24, color: '#cbd5e1', marginLeft: 8 },
});
