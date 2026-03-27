import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { api, getBaseUrl } from '../lib/api';

export function Container3DScreen({ route }: any) {
  const { id } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.containers.get3dData(id)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading 3D view...</Text>
      </View>
    );
  }

  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  const baseUrl = getBaseUrl().replace(/\/api$/, '');
  const viewerUrl = `${baseUrl}/api/public/container-3d.html`;

  // Send container data to the WebView after it loads
  const injectedJS = `
    window.postMessage(${JSON.stringify(JSON.stringify(data))}, '*');
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: viewerUrl }}
        style={styles.webview}
        injectedJavaScript={injectedJS}
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b' },
  webview: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  errorText: { color: '#dc2626', fontSize: 14 },
});
