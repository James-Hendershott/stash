import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { FateBadge } from '../components/FateBadge';

const FATE_ORDER = ['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED'];
const FATE_COLORS: Record<string, string> = {
  KEEP: '#16a34a',
  SELL: '#f97316',
  DONATE: '#7c3aed',
  TRASH: '#dc2626',
  UNDECIDED: '#6b7280',
};

export function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.stats.get(), api.activity.list({ limit: '10' })])
      .then(([s, a]) => {
        setStats(s);
        setRecentActivity(a.logs);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!stats) return <div className="error-message">Failed to load stats</div>;

  const fateMap = new Map(stats.fateBreakdown.map((f: any) => [f.fate, f.count]));

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalItems}</div>
          <div className="stat-label">Total Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.containerCount}</div>
          <div className="stat-label">Containers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.locationCount}</div>
          <div className="stat-label">Locations</div>
        </div>
        <div className="stat-card sell">
          <div className="stat-value">${stats.sellSummary.estimatedTotal.toLocaleString()}</div>
          <div className="stat-label">{stats.sellSummary.count} items to sell</div>
        </div>
      </div>

      <div className="dashboard-columns">
        <div className="dashboard-card">
          <h3>Fate Breakdown</h3>
          <div className="fate-bars">
            {FATE_ORDER.map((fate) => {
              const count = fateMap.get(fate) || 0;
              const pct = stats.totalItems > 0 ? (count / stats.totalItems) * 100 : 0;
              return (
                <div key={fate} className="fate-bar-row">
                  <FateBadge fate={fate} />
                  <div className="fate-bar-track">
                    <div
                      className="fate-bar-fill"
                      style={{ width: `${pct}%`, backgroundColor: FATE_COLORS[fate] }}
                    />
                  </div>
                  <span className="fate-bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="empty-state">No activity yet</p>
          ) : (
            <div className="activity-list">
              {recentActivity.map((log) => (
                <div key={log.id} className="activity-item">
                  <span className="activity-user">{log.user.name}</span>
                  <span className="activity-action">{log.action.toLowerCase()}</span>
                  <span className="activity-entity">{log.entityType}</span>
                  <span className="activity-time">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link to="/activity" className="link-more">View all activity →</Link>
        </div>
      </div>
    </div>
  );
}
