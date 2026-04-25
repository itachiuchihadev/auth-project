import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const METHOD_META = {
  'JWT':          { color: '#6c63ff', icon: '🔑', desc: 'Signed JWT token — expires in 8 hours' },
  'Basic Auth':   { color: '#ff6584', icon: '🔒', desc: 'HTTP Basic credentials — valid via header' },
  'API Key':      { color: '#43e97b', icon: '🗝️', desc: 'Machine-to-machine API key auth' },
  'OAuth (google)':    { color: '#4285F4', icon: '🌐', desc: 'Delegated via Google OAuth 2.0' },
  'OAuth (facebook)':  { color: '#1877F2', icon: '🌐', desc: 'Delegated via Facebook OAuth 2.0' },
  'OAuth (microsoft)': { color: '#00a1f1', icon: '🌐', desc: 'Delegated via Microsoft OAuth 2.0' },
  'OAuth (github)':    { color: '#aaa', icon: '🌐', desc: 'Delegated via GitHub OAuth 2.0' },
};

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...styles.statCard, borderColor: accent + '44' }}>
      <div style={{ ...styles.statValue, color: accent }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button style={{ ...styles.copyBtn, ...(copied ? { background: 'rgba(67,233,123,0.2)', color: '#43e97b' } : {}) }} onClick={copy}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function DashboardPage() {
  const { user, authMethod, logout, generateApiKey } = useAuth();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genMsg, setGenMsg] = useState(null);

  const meta = METHOD_META[authMethod] || { color: '#6c63ff', icon: '🔐', desc: 'Authenticated session' };

  const handleGenerate = async () => {
    setGenLoading(true);
    setGenMsg(null);
    try {
      const key = await generateApiKey();
      setGenMsg({ type: 'success', msg: `New API key generated!` });
      setApiKeyVisible(true);
    } catch {
      setGenMsg({ type: 'error', msg: 'Failed to generate API key.' });
    } finally {
      setGenLoading(false);
    }
  };

  const maskedKey = user?.apiKey
    ? user.apiKey.slice(0, 8) + '••••••••••••••••' + user.apiKey.slice(-4)
    : '—';

  return (
    <div style={styles.page}>
      {/* Welcome Banner */}
      <div style={{ ...styles.banner, borderColor: meta.color + '55', boxShadow: `0 0 40px ${meta.color}15` }}>
        <div style={styles.bannerLeft}>
          <div style={styles.avatarWrap}>
            <div style={{ ...styles.avatar, background: `linear-gradient(135deg, ${meta.color}cc, ${meta.color}44)` }}>
              {user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ ...styles.authDot, background: meta.color }} title="Auth method indicator" />
          </div>
          <div>
            <h1 style={styles.welcome}>Welcome back, <span style={{ color: meta.color }}>{user?.username}</span></h1>
            <p style={styles.welcsub}>{user?.email}</p>
          </div>
        </div>
        <div style={{ ...styles.methodPill, background: meta.color + '22', borderColor: meta.color, color: meta.color }}>
          {meta.icon} {authMethod}
        </div>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <StatCard label="Role" value={user?.role || 'User'} accent="#6c63ff" />
        <StatCard label="User ID" value={`#${user?.id}`} accent="#ff6584" />
        <StatCard label="Auth Method" value={authMethod?.split(' ')[0] || '—'} accent={meta.color} />
        <StatCard label="Status" value="Active ✓" accent="#43e97b" />
      </div>

      <div style={styles.grid}>
        {/* Auth Method Detail */}
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>🔐 Auth Session</h2>
          <div style={styles.authDetail}>
            <div style={{ ...styles.authIcon, background: meta.color + '22', color: meta.color, border: `2px solid ${meta.color}66` }}>
              {meta.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{authMethod}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>{meta.desc}</div>
            </div>
          </div>

          <div style={styles.infoRows}>
            {[
              { label: 'Mechanism', value: authMethod },
              { label: 'Username', value: user?.username },
              { label: 'Email', value: user?.email },
              { label: 'Role', value: user?.role },
            ].map(({ label, value }) => (
              <div key={label} style={styles.infoRow}>
                <span style={styles.infoLabel}>{label}</span>
                <span style={styles.infoValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Key Management */}
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>🗝️ API Key</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Use this key to authenticate machine-to-machine requests via the <code style={styles.inlineCode}>X-Api-Key</code> header.
          </p>

          {genMsg && (
            <div style={{
              ...styles.miniAlert,
              background: genMsg.type === 'error' ? 'rgba(255,77,109,0.12)' : 'rgba(67,233,123,0.12)',
              borderColor: genMsg.type === 'error' ? 'var(--error)' : 'var(--success)',
              color: genMsg.type === 'error' ? 'var(--error)' : 'var(--success)'
            }}>
              {genMsg.msg}
            </div>
          )}

          <div style={styles.keyBox}>
            <code style={styles.keyText}>
              {apiKeyVisible ? (user?.apiKey || '—') : maskedKey}
            </code>
            <div style={styles.keyActions}>
              <button style={styles.ghostBtn} onClick={() => setApiKeyVisible(v => !v)}>
                {apiKeyVisible ? '🙈 Hide' : '👁 Show'}
              </button>
              {user?.apiKey && <CopyButton text={user.apiKey} />}
            </div>
          </div>

          <div style={styles.curlExample}>
            <div style={styles.curlLabel}>Example cURL</div>
            <code style={styles.curlCode}>
              {`curl -H "X-Api-Key: ${apiKeyVisible ? (user?.apiKey || 'YOUR_KEY') : 'YOUR_KEY'}" \\
  http://localhost:5000/api/auth/me`}
            </code>
          </div>

          <button style={{ ...styles.generateBtn, opacity: genLoading ? 0.7 : 1 }}
            onClick={handleGenerate} disabled={genLoading}>
            {genLoading ? 'Generating…' : '↺ Regenerate API Key'}
          </button>
        </div>

        {/* Auth Methods Overview */}
        <div style={{ ...styles.panel, gridColumn: '1 / -1' }}>
          <h2 style={styles.panelTitle}>📚 All Supported Auth Methods</h2>
          <div style={styles.methodsGrid}>
            {[
              {
                name: 'JWT Bearer', color: '#6c63ff', icon: '🔑',
                endpoint: 'POST /api/auth/login/jwt',
                flow: 'Send credentials → Receive signed token → Attach as Bearer header',
                code: `fetch('/api/auth/login/jwt', {\n  method: 'POST',\n  body: JSON.stringify({ username, password })\n})`
              },
              {
                name: 'Basic Auth', color: '#ff6584', icon: '🔒',
                endpoint: 'POST /api/auth/login/basic',
                flow: 'Base64-encode user:pass → Send in Authorization header → Receive JWT',
                code: `const token = btoa(\`\${user}:\${pass}\`);\nfetch('/api/auth/login/basic', {\n  headers: { Authorization: \`Basic \${token}\` }\n})`
              },
              {
                name: 'API Key', color: '#43e97b', icon: '🗝️',
                endpoint: 'POST /api/auth/login/apikey',
                flow: 'Pass API key in body OR use X-Api-Key header on any protected route',
                code: `// Direct on any route:\nfetch('/api/auth/me', {\n  headers: { 'X-Api-Key': apiKey }\n})`
              },
              {
                name: 'OAuth 2.0', color: '#ffd166', icon: '🌐',
                endpoint: 'POST /api/auth/login/oauth/{provider}',
                flow: 'Redirect to provider → Receive token → Backend validates → Issues JWT',
                code: `// Google, Facebook, Microsoft, GitHub\nfetch('/api/auth/login/oauth/google', {\n  method: 'POST',\n  body: JSON.stringify(oauthToken)\n})`
              },
            ].map(m => (
              <div key={m.name} style={{ ...styles.methodCard, borderColor: m.color + '44' }}>
                <div style={styles.methodCardHead}>
                  <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.name}</div>
                    <code style={{ ...styles.inlineCode, color: m.color, fontSize: '0.72rem' }}>{m.endpoint}</code>
                  </div>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5, margin: '0.75rem 0' }}>{m.flow}</p>
                <div style={styles.codeBlock}>
                  <pre style={styles.pre}>{m.code}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.signoutWrap}>
        <button style={styles.signoutBtn} onClick={logout}>Sign Out</button>
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: '1100px', margin: '0 auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  banner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
    background: 'var(--surface)', border: '1px solid', borderRadius: '20px', padding: '1.75rem 2rem',
  },
  bannerLeft: { display: 'flex', alignItems: 'center', gap: '1.25rem' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: '56px', height: '56px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '1.5rem', color: '#fff',
    flexShrink: 0
  },
  authDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: '14px', height: '14px', borderRadius: '50%',
    border: '2px solid var(--surface)'
  },
  welcome: { fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' },
  welcsub: { color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.2rem' },
  methodPill: {
    padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid',
    fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--mono)', letterSpacing: '0.02em'
  },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' },
  statCard: {
    background: 'var(--surface)', border: '1px solid', borderRadius: '14px',
    padding: '1.25rem', textAlign: 'center'
  },
  statValue: { fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em' },
  statLabel: { color: 'var(--muted)', fontSize: '0.78rem', marginTop: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' },
  panel: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '1.75rem'
  },
  panelTitle: { fontWeight: 800, fontSize: '1rem', marginBottom: '1.25rem', letterSpacing: '-0.01em' },
  authDetail: { display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' },
  authIcon: {
    width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
  },
  infoRows: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  infoRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--surface2)'
  },
  infoLabel: { color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 600 },
  infoValue: { fontFamily: 'var(--mono)', fontSize: '0.82rem', color: 'var(--text)' },
  inlineCode: { fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: '0.85em' },
  miniAlert: {
    padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid',
    fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem'
  },
  keyBox: {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
    padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap'
  },
  keyText: { fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--text)', wordBreak: 'break-all' },
  keyActions: { display: 'flex', gap: '0.5rem', flexShrink: 0 },
  ghostBtn: {
    background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
    padding: '0.3rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
    fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 600
  },
  copyBtn: {
    background: 'rgba(108,99,255,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)',
    padding: '0.3rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
    fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s'
  },
  curlExample: {
    background: '#0d0d15', border: '1px solid var(--border)', borderRadius: '10px',
    padding: '0.9rem 1rem', marginBottom: '1rem'
  },
  curlLabel: { color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' },
  curlCode: { fontFamily: 'var(--mono)', fontSize: '0.75rem', color: '#43e97b', display: 'block', whiteSpace: 'pre-wrap', lineHeight: 1.6 },
  generateBtn: {
    width: '100%', padding: '0.75rem', borderRadius: '10px',
    border: '1px solid var(--border)', background: 'var(--surface2)',
    color: 'var(--text)', fontFamily: 'var(--font)', fontWeight: 700,
    fontSize: '0.9rem', cursor: 'pointer', transition: 'opacity 0.2s'
  },
  methodsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' },
  methodCard: {
    background: 'var(--surface2)', border: '1px solid', borderRadius: '12px', padding: '1.25rem'
  },
  methodCardHead: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start' },
  codeBlock: {
    background: '#0d0d15', borderRadius: '8px', padding: '0.75rem',
    overflow: 'auto', border: '1px solid var(--border)'
  },
  pre: { fontFamily: 'var(--mono)', fontSize: '0.72rem', color: '#a5b4fc', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 },
  signoutWrap: { textAlign: 'center', padding: '1rem 0 2rem' },
  signoutBtn: {
    background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
    padding: '0.6rem 2rem', borderRadius: '10px', cursor: 'pointer',
    fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.9rem',
    transition: 'all 0.2s'
  }
};
