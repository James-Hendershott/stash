/**
 * Print a tote's QR label (ADR-013: drawn on the phone, not the server).
 *
 * The label is an ordinary View — QR code + big ID + model/lid + contents —
 * that we photograph with react-native-view-shot and hand to the iOS Share
 * sheet. From there: the Phomemo app (M110, 50×80 mm), AirPrint, Save Image…
 * Route params: { id } (container id).
 */
import { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { api, ApiError, type ContainerScreenData } from '../lib/api';

// Phomemo 50×80 mm roll, printed landscape: 80 × 50 mm at 203 dpi ≈ 640 × 400 px.
const LABEL_W = 320; // on-screen points; captured at 640 × 400 px
const LABEL_H = 200;

export function LabelScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string };
  const [data, setData] = useState<ContainerScreenData | null>(null);
  const [showContents, setShowContents] = useState(true);
  const [busy, setBusy] = useState(false);
  const labelRef = useRef<View>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.containers.screen(id));
    } catch (err) {
      Alert.alert('Could not load', err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markPrinted(status: 'PRINTED' | 'NOT_PRINTED') {
    try {
      await api.containers.setLabelStatus(id, status);
      await load();
    } catch (err) {
      Alert.alert('Could not save', err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }

  async function shareLabel() {
    if (!labelRef.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(labelRef, { format: 'png', quality: 1, width: 640, height: 400 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: `Label ${data?.display}` });
      Alert.alert('Did the label print?', 'Mark it printed so Stash stops reminding you.', [
        { text: 'Not yet', style: 'cancel', onPress: () => markPrinted('NOT_PRINTED') },
        { text: 'Yes, printed', onPress: () => markPrinted('PRINTED') },
      ]);
    } catch (err) {
      Alert.alert('Could not create the label', String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  if (!data.qrUrl) {
    return (
      <View style={styles.centered}>
        <Text style={styles.warn}>Assign a new ID first — this tote is still on its old label ({data.display}).</Text>
      </View>
    );
  }

  const model = data.model ? `${data.model.brand} ${data.model.capacity ?? ''}`.trim() : null;
  const line2 = [model, data.lidColor ? `${data.lidColor} lid` : null].filter(Boolean).join(' · ');
  const contents = data.description || data.name;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>Preview (50 × 80 mm label)</Text>

      {/* ── The label itself — this exact View becomes the PNG ── */}
      <View style={styles.labelShadow}>
        <View ref={labelRef} collapsable={false} style={styles.label}>
          <View style={styles.qrBox}>
            <QRCode value={data.qrUrl} size={LABEL_H - 24} ecl="M" quietZone={4} />
          </View>
          <View style={styles.labelText}>
            <Text style={styles.labelNumber} numberOfLines={1} adjustsFontSizeToFit>{data.display}</Text>
            {line2 ? <Text style={styles.labelLine} numberOfLines={1}>{line2}</Text> : null}
            {showContents && contents ? <Text style={styles.labelContents} numberOfLines={3}>{contents}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionText}>Show contents on label</Text>
        <Switch value={showContents} onValueChange={setShowContents} />
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Label status:</Text>
        <Text style={[styles.status, data.labelStatus === 'PRINTED' ? styles.statusOk : styles.statusWarn]}>
          {data.labelStatus === 'PRINTED' ? 'Printed ✓' : 'Not printed yet'}
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={shareLabel} disabled={busy}>
        <Text style={styles.primaryBtnText}>{busy ? 'Preparing…' : 'Share / Print label'}</Text>
      </TouchableOpacity>
      {data.labelStatus !== 'PRINTED' ? (
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => markPrinted('PRINTED')}>
          <Text style={styles.secondaryBtnText}>Mark as printed</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => markPrinted('NOT_PRINTED')}>
          <Text style={styles.secondaryBtnText}>Needs reprinting</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.tip}>
        In the share sheet, pick the Phomemo app (or Save Image, then open it in Phomemo) and print on the
        50 × 80 mm roll. AirPrint works for regular paper too.
      </Text>
      <Text style={styles.tip}>QR opens: {data.qrUrl}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  warn: { color: '#b45309', fontSize: 15, textAlign: 'center' },
  hint: { fontSize: 12, color: '#94a3b8', alignSelf: 'flex-start', marginBottom: 6 },
  labelShadow: { borderRadius: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  // Pure black on white — thermal printers have no grays.
  label: {
    width: LABEL_W, height: LABEL_H, backgroundColor: '#fff', flexDirection: 'row',
    alignItems: 'center', padding: 12, borderRadius: 4,
  },
  qrBox: { marginRight: 12 },
  labelText: { flex: 1, height: '100%', justifyContent: 'center' },
  labelNumber: { fontSize: 58, fontWeight: '900', color: '#000', letterSpacing: -1 },
  labelLine: { fontSize: 15, fontWeight: '700', color: '#000', marginTop: 2 },
  labelContents: { fontSize: 13, color: '#000', marginTop: 4, lineHeight: 16 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    alignSelf: 'stretch', marginTop: 16, paddingHorizontal: 4,
  },
  optionText: { fontSize: 15, color: '#1e293b' },
  statusRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 12, paddingHorizontal: 4 },
  statusLabel: { fontSize: 15, color: '#64748b', marginRight: 6 },
  status: { fontSize: 15, fontWeight: '700' },
  statusOk: { color: '#15803d' },
  statusWarn: { color: '#b45309' },
  primaryBtn: { alignSelf: 'stretch', marginTop: 16, padding: 14, backgroundColor: '#3b82f6', borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { alignSelf: 'stretch', marginTop: 8, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  secondaryBtnText: { color: '#334155', fontSize: 15, fontWeight: '600' },
  tip: { fontSize: 12, color: '#94a3b8', marginTop: 12, alignSelf: 'stretch' },
});
