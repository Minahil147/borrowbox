import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../components/Toast';

const emptyForm = {
  title: '', description: '', category_id: '', condition: 'good',
  max_days: 3, pickup_area: '', image_url: '',
};

export default function ItemForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.data)).catch(() => {});
    if (isEdit) {
      api.get(`/items/${id}`)
        .then(({ data }) => {
          const it = data.data;
          setForm({
            title: it.title, description: it.description || '', category_id: it.category_id,
            condition: it.condition, max_days: it.max_days, pickup_area: it.pickup_area || '',
            image_url: it.image_url || '',
          });
        })
        .catch(() => setError('Could not load this item.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/items/${id}`, form);
        showToast('Item updated');
      } else {
        await api.post('/items', form);
        showToast('Item listed');
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this item.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeactivate = async () => {
    if (!window.confirm('Deactivate this item? It will stop appearing in search.')) return;
    await api.put(`/items/${id}`, { is_active: false });
    showToast('Item deactivated');
    navigate('/dashboard');
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 className="page-title">{isEdit ? 'Edit item' : 'List an item'}</h1>
      <p className="page-subtitle">{isEdit ? 'Update the details borrowers see.' : 'Share something you own and rarely use.'}</p>

      <div className="card">
        {error && <div className="form-error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Title</label>
            <input name="title" value={form.title} onChange={onChange} required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea name="description" rows="4" value={form.description} onChange={onChange} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Category</label>
              <select name="category_id" value={form.category_id} onChange={onChange} required>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Condition</label>
              <select name="condition" value={form.condition} onChange={onChange}>
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Max lending days</label>
              <input type="number" name="max_days" min="1" value={form.max_days} onChange={onChange} required />
            </div>
            <div className="field">
              <label>Pickup area</label>
              <input name="pickup_area" value={form.pickup_area} onChange={onChange} placeholder="e.g. Block B" />
            </div>
          </div>
          <div className="field">
            <label>Image URL (optional)</label>
            <input name="image_url" value={form.image_url} onChange={onChange} placeholder="https://…" />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-navy" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'List item'}
            </button>
            {isEdit && <button type="button" className="btn btn-outline" onClick={onDeactivate}>Deactivate</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
