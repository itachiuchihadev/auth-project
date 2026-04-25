import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'jwt',     label: '🔑 JWT',        color: '#6c63ff' },
  { id: 'basic',   label: '🔒 Basic Auth',  color: '#ff6584' },
  { id: 'apikey',  label: '🗝️ API Key',     color: '#43e97b' },
  { id: 'oauth',   label: '🌐 OAuth',       color: '#ffd166' },
];

const OAUTH_PROVIDERS = [
  { id: 'google',    label: 'Google',    icon: 'G', bg: '#4285F4' },
  { id: 'facebook',  label: 'Facebook',  icon: 'f', bg: '#1877F2' },
  { id: 'microsoft', label: 'Microsoft', icon: 'M', bg: '#00a1f1' },
  { id: 'github',    label: 'GitHub',    icon: '⌥', bg: '#333' },
];

export default function LoginPage() {
  const { loginJwt, loginBasic, loginApiKey, loginOAuth } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('jwt');
  const [form, setForm] = useState({ username: '', password: '', apiKey: '' });
  const [status, setStatus] = useState(null); // { type: 'error'|'success', msg }
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async (fn) => {
    setStatus(null);
    setLoading(true);
    try {
      await fn();
      setStatus({ type: 'success', msg: 'Authenticated! Redirecting…' });
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (e) {
      setStatus({ type: 'error', msg: e?.response?.data?.message || 'Authentication failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleJwt = () => handle(() => loginJwt(form.username, form.password));
  const handleBasic = () => handle(() => loginBasic(form.username, form.password));
  const handleApiKey = () => handle(() => loginApiKey(form.apiKey));
  const handleOAuth = (provider) => {
    // Mock token format for testing: "provider|userId|email"
    const mockToken = `${provider}|mock_${Date.now()}|demo@${provider}.com`;
    handle(() => loginOAuth(provider, mockToken));
  };

  const activeTab = TABS.find(t => t.id === tab);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Sign In</h1>
          <p style={styles.sub}>Choose your authentication method</p>
        </div>

        {/* Tab Bar */}
        <div style={styles.tabs}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setStatus(null); }}
              style={{
                ...styles.tab,
                ...(tab === t.id ? { ...styles.tabActive, borderColor: t.color, color: t.color } : {})
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Status */}
        {status && (
          <div style={{ ...styles.alert, background: status.type === 'error' ? 'rgba(255,77,109,0.12)' : 'rgba(67,233,123,0.12)', borderColor: status.type === 'error' ? 'var(--error)' : 'var(--success)', color: status.type === 'error' ? 'var(--error)' : 'var(--success)' }}>
            {status.msg}
          </div>
        )}

        {/* JWT */}
        {tab === 'jwt' && (
          <div style={styles.form}>
            <div style={styles.methodInfo}>
              <div style={styles.methodBadge}>JWT Bearer Token</div>
              <p style={styles.methodDesc}>Stateless authentication. Server signs a token; client stores and sends it on every request.</p>
            </div>
            <input style={styles.input} placeholder="Username" value={form.username} onChange={set('username')} />
            <input style={styles.input} type="password" placeholder="Password" value={form.password} onChange={set('password')} />
            <div style={styles.hint}>Demo: <code style={styles.code}>admin / Admin@123</code> or <code style={styles.code}>john / John@123</code></div>
            <button style={{ ...styles.btn, background: '#6c63ff' }} onClick={handleJwt} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In with JWT'}
            </button>
          </div>
        )}

        {/* BASIC AUTH */}
        {tab === 'basic' && (
          <div style={styles.form}>
            <div style={styles.methodInfo}>
              <div style={{ ...styles.methodBadge, background: 'rgba(255,101,132,0.15)', color: '#ff6584', border: '1px solid #ff6584' }}>HTTP Basic Auth</div>
              <p style={styles.methodDesc}>Credentials are Base64-encoded and sent in the Authorization header. Simple but requires HTTPS.</p>
            </div>
            <input style={styles.input} placeholder="Username" value={form.username} onChange={set('username')} />
            <input style={styles.input} type="password" placeholder="Password" value={form.password} onChange={set('password')} />
            <div style={styles.hint}>Header: <code style={styles.code}>Authorization: Basic base64(user:pass)</code></div>
            <button style={{ ...styles.btn, background: '#ff6584' }} onClick={handleBasic} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In with Basic Auth'}
            </button>
          </div>
        )}

        {/* API KEY */}
        {tab === 'apikey' && (
          <div style={styles.form}>
            <div style={styles.methodInfo}>
              <div style={{ ...styles.methodBadge, background: 'rgba(67,233,123,0.12)', color: '#43e97b', border: '1px solid #43e97b' }}>API Key</div>
              <p style={styles.methodDesc}>Machine-to-machine auth. Send key in <code style={styles.code}>X-Api-Key</code> header or exchange it for a JWT.</p>
            </div>
            <input style={styles.input} placeholder="Enter API Key" value={form.apiKey} onChange={set('apiKey')} fontFamily="var(--mono)" />
            <div style={styles.hint}>Demo keys: <code style={styles.code}>ak_DEMO_ADMIN_KEY_1234</code> or <code style={styles.code}>ak_DEMO_USER_KEY_5678</code></div>
            <button style={{ ...styles.btn, background: '#43e97b', color: '#0a0a0f' }} onClick={handleApiKey} disabled={loading}>
              {loading ? 'Verifying…' : 'Authenticate with API Key'}
            </button>
          </div>
        )}

        {/* OAUTH */}
        {tab === 'oauth' && (
          <div style={styles.form}>
            <div style={styles.methodInfo}>
              <div style={{ ...styles.methodBadge, background: 'rgba(255,209,102,0.12)', color: '#ffd166', border: '1px solid #ffd166' }}>OAuth 2.0</div>
              <p style={styles.methodDesc}>Delegate auth to a trusted provider. The backend validates the provider token and issues a JWT.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {OAUTH_PROVIDERS.map(p => (
                <button key={p.id} style={{ ...styles.oauthBtn, background: p.bg }} onClick={() => handleOAuth(p.id)} disabled={loading}>
                  <span style={styles.oauthIcon}>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={styles.hint}>⚠️ Demo mode: uses a mock token. Real apps redirect to provider.</div>
          </div>
        )}

        <p style={styles.footer}>
          Don't have an account? <Link to="/register" style={styles.footerLink}>Register</Link>
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
    width: '100%', maxWidth: '500px',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '2.5rem', boxShadow: 'var(--shadow)',
  },
  header: { marginBottom: '2rem', textAlign: 'center' },
  title: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' },
  sub: { color: 'var(--muted)', marginTop: '0.4rem', fontSize: '0.95rem' },
  tabs: {
    display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
    background: 'var(--surface2)', padding: '6px', borderRadius: '12px',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1, padding: '0.5rem 0.25rem', border: '1px solid transparent',
    borderRadius: '8px', cursor: 'pointer', background: 'transparent',
    color: 'var(--muted)', fontFamily: 'var(--font)', fontSize: '0.8rem',
    fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap'
  },
  tabActive: {
    background: 'rgba(108,99,255,0.1)', color: 'var(--accent)'
  },
  alert: {
    padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid',
    marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  methodInfo: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  methodBadge: {
    display: 'inline-block', padding: '3px 12px', borderRadius: '20px', fontSize: '0.75rem',
    fontWeight: 700, letterSpacing: '0.05em', fontFamily: 'var(--mono)',
    background: 'rgba(108,99,255,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)',
    width: 'fit-content'
  },
  methodDesc: { color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 },
  input: {
    padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)',
    fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s',
    width: '100%'
  },
  btn: {
    padding: '0.85rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font)', fontWeight: 700, fontSize: '1rem',
    color: '#fff', transition: 'opacity 0.2s', letterSpacing: '-0.01em'
  },
  hint: { fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 },
  code: { fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: '0.85em' },
  oauthBtn: {
    padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.9rem', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    transition: 'filter 0.2s'
  },
  oauthIcon: { fontWeight: 900, fontSize: '1.1rem' },
  footer: { textAlign: 'center', marginTop: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' },
  footerLink: { color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }
};
