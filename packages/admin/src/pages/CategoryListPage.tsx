import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function CategoryListPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.categories.list()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading categories...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Categories ({categories.length})</h2>
      </div>

      <div className="category-grid">
        {categories.map((cat) => (
          <div key={cat.id} className="category-card" style={{ borderLeftColor: cat.color }}>
            <div className="category-name" style={{ color: cat.color }}>{cat.name}</div>
            <div className="category-count">{cat._count?.items || 0} items</div>
          </div>
        ))}
      </div>
    </div>
  );
}
