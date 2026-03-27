import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { FateBadge } from '../components/FateBadge';

export function ContainerListPage() {
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.containers.list()
      .then(setContainers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading containers...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Containers ({containers.length})</h2>
      </div>

      {containers.length === 0 ? (
        <div className="empty-state">No containers yet</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Items Inside</th>
                <th>Fate</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/containers/${c.id}`} className="table-link">
                      {c.label}
                    </Link>
                  </td>
                  <td>{c.item?.name}</td>
                  <td>{c.containerType.replace(/_/g, ' ')}</td>
                  <td>{c.item?.originLocation?.name}</td>
                  <td>{c.activeItemCount}</td>
                  <td><FateBadge fate={c.item?.fate || 'UNDECIDED'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
