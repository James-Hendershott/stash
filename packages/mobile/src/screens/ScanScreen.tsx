import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export function ScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    // QR codes encode URLs like: http://localhost:3001/api/items/abc-123
    // or http://localhost:3001/api/containers/xyz-456
    const itemMatch = data.match(/\/items\/([a-f0-9-]+)/);
    const containerMatch = data.match(/\/containers\/([a-f0-9-]+)/);

    if (itemMatch) {
      navigation.navigate('ItemDetail', { id: itemMatch[1] });
    } else if (containerMatch) {
      Alert.alert('Container Scanned', `Container ID: ${containerMatch[1]}`);
      setScanned(false);
    } else {
      Alert.alert('Unknown QR Code', data, [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
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
