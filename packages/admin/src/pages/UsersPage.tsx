import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  createdAt: string;
  _count: { addedItems: number; activityLogs: number };
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('USER');
  const [creating, setCreating] = useState(false);

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const token = localStorage.getItem('stash_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function fetchUsers() {
    const res = await fetch('/api/users', { headers });
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate() {
    setCreating(true);
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: newEmail, name: newName, password: newPassword, role: newRole }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) { setError(data.error); return; }

    setShowCreate(false);
    setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('USER');
    fetchUsers();
  }

  async function handleToggleRole(user: User) {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) fetchUsers();
    else { const d = await res.json(); setError(d.error); }
  }

  async function handleResetPassword(userId: string) {
    if (!resetPassword || resetPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    const res = await fetch(`/api/users/${userId}/reset-password`, {
      method: 'POST', headers,
      body: JSON.stringify({ newPassword: resetPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setResetUserId(null);
      setResetPassword('');
      alert(data.message);
    } else {
      setError(data.error);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete user "${user.name}" (${user.email})? Their items will be reassigned to you.`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE', headers });
    if (res.ok) fetchUsers();
    else { const d = await res.json(); setError(d.error); }
  }

  if (loading) return <div className="loading">Loading users...</div>;

  if (currentUser?.role !== 'ADMIN') {
    return <div className="error-message">Admin access required</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Users ({users.length})</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Create User Form */}
      {showCreate && (
        <div className="detail-card" style={{ marginBottom: 16 }}>
          <h3>Create User</h3>
          <div className="create-form">
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ashley" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="ashley@stash.local" type="email" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Password</label>
                <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" type="password" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="detail-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Items</th>
                <th>Actions</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="table-link" style={{ fontWeight: 600 }}>
                    {u.name}
                    {u.mustChangePassword && <span className="user-badge-warn">must change pw</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`user-role-badge ${u.role === 'ADMIN' ? 'admin' : 'user'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u._count.addedItems}</td>
                  <td>{u._count.activityLogs}</td>
                  <td className="nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="user-actions">
                      <button className="btn btn-small" onClick={() => handleToggleRole(u)} title={`Switch to ${u.role === 'ADMIN' ? 'User' : 'Admin'}`}>
                        {u.role === 'ADMIN' ? 'Demote' : 'Promote'}
                      </button>
                      <button className="btn btn-small" onClick={() => { setResetUserId(u.id); setResetPassword(''); }}>
                        Reset PW
                      </button>
                      {u.id !== currentUser?.id && (
                        <button className="btn btn-small btn-danger" onClick={() => handleDelete(u)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="modal-overlay" onClick={() => setResetUserId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <p className="export-desc">For: {users.find((u) => u.id === resetUserId)?.email}</p>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>New Password</label>
              <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Minimum 8 characters" autoFocus />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => handleResetPassword(resetUserId)}>Reset Password</button>
              <button className="btn" onClick={() => setResetUserId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
