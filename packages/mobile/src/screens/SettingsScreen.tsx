import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl, setBaseUrl } from '../lib/api';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const [serverUrl, setServerUrl] = useState(getBaseUrl().replace(/\/api$/, ''));

  function handleSaveUrl() {
    setBaseUrl(serverUrl);
    Alert.alert('Saved', `Server URL set to: ${serverUrl}`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Backend URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://100.122.58.114:3001"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
            <Text style={styles.saveBtnText}>Save URL</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Stash v0.7.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', marginTop: 8 },
  value: { fontSize: 15, color: '#1e293b', fontWeight: '500', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10,
    fontSize: 14, backgroundColor: '#f9fafb', marginTop: 4,
  },
  saveBtn: {
    marginTop: 10, padding: 10, backgroundColor: '#3b82f6',
    borderRadius: 8, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  logoutBtn: {
    padding: 16, backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#fca5a5', alignItems: 'center',
  },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
  version: { textAlign: 'center', color: '#94a3b8', marginTop: 16, fontSize: 13 },
});
