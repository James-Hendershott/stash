import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function ExportPage() {
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.containers.list()
      .then(setContainers)
      .finally(() => setLoading(false));
  }, []);

  function downloadUrl(path: string, filename: string) {
    // Build the full URL and trigger download
    const token = localStorage.getItem('stash_token');
    fetch(`/api/export${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => alert(err.message));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Export</h2>
      </div>

      <div className="export-grid">
        {/* PDF Exports */}
        <div className="detail-card">
          <h3>PDF Reports</h3>
          <div className="export-list">
            <div className="export-item">
              <div>
                <div className="export-title">Sell List</div>
                <div className="export-desc">All items marked as SELL with your estimate and AI price suggestion</div>
              </div>
              <button className="btn btn-primary" onClick={() => downloadUrl('/pdf/sell-list', 'sell-list.pdf')}>
                Download PDF
              </button>
            </div>

            <div className="export-item">
              <div>
                <div className="export-title">Donate List</div>
                <div className="export-desc">All items marked as DONATE with room, category, and condition</div>
              </div>
              <button className="btn btn-primary" onClick={() => downloadUrl('/pdf/donate-list', 'donate-list.pdf')}>
                Download PDF
              </button>
            </div>

            <div className="export-item">
              <div>
                <div className="export-title">QR Label Sheet</div>
                <div className="export-desc">Printable QR codes for all containers (4 per page) — cut and stick on boxes</div>
              </div>
              <button className="btn btn-primary" onClick={() => downloadUrl('/pdf/qr-labels', 'qr-labels.pdf')}>
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Container Manifests */}
        <div className="detail-card">
          <h3>Container Manifests</h3>
          <div className="export-desc" style={{ marginBottom: 12 }}>
            PDF listing every item inside a specific container — print and tape to the box.
          </div>
          {loading ? (
            <div className="loading">Loading containers...</div>
          ) : containers.length === 0 ? (
            <div className="empty-state">No containers</div>
          ) : (
            <div className="export-list">
              {containers.map((c) => (
                <div key={c.id} className="export-item">
                  <div>
                    <div className="export-title">{c.label}</div>
                    <div className="export-desc">{c.item?.name} · {c.activeItemCount} items</div>
                  </div>
                  <button
                    className="btn"
                    onClick={() => downloadUrl(`/pdf/manifest/${c.id}`, `manifest-${c.label}.pdf`)}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CSV Export */}
        <div className="detail-card">
          <h3>CSV Export</h3>
          <div className="export-list">
            <div className="export-item">
              <div>
                <div className="export-title">All Items</div>
                <div className="export-desc">Complete inventory as spreadsheet — name, category, fate, dimensions, prices</div>
              </div>
              <button className="btn btn-primary" onClick={() => downloadUrl('/csv/items', `stash-items-${new Date().toISOString().slice(0, 10)}.csv`)}>
                Download CSV
              </button>
            </div>

            <div className="export-item">
              <div>
                <div className="export-title">Sell Items Only</div>
                <div className="export-desc">Just items marked as SELL</div>
              </div>
              <button className="btn" onClick={() => downloadUrl('/csv/items?fate=SELL', `stash-sell-items.csv`)}>
                Download CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
