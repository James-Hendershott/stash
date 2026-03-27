import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { FateBadge } from '../components/FateBadge';

const FATES = ['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED'];
const CONDITIONS = ['GOOD', 'FAIR', 'POOR'];

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [priceEstimate, setPriceEstimate] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.items.get(id)
      .then((data) => {
        setItem(data);
        setForm(data);
        // Load existing price estimate if available
        return api.items.getPriceEstimate(id);
      })
      .then((pe) => {
        if (pe.estimated) setPriceEstimate(pe);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleFateChange(fate: string) {
    if (!id) return;
    try {
      const updated = await api.items.updateFate(id, fate);
      setItem({ ...item, ...updated });
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSave() {
    if (!id) return;
    try {
      const updated = await api.items.update(id, {
        name: form.name,
        description: form.description || null,
        condition: form.condition,
        quantity: form.quantity,
        lengthIn: form.lengthIn || null,
        widthIn: form.widthIn || null,
        heightIn: form.heightIn || null,
        weightLbs: form.weightLbs || null,
        estimatedSaleValue: form.estimatedSaleValue || null,
        notes: form.notes || null,
      });
      setItem({ ...item, ...updated });
      setEditing(false);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!id || !confirm('Delete this item?')) return;
    try {
      await api.items.delete(id);
      navigate('/items');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      const result = await api.items.uploadPhoto(id, file);
      setItem({ ...item, photoPath: result.photoPath });
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRequestPriceEstimate() {
    if (!id) return;
    setPricingLoading(true);
    setError('');
    try {
      const estimate = await api.items.requestPriceEstimate(id);
      setPriceEstimate({
        estimated: true,
        suggestedPrice: estimate.suggestedPrice,
        rationale: estimate.rationale,
        platforms: estimate.platforms,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPricingLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading item...</div>;
  if (error && !item) return <div className="error-message">{error}</div>;
  if (!item) return <div className="error-message">Item not found</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/items" className="back-link">← Items</Link>
          <h2>{item.name}</h2>
        </div>
        <div className="page-actions">
          {editing ? (
            <>
              <button onClick={handleSave} className="btn btn-primary">Save</button>
              <button onClick={() => { setEditing(false); setForm(item); }} className="btn">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn">Edit</button>
              <button onClick={handleDelete} className="btn btn-danger">Delete</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="detail-grid">
        <div className="detail-main">
          {/* Photo */}
          <div className="detail-card">
            <h3>Photo</h3>
            {item.photoPath ? (
              <img src={`/api/files/${item.photoPath}`} alt={item.name} className="item-photo" />
            ) : (
              <div className="photo-placeholder">No photo</div>
            )}
            <label className="btn btn-small upload-btn">
              {item.photoPath ? 'Replace Photo' : 'Upload Photo'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
            </label>
          </div>

          {/* Details */}
          <div className="detail-card">
            <h3>Details</h3>
            {editing ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Condition</label>
                    <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" min={1} value={form.quantity || 1} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Length (in)</label>
                    <input type="number" value={form.lengthIn || ''} onChange={(e) => setForm({ ...form, lengthIn: parseFloat(e.target.value) || null })} />
                  </div>
                  <div className="form-group">
                    <label>Width (in)</label>
                    <input type="number" value={form.widthIn || ''} onChange={(e) => setForm({ ...form, widthIn: parseFloat(e.target.value) || null })} />
                  </div>
                  <div className="form-group">
                    <label>Height (in)</label>
                    <input type="number" value={form.heightIn || ''} onChange={(e) => setForm({ ...form, heightIn: parseFloat(e.target.value) || null })} />
                  </div>
                  <div className="form-group">
                    <label>Weight (lbs)</label>
                    <input type="number" value={form.weightLbs || ''} onChange={(e) => setForm({ ...form, weightLbs: parseFloat(e.target.value) || null })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Estimated Sale Value ($)</label>
                  <input type="number" value={form.estimatedSaleValue || ''} onChange={(e) => setForm({ ...form, estimatedSaleValue: parseFloat(e.target.value) || null })} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
              </div>
            ) : (
              <div className="detail-fields">
                {item.description && <p className="item-description">{item.description}</p>}
                <div className="field-grid">
                  <div className="field"><span className="field-label">Category</span><span style={{ color: item.category?.color }}>{item.category?.name}</span></div>
                  <div className="field"><span className="field-label">Condition</span><span>{item.condition}</span></div>
                  <div className="field"><span className="field-label">Quantity</span><span>{item.quantity}</span></div>
                  {(item.lengthIn || item.widthIn || item.heightIn) && (
                    <div className="field"><span className="field-label">Dimensions</span><span>{[item.lengthIn && `${item.lengthIn}"L`, item.widthIn && `${item.widthIn}"W`, item.heightIn && `${item.heightIn}"H`].filter(Boolean).join(' × ')}</span></div>
                  )}
                  {item.weightLbs && <div className="field"><span className="field-label">Weight</span><span>{item.weightLbs} lbs</span></div>}
                  {item.estimatedSaleValue && <div className="field"><span className="field-label">Est. Sale Value</span><span>${item.estimatedSaleValue}</span></div>}
                  <div className="field"><span className="field-label">Origin</span><span>{item.originLocation?.name}</span></div>
                  {item.destinationLocation && <div className="field"><span className="field-label">Destination</span><span>{item.destinationLocation.name}</span></div>}
                  <div className="field"><span className="field-label">Added By</span><span>{item.addedBy?.name}</span></div>
                  <div className="field"><span className="field-label">Created</span><span>{new Date(item.createdAt).toLocaleDateString()}</span></div>
                </div>
                {item.notes && <div className="item-notes"><strong>Notes:</strong> {item.notes}</div>}
              </div>
            )}
          </div>
        </div>

        <div className="detail-sidebar">
          {/* Fate */}
          <div className="detail-card">
            <h3>Fate</h3>
            <div className="fate-selector">
              {FATES.map((fate) => (
                <button
                  key={fate}
                  onClick={() => handleFateChange(fate)}
                  className={`fate-btn ${item.fate === fate ? 'active' : ''}`}
                >
                  <FateBadge fate={fate} />
                </button>
              ))}
            </div>
          </div>

          {/* AI Price Estimate */}
          <div className="detail-card">
            <h3>AI Price Estimate</h3>
            {priceEstimate ? (
              <div className="price-estimate">
                <div className="price-estimate-value">
                  ${priceEstimate.suggestedPrice}
                </div>
                <p className="price-estimate-rationale">{priceEstimate.rationale}</p>
                <div className="price-estimate-platforms">
                  <span className="field-label">Recommended Platforms</span>
                  <div className="platform-tags">
                    {priceEstimate.platforms.map((p: string) => (
                      <span key={p} className="platform-tag">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="price-estimate-meta">
                  Generated {new Date(priceEstimate.generatedAt).toLocaleString()}
                </div>
                <button
                  onClick={handleRequestPriceEstimate}
                  className="btn btn-small"
                  disabled={pricingLoading}
                >
                  {pricingLoading ? 'Refreshing...' : 'Refresh Estimate'}
                </button>
              </div>
            ) : (
              <div>
                <p className="empty-state">No estimate yet</p>
                <button
                  onClick={handleRequestPriceEstimate}
                  className="btn btn-primary btn-full"
                  disabled={pricingLoading}
                >
                  {pricingLoading ? 'Asking Claude...' : 'Get Price Estimate'}
                </button>
              </div>
            )}
          </div>

          {/* Container Placements */}
          <div className="detail-card">
            <h3>Container Placements</h3>
            {item.placements?.length > 0 ? (
              <div className="placement-list">
                {item.placements.map((p: any) => (
                  <div key={p.id} className={`placement-item ${p.removedAt ? 'removed' : ''}`}>
                    <span>{p.container?.item?.name || 'Unknown'}</span>
                    <span className="placement-date">
                      {new Date(p.placedAt).toLocaleDateString()}
                      {p.removedAt && ` → ${new Date(p.removedAt).toLocaleDateString()}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">Not in any container</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
