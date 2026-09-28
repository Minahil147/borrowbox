import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', area: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      showToast('Account created — welcome to BorrowBox!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="card">
        <h1 className="page-title">Create your account</h1>
        <p className="page-subtitle">Join BorrowBox to lend and borrow.</p>
        {error && <div className="form-error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Full name</label>
            <input name="name" value={form.name} onChange={onChange} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={onChange} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={onChange} minLength={6} required />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Phone</label>
              <input name="phone" value={form.phone} onChange={onChange} />
            </div>
            <div className="field">
              <label>Area</label>
              <input name="area" value={form.area} onChange={onChange} placeholder="e.g. Block B" />
            </div>
          </div>
          <button type="submit" className="btn btn-navy" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
