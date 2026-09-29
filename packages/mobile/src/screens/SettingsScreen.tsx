import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { api, ApiError, getBaseUrl, setBaseUrl } from '../lib/api';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { status, lastSynced, error: syncError, sync } = useSync();
  const [serverUrl, setServerUrl] = useState(getBaseUrl().replace(/\/api$/, ''));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  function handleSaveUrl() {
    setBaseUrl(serverUrl);
    Alert.alert('Saved', `Server URL set to: ${serverUrl}`);
  }

  async function handleChangePassword() {
    setPwError(null);
    if (!currentPassword || !newPassword) {
      setPwError('Fill in your current and new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPwError('New password must be different from the current one.');
      return;
    }

    setPwSaving(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password changed', 'Use your new password next time you sign in.');
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
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
        <Text style={styles.sectionTitle}>Change Password</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
          />
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            placeholder="At least 8 characters"
          />
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
          />
          {pwError && <Text style={styles.errorText}>{pwError}</Text>}
          <TouchableOpacity
            style={[styles.saveBtn, pwSaving && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={pwSaving}
          >
            {pwSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Change Password</Text>
            )}
          </TouchableOpacity>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offline Sync</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: status === 'error' ? '#dc2626' : status === 'success' ? '#16a34a' : '#1e293b' }]}>
            {status === 'idle' ? 'Ready' : status === 'syncing' ? 'Syncing...' : status === 'success' ? 'Synced' : 'Error'}
          </Text>
          {lastSynced && (
            <>
              <Text style={styles.label}>Last Synced</Text>
              <Text style={styles.value}>{new Date(lastSynced).toLocaleString()}</Text>
            </>
          )}
          {syncError && <Text style={styles.errorText}>{syncError}</Text>}
          <TouchableOpacity style={styles.saveBtn} onPress={sync} disabled={status === 'syncing'}>
            <Text style={styles.saveBtnText}>{status === 'syncing' ? 'Syncing...' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Stash v0.8.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, paddingBottom: 32 },
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
  btnDisabled: { opacity: 0.6 },
  logoutBtn: {
    padding: 16, backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#fca5a5', alignItems: 'center',
  },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
  errorText: { color: '#dc2626', fontSize: 13, marginTop: 4 },
  version: { textAlign: 'center', color: '#94a3b8', marginTop: 16, fontSize: 13 },
});
