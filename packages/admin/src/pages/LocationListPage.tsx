import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export function LocationListPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.locations.list()
      .then(setLocations)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading locations...</div>;

  const origins = locations.filter((l) => l.type === 'ORIGIN');
  const destinations = locations.filter((l) => l.type === 'DESTINATION');

  function LocationTable({ locs, title }: { locs: any[]; title: string }) {
    return (
      <div className="detail-card">
        <h3>{title}</h3>
        {locs.length === 0 ? (
          <p className="empty-state">No locations</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Floor</th>
                  <th>House</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {locs.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link to={`/locations/${l.id}`} className="table-link">
                        <span className="color-dot" style={{ backgroundColor: l.color }} />
                        {l.name}
                      </Link>
                    </td>
                    <td>{l.floor}</td>
                    <td>{l.house}</td>
                    <td>{l._count?.originItems || l._count?.destinationItems || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Locations ({locations.length})</h2>
      </div>

      <LocationTable locs={origins} title="Origin — Colorado Home" />
      <LocationTable locs={destinations} title="Destination — North Carolina Home" />
    </div>
  );
}
