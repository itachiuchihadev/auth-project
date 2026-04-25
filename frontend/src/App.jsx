import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import Navbar from './components/Navbar';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
      </Routes>
    </>
  );
}
