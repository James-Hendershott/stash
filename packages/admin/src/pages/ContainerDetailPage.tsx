import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { FateBadge } from '../components/FateBadge';

export function ContainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [container, setContainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.containers.get(id)
      .then(setContainer)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRemovePlacement(placementId: string) {
    try {
      await api.placements.remove(placementId);
      // Refresh container data
      if (id) {
        const updated = await api.containers.get(id);
        setContainer(updated);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <div className="loading">Loading container...</div>;
  if (error && !container) return <div className="error-message">{error}</div>;
  if (!container) return <div className="error-message">Container not found</div>;

  const activePlacements = container.placements?.filter((p: any) => !p.removedAt) || [];
  const pastPlacements = container.placements?.filter((p: any) => p.removedAt) || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/containers" className="back-link">← Containers</Link>
          <h2>{container.label} — {container.item?.name}</h2>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-card">
            <h3>Container Info</h3>
            <div className="field-grid">
              <div className="field"><span className="field-label">Type</span><span>{container.containerType.replace(/_/g, ' ')}</span></div>
              <div className="field"><span className="field-label">Dimensions</span><span>{container.internalLengthIn}"L × {container.internalWidthIn}"W × {container.internalHeightIn}"H</span></div>
              {container.maxWeightLbs && <div className="field"><span className="field-label">Max Weight</span><span>{container.maxWeightLbs} lbs</span></div>}
              <div className="field"><span className="field-label">Location</span><span>{container.item?.originLocation?.name}</span></div>
              {container.item?.destinationLocation && <div className="field"><span className="field-label">Destination</span><span>{container.item.destinationLocation.name}</span></div>}
              <div className="field"><span className="field-label">Fate</span><FateBadge fate={container.item?.fate || 'UNDECIDED'} /></div>
            </div>
          </div>

          <div className="detail-card">
            <h3>Items Inside ({activePlacements.length})</h3>
            {activePlacements.length === 0 ? (
              <p className="empty-state">Container is empty</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Fate</th>
                      <th>Condition</th>
                      <th>Placed</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePlacements.map((p: any) => (
                      <tr key={p.id}>
                        <td><Link to={`/items/${p.item.id}`} className="table-link">{p.item.name}</Link></td>
                        <td><FateBadge fate={p.item.fate} /></td>
                        <td>{p.item.condition}</td>
                        <td>{new Date(p.placedAt).toLocaleDateString()}</td>
                        <td>
                          <button onClick={() => handleRemovePlacement(p.id)} className="btn btn-small btn-danger">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {pastPlacements.length > 0 && (
            <div className="detail-card">
              <h3>Previously Contained</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Item</th><th>Placed</th><th>Removed</th></tr>
                  </thead>
                  <tbody>
                    {pastPlacements.map((p: any) => (
                      <tr key={p.id} className="row-muted">
                        <td><Link to={`/items/${p.item.id}`} className="table-link">{p.item.name}</Link></td>
                        <td>{new Date(p.placedAt).toLocaleDateString()}</td>
                        <td>{new Date(p.removedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
