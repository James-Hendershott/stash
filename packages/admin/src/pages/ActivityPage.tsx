import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    api.activity.list({ limit: String(limit), offset: String(offset) })
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [offset]);

  if (loading) return <div className="loading">Loading activity...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Activity Log ({total} entries)</h2>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">No activity yet</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.user?.name}</td>
                  <td><span className="action-badge">{log.action}</span></td>
                  <td>{log.entityType}</td>
                  <td className="activity-details">
                    {log.newValue && <span>{JSON.stringify(log.newValue)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <div className="pagination">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="btn"
          >
            ← Previous
          </button>
          <span>Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}</span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
