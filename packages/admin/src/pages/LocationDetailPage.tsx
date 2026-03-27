import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { FateBadge } from '../components/FateBadge';

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.locations.get(id)
      .then(setLocation)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading location...</div>;
  if (!location) return <div className="error-message">Location not found</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/locations" className="back-link">← Locations</Link>
          <h2>
            <span className="color-dot" style={{ backgroundColor: location.color }} />
            {location.name}
          </h2>
          <span className="page-subtitle">{location.house} — {location.floor} Floor</span>
        </div>
      </div>

      <div className="detail-card">
        <h3>Items in this room ({location.originItems?.length || 0})</h3>
        {location.originItems?.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Fate</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>
                {location.originItems.map((item: any) => (
                  <tr key={item.id}>
                    <td><Link to={`/items/${item.id}`} className="table-link">{item.name}</Link></td>
                    <td style={{ color: item.category?.color }}>{item.category?.name}</td>
                    <td><FateBadge fate={item.fate} /></td>
                    <td>{item.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No items in this room</p>
        )}
      </div>
    </div>
  );
}
