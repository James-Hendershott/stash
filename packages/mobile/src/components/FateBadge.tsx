import { View, Text, StyleSheet } from 'react-native';

const FATE_STYLES: Record<string, { bg: string; text: string }> = {
  KEEP: { bg: '#dcfce7', text: '#16a34a' },
  SELL: { bg: '#ffedd5', text: '#ea580c' },
  DONATE: { bg: '#ede9fe', text: '#7c3aed' },
  TRASH: { bg: '#fee2e2', text: '#dc2626' },
  UNDECIDED: { bg: '#f3f4f6', text: '#6b7280' },
};

export function FateBadge({ fate }: { fate: string }) {
  const colors = FATE_STYLES[fate] || FATE_STYLES.UNDECIDED;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{fate}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
