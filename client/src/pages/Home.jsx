import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import ItemCard from '../components/ItemCard';

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const page = params.get('page') || '1';

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const query = { page };
    if (search) query.search = search;
    if (category) query.category = category;
    if (from) query.from = from;
    if (to) query.to = to;

    api.get('/items', { params: query })
      .then(({ data }) => { setItems(data.data); setMeta(data.meta); })
      .catch(() => setError('Could not load items. Please try again.'))
      .finally(() => setLoading(false));
  }, [search, category, from, to, page]);

  useEffect(() => { load(); }, [load]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.set('page', '1');
    setParams(next);
  };

  const clearFilters = () => setParams({});

  return (
    <div>
      <h1 className="page-title">Borrow what you need. Lend what you don&apos;t.</h1>
      <p className="page-subtitle">Search tools and gadgets shared by people nearby.</p>

      <div className="search-bar">
        <input
          type="text" placeholder="Search tools & gadgets…"
          defaultValue={search}
          onKeyDown={(e) => { if (e.key === 'Enter') updateParam('search', e.target.value); }}
          onBlur={(e) => updateParam('search', e.target.value)}
        />
        <input type="date" value={from} onChange={(e) => updateParam('from', e.target.value)} />
        <input type="date" value={to} onChange={(e) => updateParam('to', e.target.value)} />
      </div>

      <div className="browse-layout">
        <aside className="filters-panel card">
          <h4>Category</h4>
          <div className="filter-group">
            <label>
              <input type="radio" name="cat" checked={!category} onChange={() => updateParam('category', '')} />
              All
            </label>
            {categories.map((c) => (
              <label key={c.id}>
                <input type="radio" name="cat" checked={String(category) === String(c.id)}
                  onChange={() => updateParam('category', c.id)} />
                {c.name}
              </label>
            ))}
          </div>
          <button className="clear-link" onClick={clearFilters}>Clear filters</button>
        </aside>

        <div>
          {loading && <div className="page-loading">Loading items…</div>}
          {error && <div className="form-error-banner">{error}</div>}

          {!loading && !error && (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 14 }}>
                {meta.total} item{meta.total !== 1 ? 's' : ''} found
              </p>

              {items.length === 0 ? (
                <div className="empty-state">No items match your search. Try different dates or filters.</div>
              ) : (
                <div className="item-grid">
                  {items.map((item) => <ItemCard key={item.id} item={item} />)}
                </div>
              )}

              {meta.pages > 1 && (
                <div className="pagination">
                  {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
                    <button key={p} className={String(p) === page ? 'active' : ''}
                      onClick={() => updateParam('page', p)}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
