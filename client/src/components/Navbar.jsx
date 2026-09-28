import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '';

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-badge">B</span> BorrowBox
      </Link>
      <nav>
        <NavLink to="/" end>Browse</NavLink>
        {user && <NavLink to="/dashboard">Dashboard</NavLink>}
        {user && <NavLink to="/items/new">List an item</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="nav-actions">
        {!user && (
          <>
            <Link to="/login" className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
        {user && (
          <>
            <Link to={`/profile/${user.id}`} className="avatar" title={user.name}>{initials}</Link>
            <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
              onClick={() => { logout(); navigate('/'); }}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
