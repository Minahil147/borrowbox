import { Link } from 'react-router-dom';

export default function ItemCard({ item }) {
  return (
    <Link to={`/items/${item.id}`} className="item-card">
      <div className="thumb">{item.title.charAt(0)}</div>
      <div className="body">
        <div className="title">{item.title}</div>
        <div className="meta">{item.category_name} · max {item.max_days} days</div>
        <div className="footer-row">
          <span className="rating">★ {Number(item.owner_rating || 0).toFixed(1)}</span>
          <span className="badge badge-available">Available</span>
        </div>
      </div>
    </Link>
  );
}
