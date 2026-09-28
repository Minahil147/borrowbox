import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useToast } from '../components/Toast';

export default function Admin() {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/categories'),
    ]).then(([s, u, c]) => {
      setStats(s.data.data);
      setUsers(u.data.data);
      setCategories(c.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleUser = async (id, current) => {
    try {
      await api.patch(`/admin/users/${id}/status`, { is_active: !current });
      showToast('User status updated');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update user', 'error');
    }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await api.post('/categories', { name: newCategory.trim() });
      setNewCategory('');
      showToast('Category added');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not add category', 'error');
    }
  };

  const renameCategory = async (id, currentName) => {
    const name = window.prompt('Rename category', currentName);
    if (!name || name === currentName) return;
    try {
      await api.put(`/categories/${id}`, { name });
      showToast('Category renamed');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not rename category', 'error');
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      showToast('Category deleted');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete category', 'error');
    }
  };

  if (loading) return <div className="page-loading">Loading admin panel…</div>;

  return (
    <div>
      <h1 className="page-title">Admin Panel</h1>
      <p className="page-subtitle">Manage users, categories and view platform statistics.</p>

      <div className="stat-cards">
        <div className="stat-card"><div className="num">{stats.total_users}</div><div className="label">Users</div></div>
        <div className="stat-card"><div className="num">{stats.total_items}</div><div className="label">Items</div></div>
        {Object.entries(stats.bookings_by_status).map(([status, count]) => (
          <div className="stat-card" key={status}>
            <div className="num">{count}</div>
            <div className="label">{status.replace('_', ' ')}</div>
          </div>
        ))}
      </div>

      <h3>Categories</h3>
      <form onSubmit={addCategory} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name"
          style={{ padding: 9, borderRadius: 8, border: '1px solid var(--border)', flex: 1, maxWidth: 260 }} />
        <button className="btn btn-navy btn-sm" type="submit">Add</button>
      </form>
      <table className="data-table" style={{ marginBottom: 30 }}>
        <thead><tr><th>Name</th><th style={{ width: 160 }}>Actions</th></tr></thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-outline btn-sm" onClick={() => renameCategory(c.id, c.name)}>Rename</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteCategory(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Users</h3>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.is_active ? 'Active' : 'Deactivated'}</td>
              <td>
                {u.role !== 'admin' && (
                  <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => toggleUser(u.id, u.is_active)}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
