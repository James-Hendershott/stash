import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { FateBadge } from '../components/FateBadge';

const FATES = ['ALL', 'KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED'];

export function ItemListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentFate = searchParams.get('fate') || 'ALL';
  const currentSearch = searchParams.get('search') || '';

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (currentFate !== 'ALL') params.fate = currentFate;
    if (currentSearch) params.search = currentSearch;

    api.items.list(params)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [currentFate, currentSearch]);

  function setFate(fate: string) {
    const params = new URLSearchParams(searchParams);
    if (fate === 'ALL') params.delete('fate');
    else params.set('fate', fate);
    setSearchParams(params);
  }

  function setSearch(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set('search', value);
    else params.delete('search');
    setSearchParams(params);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Items ({items.length})</h2>
        <Link to="/items/new" className="btn btn-primary">+ Add Item</Link>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search items..."
          value={currentSearch}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="fate-filters">
          {FATES.map((fate) => (
            <button
              key={fate}
              onClick={() => setFate(fate)}
              className={`fate-filter-btn ${currentFate === fate ? 'active' : ''}`}
            >
              {fate === 'ALL' ? 'All' : fate}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading items...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">No items found</div>
      ) : (
        <div className="item-grid">
          {items.map((item) => (
            <Link key={item.id} to={`/items/${item.id}`} className="item-card">
              {item.photoPath && (
                <div className="item-card-photo">
                  <img src={`/api/files/${item.photoPath}`} alt={item.name} />
                </div>
              )}
              <div className="item-card-body">
                <div className="item-card-header">
                  <h3>{item.name}</h3>
                  <FateBadge fate={item.fate} />
                </div>
                <div className="item-card-meta">
                  <span className="item-card-category" style={{ color: item.category?.color }}>
                    {item.category?.name}
                  </span>
                  <span className="item-card-location">
                    {item.originLocation?.name}
                  </span>
                </div>
                {item.quantity > 1 && (
                  <span className="item-card-qty">×{item.quantity}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
