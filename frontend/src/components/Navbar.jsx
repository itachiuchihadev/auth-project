import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFont } from '../context/FontContext';

const s = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 2rem', borderBottom: '1px solid var(--border)',
    background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(12px)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  brand: {
    fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em',
    textDecoration: 'none', color: 'var(--text)',
    display: 'flex', alignItems: 'center', gap: '0.5rem'
  },
  pill: {
    background: 'var(--accent)', color: '#fff',
    fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px',
    fontFamily: 'var(--mono)', letterSpacing: '0.05em'
  },
  actions: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  link: {
    color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem',
    padding: '0.4rem 1rem', borderRadius: '8px', transition: 'all 0.2s'
  },
  btn: {
    background: 'var(--accent)', color: '#fff', border: 'none',
    padding: '0.4rem 1.2rem', borderRadius: '8px', cursor: 'pointer',
    fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.9rem',
    transition: 'opacity 0.2s'
  },
  badge: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    padding: '0.3rem 0.8rem', borderRadius: '8px',
    fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'var(--mono)'
  },
  fontBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
    color: 'var(--muted)', fontFamily: 'var(--font)', fontSize: '0.9rem',
    fontWeight: 600, transition: 'all 0.2s', position: 'relative'
  },
  dropdown: {
    position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    zIndex: 1000, minWidth: '220px', overflow: 'hidden'
  },
  dropdownItem: {
    padding: '0.75rem 1rem', cursor: 'pointer', transition: 'all 0.2s',
    borderBottom: '1px solid var(--border)', fontSize: '0.88rem',
    fontWeight: 600
  },
  dropdownItemActive: {
    background: 'var(--accent)', color: '#fff'
  }
};

export default function Navbar() {
  const { user, logout, authMethod } = useAuth();
  const { currentFont, fontOptions, changeFontFamily } = useFont();
  const navigate = useNavigate();
  const [fontOpen, setFontOpen] = useState(false);

  const currentFontInfo = fontOptions?.[currentFont] || { name: 'Font' };
  const fontKeys = Object.keys(fontOptions || {});

  return (
    <nav style={s.nav}>
      <Link to="/" style={s.brand}>
        🔐 AuthVault
        <span style={s.pill}>MULTI-AUTH</span>
      </Link>
      <div style={s.actions}>
        {user ? (
          <>
            {authMethod && <span style={s.badge}>{authMethod}</span>}
            <Link to="/dashboard" style={{ ...s.link, color: 'var(--text)' }}>Dashboard</Link>
            <button style={s.btn} onClick={() => { logout(); navigate('/login'); }}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={s.link}>Sign In</Link>
            <Link to="/register" style={{ ...s.btn, textDecoration: 'none', padding: '0.4rem 1.2rem' }}>
              Register
            </Link>
          </>
        )}
        
        {/* Font Selector */}
        <div style={{ position: 'relative' }}>
          <button 
            style={{ ...s.fontBtn, borderColor: fontOpen ? 'var(--accent)' : 'var(--border)' }}
            onClick={() => setFontOpen(!fontOpen)}
            title="Change font"
          >
            🔤 {currentFontInfo.name}
          </button>
          
          {fontOpen && (
            <div style={s.dropdown}>
              {Object.entries(fontOptions || {}).map(([key, option], index) => (
                <div
                  key={key}
                  style={{
                    ...s.dropdownItem,
                    ...(currentFont === key ? s.dropdownItemActive : {}),
                    borderBottom: index === fontKeys.length - 1 ? 'none' : '1px solid var(--border)'
                  }}
                  onClick={() => {
                    changeFontFamily(key);
                    setFontOpen(false);
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {currentFont === key && '✓ '}{option.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.2rem' }}>
                    {option.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
