import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

function ReviewBox({ booking, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/bookings/${booking.id}/reviews`, { rating: Number(rating), comment });
      showToast('Review submitted');
      onDone();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not submit review', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 10, padding: 10, border: '1px dashed var(--border)', borderRadius: 8, width: '100%' }}>
      <div className="field-row" style={{ marginBottom: 8 }}>
        <select value={rating} onChange={(e) => setRating(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
        </select>
        <input placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)}
          style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid var(--border)' }} />
      </div>
      <button className="btn btn-navy btn-sm" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit review'}</button>
    </div>
  );
}

function BookingRow({ booking, role, onChanged }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const act = async (action, extra = {}) => {
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/status`, { action, ...extra });
      showToast(`Booking ${action}d`);
      onChanged();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeBooking = async () => {
    if (!window.confirm('Remove this booking permanently?')) return;
    setBusy(true);
    try {
      await api.delete(`/bookings/${booking.id}`);
      showToast('Booking removed');
      onChanged();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not remove booking', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="list-row" style={{ flexWrap: 'wrap' }}>
      <div className="thumb-sm" />
      <div className="main">
        <div className="title">
          <Link to={`/items/${booking.item_id}`}>{booking.item_title}</Link>
        </div>
        <div className="sub">
          {role === 'incoming' ? `From ${booking.borrower_name}` : `Owner: ${booking.owner_name}`} ·{' '}
          {booking.start_date.slice(0, 10)} → {booking.end_date.slice(0, 10)}
        </div>
      </div>
      <StatusBadge status={booking.status} />
      {booking.overdue && <span className="overdue-tag">OVERDUE</span>}

      <div className="actions">
        {role === 'incoming' && booking.status === 'REQUESTED' && (
          <>
            <button className="btn btn-success btn-sm" disabled={busy} onClick={() => act('approve')}>Approve</button>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => act('reject')}>Reject</button>
          </>
        )}
        {role === 'incoming' && booking.status === 'APPROVED' && (
          <button className="btn btn-navy btn-sm" disabled={busy} onClick={() => act('pickup', { condition: 'good' })}>Mark Picked Up</button>
        )}
        {role === 'incoming' && booking.status === 'PICKED_UP' && (
          <button className="btn btn-navy btn-sm" disabled={busy} onClick={() => act('return', { condition: 'good' })}>Mark Returned</button>
        )}
        {role === 'mine' && ['REQUESTED', 'APPROVED'].includes(booking.status) && (
          <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act('cancel')}>Cancel</button>
        )}
        {['REJECTED', 'CANCELLED'].includes(booking.status) && (
          <button className="btn btn-outline btn-sm" disabled={busy} onClick={removeBooking}>Remove</button>
        )}
        {booking.status === 'RETURNED' && !showReview && (
          <button className="btn btn-outline btn-sm" onClick={() => setShowReview(true)}>Leave a review</button>
        )}
      </div>

      {showReview && <ReviewBox booking={booking} onDone={() => { setShowReview(false); onChanged(); }} />}
    </div>
  );
}

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'items';
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [mineBookings, setMineBookings] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/items/mine'),
      api.get('/bookings/mine'),
      api.get('/bookings/incoming'),
    ]).then(([i, m, inc]) => {
      setItems(i.data.data);
      setMineBookings(m.data.data);
      setIncoming(inc.data.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      const { data } = await api.delete(`/items/${id}`);
      showToast(data.message);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete item', 'error');
    }
  };

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Manage what you lend and what you borrow.</p>

      <div className="tabs">
        <button className={tab === 'items' ? 'active' : ''} onClick={() => setParams({ tab: 'items' })}>My Items ({items.length})</button>
        <button className={tab === 'borrowings' ? 'active' : ''} onClick={() => setParams({ tab: 'borrowings' })}>My Borrowings ({mineBookings.length})</button>
        <button className={tab === 'incoming' ? 'active' : ''} onClick={() => setParams({ tab: 'incoming' })}>Incoming Requests ({incoming.length})</button>
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : (
        <>
          {tab === 'items' && (
            items.length === 0 ? (
              <div className="empty-state">You haven't listed any items yet. <Link to="/items/new">List one now</Link>.</div>
            ) : items.map((it) => (
              <div className="list-row" key={it.id}>
                <div className="thumb-sm" />
                <div className="main">
                  <div className="title"><Link to={`/items/${it.id}`}>{it.title}</Link></div>
                  <div className="sub">{it.category_name} · {it.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="actions">
                  <Link to={`/items/${it.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteItem(it.id)}>Delete</button>
                </div>
              </div>
            ))
          )}

          {tab === 'borrowings' && (
            mineBookings.length === 0 ? (
              <div className="empty-state">You haven't requested to borrow anything yet.</div>
            ) : mineBookings.map((b) => <BookingRow key={b.id} booking={b} role="mine" onChanged={load} />)
          )}

          {tab === 'incoming' && (
            incoming.length === 0 ? (
              <div className="empty-state">No borrow requests yet.</div>
            ) : incoming.map((b) => <BookingRow key={b.id} booking={b} role="incoming" onChanged={load} />)
          )}
        </>
      )}
    </div>
  );
}
