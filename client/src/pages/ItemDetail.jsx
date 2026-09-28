import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [booked, setBooked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/items/${id}`),
      api.get(`/items/${id}/availability`),
    ])
      .then(([itemRes, availRes]) => {
        setItem(itemRes.data.data);
        setBooked(availRes.data.data);
      })
      .catch(() => setError('Item not found.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <div className="page-loading">Loading item…</div>;
  if (error || !item) return <div className="empty-state">{error || 'Item not found.'}</div>;

  const isOwner = user && user.id === item.owner_id;
  const days = start && end ? Math.floor((new Date(end) - new Date(start)) / 86400000) + 1 : 0;
  const overMax = days > item.max_days;
  const invalidRange = start && end && end < start;

  const overlapsBooked = () => {
    if (!start || !end) return false;
    return booked.some((b) => start <= b.end_date && end >= b.start_date);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!user) { navigate('/login'); return; }
    if (!start || !end) { setFormError('Please choose both dates.'); return; }
    if (invalidRange) { setFormError('End date must be on or after the start date.'); return; }
    if (overMax) { setFormError(`This item can be borrowed for at most ${item.max_days} days.`); return; }
    if (overlapsBooked()) { setFormError('These dates overlap an existing booking.'); return; }

    setSubmitting(true);
    try {
      await api.post('/bookings', { item_id: item.id, start_date: start, end_date: end, message });
      showToast('Request sent to the owner');
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not send request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="item-detail-layout">
      <div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          <Link to="/">Browse</Link> / {item.category_name} / {item.title}
        </div>
        <div className="item-hero">{item.title.charAt(0)}</div>

        <h1 className="page-title" style={{ marginTop: 18 }}>{item.title}</h1>
        <div className="chip-row">
          <span className="chip">{item.category_name}</span>
          <span className="chip">Condition: {item.condition}</span>
          <span className="chip">Max {item.max_days} days</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>{item.description}</p>

        <div className="owner-card">
          <div className="avatar" style={{ background: 'var(--navy)' }}>{item.owner_name.charAt(0)}</div>
          <div className="info">
            <div className="name">{item.owner_name}</div>
            <div className="sub">Pickup area: {item.pickup_area || 'Not specified'}</div>
          </div>
          <div className="rating">★ {Number(item.owner_rating || 0).toFixed(1)}</div>
          <Link to={`/profile/${item.owner_id}`} className="btn btn-outline btn-sm">View profile</Link>
        </div>
      </div>

      <div className="booking-panel card">
        <h3 style={{ margin: '0 0 4px' }}>Request to borrow</h3>
        <p className="calendar-hint">Owner approval required · max {item.max_days} days</p>

        {booked.length > 0 && (
          <div style={{ fontSize: '0.8rem', marginBottom: 12 }}>
            <strong>Already booked:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--text-muted)' }}>
              {booked.map((b, i) => (
                <li key={i}>{b.start_date.slice(0, 10)} → {b.end_date.slice(0, 10)}</li>
              ))}
            </ul>
          </div>
        )}

        {isOwner ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            This is your item. <Link to={`/items/${item.id}/edit`} className="btn btn-outline btn-sm" style={{ marginTop: 10 }}>Edit item</Link>
          </p>
        ) : (
          <form onSubmit={submitRequest}>
            {formError && <div className="form-error-banner">{formError}</div>}
            <div className="field-row">
              <div className="field">
                <label>From</label>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} min={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="field">
                <label>To</label>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} min={start || undefined} required />
              </div>
            </div>
            {days > 0 && (
              <p className={`days-summary ${overMax ? 'warn' : ''}`}>
                {days} day{days !== 1 ? 's' : ''} selected (max {item.max_days} allowed)
              </p>
            )}
            <div className="field">
              <label>Message to the owner</label>
              <textarea rows="3" value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Let them know what you need it for…" />
            </div>
            <button type="submit" className="btn btn-navy" style={{ width: '100%' }}
              disabled={submitting || !start || !end || overMax || invalidRange}>
              {submitting ? 'Sending…' : user ? 'Send Request' : 'Login to Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
