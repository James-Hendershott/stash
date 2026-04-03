import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

const SHAPE_TYPES = ['BOX', 'CYLINDER', 'SPHERE', 'L_SHAPE', 'PANEL'];

export function ItemCreatePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shapeIframeRef = useRef<HTMLIFrameElement>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    condition: 'GOOD',
    quantity: 1,
    fate: 'UNDECIDED',
    shapeType: 'BOX',
    originLocationId: '',
    destinationLocationId: '',
    lengthIn: '',
    widthIn: '',
    heightIn: '',
    weightLbs: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([api.categories.list(), api.locations.list()])
      .then(([cats, locs]) => {
        setCategories(cats);
        setLocations(locs);
        if (cats.length > 0) setForm((f) => ({ ...f, categoryId: cats[0].id }));
        const firstOrigin = locs.find((l: any) => l.type === 'ORIGIN');
        if (firstOrigin) setForm((f) => ({ ...f, originLocationId: firstOrigin.id }));
      });
  }, []);

  // Send shape updates to the 3D preview whenever dimensions/shape/fate change
  useEffect(() => {
    const iframe = shapeIframeRef.current;
    if (!iframe?.contentWindow) return;

    const msg = JSON.stringify({
      type: 'shapeUpdate',
      lengthIn: parseFloat(form.lengthIn) || 18,
      widthIn: parseFloat(form.widthIn) || 18,
      heightIn: parseFloat(form.heightIn) || 18,
      shapeType: form.shapeType,
      fate: form.fate,
    });

    iframe.contentWindow.postMessage(msg, '*');
  }, [form.lengthIn, form.widthIn, form.heightIn, form.shapeType, form.fate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        categoryId: form.categoryId,
        condition: form.condition,
        quantity: form.quantity,
        fate: form.fate,
        shapeType: form.shapeType,
        originLocationId: form.originLocationId,
        destinationLocationId: form.destinationLocationId || null,
        lengthIn: form.lengthIn ? parseFloat(form.lengthIn) : null,
        widthIn: form.widthIn ? parseFloat(form.widthIn) : null,
        heightIn: form.heightIn ? parseFloat(form.heightIn) : null,
        weightLbs: form.weightLbs ? parseFloat(form.weightLbs) : null,
        notes: form.notes || null,
      };

      const item = await api.items.create(data);
      navigate(`/items/${item.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const origins = locations.filter((l) => l.type === 'ORIGIN');
  const destinations = locations.filter((l) => l.type === 'DESTINATION');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/items" className="back-link">← Items</Link>
          <h2>Add Item</h2>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="create-layout">
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>

          {/* Shape & Dimensions — right below description, next to the 3D preview */}
          <div className="form-row">
            <div className="form-group">
              <label>Shape</label>
              <select value={form.shapeType} onChange={(e) => setForm({ ...form, shapeType: e.target.value })}>
                {SHAPE_TYPES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Length (in)</label>
              <input type="number" value={form.lengthIn} onChange={(e) => setForm({ ...form, lengthIn: e.target.value })} placeholder="L" />
            </div>
            <div className="form-group">
              <label>Width (in)</label>
              <input type="number" value={form.widthIn} onChange={(e) => setForm({ ...form, widthIn: e.target.value })} placeholder="W" />
            </div>
            <div className="form-group">
              <label>Height (in)</label>
              <input type="number" value={form.heightIn} onChange={(e) => setForm({ ...form, heightIn: e.target.value })} placeholder="H" />
            </div>
          </div>

          <div className="form-group">
            <label>Weight (lbs)</label>
            <input type="number" value={form.weightLbs} onChange={(e) => setForm({ ...form, weightLbs: e.target.value })} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Condition</label>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fate</label>
              <select value={form.fate} onChange={(e) => setForm({ ...form, fate: e.target.value })}>
                <option value="UNDECIDED">Undecided</option>
                <option value="KEEP">Keep</option>
                <option value="SELL">Sell</option>
                <option value="DONATE">Donate</option>
                <option value="TRASH">Trash</option>
              </select>
            </div>
            <div className="form-group">
              <label>Origin Room *</label>
              <select value={form.originLocationId} onChange={(e) => setForm({ ...form, originLocationId: e.target.value })}>
                {origins.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.floor})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Destination Room</label>
              <select value={form.destinationLocationId} onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}>
                <option value="">Not assigned</option>
                {destinations.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.floor})</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Item'}
            </button>
            <Link to="/items" className="btn">Cancel</Link>
          </div>
        </form>

        {/* Live 3D Shape Preview */}
        <div className="shape-preview-panel">
          <h3 className="shape-preview-title">3D Shape Preview</h3>
          <div className="shape-preview-wrapper">
            <iframe
              ref={shapeIframeRef}
              src="/api/public/shape-preview.html"
              className="shape-preview-iframe"
              title="Shape Preview"
            />
          </div>
          <p className="shape-preview-hint">
            Changes as you type dimensions. Colored by fate. Drag to rotate.
          </p>
        </div>
      </div>
    </div>
  );
}
