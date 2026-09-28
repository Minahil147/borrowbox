import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function Profile() {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', area: '' });
  const [saving, setSaving] = useState(false);

  const isSelf = user && String(user.id) === String(id);

  const load = () => {
    setLoading(true);
    api.get(`/users/${id}`)
      .then(({ data }) => {
        setData(data.data);
        setForm({ name: data.data.user.name, phone: user?.phone || '', area: data.data.user.area || '' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: res } = await api.put('/users/me', form);
      updateUser(res.data);
      showToast('Profile updated');
      setEditing(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Loading profile…</div>;
  if (!data) return <div className="empty-state">Profile not found.</div>;

  const { user: profileUser, trust_score, review_count, reviews } = data;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>{profileUser.name}</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>{profileUser.area || 'Area not set'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="rating" style={{ fontSize: '1.1rem' }}>★ {trust_score.toFixed(1)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{review_count} review{review_count !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {isSelf && (
          <div style={{ marginTop: 16 }}>
            {editing ? (
              <div>
                <div className="field-row">
                  <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="field"><label>Area</label><input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-navy btn-sm" disabled={saving} onClick={saveProfile}>{saving ? 'Saving…' : 'Save'}</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit profile</button>
            )}
          </div>
        )}
      </div>

      <h3>Reviews</h3>
      {reviews.length === 0 ? (
        <div className="empty-state">No reviews yet.</div>
      ) : reviews.map((r) => (
        <div className="card" key={r.id} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{r.reviewer_name}</strong>
            <span className="rating">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
          </div>
          {r.comment && <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>{r.comment}</p>}
        </div>
      ))}
    </div>
  );
}
