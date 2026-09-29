import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { parseStashCode } from '../lib/qr';

export function ScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Re-arm the scanner every time this tab comes back into view — otherwise
  // one successful scan would leave it ignoring every later code.
  useFocusEffect(useCallback(() => { setScanned(false); }, []));

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    const code = parseStashCode(data);
    if (!code) {
      Alert.alert('Not a Stash code', data, [{ text: 'OK', onPress: () => setScanned(false) }]);
      return;
    }
    if (code.kind === 'item') {
      navigation.navigate('ItemDetail', { id: code.id });
    } else if ('number' in code) {
      navigation.navigate('Container', { number: code.number });
    } else {
      navigation.navigate('Container', { id: code.id });
    }
  }

  if (!permission) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is needed to scan QR codes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.crosshair} />
          <Text style={styles.hint}>Point camera at a Stash QR code</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  crosshair: {
    width: 200, height: 200, borderWidth: 2, borderColor: '#fff',
    borderRadius: 16, opacity: 0.7,
  },
  hint: { color: '#fff', marginTop: 20, fontSize: 15, opacity: 0.8 },
  message: { color: '#64748b', fontSize: 16, textAlign: 'center', padding: 24 },
});
