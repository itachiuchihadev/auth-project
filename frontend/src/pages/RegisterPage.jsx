import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!form.username || !form.email || !form.password) return 'All fields are required.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email address.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setStatus({ type: 'error', msg: err }); return; }
    setLoading(true);
    setStatus(null);
    try {
      await register({ username: form.username, email: form.email, password: form.password });
      setStatus({ type: 'success', msg: 'Account created! Redirecting…' });
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (e) {
      setStatus({ type: 'error', msg: e?.response?.data?.message || 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthColors = ['', '#ff4d6d', '#ff9f43', '#ffd166', '#43e97b'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>✨</div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.sub}>An API key is auto-generated for you</p>
        </div>

        {status && (
          <div style={{
            ...styles.alert,
            background: status.type === 'error' ? 'rgba(255,77,109,0.12)' : 'rgba(67,233,123,0.12)',
            borderColor: status.type === 'error' ? 'var(--error)' : 'var(--success)',
            color: status.type === 'error' ? 'var(--error)' : 'var(--success)'
          }}>
            {status.msg}
          </div>
        )}

        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input style={styles.input} placeholder="johndoe" value={form.username} onChange={set('username')} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" placeholder="john@example.com" value={form.email} onChange={set('email')} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} />
            {form.password && (
              <div style={styles.strengthWrap}>
                <div style={styles.strengthBar}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      ...styles.strengthSegment,
                      background: i <= strength ? strengthColors[strength] : 'var(--border)'
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: strengthColors[strength] }}>
                  {strengthLabels[strength]}
                </span>
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input style={styles.input} type="password" placeholder="Re-enter password" value={form.confirm} onChange={set('confirm')} />
          </div>

          <div style={styles.features}>
            {['JWT token on login', 'Auto-generated API Key', 'Role-based access control', 'OAuth linkable'].map(f => (
              <div key={f} style={styles.feature}>
                <span style={styles.check}>✓</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{f}</span>
              </div>
            ))}
          </div>

          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </div>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.footerLink}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: 'calc(100vh - 64px)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '2rem'
  },
  card: {
    width: '100%', maxWidth: '460px',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '2.5rem', boxShadow: 'var(--shadow)'
  },
  header: { textAlign: 'center', marginBottom: '1.75rem' },
  icon: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  title: { fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.03em' },
  sub: { color: 'var(--muted)', marginTop: '0.4rem', fontSize: '0.9rem' },
  alert: {
    padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid',
    marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: 600
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1.1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' },
  input: {
    padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)',
    fontSize: '0.95rem', outline: 'none', width: '100%'
  },
  strengthWrap: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.3rem' },
  strengthBar: { display: 'flex', gap: '4px', flex: 1 },
  strengthSegment: { height: '4px', flex: 1, borderRadius: '2px', transition: 'background 0.3s' },
  features: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
    background: 'var(--surface2)', padding: '1rem', borderRadius: '12px',
    border: '1px solid var(--border)'
  },
  feature: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  check: { color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' },
  btn: {
    padding: '0.9rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font)', fontWeight: 800, fontSize: '1rem', color: '#fff',
    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
    letterSpacing: '-0.01em', transition: 'opacity 0.2s'
  },
  footer: { textAlign: 'center', marginTop: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' },
  footerLink: { color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }
};
